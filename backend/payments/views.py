"""API views for the payments app."""

from __future__ import annotations

import logging
import uuid as _uuid

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PaymentProvider, PaymentStatus, PaymentTransaction
from .serializers import (
    InitiateCheckoutSerializer,
    ManualPaymentSubmitSerializer,
    PaymentTransactionSerializer,
)
from .services import (
    initiate_paystack_checkout,
    process_hubtel_webhook,
    process_paystack_webhook,
    record_webhook_event,
    verify_hubtel_signature,
    verify_paystack_signature,
)

logger = logging.getLogger(__name__)

# Manual MoMo configuration — change here if it ever moves
MANUAL_MOMO_NUMBER = "0556025785"
MANUAL_MOMO_NAME = "ABRAHAM DIVINE DIAME"
MANUAL_PRICE_GHS = 30

# Where to send payment notifications
ADMIN_NOTIFICATION_EMAIL = "syntradigitalsolutions88@gmail.com"


def notify_admin_new_payment(txn, manual_reference: str, manual_note: str = "") -> None:
    """
    Send an email to the admin when a student submits a manual payment.
    Never raises — a failed email must NOT fail the API request.
    """
    try:
        admin_url = f"{settings.FRONTEND_ORIGIN.replace(':5173', ':8000')}/admin/payments/paymenttransaction/"

        subject = f"🔔 New payment: GHS {txn.amount_ghs} from {txn.student.full_name}"
        body = (
            f"NEW MANUAL PAYMENT SUBMITTED\n"
            f"{'=' * 50}\n\n"
            f"Student:       {txn.student.full_name}\n"
            f"Email:         {txn.student.email}\n"
            f"Amount:        GHS {txn.amount_ghs}\n"
            f"MoMo Ref:      {manual_reference}\n"
            f"System Ref:    {txn.reference}\n"
            f"Note:          {manual_note or '(none)'}\n\n"
            f"{'=' * 50}\n\n"
            f"ACTION REQUIRED:\n"
            f"1. Check your MoMo app for GHS {txn.amount_ghs} from {txn.student.full_name}\n"
            f"2. If the payment arrived, approve here:\n"
            f"   {admin_url}\n\n"
            f"Only approve AFTER you've confirmed the money landed in your MoMo.\n"
        )

        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ADMIN_NOTIFICATION_EMAIL],
            fail_silently=False,
        )

        logger.info("Admin notification email sent to %s", ADMIN_NOTIFICATION_EMAIL)

    except Exception as exc:
        # Log but don't fail the request
        logger.error("Failed to send admin notification email: %s", exc)


