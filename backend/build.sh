#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Create the live superuser
python manage.py shell -c "
from accounts.models import User
u = User.objects.filter(email='syntradigitalsolutions88@gmail.com').first()
if u:
    u.set_password('Password123!')
    u.is_staff = True
    u.is_superuser = True
    u.save()
    print('✅ Live password reset!')
else:
    User.objects.create_superuser(
        email='syntradigitalsolutions88@gmail.com',
        password='Password123!',
        full_name='Admin User',
        level=100,
        program='GENERAL'
    )
    print('✅ Live user created!')
"
