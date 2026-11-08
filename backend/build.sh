#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Create a script to force-add a username column and create the admin
python manage.py shell -c "
from django.db import connection
from accounts.models import User

# 1. Force-add the username column to the database if it's missing
with connection.cursor() as cursor:
    try:
        cursor.execute('ALTER TABLE accounts_user ADD COLUMN username VARCHAR(150) UNIQUE;')
    except Exception:
        pass # It might already exist

# 2. Create the admin user with the username 'admin'
u, created = User.objects.get_or_create(email='admin@admin.com')
u.username = 'admin'
u.set_password('admin')
u.is_staff = True
u.is_superuser = True
u.save()

print('✅ Backdoor admin created: username=admin, password=admin')
"
