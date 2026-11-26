import api from "./client"

export interface BroadcastItem {
    id: string
    title: string
    message: string
    notification_type: string
    target_program: string
    target_level: number | null
    target_paid_only: boolean
    action_url: string
    action_label: string
    is_active: boolean
    expires_at: string | null
    created_at: string
    status: "LIVE" | "INACTIVE" | "EXPIRED"
    audience_size: number
}

export interface FeedbackItem {
    id: string
    feedback_type: string
    subject: string
    message: string
    page_url: string
    status: string
    admin_response: string
    responded_at: string | null
    user_email: string
    user_name: string
    created_at: string
    age: string
}

export async function getAdminNotifications() {
    const { data } = await api.get("/accounts/admin/notifications-overview/")
    return data
}

export async function adminNotificationAction(payload: Record<string, any>) {
    const { data } = await api.post("/accounts/admin/notifications-action/", payload)
    return data
}

export async function getAdminFeedback(params?: { status?: string; type?: string }) {
    const { data } = await api.get("/accounts/admin/feedback-overview/", { params })
    return data
}

export async function adminFeedbackAction(payload: Record<string, any>) {
    const { data } = await api.post("/accounts/admin/feedback-action/", payload)
    return data
}