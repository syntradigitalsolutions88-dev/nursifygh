import api from "./client"

export interface FeedbackItem {
    id: string
    feedback_type: string
    subject: string
    message: string
    page_url: string
    status: string
    admin_response: string
    responded_at: string | null
    created_at: string
}

export async function listMyFeedback(): Promise<FeedbackItem[]> {
    const { data } = await api.get<FeedbackItem[]>("/accounts/feedback/")
    return data
}

export async function submitFeedback(payload: {
    feedback_type: string
    subject: string
    message: string
    page_url: string
}): Promise<FeedbackItem> {
    const { data } = await api.post<FeedbackItem>("/accounts/feedback/", payload)
    return data
}