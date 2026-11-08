#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Force the admin user to exist
python manage.py shell -c "from accounts.models import User; u = User.objects.filter(email='syntradigitalsolutions88@gmail.com').first(); u.set_password('admin') if u else User.objects.create_superuser(email='syntradigitalsolutions88@gmail.com', password='admin', full_name='Admin', level=100, program='GENERAL'); u.is_staff=True if u else None; u.is_superuser=True if u else None; u.save() if u else None"