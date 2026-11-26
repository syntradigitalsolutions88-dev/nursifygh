import api from "./client"

export interface BroadcastNotification {
    id: string
    title: string
    message: string
    notification_type: string
    action_url: string
    action_label: string
    created_at: string
}

export interface UserNotification {
    id: string
    title: string
    message: string
    notification_type: string
    action_url: string
    action_label: string
    is_read: boolean
    created_at: string
}

export interface NotificationFeed {
    broadcasts: BroadcastNotification[]
    personal: UserNotification[]
    unread_count: number
}

export async function getNotifications(): Promise<NotificationFeed> {
    const { data } = await api.get<NotificationFeed>("/accounts/notifications/")
    return data
}

export async function markRead(id: string): Promise<void> {
    await api.post(`/accounts/notifications/${id}/read/`)
}

export async function markAllRead(): Promise<void> {
    await api.post("/accounts/notifications/read-all/")
}