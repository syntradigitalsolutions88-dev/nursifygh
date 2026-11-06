import api from "./client"
import type {
    InitiateCheckoutRequest,
    PaymentTransaction,
} from "../types/api"

// ---------------------------------------------------------------------------
// Checkout initiation
// ---------------------------------------------------------------------------
export async function initiateCheckout(
    payload: InitiateCheckoutRequest = {},
): Promise<PaymentTransaction> {
    const { data } = await api.post<PaymentTransaction>(
        "/payments/checkout/",
        {
            provider: "PAYSTACK",
            ...payload,
        },
    )
    return data
}

// ---------------------------------------------------------------------------
// Transaction history
// ---------------------------------------------------------------------------
export async function listTransactions(): Promise<PaymentTransaction[]> {
    const { data } = await api.get<{
        count: number
        results: PaymentTransaction[]
    }>("/payments/transactions/")
    return data.results
}

// ---------------------------------------------------------------------------
// DEV MODE ONLY — simulate a successful Paystack payment
// ---------------------------------------------------------------------------
// Calls a dev-only backend endpoint that activates the subscription directly.
// Bypasses HMAC (which is fragile to compute in a browser) — the backend
// endpoint itself refuses to run when DEBUG=False.
export async function simulatePaystackWebhook(reference: string): Promise<void> {
    await api.post("/payments/dev/simulate-paystack/", { reference })
}