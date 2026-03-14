import io
from datetime import datetime
from django.db.models import Sum, Count, F

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from .models import InvoiceItem, Ward, Family


def generate_analytics_report_pdf(invoices_queryset, request_params):
    """
    Generates a beautifully styled PDF report summarizing the analytics data.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=50,
        bottomMargin=50
    )
    elements = []

    # ─── STYLES ────────────────────────────────────────────────────────
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#15803d'),  # primary green
        alignment=TA_CENTER,
        spaceAfter=5
    )

    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        alignment=TA_CENTER,
        fontSize=11,
        textColor=colors.gray,
        spaceAfter=20
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=10,
        spaceBefore=20
    )

    normal_style = styles['Normal']
    normal_style.fontSize = 10
    normal_style.textColor = colors.HexColor('#334155')

    # ─── HEADER ────────────────────────────────────────────────────────
    elements.append(Paragraph("AgroBilling", title_style))
    elements.append(Paragraph("Analytics Report", subtitle_style))

    # --- FILTERS SUMMARY ---
    start_date = request_params.get('start_date', 'All Time')
    end_date = request_params.get('end_date', 'All Time')
    ward_id = request_params.get('ward_id')
    family_id = request_params.get('family_id')
    payment_method = request_params.get('payment_method', 'All Methods')

    ward_text = "All Wards"
    if ward_id:
        ward = Ward.objects.filter(id=ward_id).first()
        if ward:
            ward_text = f"{ward.ward_name} ({ward.ward_number})"

    family_text = "All Families"
    if family_id:
        family = Family.objects.filter(id=family_id).first()
        if family:
            family_text = family.family_name

    filter_data = [
        [Paragraph(f"<b>Date Range:</b> {start_date} to {end_date}", normal_style),
         Paragraph(f"<b>Payment:</b> {payment_method}", normal_style)],
        [Paragraph(f"<b>Ward Filter:</b> {ward_text}", normal_style),
         Paragraph(f"<b>Family Filter:</b> {family_text}", normal_style)],
        [Paragraph(
            f"<b>Generated On:</b> {datetime.now().strftime('%B %d, %Y - %I:%M %p')}", normal_style), ""]
    ]

    filter_table = Table(filter_data, colWidths=['50%', '50%'])
    filter_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(filter_table)
    elements.append(Spacer(1, 15))

    # --- AGGREGATE SUMMARY ---
    total_invoices = invoices_queryset.count()
    total_revenue = invoices_queryset.aggregate(
        total=Sum('total_amount'))['total'] or 0

    summary_data = [
        ["Total Transactions", "Total Revenue Generated"],
        [str(total_invoices), f"Rs. {total_revenue:,.2f}"]
    ]
    summary_table = Table(summary_data, colWidths=['50%', '50%'])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.gray),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 16),
        ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#16a34a')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(summary_table)

    # ─── WARD PERFORMANCE ──────────────────────────────────────────────
    ward_data = invoices_queryset.values('family__ward__ward_name').annotate(
        total_revenue=Sum('total_amount'),
        purchase_count=Count('id')
    ).order_by('-total_revenue')

    if ward_data:
        elements.append(
            Paragraph("Ward Performance Revenue", section_header_style))
        w_table_data = [['#', 'Ward Name', 'Transactions', 'Total Revenue']]
        for idx, w in enumerate(ward_data, start=1):
            w_table_data.append([
                str(idx),
                w['family__ward__ward_name'] or 'Unassigned',
                str(w['purchase_count']),
                f"Rs. {w['total_revenue']:,.2f}"
            ])

        elements.append(_build_data_table(
            w_table_data, colWidths=['10%', '40%', '25%', '25%']))

    # ─── TOP FAMILIES ──────────────────────────────────────────────────
    family_data = invoices_queryset.values('family__family_name', 'family__head_name').annotate(
        total_revenue=Sum('total_amount'),
        purchase_count=Count('id')
    ).order_by('-total_revenue')[:15]

    if family_data:
        elements.append(
            Paragraph("Top Families (By Revenue)", section_header_style))
        f_table_data = [['#', 'Family Name / Head',
                         'Purchases', 'Revenue Generated']]
        for idx, f in enumerate(family_data, start=1):
            family_name = f['family__family_name'] or 'Unknown'
            head_name = f" (Head: {f['family__head_name']})" if f.get(
                'family__head_name') else ""
            f_table_data.append([
                str(idx),
                f"{family_name}{head_name}",
                str(f['purchase_count']),
                f"Rs. {f['total_revenue']:,.2f}"
            ])

        elements.append(_build_data_table(
            f_table_data, colWidths=['10%', '40%', '25%', '25%']))

    # ─── TOP PRODUCTS ──────────────────────────────────────────────────
    items = InvoiceItem.objects.filter(invoice__in=invoices_queryset)
    product_data = items.values('product__name').annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('price'))
        # Limit to top 15 in report to save space
    ).order_by('-total_quantity')[:15]

    if product_data:
        elements.append(
            Paragraph("Top Products (By Quantity)", section_header_style))
        p_table_data = [['#', 'Product Name',
                         'Quantity Sold', 'Revenue Generated']]
        for idx, p in enumerate(product_data, start=1):
            p_table_data.append([
                str(idx),
                p['product__name'],
                str(p['total_quantity']),
                f"Rs. {p['total_revenue']:,.2f}"
            ])

        elements.append(_build_data_table(
            p_table_data, colWidths=['10%', '40%', '25%', '25%']))

    # ─── PAYMENT METHODS ───────────────────────────────────────────────
    payment_data = invoices_queryset.values('payment_method').annotate(
        count=Count('id'),
        total_revenue=Sum('total_amount')
    ).order_by('-count')

    if payment_data:
        elements.append(Paragraph("Payment Methods", section_header_style))
        pm_table_data = [['#', 'Method', 'Transaction Count', 'Total Revenue']]
        for idx, pm in enumerate(payment_data, start=1):
            pm_table_data.append([
                str(idx),
                pm['payment_method'],
                str(pm['count']),
                f"Rs. {pm['total_revenue']:,.2f}"
            ])

        elements.append(_build_data_table(
            pm_table_data, colWidths=['10%', '30%', '30%', '30%']))

    # ─── FOOTER ────────────────────────────────────────────────────────
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        "Auto-generated by AgroBilling",
        ParagraphStyle(
            'Footer',
            parent=normal_style,
            alignment=TA_CENTER,
            textColor=colors.gray,
            fontName='Helvetica-Oblique',
            fontSize=8
        )
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def _build_data_table(data_list, colWidths=None):
    """Helper method to format the standard data tables consistently."""
    table = Table(data_list, colWidths=colWidths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),  # Dark header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        # Left align second column (names)
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        # Right align last column (revenues)
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#334155')),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 1, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1),
         [colors.white, colors.HexColor('#f8fafc')])  # Alternating row colors
    ]))
    return table
