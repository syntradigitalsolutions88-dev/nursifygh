#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Create the superuser using the environment variables
export DJANGO_SUPERUSER_PASSWORD="admin"
python manage.py createsuperuser --email "syntradigitalsolutions88@gmail.com" --noinput || true
