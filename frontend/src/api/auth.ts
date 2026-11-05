import api, { tokenStore } from "./client"
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    User,
} from "../types/api"

export async function login(payload: LoginRequest): Promise<User> {
    const { data } = await api.post<LoginResponse>("/accounts/login/", payload)
    tokenStore.set(data.access, data.refresh)
    return getCurrentUser()
}

export async function register(payload: RegisterRequest): Promise<User> {
    await api.post("/accounts/register/", payload)
    // After registering, automatically log the user in
    return login({ email: payload.email, password: payload.password })
}

export async function getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>("/accounts/me/")
    return data
}

export function logout(): void {
    tokenStore.clear()
}