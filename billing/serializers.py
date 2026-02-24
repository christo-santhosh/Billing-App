from rest_framework import serializers
from .models import User, Ward, Family, Product, Invoice, InvoiceItem

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_sub_admin', 'phone_number']

class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = '__all__'

class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'product', 'quantity', 'price']
        read_only_fields = ['price']

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = ['id', 'family', 'date', 'total_amount', 'payment_method', 'items']
        read_only_fields = ['total_amount', 'date']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            # Default price to product current price at the time of invoice creation
            price = product.price
            InvoiceItem.objects.create(invoice=invoice, product=product, quantity=quantity, price=price)
        return invoice
