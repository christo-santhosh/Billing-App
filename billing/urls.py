from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WardViewSet, FamilyViewSet, ProductViewSet, InvoiceViewSet, AnalyticsViewSet

router = DefaultRouter()
router.register(r'wards', WardViewSet)
router.register(r'families', FamilyViewSet)
router.register(r'products', ProductViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'analytics', AnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]
