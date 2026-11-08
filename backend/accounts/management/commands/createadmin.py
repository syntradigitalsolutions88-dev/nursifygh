from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Create or reset the admin superuser"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        email = "syntradigitalsolutions88@gmail.com"
        password = "AdminPass2026!"
        
        # Delete existing user to ensure a clean slate
        User.objects.filter(email=email).delete()
        
        # Create new superuser
        User.objects.create_superuser(
            email=email,
            password=password,
            full_name="Syntra Admin",
            level=100,
            program="GENERAL"
        )
        self.stdout.write(self.style.SUCCESS(f"Successfully created superuser: {email}"))