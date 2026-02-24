from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from django.db.models import Sum, Count
from django.db.models.functions import TruncWeek, TruncMonth, TruncYear
from .models import Ward, Family, Product, Invoice
from .serializers import WardSerializer, FamilySerializer, ProductSerializer, InvoiceSerializer
from .utils import generate_invoice_pdf, generate_whatsapp_link

class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer

class FamilyViewSet(viewsets.ModelViewSet):
    queryset = Family.objects.all()
    serializer_class = FamilySerializer
    
    # Implement SearchFilter so frontend can search by family_name, head_name, or phone_number
    filter_backends = [filters.SearchFilter]
    search_fields = ['family_name', 'head_name', 'phone_number']

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    # ViewSet allows updating stock and price via PUT/PATCH out of the box.

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

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

    @action(detail=False, methods=['get'])
    def time_based_revenue(self, request):
        invoices = Invoice.objects.all()

        weekly = invoices.annotate(week=TruncWeek('date')).values('week').annotate(
            revenue=Sum('total_amount'),
            count=Count('id')
        ).order_by('-week')

        monthly = invoices.annotate(month=TruncMonth('date')).values('month').annotate(
            revenue=Sum('total_amount'),
            count=Count('id')
        ).order_by('-month')

        annually = invoices.annotate(year=TruncYear('date')).values('year').annotate(
            revenue=Sum('total_amount'),
            count=Count('id')
        ).order_by('-year')

        return Response({
            'weekly': weekly,
            'monthly': monthly,
            'annually': annually
        })

    @action(detail=False, methods=['get'])
    def ward_wise_analysis(self, request):
        # Total revenue generated per Ward and the Ward that made the most purchases
        ward_data = Ward.objects.annotate(
            total_revenue=Sum('families__invoices__total_amount'),
            purchase_count=Count('families__invoices')
        ).values('ward_name', 'total_revenue', 'purchase_count').order_by('-total_revenue')

        ward_most_purchases = max(ward_data, key=lambda x: x['purchase_count']) if ward_data else None

        return Response({
            'ward_revenue': list(ward_data),
            'ward_with_most_purchases': ward_most_purchases
        })
