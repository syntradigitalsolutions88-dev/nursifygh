"""Send 7-day expiry reminder emails to students whose pass expires soon."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.email_service import send_subscription_expiring
from accounts.models import User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Send reminder emails to students whose subscription expires in 7 days."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Days before expiry to send reminder (default: 7)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would happen without actually sending emails.",
        )

    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]

        now = timezone.now()
        # Use calendar-day boundaries, not exact timestamps
        target_start = (now + timedelta(days=days)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        target_end = target_start + timedelta(days=1)

        users = User.objects.filter(
            is_subscribed=True,
            subscription_expires_at__gte=target_start,
            subscription_expires_at__lt=target_end,
        )

        total = users.count()
        self.stdout.write(
            self.style.WARNING(
                f"Window: {target_start.date()} → {target_end.date()}"
            )
        )
        self.stdout.write(
            self.style.WARNING(f"Found {total} user(s) expiring on that day.")
        )

        if dry_run:
            self.stdout.write(self.style.NOTICE("DRY RUN — no emails will be sent."))

        sent = 0
        failed = 0

        for user in users:
            expiry = user.subscription_expires_at
            expiry_str = expiry.strftime("%Y-%m-%d %H:%M") if expiry else "—"
            self.stdout.write(f"  → {user.email} (expires {expiry_str})")

            if dry_run:
                continue

            try:
                ok = send_subscription_expiring(
                    to=user.email,
                    full_name=user.full_name,
                    expires_at=expiry,
                )
                if ok:
                    sent += 1
                else:
                    failed += 1
            except Exception:
                logger.exception("Failed to send expiry reminder to %s", user.email)
                failed += 1

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Sent {sent} reminder(s). Failed: {failed}."
                )
            )
