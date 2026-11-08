#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Bulletproof user creation
python manage.py shell -c "from accounts.models import User; email = 'syntradigitalsolutions88@gmail.com'; password = 'admin'; u = User.objects.filter(email=email).first() or User(email=email, full_name='Admin User', level=100, program='GENERAL'); u.set_password(password); u.is_staff = True; u.is_superuser = True; u.is_active = True; u.save(); print('=================================================='); print('✅ SUCCESS: Admin user forcefully created and saved!'); print('==================================================')"