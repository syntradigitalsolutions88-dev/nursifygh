"""Automatically deactivate expired subscriptions."""
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User


class Command(BaseCommand):
    help = "Deactivate users whose subscription has expired."

    def handle(self, *args, **options):
        now = timezone.now()
        # Find users who are marked subscribed but their expiry date is in the past
        expired_users = User.objects.filter(
            is_subscribed=True,
            subscription_expires_at__lte=now,
        )
        
        count = expired_users.update(is_subscribed=False)
        
        if count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Deactivated {count} expired subscription(s)"))
        else:
            self.stdout.write(self.style.SUCCESS("No expired subscriptions found"))