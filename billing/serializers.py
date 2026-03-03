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

    def validate_phone_number(self, value):
        qs = Family.objects.filter(phone_number=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A family with this phone number already exists.")
        return value.strip()

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

    def validate_name(self, value):
        qs = Product.objects.filter(name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product with this name already exists.")
        return value.strip()

class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    unit = serializers.CharField(source='product.unit', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'product', 'product_name', 'unit', 'quantity', 'price']
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


class InvoiceListSerializer(serializers.ModelSerializer):
    """Read-only serializer for Sales History list — embeds family & ward names."""
    family_name = serializers.CharField(source='family.family_name', read_only=True)
    head_name   = serializers.CharField(source='family.head_name',   read_only=True)
    ward_name   = serializers.CharField(source='family.ward.ward_name', read_only=True)
    item_count  = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ['id', 'date', 'total_amount', 'payment_method',
                  'family_name', 'head_name', 'ward_name', 'item_count']

    def get_item_count(self, obj):
        return obj.items.count()
