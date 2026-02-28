from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render

def serve_page(template_name):
    """Helper to create a view that renders a frontend HTML template."""
    def view(request):
        return render(request, template_name)
    return view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('billing.urls')),

    # Frontend pages — served directly by Django
    path('', serve_page('index.html'), name='dashboard'),
    path('pos/', serve_page('pos.html'), name='pos'),
    path('families/', serve_page('families.html'), name='families'),
    path('inventory/', serve_page('inventory.html'), name='inventory'),
    path('sales/', serve_page('sales.html'), name='sales'),
    path('analytics/', serve_page('analytics.html'), name='analytics'),
]
