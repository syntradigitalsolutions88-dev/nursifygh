#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# 1. WIPE THE LIVE DATABASE CLEAN
python manage.py flush --no-input

# 2. CREATE THE ADMIN USER FRESH
python manage.py shell -c "from accounts.models import User; User.objects.create_superuser(email='syntradigitalsolutions88@gmail.com', password='admin', full_name='Admin User', level=100, program='GENERAL')"