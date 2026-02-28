from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from django.db.models import Sum, Count
from django.db.models.functions import TruncWeek, TruncMonth, TruncYear
from .models import Ward, Family, Product, Invoice
from .serializers import WardSerializer, FamilySerializer, ProductSerializer, InvoiceSerializer, InvoiceListSerializer
from .utils import generate_invoice_pdf, generate_whatsapp_link

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
    search_fields = ['family_name', 'head_name', 'phone_number', 'ward__ward_name', 'ward__ward_number']

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    # ViewSet allows updating stock and price via PUT/PATCH out of the box.

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('family__ward').prefetch_related('items').order_by('-date')
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['id', 'family__family_name', 'family__head_name', 'family__phone_number']

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
        """Helper method to filter invoices based on query params."""
        invoices = Invoice.objects.all()

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        ward_id = request.query_params.get('ward_id')
        family_id = request.query_params.get('family_id')
        payment_method = request.query_params.get('payment_method')

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

        return invoices

    @action(detail=False, methods=['get'])
    def time_based_revenue(self, request):
        invoices = self._get_filtered_invoices(request)

        # Truncate by day so the frontend can group it however it wants based on the date range
        # For 'all time' or 'this year', daily might be too granular, but let the frontend handle aggregation
        # or we return daily and let them chart it. We'll return dates for flexibility.
        from django.db.models.functions import TruncDate
        
        daily = invoices.annotate(day=TruncDate('date')).values('day').annotate(
            revenue=Sum('total_amount'),
            count=Count('id')
        ).order_by('day') # Order by day ascending for charts

        return Response({
            'trend': daily,
        })

    @action(detail=False, methods=['get'])
    def ward_wise_analysis(self, request):
        invoices = self._get_filtered_invoices(request)

        # Aggregate revenue and count per ward based on the filtered invoices
        ward_data = invoices.values('family__ward__ward_name').annotate(
            total_revenue=Sum('total_amount'),
            purchase_count=Count('id')
        ).order_by('-total_revenue')

        return Response({
            'ward_revenue': list(ward_data),
        })

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        invoices = self._get_filtered_invoices(request)

        from .models import InvoiceItem
        items = InvoiceItem.objects.filter(invoice__in=invoices)
        
        # Aggregate by product name
        from django.db.models import F
        product_data = items.values('product__name').annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('price'))
        ).order_by('-total_quantity')[:10] # Top 10

        return Response({
            'top_products': list(product_data),
        })

    @action(detail=False, methods=['get'])
    def top_families(self, request):
        invoices = self._get_filtered_invoices(request)

        family_data = invoices.values('family__family_name', 'family__head_name').annotate(
            total_revenue=Sum('total_amount'),
            purchase_count=Count('id')
        ).order_by('-total_revenue')[:10] # Top 10

        return Response({
            'top_families': list(family_data)
        })

    @action(detail=False, methods=['get'])
    def payment_methods(self, request):
        invoices = self._get_filtered_invoices(request)

        payment_data = invoices.values('payment_method').annotate(
            count=Count('id'),
            total_revenue=Sum('total_amount')
        ).order_by('-count')

        return Response({
            'payment_distribution': list(payment_data)
        })
