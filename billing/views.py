from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from django.db.models import Sum, Count, F, Subquery, OuterRef, DecimalField
from django.db.models.functions import Coalesce
from django.db.models.functions import TruncWeek, TruncMonth, TruncYear
from datetime import datetime
from .models import Ward, Family, Product, Invoice, InvoiceItem, StoreSettings
from .serializers import WardSerializer, FamilySerializer, ProductSerializer, InvoiceSerializer, InvoiceListSerializer, StoreSettingsSerializer
from .utils import generate_invoice_pdf, generate_whatsapp_link
from .report_utils import generate_analytics_report_pdf


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['ward_name', 'ward_number']


class FamilyViewSet(viewsets.ModelViewSet):
    queryset = Family.objects.all()
    serializer_class = FamilySerializer

    # Implement SearchFilter so frontend can search by family_name, head_name, phone_number, or ward details
    filter_backends = [filters.SearchFilter]
    search_fields = ['family_name', 'head_name',
                     'phone_number', 'ward__ward_name', 'ward__ward_number']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    # ViewSet allows updating stock and price via PUT/PATCH out of the box.


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()  # Required for DRF router to determine basename
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['id', 'family__family_name',
                     'family__head_name', 'family__phone_number']

    def get_queryset(self):
        queryset = Invoice.objects.select_related(
            'family__ward').prefetch_related('items').order_by('-date')

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        ward_id = self.request.query_params.get('ward_id')
        family_id = self.request.query_params.get('family_id')
        payment_method = self.request.query_params.get('payment_method')
        product_id = self.request.query_params.get('product_id')
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')

        if start_date:
            queryset = queryset.filter(date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__date__lte=end_date)
        if ward_id:
            queryset = queryset.filter(family__ward_id=ward_id)
        if family_id:
            queryset = queryset.filter(family_id=family_id)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if product_id:
            queryset = queryset.filter(items__product_id=product_id).distinct()
        if min_amount:
            queryset = queryset.filter(total_amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(total_amount__lte=max_amount)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """
        Endpoint to automatically generate and return a PDF receipt for the invoice.
        """
        pdf_buffer = generate_invoice_pdf(pk)
        return FileResponse(pdf_buffer, as_attachment=True, filename=f"Invoice_{pk}.pdf")

    @action(detail=True, methods=['get'])
    def get_whatsapp_link(self, request, pk=None):
        """
        Returns a URL-encoded wa.me WhatsApp link containing a short bill summary.
        """
        url = generate_whatsapp_link(pk)
        return Response({'whatsapp_url': url})


class AnalyticsViewSet(viewsets.ViewSet):
    """
    Custom API endpoints that return JSON data for analytics and reporting.
    """

    def _get_filtered_invoices(self, request):
        """Helper method to filter invoices based on query params.
        Returns a tuple of (invoices_queryset, product_id_or_None).
        """
        invoices = Invoice.objects.all()

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        ward_id = request.query_params.get('ward_id')
        family_id = request.query_params.get('family_id')
        payment_method = request.query_params.get('payment_method')
        product_id = request.query_params.get('product_id')
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')

        if start_date:
            invoices = invoices.filter(date__date__gte=start_date)
        if end_date:
            invoices = invoices.filter(date__date__lte=end_date)
        if ward_id:
            invoices = invoices.filter(family__ward_id=ward_id)
        if family_id:
            invoices = invoices.filter(family_id=family_id)
        if payment_method:
            invoices = invoices.filter(payment_method=payment_method)
        if product_id:
            invoices = invoices.filter(items__product_id=product_id).distinct()
        if min_amount:
            invoices = invoices.filter(total_amount__gte=min_amount)
        if max_amount:
            invoices = invoices.filter(total_amount__lte=max_amount)

        return invoices, product_id

    def _get_product_revenue_annotation(self, product_id):
        """Returns an annotation that computes revenue from a specific product's items only."""
        return Coalesce(
            Subquery(
                InvoiceItem.objects.filter(
                    invoice=OuterRef('pk'),
                    product_id=product_id
                ).values('invoice').annotate(
                    item_revenue=Sum(F('quantity') * F('price'))
                ).values('item_revenue')[:1],
                output_field=DecimalField()
            ),
            0,
            output_field=DecimalField()
        )

    @action(detail=False, methods=['get'])
    def time_based_revenue(self, request):
        invoices, product_id = self._get_filtered_invoices(request)

        from django.db.models.functions import TruncDate

        if product_id:
            # When filtering by product, compute revenue from that product's items only
            items = InvoiceItem.objects.filter(
                invoice__in=invoices, product_id=product_id
            )
            daily = items.annotate(
                day=TruncDate('invoice__date')
            ).values('day').annotate(
                revenue=Sum(F('quantity') * F('price')),
                count=Count('invoice_id', distinct=True)
            ).order_by('day')
        else:
            daily = invoices.annotate(day=TruncDate('date')).values('day').annotate(
                revenue=Sum('total_amount'),
                count=Count('id')
            ).order_by('day')

        return Response({
            'trend': daily,
        })

    @action(detail=False, methods=['get'])
    def ward_wise_analysis(self, request):
        invoices, product_id = self._get_filtered_invoices(request)

        if product_id:
            items = InvoiceItem.objects.filter(
                invoice__in=invoices, product_id=product_id
            )
            ward_data = items.values(
                ward_name=F('invoice__family__ward__ward_name')
            ).annotate(
                total_revenue=Sum(F('quantity') * F('price')),
                purchase_count=Count('invoice_id', distinct=True)
            ).order_by('-total_revenue')
        else:
            ward_data = invoices.values('family__ward__ward_name').annotate(
                total_revenue=Sum('total_amount'),
                purchase_count=Count('id')
            ).order_by('-total_revenue')

        formatted_ward_data = []
        for w in ward_data:
            formatted_ward_data.append({
                'ward_name': w.get('ward_name') or w.get('family__ward__ward_name'),
                'total_revenue': w['total_revenue'],
                'purchase_count': w['purchase_count']
            })

        return Response({
            'ward_revenue': formatted_ward_data,
        })

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        invoices, product_id = self._get_filtered_invoices(request)

        items = InvoiceItem.objects.filter(invoice__in=invoices)
        if product_id:
            items = items.filter(product_id=product_id)

        limit_param = request.query_params.get('limit')
        product_data = items.values('product__name').annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('price'))
        ).order_by('-total_quantity')

        if limit_param != 'all':
            product_data = product_data[:10]

        return Response({
            'top_products': list(product_data),
        })

    @action(detail=False, methods=['get'])
    def top_families(self, request):
        invoices, product_id = self._get_filtered_invoices(request)

        limit_param = request.query_params.get('limit')

        if product_id:
            items = InvoiceItem.objects.filter(
                invoice__in=invoices, product_id=product_id
            )
            family_data = items.values(
                family_name=F('invoice__family__family_name'),
                head_name=F('invoice__family__head_name')
            ).annotate(
                total_revenue=Sum(F('quantity') * F('price')),
                purchase_count=Count('invoice_id', distinct=True)
            ).order_by('-total_revenue')
        else:
            family_data = invoices.values('family__family_name', 'family__head_name').annotate(
                total_revenue=Sum('total_amount'),
                purchase_count=Count('id')
            ).order_by('-total_revenue')

        if limit_param != 'all':
            family_data = family_data[:10]

        # Normalize field names for the response
        result = []
        for f in family_data:
            result.append({
                'family__family_name': f.get('family__family_name') or f.get('family_name'),
                'family__head_name': f.get('family__head_name') or f.get('head_name'),
                'total_revenue': f['total_revenue'],
                'purchase_count': f['purchase_count']
            })

        return Response({
            'top_families': result
        })

    @action(detail=False, methods=['get'])
    def payment_methods(self, request):
        invoices, product_id = self._get_filtered_invoices(request)

        if product_id:
            items = InvoiceItem.objects.filter(
                invoice__in=invoices, product_id=product_id
            )
            payment_data = items.values(
                payment_method=F('invoice__payment_method')
            ).annotate(
                count=Count('invoice_id', distinct=True),
                total_revenue=Sum(F('quantity') * F('price'))
            ).order_by('-count')
        else:
            payment_data = invoices.values('payment_method').annotate(
                count=Count('id'),
                total_revenue=Sum('total_amount')
            ).order_by('-count')

        return Response({
            'payment_distribution': list(payment_data)
        })

    @action(detail=False, methods=['get'])
    def download_report(self, request):
        invoices, product_id = self._get_filtered_invoices(request)

        pdf_buffer = generate_analytics_report_pdf(
            invoices, request.query_params)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return FileResponse(pdf_buffer, as_attachment=True, filename=f"Analytics_Report_{timestamp}.pdf")


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # Bypass DRF's strict auth check for the login route

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        # Ensure values are not None
        if not username or not password:
            return Response({"detail": "Username and password required."}, status=400)

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return Response({"detail": "Successfully logged in."})

        return Response({"detail": "Invalid credentials. Please check username and password."}, status=401)


class LogoutView(APIView):
    # Depending on how the frontend handles logout, this could be permission_classes = [AllowAny] or left default.
    def post(self, request):
        logout(request)
        return Response({"detail": "Successfully logged out."})


class CheckSessionView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                "isAuthenticated": True,
                "username": request.user.username
            })
        return Response({"isAuthenticated": False}, status=401)


class StoreSettingsView(APIView):
    def get(self, request):
        settings = StoreSettings.get_settings()
        serializer = StoreSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = StoreSettings.get_settings()
        serializer = StoreSettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
