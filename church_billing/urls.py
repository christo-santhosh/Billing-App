from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from django.conf import settings
from django.views.generic.base import RedirectView
from django.conf.urls.static import static


def serve_page(template_name, content_type='text/html'):
    """Helper to create a view that renders a frontend HTML template."""
    def view(request):
        return render(request, template_name, content_type=content_type)
    return view


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('billing.urls')),

    # Frontend pages — served directly by Django
    path('', serve_page('index.html'), name='dashboard'),
    path('index.html', serve_page('index.html'), name='dashboard_alt'),
    path('login.html', serve_page('login.html'), name='login_page'),
    path('pos/', serve_page('pos.html'), name='pos'),
    path('families/', serve_page('families.html'), name='families'),
    path('inventory/', serve_page('inventory.html'), name='inventory'),
    path('sales/', serve_page('sales.html'), name='sales'),
    path('analytics/', serve_page('analytics.html'), name='analytics'),
    
    # PWA files
    path('manifest.json', serve_page('manifest.json', content_type='application/manifest+json'), name='manifest'),
    path('service-worker.js', serve_page('service-worker.js', content_type='application/javascript'), name='service_worker'),
    path('favicon.ico', RedirectView.as_view(url='/static/icon.png', permanent=False)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
