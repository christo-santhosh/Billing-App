"""
Quick standalone seed script — run from the project root:
    venv\Scripts\python.exe seed.py
"""
import os
import django
import random
from datetime import timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "church_billing.settings")
django.setup()

from django.utils import timezone
from django.db import transaction
from billing.models import Ward, Family, Product, Invoice, InvoiceItem

WARDS = [
    ("W-01", "St. Marys"),
    ("W-02", "St. Joseph"),
    ("W-03", "Holy Cross"),
    ("W-04", "Sacred Heart"),
]

FAMILIES = [
    ("Thomas",  "George Thomas",   "+919876543210"),
    ("Mathew",  "Raju Mathew",     "+919876543211"),
    ("John",    "Biju John",       "+919876543212"),
    ("Philip",  "Saji Philip",     "+919876543213"),
    ("Paul",    "Tomy Paul",       "+919876543214"),
    ("Joseph",  "Suresh Joseph",   "+919876543215"),
    ("Simon",   "Anoop Simon",     "+919876543216"),
    ("Peter",   "Joji Peter",      "+919876543217"),
    ("George",  "Vinod George",    "+919876543218"),
    ("James",   "Shaji James",     "+919876543219"),
    ("David",   "Reji David",      "+919876543220"),
    ("Xavier",  "Lijo Xavier",     "+919876543221"),
]

PRODUCTS = [
    ("Candles (Pack)", 50.00,  5000, "pack"),
    ("Rice (kg)",      35.00,  5000, "kg"),
    ("Oil (ltr)",     120.00,  5000, "ltr"),
    ("Incense Sticks", 20.00,  5000, "pack"),
    ("Coconut",        25.00,  5000, "pcs"),
    ("Flowers (kg)",   80.00,  5000, "kg"),
    ("Bread (loaf)",   45.00,  5000, "loaf"),
    ("Sugar (kg)",     42.00,  5000, "kg"),
]

print("Seeding database...")

with transaction.atomic():
    # Wards
    wards = []
    for number, name in WARDS:
        w, _ = Ward.objects.get_or_create(ward_number=number, defaults={"ward_name": name})
        wards.append(w)
    print(f"  Wards: {len(wards)}")

    # Products
    products = []
    for name, price, stock, unit in PRODUCTS:
        p, created = Product.objects.get_or_create(
            name=name, defaults={"price": price, "stock_quantity": stock, "unit": unit}
        )
        if not created:
            Product.objects.filter(pk=p.pk).update(stock_quantity=stock)
        products.append(p)
    print(f"  Products: {len(products)}")

    # Families
    families = []
    for i, (fname, head, phone) in enumerate(FAMILIES):
        f, _ = Family.objects.get_or_create(
            family_name=fname,
            defaults={"head_name": head, "phone_number": phone, "ward": wards[i % len(wards)]}
        )
        families.append(f)
    print(f"  Families: {len(families)}")

    # Invoices — 2-5 per week for last 26 weeks
    now = timezone.now()
    payments = ["CASH", "UPI", "CARD"]
    inv_list, inv_dates, inv_items_spec = [], [], []

    for weeks_ago in range(26, 0, -1):
        base_date = now - timedelta(weeks=weeks_ago, days=random.randint(0, 6))
        for _ in range(random.randint(2, 5)):
            fam = random.choice(families)
            sel = random.sample(products, random.randint(1, 3))
            items = [(p.id, random.randint(1, 4), float(p.price)) for p in sel]
            total = sum(qty * price for _, qty, price in items)
            inv_list.append(Invoice(family=fam, payment_method=random.choice(payments), total_amount=total))
            inv_dates.append(base_date)
            inv_items_spec.append(items)

    created = Invoice.objects.bulk_create(inv_list)
    print(f"  Invoices created: {len(created)}")

    # Backdate
    for inv, date in zip(created, inv_dates):
        Invoice.objects.filter(pk=inv.pk).update(date=date)

    # Invoice Items
    item_objs = []
    for inv, items in zip(created, inv_items_spec):
        for product_id, qty, price in items:
            item_objs.append(InvoiceItem(invoice=inv, product_id=product_id, quantity=qty, price=price))
    InvoiceItem.objects.bulk_create(item_objs)
    print(f"  Invoice items created: {len(item_objs)}")

print(f"\nDone! {len(wards)} wards | {len(families)} families | {len(products)} products | {len(created)} invoices | {len(item_objs)} items")
