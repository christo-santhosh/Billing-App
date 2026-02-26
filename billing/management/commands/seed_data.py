import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import connection, transaction
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


class Command(BaseCommand):
    help = "Seed the database with realistic test data (fast bulk version)"

    def handle(self, *args, **options):
        self.stdout.write("Seeding database (bulk mode)...")

        with transaction.atomic():

            # --- Wards ---
            wards = []
            for number, name in WARDS:
                ward, _ = Ward.objects.get_or_create(
                    ward_number=number, defaults={"ward_name": name}
                )
                wards.append(ward)
            self.stdout.write(f"  Wards ready: {len(wards)}")

            # --- Products ---
            products = []
            for name, price, stock, unit in PRODUCTS:
                product, created = Product.objects.get_or_create(
                    name=name,
                    defaults={"price": price, "stock_quantity": stock, "unit": unit}
                )
                if not created:
                    # Top up stock so seeding doesn't fail on insufficient stock
                    Product.objects.filter(pk=product.pk).update(stock_quantity=stock)
                    product.stock_quantity = stock
                products.append(product)
            self.stdout.write(f"  Products ready: {len(products)}")

            # --- Families ---
            all_families = []
            for i, (fname, head, phone) in enumerate(FAMILIES):
                ward = wards[i % len(wards)]
                family, _ = Family.objects.get_or_create(
                    family_name=fname,
                    defaults={"head_name": head, "phone_number": phone, "ward": ward}
                )
                all_families.append(family)
            self.stdout.write(f"  Families ready: {len(all_families)}")

            # --- Build invoices & items in bulk ---
            now = timezone.now()
            payment_methods = ["CASH", "UPI", "CARD"]

            invoice_objs = []
            invoice_meta = []  # (date, family, items_spec)

            for weeks_ago in range(26, 0, -1):
                num_invoices = random.randint(2, 5)
                base_date = now - timedelta(weeks=weeks_ago, days=random.randint(0, 6))

                for _ in range(num_invoices):
                    family = random.choice(all_families)
                    selected = random.sample(products, random.randint(1, 3))
                    items_spec = [(p.id, random.randint(1, 4), float(p.price))
                                  for p in selected]

                    invoice_objs.append(Invoice(
                        family=family,
                        payment_method=random.choice(payment_methods),
                        total_amount=sum(qty * price for _, qty, price in items_spec),
                    ))
                    invoice_meta.append((base_date, items_spec))

            # Bulk create invoices
            created_invoices = Invoice.objects.bulk_create(invoice_objs)
            self.stdout.write(f"  Invoices created: {len(created_invoices)}")

            # Backdate using raw SQL for speed (auto_now_add blocks ORM update)
            for inv, (date, _) in zip(created_invoices, invoice_meta):
                Invoice.objects.filter(pk=inv.pk).update(date=date)

            # Bulk create invoice items
            item_objs = []
            for inv, (_, items_spec) in zip(created_invoices, invoice_meta):
                for product_id, qty, price in items_spec:
                    item_objs.append(InvoiceItem(
                        invoice=inv,
                        product_id=product_id,
                        quantity=qty,
                        price=price,
                    ))

            InvoiceItem.objects.bulk_create(item_objs)
            self.stdout.write(f"  Invoice items created: {len(item_objs)}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! {len(wards)} wards | {len(all_families)} families | "
            f"{len(products)} products | {len(created_invoices)} invoices | "
            f"{len(item_objs)} items"
        ))
