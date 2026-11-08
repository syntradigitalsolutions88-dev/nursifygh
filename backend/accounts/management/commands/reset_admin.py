from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create or reset the admin superuser password"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        email = "syntradigitalsolutions88@gmail.com"
        password = "AdminPass2026!"

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": "Syntra Admin",
                "level": 100,
                "program": "GENERAL",
            },
        )
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"✅ Created superuser: {email}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✅ Reset superuser password: {email}"))