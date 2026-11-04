"""
Payments application models.

Domain map:

    PaymentTransaction  ← immutable log of a payment attempt
        ↓ (1-to-1 on successful webhook match)
    PaymentWebhookEvent ← raw webhook payloads, idempotent on (provider, event_id)

Design notes:
- `PaymentTransaction` is append-only. Its rows are never updated after
  creation, except for `status` (PENDING → SUCCESS/FAILED) and
  `provider_reference` (set once Paystack returns the ref) and
  `completed_at`. No other mutation is ever allowed.
- `reference` is the client-supplied idempotency key. Two attempts with the
  same reference are rejected at the DB level via `unique=True`.
- `PaymentWebhookEvent.event_id` is the provider's own event identifier.
  Paystack sends a UUID per webhook; Hubtel sends a timestamp + hash. We
  store it as a string to accommodate either. Idempotency is enforced by
  `UniqueConstraint(provider, event_id)`.
- Amounts are DecimalField in GHS. Paystack API calls multiply by 100 to
  send pesewas. This conversion happens in `services.py`, never in the
  models.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class PaymentProvider(models.TextChoices):
    """Supported Mobile Money / card payment providers."""

    PAYSTACK = "PAYSTACK", _("Paystack")
    HUBTEL = "HUBTEL", _("Hubtel")


class PaymentStatus(models.TextChoices):
    """Lifecycle of a payment attempt."""

    PENDING = "PENDING", _("Pending")
    SUCCESS = "SUCCESS", _("Success")
    FAILED = "FAILED", _("Failed")
    ABANDONED = "ABANDONED", _("Abandoned")


# Business-rule constants. Override in settings if pricing changes.
SEMESTER_PASS_PRICE_GHS = 30
SEMESTER_PASS_DURATION_DAYS = 120


class PaymentTransaction(models.Model):
    """
    An immutable log of a payment attempt.

    Created when the student initiates a checkout. The webhook handler
    updates only `status`, `provider_reference`, and `completed_at`.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
        db_index=True,
    )

    provider = models.CharField(
        _("provider"),
        max_length=20,
        choices=PaymentProvider.choices,
        db_index=True,
    )

    # Client-supplied idempotency key, unique across all transactions.
    reference = models.CharField(
        _("reference"),
        max_length=100,
        unique=True,
        db_index=True,
        help_text=_("Client-side idempotency key. Must be unique."),
    )

    # Provider's own reference, filled when the provider responds.
    provider_reference = models.CharField(
        _("provider reference"),
        max_length=200,
        blank=True,
        db_index=True,
    )

    amount_ghs = models.DecimalField(
        _("amount (GHS)"),
        max_digits=10,
        decimal_places=2,
        help_text=_("Amount in Ghana Cedis. Paystack API calls use ×100 pesewas."),
    )

    status = models.CharField(
        _("status"),
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )

    # Cached snapshot of the user's subscription state *before* activation,
    # for audit trail. Populated by the webhook handler when SUCCESS.
    duration_days = models.PositiveSmallIntegerField(
        _("duration (days)"),
        default=SEMESTER_PASS_DURATION_DAYS,
    )

    initiated_at = models.DateTimeField(_("initiated at"), default=timezone.now)
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)

    # Optional: provider's redirect URL for this specific charge
    authorization_url = models.URLField(
        _("authorization URL"),
        blank=True,
        help_text=_("Provider-hosted checkout URL for the student."),
    )

    class Meta:
        verbose_name = _("payment transaction")
        verbose_name_plural = _("payment transactions")
        ordering = ("-initiated_at",)
        indexes = [
            models.Index(fields=["student", "-initiated_at"], name="idx_txn_student_time"),
            models.Index(fields=["provider", "status"], name="idx_txn_provider_status"),
        ]

    def __str__(self) -> str:
        return f"{self.student.email} • {self.amount_ghs} GHS • {self.status}"

    # The only allowed mutations on a transaction:
    def mark_success(self, *, provider_reference: str = "") -> None:
        """Mark as succeeded. Called by the webhook handler after signature verification."""
        self.status = PaymentStatus.SUCCESS
        self.completed_at = timezone.now()
        if provider_reference:
            self.provider_reference = provider_reference
        self.save(update_fields=["status", "completed_at", "provider_reference"])

    def mark_failed(self, *, provider_reference: str = "") -> None:
        """Mark as failed. Called by webhook handler on charge.failed."""
        self.status = PaymentStatus.FAILED
        self.completed_at = timezone.now()
        if provider_reference:
            self.provider_reference = provider_reference
        self.save(update_fields=["status", "completed_at", "provider_reference"])


class PaymentWebhookEvent(models.Model):
    """
    An idempotency record for incoming webhooks.

    Each webhook's (provider, event_id) tuple is unique. When a duplicate
    fires — as Paystack does on retry after a timeout — we skip processing.
    The raw payload is stored for audit and replay.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    provider = models.CharField(
        _("provider"),
        max_length=20,
        choices=PaymentProvider.choices,
        db_index=True,
    )
    event_id = models.CharField(
        _("event ID"),
        max_length=200,
        db_index=True,
        help_text=_("Provider's unique event identifier (UUID or hash)."),
    )
    event_type = models.CharField(
        _("event type"),
        max_length=100,
        blank=True,
        help_text=_("e.g. 'charge.success', 'charge.failed'"),
    )

    payload = models.JSONField(_("raw payload"))

    # Link to the transaction if this event resolved one
    transaction = models.ForeignKey(
        PaymentTransaction,
        on_delete=models.PROTECT,
        related_name="webhook_events",
        null=True,
        blank=True,
    )

    received_at = models.DateTimeField(_("received at"), auto_now_add=True)
    processed = models.BooleanField(_("processed"), default=False, db_index=True)
    processing_error = models.TextField(
        _("processing error"),
        blank=True,
        help_text=_("Populated if processing failed but the event was accepted."),
    )

    class Meta:
        verbose_name = _("payment webhook event")
        verbose_name_plural = _("payment webhook events")
        ordering = ("-received_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "event_id"],
                name="uniq_webhook_provider_event",
            ),
        ]
        indexes = [
            models.Index(
                fields=["provider", "processed"],
                name="idx_webhook_provider_processed",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.provider} • {self.event_type or '(no type)'} • {self.event_id[:8]}"