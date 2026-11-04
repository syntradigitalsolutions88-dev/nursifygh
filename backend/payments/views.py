"""API views for the payments app."""

from __future__ import annotations

import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PaymentProvider, PaymentStatus, PaymentTransaction
from .serializers import (
    InitiateCheckoutSerializer,
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