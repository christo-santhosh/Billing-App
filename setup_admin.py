from django.contrib.auth import get_user_model
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_billing.settings')
django.setup()


User = get_user_model()

try:
    user = User.objects.get(username='admin')
    user.set_password('admin123')
    user.save()
    print("SUCCESS: Updated admin password.")
except User.DoesNotExist:
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("SUCCESS: Created admin user.")
