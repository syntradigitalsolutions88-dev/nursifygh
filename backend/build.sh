#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Force superuser creation and password reset
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); u = User.objects.filter(email='admin@nursifygh.com').first(); u.set_password('Password123!') if u else User.objects.create_superuser(email='admin@nursifygh.com', password='Password123!'); u.save() if u else None"
