from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Ward, Family, Product, Invoice, InvoiceItem

admin.site.register(User, UserAdmin)
admin.site.register(Ward)
admin.site.register(Family)
admin.site.register(Product)

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    inlines = [InvoiceItemInline]
    list_display = ('id', 'family', 'date', 'total_amount', 'payment_method')
    list_filter = ('date', 'payment_method', 'family__ward')
