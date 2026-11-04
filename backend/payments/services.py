"""
Domain services for the payments app.

All webhook signature verification, transaction lifecycle, and
subscription-activation logic lives here. Views are thin — they parse
the request, call a service, and format the response.

Design notes:
- Signature verification uses `hmac.compare_digest` for constant-time
  comparison. Never use `==` on HMAC digests.
- Webhook processing is wrapped in `transaction.atomic` so a mid-flight
  failure cannot leave the transaction and the user out of sync.
- Idempotency is enforced at *two* levels:
  1. `PaymentWebhookEvent` unique constraint on (provider, event_id)
  2. A check inside the handler: if the transaction is already SUCCESS,
     do not re-activate the subscription.
- Paystack amounts are in pesewas (minor units). The GHS amount is
  multiplied by 100 before being sent to Paystack.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from decimal import Decimal

import requests
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import User
from .models import (
    SEMESTER_PASS_DURATION_DAYS,
    SEMESTER_PASS_PRICE_GHS,
    PaymentProvider,
    PaymentStatus,
    PaymentTransaction,
    PaymentWebhookEvent,
)

logger = logging.getLogger(__name__)

PAYSTACK_API_BASE = "https://api.paystack.co"


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------
def verify_paystack_signature(raw_body: bytes, signature_header: str) -> bool:
    """
    Verify a Paystack webhook signature.

    Paystack signs the raw JSON body with HMAC-SHA512 using the secret key
    as the HMAC key. The `x-paystack-signature` header carries the hex digest.
    """
    secret = getattr(settings, "PAYSTACK_SECRET_KEY", "") or ""
    if not secret or not signature_header:
        return False
    expected = hmac.new(
        secret.encode("utf-8"), raw_body, hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header.lower())


def verify_hubtel_signature(raw_body: bytes, signature_header: str) -> bool:
    """
    Verify a Hubtel webhook signature.

    Hubtel signs the raw body with HMAC-SHA256 using the client secret.
    """
    secret = getattr(settings, "HUBTEL_CLIENT_SECRET", "") or ""
    if not secret or not signature_header:
        return False
    expected = hmac.new(
        secret.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header.lower())


# ---------------------------------------------------------------------------
# Transaction initiation
# ---------------------------------------------------------------------------
def initiate_paystack_checkout(
    *,
    student: User,
    amount_ghs: Decimal | None = None,
    duration_days: int = SEMESTER_PASS_DURATION_DAYS,
    reference: str | None = None,
) -> PaymentTransaction:
    """
    Create a PaymentTransaction and, if configured, call Paystack to
    obtain an authorization_url.

    If `reference` is supplied and a PENDING transaction with that
    reference already exists for this student, that transaction is
    returned without creating a duplicate.
    """
    import secrets

    amount = amount_ghs if amount_ghs is not None else Decimal(SEMESTER_PASS_PRICE_GHS)
    ref = reference or f"NSGH-{student.id.hex[:8]}-{secrets.token_hex(6)}"

    # Idempotency: reuse an existing PENDING transaction with the same reference.
    existing = PaymentTransaction.objects.filter(
        reference=ref, student=student
    ).first()
    if existing:
        return existing

    txn = PaymentTransaction.objects.create(
        student=student,
        provider=PaymentProvider.PAYSTACK,
        reference=ref,
        amount_ghs=amount,
        duration_days=duration_days,
        status=PaymentStatus.PENDING,
    )

    secret = getattr(settings, "PAYSTACK_SECRET_KEY", "") or ""
    if not secret:
        # No keys configured — return the PENDING transaction with an empty
        # authorization_url. The smoke test can still exercise webhook processing.
        logger.warning(
            "Paystack secret not configured; returning transaction without auth URL."
        )
        return txn

    payload = {
        "email": student.email,
        "amount": int(amount * 100),  # pesewas
        "reference": ref,
        "currency": "GHS",
        "metadata": {
            "student_id": str(student.id),
            "duration_days": duration_days,
        },
    }

    try:
        response = requests.post(
            f"{PAYSTACK_API_BASE}/transaction/initialize",
            json=payload,
            headers={
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        data = response.json()
    except requests.RequestException as exc:
        logger.exception("Paystack initialize failed: %s", exc)
        return txn

    if data.get("status") and "data" in data:
        auth_url = data["data"].get("authorization_url", "")
        provider_ref = data["data"].get("reference", "")
        txn.authorization_url = auth_url
        txn.provider_reference = provider_ref
        txn.save(update_fields=["authorization_url", "provider_reference"])
    else:
        logger.warning("Paystack initialize error response: %s", data)

    return txn


# ---------------------------------------------------------------------------
# Webhook event recording (idempotent)
# ---------------------------------------------------------------------------
def record_webhook_event(
    *,
    provider: str,
    event_id: str,
    event_type: str,
    payload: dict,
) -> tuple[PaymentWebhookEvent, bool]:
    """
    Record a webhook event idempotently.

    Returns (event, created). If `created` is False, the event was a
    duplicate and should be skipped by the caller.
    """
    try:
        event = PaymentWebhookEvent.objects.create(
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=payload,
        )
        return event, True
    except IntegrityError:
        event = PaymentWebhookEvent.objects.get(
            provider=provider, event_id=event_id
        )
        return event, False


# ---------------------------------------------------------------------------
# Webhook processing
# ---------------------------------------------------------------------------
@transaction.atomic
def process_paystack_webhook(event: PaymentWebhookEvent) -> None:
    """
    Process a Paystack webhook event. Idempotent.

    Paystack payload shape (subset we care about):
        {
          "event": "charge.success",
          "data": {
            "reference": "...",
            "status": "success",
            "amount": 3000,   # pesewas
            ...
          }
        }
    """
    if event.processed:
        return

    payload = event.payload or {}
    event_type = payload.get("event", "")
    data = payload.get("data", {}) or {}
    reference = data.get("reference", "")

    if not reference:
        event.processing_error = "No reference in payload."
        event.save(update_fields=["processing_error"])
        return

    txn = PaymentTransaction.objects.filter(reference=reference).first()
    if not txn:
        event.processing_error = f"No transaction found for reference {reference}."
        event.save(update_fields=["processing_error"])
        return

    event.transaction = txn

    if event_type == "charge.success":
        if txn.status == PaymentStatus.SUCCESS:
            # Idempotency: already processed.
            event.processed = True
            event.save(update_fields=["transaction", "processed"])
            return

        txn.mark_success(provider_reference=data.get("reference", ""))
        txn.student.activate_subscription(
            days=txn.duration_days,
            reference=txn.reference,
        )
    elif event_type in ("charge.failed", "charge.abandoned"):
        if txn.status == PaymentStatus.PENDING:
            txn.mark_failed(provider_reference=data.get("reference", ""))

    event.processed = True
    event.save(update_fields=["transaction", "processed"])


@transaction.atomic
def process_hubtel_webhook(event: PaymentWebhookEvent) -> None:
    """
    Process a Hubtel webhook event. Idempotent.

    Hubtel payload shape (subset):
        {
          "Status": "Success",
          "Data": {
            "ClientReference": "...",
            "TransactionId": "...",
            "Amount": 30.00,
            ...
          }
        }
    """
    if event.processed:
        return

    payload = event.payload or {}
    status = (payload.get("Status") or "").lower()
    data = payload.get("Data", {}) or {}
    reference = data.get("ClientReference", "") or data.get("TransactionId", "")

    if not reference:
        event.processing_error = "No reference in payload."
        event.save(update_fields=["processing_error"])
        return

    txn = PaymentTransaction.objects.filter(reference=reference).first()
    if not txn:
        event.processing_error = f"No transaction found for reference {reference}."
        event.save(update_fields=["processing_error"])
        return

    event.transaction = txn

    if status == "success":
        if txn.status == PaymentStatus.SUCCESS:
            event.processed = True
            event.save(update_fields=["transaction", "processed"])
            return

        txn.mark_success(provider_reference=data.get("TransactionId", ""))
        txn.student.activate_subscription(
            days=txn.duration_days,
            reference=txn.reference,
        )
    elif status in ("failed", "cancelled"):
        if txn.status == PaymentStatus.PENDING:
            txn.mark_failed(provider_reference=data.get("TransactionId", ""))

    event.processed = True
    event.save(update_fields=["transaction", "processed"])