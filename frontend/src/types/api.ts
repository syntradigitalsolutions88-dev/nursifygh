/**
 * TypeScript mirrors of the backend's DRF serializers.
 *
 * These types stay in sync with the corresponding Python serializers on
 * the backend. When you change a serializer field there, change it here.
 */

export type StudentLevel = 100 | 200 | 300

export interface User {
    id: string
    email: string
    full_name: string
    phone_number: string
    level: StudentLevel
    level_display: string
    institution: string
    is_subscribed: boolean
    subscription_expires_at: string | null
    has_active_subscription: boolean
    date_joined: string
}

export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    access: string
    refresh: string
}

export interface RegisterRequest {
    email: string
    full_name: string
    phone_number: string
    level: StudentLevel
    institution: string
    password: string
    password_confirm: string
}

export interface RefreshResponse {
    access: string
}