class InitiateCheckoutView(APIView):
    """
    POST /api/payments/checkout/
    Initiate a mobile-money checkout. Requires authentication but NOT an
    active subscription (unsubscribed students must be able to pay).
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = InitiateCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data["provider"]
        amount = serializer.validated_data.get("amount_ghs")
        duration = serializer.validated_data.get("duration_days")
        reference = serializer.validated_data.get("reference") or None

        if provider != PaymentProvider.PAYSTACK:
            return Response(
                {"detail": f"Provider {provider} is not yet supported for checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        txn = initiate_paystack_checkout(
            student=request.user,
            amount_ghs=amount,
            duration_days=duration or 120,
            reference=reference,
        )
        return Response(
            PaymentTransactionSerializer(txn).data,
            status=status.HTTP_201_CREATED,
        )


class TransactionListView(generics.ListAPIView):
    """
    GET /api/payments/transactions/
    Lists the authenticated student's payment history.
    """

    serializer_class = PaymentTransactionSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return PaymentTransaction.objects.filter(
            student=self.request.user
        ).order_by("-initiated_at")


class TransactionDetailView(generics.RetrieveAPIView):
    """GET /api/payments/transactions/<uuid>/"""

    serializer_class = PaymentTransactionSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = "id"

    def get_queryset(self):
        return PaymentTransaction.objects.filter(student=self.request.user)


class PaystackWebhookView(APIView):
    """
    POST /api/payments/webhooks/paystack/
    Unauthenticated. Signature verified via x-paystack-signature header.
    """

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request, *args, **kwargs):
        signature = request.headers.get("x-paystack-signature", "").lower()
        raw_body = request.body

        if not verify_paystack_signature(raw_body, signature):
            logger.warning("Paystack webhook rejected: bad signature.")
            return Response(
                {"detail": "Invalid signature."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        payload = request.data
        event_id = (
            payload.get("data", {}).get("id")
            or payload.get("id")
            or request.headers.get("x-paystack-webhook-id")
            or f"paystack-{payload.get('event', 'unknown')}-{id(payload)}"
        )
        event_id = str(event_id)
        event_type = payload.get("event", "")

        event, created = record_webhook_event(
            provider=PaymentProvider.PAYSTACK,
            event_id=event_id,
            event_type=event_type,
            payload=payload,
        )
        if not created:
            logger.info("Duplicate Paystack webhook: %s — skipping.", event_id)
            return Response({"detail": "duplicate", "idempotent": True})

        try:
            process_paystack_webhook(event)
        except Exception as exc:
            logger.exception("Paystack webhook processing failed: %s", exc)
            event.processing_error = str(exc)
            event.save(update_fields=["processing_error"])
            return Response(
                {"detail": "processing_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"detail": "processed"})


class HubtelWebhookView(APIView):
    """
    POST /api/payments/webhooks/hubtel/
    Unauthenticated. Signature verified via x-hubtel-signature header.
    """

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request, *args, **kwargs):
        signature = request.headers.get("x-hubtel-signature", "").lower()
        raw_body = request.body

        if not verify_hubtel_signature(raw_body, signature):
            logger.warning("Hubtel webhook rejected: bad signature.")
            return Response(
                {"detail": "Invalid signature."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        payload = request.data
        data = payload.get("Data", {}) or {}
        event_id = (
            data.get("TransactionId")
            or payload.get("TransactionId")
            or f"hubtel-{data.get('ClientReference', 'unknown')}"
        )
        event_id = str(event_id)
        event_type = payload.get("Status", "") or "hubtel.event"

        event, created = record_webhook_event(
            provider=PaymentProvider.HUBTEL,
            event_id=event_id,
            event_type=event_type,
            payload=payload,
        )
        if not created:
            logger.info("Duplicate Hubtel webhook: %s — skipping.", event_id)
            return Response({"detail": "duplicate", "idempotent": True})

        try:
            process_hubtel_webhook(event)
        except Exception as exc:
            logger.exception("Hubtel webhook processing failed: %s", exc)
            event.processing_error = str(exc)
            event.save(update_fields=["processing_error"])
            return Response(
                {"detail": "processing_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"detail": "processed"})


class DevSimulatePaystackPaymentView(APIView):
    """
    POST /api/payments/dev/simulate-paystack/
    DEV MODE ONLY. Requires DEBUG=True to be enabled.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        if not settings.DEBUG:
            return Response(
                {"detail": "Dev-only endpoint is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reference = request.data.get("reference")
        if not reference:
            return Response(
                {"detail": "reference is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        txn = PaymentTransaction.objects.filter(
            reference=reference, student=request.user
        ).first()
        if not txn:
            return Response(
                {"detail": "Transaction not found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if txn.status == PaymentStatus.SUCCESS:
            return Response(
                {"detail": "Transaction already marked SUCCESS."},
                status=status.HTTP_200_OK,
            )

        txn.mark_success(provider_reference=reference)
        txn.student.activate_subscription(
            days=txn.duration_days, reference=txn.reference
        )

        record_webhook_event(
            provider=PaymentProvider.PAYSTACK,
            event_id=f"dev_sim_{reference}_{int(timezone.now().timestamp())}",
            event_type="charge.success",
            payload={
                "event": "charge.success",
                "data": {"reference": reference, "status": "success", "amount": 3000},
                "_dev_simulated": True,
            },
        )

        return Response({"detail": "processed (dev simulation)"})


# ---------------------------------------------------------------------------
# MANUAL MOBILE MONEY FLOW
# ---------------------------------------------------------------------------
class ManualPaymentInfoView(APIView):
    """
    GET /api/payments/manual/info/
    Returns the manual MoMo instructions + the current pending transaction.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        pending = (
            PaymentTransaction.objects.filter(
                student=request.user,
                provider=PaymentProvider.MANUAL,
                status=PaymentStatus.AWAITING_REVIEW,
            )
            .order_by("-initiated_at")
            .first()
        )

        pending_data = None
        if pending:
            pending_data = {
                "id": str(pending.id),
                "reference": pending.reference,
                "manual_reference": pending.manual_reference,
                "manual_note": pending.manual_note,
                "amount_ghs": str(pending.amount_ghs),
                "submitted_at": pending.initiated_at.isoformat(),
            }

        return Response({
            "momo_number": MANUAL_MOMO_NUMBER,
            "momo_name": MANUAL_MOMO_NAME,
            "amount_ghs": str(MANUAL_PRICE_GHS),
            "duration_days": 120,
            "pending": pending_data,
        })


class ManualPaymentInitiateView(APIView):
    """
    POST /api/payments/manual/initiate/
    Creates a PENDING transaction for the manual flow.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        existing = PaymentTransaction.objects.filter(
            student=request.user,
            provider=PaymentProvider.MANUAL,
            status__in=[PaymentStatus.PENDING, PaymentStatus.AWAITING_REVIEW],
        ).first()

        if existing:
            return Response(PaymentTransactionSerializer(existing).data)

        ref = f"NSGH-MAN-{_uuid.uuid4().hex[:10].upper()}"
        txn = PaymentTransaction.objects.create(
            student=request.user,
            provider=PaymentProvider.MANUAL,
            reference=ref,
            amount_ghs=MANUAL_PRICE_GHS,
            duration_days=120,
            status=PaymentStatus.PENDING,
        )
        return Response(
            PaymentTransactionSerializer(txn).data,
            status=status.HTTP_201_CREATED,
        )


class ManualPaymentSubmitView(APIView):
    """
    POST /api/payments/manual/submit/
    Student submits their MoMo transaction reference after sending the money.
    Triggers an email notification to the admin.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = ManualPaymentSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reference = serializer.validated_data["reference"]
        manual_reference = serializer.validated_data["manual_reference"]
        manual_note = serializer.validated_data.get("manual_note", "")

        txn = PaymentTransaction.objects.filter(
            reference=reference, student=request.user
        ).first()
        if not txn:
            return Response(
                {"detail": "Transaction not found. Please refresh and try again."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if txn.status == PaymentStatus.SUCCESS:
            return Response(
                {"detail": "This payment is already approved."},
                status=status.HTTP_200_OK,
            )

        if txn.status == PaymentStatus.AWAITING_REVIEW:
            return Response(
                {"detail": "This payment is already awaiting review."},
                status=status.HTTP_200_OK,
            )

        txn.mark_awaiting_review(
            manual_reference=manual_reference, manual_note=manual_note
        )

        # Log to console
        logger.info("=" * 60)
        logger.info("🔔 NEW MANUAL PAYMENT SUBMITTED")
        logger.info("  Student:    %s", request.user.email)
        logger.info("  Name:       %s", request.user.full_name)
        logger.info("  Amount:     GHS %s", txn.amount_ghs)
        logger.info("  MoMo Ref:   %s", manual_reference)
        logger.info("  System Ref: %s", txn.reference)
        logger.info("  → Approve at /admin/payments/paymenttransaction/")
        logger.info("=" * 60)

        # Send email notification to admin
        notify_admin_new_payment(txn, manual_reference, manual_note)

        return Response({
            "detail": "Payment submitted. We'll verify and activate your subscription within 24 hours.",
            "transaction": PaymentTransactionSerializer(txn).data,
        })