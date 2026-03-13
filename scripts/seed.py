"""
Quick standalone seed script — run from the project root:
    python scripts/seed.py
"""
import os
import django
import random
from datetime import timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "church_billing.settings")

# Add the project root to sys.path so Django can find the settings module
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

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
    ("Kallivayalil", "Kurian Kallivayalil", "+919876543101"),
    ("Tharakan",     "Ouseph Tharakan",     "+919876543102"),
    ("Maliyekkal",   "Chacko Maliyekkal",   "+919876543103"),
    ("Puthuppally",  "Varkey Puthuppally",  "+919876543104"),
    ("Kizhakkedath", "Mathai Kizhakkedath", "+919876543105"),
    ("Palathinkal",  "Itty Palathinkal",    "+919876543106"),
    ("Vadakkethil",  "Kunjumon Vadakkethil","+919876543107"),
    ("Pazhoor",      "Thomachan Pazhoor",   "+919876543108"),
    ("Chempakassery","Antony Chempakassery","+919876543109"),
    ("Kunnumpurathu","Jose Kunnumpurathu",  "+919876543110"),
    ("Manappuram",   "Babu Manappuram",     "+919876543111"),
    ("Thekkekkara",  "Sunny Thekkekkara",   "+919876543112"),
    ("Kodiyanthara", "Joy Kodiyanthara",    "+919876543113"),
    ("Vellapally",   "Tomy Vellapally",     "+919876543114"),
    ("Kanjirappally","Roy Kanjirappally",   "+919876543115"),
]

PRODUCTS = [
    ("Chilli Powder (1kg)",   250.00, 1000, "pkt"),
    ("Black Pepper (500g)",   320.00, 1000, "pkt"),
    ("Turmeric Powder (250g)", 85.00, 1000, "pkt"),
    ("Coffee Powder (500g)",  220.00, 1000, "pkt"),
    ("Tea Dust (1kg)",        280.00, 1000, "pkt"),
    ("Cardamom (100g)",       180.00, 1000, "pkt"),
    ("Coriander Powder (500g)",90.00, 1000, "pkt"),
    ("Cumin Seeds (250g)",    110.00, 1000, "pkt"),
    ("Mustard Seeds (500g)",   60.00, 1000, "pkt"),
    ("Fenugreek (250g)",       55.00, 1000, "pkt"),
]

print("Wiping existing database records... this may take a moment.")
InvoiceItem.objects.all().delete()
Invoice.objects.all().delete()
Product.objects.all().delete()
Family.objects.all().delete()
Ward.objects.all().delete()

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
        p = Product.objects.create(name=name, price=price, stock_quantity=stock, unit=unit)
        products.append(p)
    print(f"  Products: {len(products)}")


    # Families
    families = []
    for i, (fname, head, phone) in enumerate(FAMILIES):
        f = Family.objects.create(
            family_name=fname, head_name=head, phone_number=phone, ward=wards[i % len(wards)]
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
