"""URL configuration for the payments app."""

from django.urls import path

from .views import (
    DevSimulatePaystackPaymentView,
    HubtelWebhookView,
    InitiateCheckoutView,
    ManualPaymentInfoView,
    ManualPaymentInitiateView,
    ManualPaymentSubmitView,
    PaystackWebhookView,
    TransactionDetailView,
    TransactionListView,
)

app_name = "payments"

urlpatterns = [
    path("checkout/", InitiateCheckoutView.as_view(), name="checkout"),
    path("transactions/", TransactionListView.as_view(), name="transaction-list"),
    path(
        "transactions/<uuid:id>/",
        TransactionDetailView.as_view(),
        name="transaction-detail",
    ),
    path("webhooks/paystack/", PaystackWebhookView.as_view(), name="webhook-paystack"),
    path("webhooks/hubtel/", HubtelWebhookView.as_view(), name="webhook-hubtel"),
    path(
        "dev/simulate-paystack/",
        DevSimulatePaystackPaymentView.as_view(),
        name="dev-simulate-paystack",
    ),
    # Manual MoMo flow
    path("manual/info/", ManualPaymentInfoView.as_view(), name="manual-info"),
    path("manual/initiate/", ManualPaymentInitiateView.as_view(), name="manual-initiate"),
    path("manual/submit/", ManualPaymentSubmitView.as_view(), name="manual-submit"),
]