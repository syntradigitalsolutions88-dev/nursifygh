import api from "./client"

export interface ManualPaymentInfo {
    momo_number: string
    momo_name: string
    amount_ghs: string
    duration_days: number
    pending: null | {
        id: string
        reference: string
        manual_reference: string
        manual_note: string
        amount_ghs: string
        submitted_at: string
    }
}

export interface ManualPaymentTransaction {
    id: string
    reference: string
    amount_ghs: string
    status: string
}

export async function getManualPaymentInfo(): Promise<ManualPaymentInfo> {
    const { data } = await api.get<ManualPaymentInfo>("/payments/manual/info/")
    return data
}

export async function initiateManualPayment(): Promise<ManualPaymentTransaction> {
    const { data } = await api.post<ManualPaymentTransaction>(
        "/payments/manual/initiate/"
    )
    return data
}

export async function submitManualPayment(payload: {
    reference: string
    manual_reference: string
    manual_note?: string
}): Promise<{ detail: string; transaction: ManualPaymentTransaction }> {
    const { data } = await api.post("/payments/manual/submit/", payload)
    return data
}