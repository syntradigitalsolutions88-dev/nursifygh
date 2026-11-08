#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Create the user and force the Admin to use Email authentication
python manage.py shell -c "
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import login

User = get_user_model()

# 1. Create the perfect user
u, _ = User.objects.get_or_create(email='syntradigitalsolutions88@gmail.com')
u.set_password('admin')
u.is_staff = True
u.is_superuser = True
u.save()
print('✅ User created: syntradigitalsolutions88@gmail.com / admin')

# 2. Patch the Admin form to use Email instead of Username
from django.contrib.admin.forms import AdminAuthenticationForm
AdminAuthenticationForm.username_field = u._meta.get_field('email')
print('✅ Admin form patched to use email!')
"
