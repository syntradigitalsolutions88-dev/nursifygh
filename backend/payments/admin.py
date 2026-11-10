"""Django admin configuration for the payments app."""

import logging

from django.contrib import admin, messages
from django.utils import timezone

from .models import (
    PaymentProvider,
    PaymentStatus,
    PaymentTransaction,
    PaymentWebhookEvent,
)

logger = logging.getLogger(__name__)


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "student_email",
        "provider",
        "amount_ghs",
        "status",
        "manual_reference",
        "initiated_at",
        "completed_at",
    )
    list_filter = ("provider", "status", "initiated_at")
    search_fields = (
        "reference",
        "student__email",
        "manual_reference",
        "provider_reference",
    )
    readonly_fields = (
        "id",
        "reference",
        "provider",
        "amount_ghs",
        "duration_days",
        "initiated_at",
        "completed_at",
        "reviewed_at",
        "reviewed_by",
    )
    actions = ["approve_selected_payments", "reject_selected_payments"]

    def student_email(self, obj):
        return obj.student.email
    student_email.short_description = "Student"

    @admin.action(description="✅ Approve selected manual payments")
    def approve_selected_payments(self, request, queryset):
        from accounts.email_service import send_subscription_activated

        approved = 0
        emailed = 0

        for txn in queryset:
            if txn.provider != PaymentProvider.MANUAL:
                continue
            if txn.status == PaymentStatus.SUCCESS:
                continue

            txn.mark_success(provider_reference=txn.manual_reference or txn.reference)
            txn.reviewed_by = request.user
            txn.reviewed_at = timezone.now()
            txn.save(update_fields=["reviewed_by", "reviewed_at"])

            txn.student.activate_subscription(
                days=txn.duration_days, reference=txn.reference
            )

            # Send subscription-activated email
            try:
                txn.student.refresh_from_db()
                sent = send_subscription_activated(
                    to=txn.student.email,
                    full_name=txn.student.full_name,
                    expires_at=txn.student.subscription_expires_at,
                )
                if sent:
                    emailed += 1
            except Exception:
                logger.exception(
                    "Subscription email failed for %s", txn.student.email
                )

            approved += 1

        self.message_user(
            request,
            f"✅ Approved {approved} payment(s). "
            f"{emailed} confirmation email(s) sent.",
            messages.SUCCESS,
        )

    @admin.action(description="❌ Reject selected manual payments")
    def reject_selected_payments(self, request, queryset):
        rejected = 0
        for txn in queryset:
            if txn.status == PaymentStatus.SUCCESS:
                continue
            txn.mark_failed()
            txn.reviewed_by = request.user
            txn.reviewed_at = timezone.now()
            txn.save(update_fields=["reviewed_by", "reviewed_at"])
            rejected += 1

        self.message_user(
            request,
            f"Rejected {rejected} payment(s).",
            messages.WARNING,
        )


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_type", "event_id", "processed", "received_at")
    list_filter = ("provider", "processed", "received_at")
    search_fields = ("event_id", "event_type")
    readonly_fields = ("id", "payload", "received_at")