import io
import urllib.parse
from django.shortcuts import get_object_or_404
from .models import Invoice
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def generate_invoice_pdf(invoice_id):
    """
    Takes an invoice_id, uses ReportLab (to avoid complex WeasyPrint system-level
    dependencies typically required on non-Linux platforms) and generates a PDF receipt.
    """
    invoice = get_object_or_404(Invoice, id=invoice_id)
    family = invoice.family
    ward = family.ward
    
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    y = 750
    
    # Header
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, y, "Church Community Billing System - Receipt")
    y -= 30
    
    p.setFont("Helvetica", 12)
    p.drawString(100, y, f"Invoice ID: {invoice.id}     Date: {invoice.date.strftime('%Y-%m-%d %H:%M')}")
    y -= 20
    p.drawString(100, y, f"Ward: {ward.ward_name} (Ward No: {ward.ward_number})")
    y -= 20
    p.drawString(100, y, f"Family: {family.family_name}")
    y -= 20
    p.drawString(100, y, f"Head Name: {family.head_name}")
    y -= 30
    
    # Items
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "Itemized List:")
    y -= 20
    
    p.setFont("Helvetica", 12)
    for item in invoice.items.all():
        line_item_total = item.quantity * item.price
        p.drawString(120, y, f"- {item.product.name}: {item.quantity} {item.product.unit} @ ₹{item.price} = ₹{line_item_total}")
        y -= 20
        # Pagination
        if y < 100:
            p.showPage()
            p.setFont("Helvetica", 12)
            y = 750
            
    y -= 10
    p.setFont("Helvetica-Bold", 14)
    p.drawString(100, y, f"Total Amount: ₹{invoice.total_amount}")
    
    p.showPage()
    p.save()
    
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
