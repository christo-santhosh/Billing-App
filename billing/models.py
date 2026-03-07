from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError

class User(AbstractUser):
    is_sub_admin = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

class Ward(models.Model):
    ward_number = models.CharField(max_length=10, unique=True)
    ward_name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.ward_name} ({self.ward_number})"

class Family(models.Model):
    family_name = models.CharField(max_length=100)
    head_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='families')

    def __str__(self):
        return self.family_name

class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, help_text="e.g., kg, pcs, ltr")
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)

    def __str__(self):
        return self.name

class Invoice(models.Model):
    PAYMENT_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
        ('CARD', 'Card'),
    ]
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='invoices')
    date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='CASH')

    def update_total(self):
        # Calculate total amount by summing up the price * quantity of all related items
        total = sum(item.price * item.quantity for item in self.items.all())
        self.total_amount = total
        self.save()

    def __str__(self):
        return f"Invoice #{self.id} for {self.family}"

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        if not self.pk:  # Deduct stock only on creation
            if self.product.stock_quantity < self.quantity:
                raise ValidationError(f"Insufficient stock for {self.product.name}.")
            self.product.stock_quantity -= self.quantity
            self.product.save()
        super().save(*args, **kwargs)
        self.invoice.update_total()

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Invoice #{self.invoice.id})"
