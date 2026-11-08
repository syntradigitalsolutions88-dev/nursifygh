#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Create the superuser if they don't exist
python manage.py shell -c "from accounts.models import User; User.objects.filter(email='admin@nursifygh.com').exists() or User.objects.create_superuser('admin@nursifygh.com', 'Password123!')"
