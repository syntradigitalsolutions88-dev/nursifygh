#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Create the superuser with a password
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(email='admin@nursifygh.com').exists() or User.objects.create_superuser(email='admin@nursifygh.com', password='Password123!')"
