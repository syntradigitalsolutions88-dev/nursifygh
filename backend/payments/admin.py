"""Admin configuration for the payments app."""

from django.contrib import admin

from .models import PaymentTransaction, PaymentWebhookEvent


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    """
    Read-heavy admin. Only `status`, `provider_reference`, and `completed_at`
    are ever mutated, and those go through `mark_success` / `mark_failed`.
    Admin edits should be rare and purposeful.
    """

    list_display = (
        "reference", "student", "provider", "amount_ghs", "status",
        "initiated_at", "completed_at",
    )
    list_filter = ("provider", "status")
    search_fields = ("reference", "provider_reference", "student__email")
    readonly_fields = (
        "id", "reference", "student", "provider", "amount_ghs",
        "duration_days", "initiated_at", "authorization_url",
    )
    date_hierarchy = "initiated_at"
    ordering = ("-initiated_at",)

    fieldsets = (
        ("Identity", {"fields": ("id", "reference", "student", "provider")}),
        ("Amount & duration", {"fields": ("amount_ghs", "duration_days")}),
        ("Provider info", {"fields": ("provider_reference", "authorization_url")}),
        ("Status", {"fields": ("status", "initiated_at", "completed_at")}),
    )


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    """
    Strictly read-only. Webhook events are the audit trail of what providers
    sent. Never allow editing.
    """

    list_display = (
        "event_id", "provider", "event_type", "received_at", "processed",
    )
    list_filter = ("provider", "processed", "event_type")
    search_fields = ("event_id", "transaction__reference", "student_email")
    readonly_fields = (
        "id", "provider", "event_id", "event_type", "payload",
        "transaction", "received_at", "processed", "processing_error",
    )
    date_hierarchy = "received_at"
    ordering = ("-received_at",)

    def student_email(self, obj: PaymentWebhookEvent) -> str:
        return obj.transaction.student.email if obj.transaction else "—"
    student_email.short_description = "Student"

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False