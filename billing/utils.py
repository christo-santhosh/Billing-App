import io
import urllib.parse
from django.shortcuts import get_object_or_404
from .models import Invoice

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

def generate_invoice_pdf(invoice_id):
    """
    Takes an invoice_id and uses ReportLab Platypus to generate a beautifully styled PDF receipt.
    """
    invoice = get_object_or_404(Invoice, id=invoice_id)
    family = invoice.family
    ward = family.ward
    
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
        fontSize=24,
        textColor=colors.HexColor('#15803d'), # primary green
        alignment=TA_CENTER,
        spaceAfter=5
    )
    
    subtitle_style = ParagraphStyle(
        'SubTitle', 
        parent=styles['Normal'], 
        alignment=TA_CENTER, 
        fontSize=12, 
        textColor=colors.gray,
        spaceAfter=30
    )

    normal_style = styles['Normal']
    normal_style.fontSize = 11
    normal_style.textColor = colors.HexColor('#334155')

    right_align_style = ParagraphStyle(
        'RightAlign', 
        parent=normal_style, 
        alignment=TA_RIGHT
    )

    # ─── HEADER ────────────────────────────────────────────────────────
    elements.append(Paragraph("Church Community", title_style))
    elements.append(Paragraph("Official Payment Receipt", subtitle_style))
    
    # Invoice & Customer Info Grid
    data_header = [
        [
            Paragraph(f"<b>Invoice #:</b> {invoice.id}", normal_style), 
            Paragraph(f"<b>Date:</b> {invoice.date.strftime('%B %d, %Y - %I:%M %p')}", right_align_style)
        ],
        [
            Paragraph(f"<b>Ward:</b> {ward.ward_name} ({ward.ward_number})", normal_style), 
            Paragraph(f"<b>Payment Method:</b> {invoice.payment_method}", right_align_style)
        ],
        [
            Paragraph(f"<b>Family:</b> {family.family_name}", normal_style), 
            ""
        ],
        [
            Paragraph(f"<b>Head Name:</b> {family.head_name}", normal_style), 
            ""
        ],
    ]
    
    header_table = Table(data_header, colWidths=['60%', '40%'])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    
    # ─── ITEMS TABLE ───────────────────────────────────────────────────
    table_data = [['Item / Product', 'Qty', 'Unit', 'Unit Price', 'Total']]
    
    for item in invoice.items.all():
        line_total = float(item.quantity * item.price)
        table_data.append([
            item.product.name,
            str(item.quantity),
            item.product.unit,
            f"Rs. {item.price:.2f}",
            f"Rs. {line_total:.2f}"
        ])
        
    # Add Total Row
    table_data.append(["", "", "", "Grand Total:", f"Rs. {invoice.total_amount:.2f}"])
    
    item_table = Table(table_data, colWidths=['40%', '15%', '15%', '15%', '15%'])
    
    # Table Styling
    item_table.setStyle(TableStyle([
        # Header Row Styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16a34a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Alignment
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),   # Left align product names
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'), # Right align totals
        
        # Body rows styling
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#334155')),
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        
        # Grid/Lines
        ('LINEBELOW', (0, 0), (-1, -2), 1, colors.HexColor('#e2e8f0')),
        
        # Grand Total Row Styling
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f1f5f9')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (-2, -1), (-1, -1), 2, colors.HexColor('#16a34a')), # Line above total
        ('LINEBELOW', (-2, -1), (-1, -1), 2, colors.HexColor('#16a34a')), # Line below total
    ]))
    
    elements.append(item_table)
    
    # ─── FOOTER ────────────────────────────────────────────────────────
    elements.append(Spacer(1, 40))
    elements.append(Paragraph(
        "Thank you for your contribution!", 
        ParagraphStyle(
            'Footer', 
            parent=normal_style, 
            alignment=TA_CENTER, 
            textColor=colors.HexColor('#15803d'), 
            fontName='Helvetica-Oblique'
        )
    ))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_whatsapp_link(invoice_id):
    """
    Formats a short bill summary and returns a URL-encoded wa.me WhatsApp link.
    """
    invoice = get_object_or_404(Invoice, id=invoice_id)
    family = invoice.family
    phone = str(family.phone_number)
    
    # Strip non-digits to ensure proper wa.me formatting
    phone_clean = ''.join(filter(str.isdigit, phone))
    
    date_str = invoice.date.strftime('%B %d, %Y')
    message = f"Hello {family.head_name}, your bill for {date_str} is ₹{invoice.total_amount}."
    
    encoded_message = urllib.parse.quote(message)
    return f"https://wa.me/{phone_clean}?text={encoded_message}"
