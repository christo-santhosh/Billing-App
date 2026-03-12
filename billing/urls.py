from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WardViewSet, FamilyViewSet, ProductViewSet, InvoiceViewSet, AnalyticsViewSet,
    LoginView, LogoutView, CheckSessionView, StoreSettingsView
)

router = DefaultRouter()
router.register(r'wards', WardViewSet)
router.register(r'families', FamilyViewSet)
router.register(r'products', ProductViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'analytics', AnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/session/', CheckSessionView.as_view(), name='check_session'),
    path('settings/', StoreSettingsView.as_view(), name='settings'),
]
