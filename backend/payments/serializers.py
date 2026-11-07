"""Serializers for the payments app."""

from __future__ import annotations

from rest_framework import serializers

from .models import PaymentTransaction, PaymentProvider, PaymentStatus


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Read-only transaction record for the student's own history."""

    provider_display = serializers.CharField(
        source="get_provider_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = PaymentTransaction
        fields = (
            "id", "provider", "provider_display",
            "reference", "provider_reference",
            "amount_ghs", "status", "status_display",
            "duration_days", "authorization_url",
            "initiated_at", "completed_at",
        )
        read_only_fields = fields


class InitiateCheckoutSerializer(serializers.Serializer):
    """Payload for POST /api/payments/checkout/."""

    provider = serializers.ChoiceField(
        choices=PaymentProvider.choices,
        default=PaymentProvider.PAYSTACK,
    )
    amount_ghs = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False,
        help_text="Optional. Defaults to the standard semester pass price.",
    )
    duration_days = serializers.IntegerField(
        min_value=1, max_value=365, required=False,
        help_text="Optional. Defaults to 120 days (one semester).",
    )
    # Optional client-supplied idempotency key. If omitted, the backend
    # generates one. If supplied and already used, the existing transaction
    # is returned (no double-charge).
    reference = serializers.CharField(
        max_length=100, required=False, allow_blank=True,
    )
    # ---------------------------------------------------------------------------
# Manual payment flow
# ---------------------------------------------------------------------------
class ManualPaymentSubmitSerializer(serializers.Serializer):
    """
    POST body for submitting a manual MoMo payment.
    Body: {"reference": "NSGH-xxx", "manual_reference": "MP2401A12345", "manual_note": "Optional"}
    """

    reference = serializers.CharField(max_length=100)
    manual_reference = serializers.CharField(
        max_length=100,
        help_text="The transaction ID from your MoMo SMS.",
    )
    manual_note = serializers.CharField(
        required=False, allow_blank=True, max_length=500
    )