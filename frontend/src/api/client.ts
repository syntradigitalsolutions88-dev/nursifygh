import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"

const ACCESS_KEY = "nursify.access"
const REFRESH_KEY = "nursify.refresh"

export const tokenStore = {
    get access(): string | null {
        return localStorage.getItem(ACCESS_KEY)
    },
    get refresh(): string | null {
        return localStorage.getItem(REFRESH_KEY)
    },
    set(access: string, refresh?: string) {
        localStorage.setItem(ACCESS_KEY, access)
        if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
    },
    clear() {
        localStorage.removeItem(ACCESS_KEY)
        localStorage.removeItem(REFRESH_KEY)
    },
}

export const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
})

// ---- Request interceptor: attach current access token to every request ----
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStore.access
    if (token) {
        config.headers.set("Authorization", `Bearer ${token}`)
    }
    return config
})

// ---- Response interceptor: on 401, try to refresh once, retry original ----
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
    const refresh = tokenStore.refresh
    if (!refresh) {
        throw new Error("No refresh token available")
    }
    const resp = await axios.post<{ access: string }>(
        `${API_BASE}/accounts/token/refresh/`,
        { refresh },
        { headers: { "Content-Type": "application/json" } },
    )
    tokenStore.set(resp.data.access)
    return resp.data.access
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean
        }
        const status = error.response?.status
        const url = original?.url ?? ""

        // Don't try to refresh on login/register/refresh endpoints
        const isAuthEndpoint =
            url.includes("/accounts/login/") ||
            url.includes("/accounts/register/") ||
            url.includes("/accounts/token/refresh/")

        if (status === 401 && !original._retry && !isAuthEndpoint) {
            original._retry = true
            try {
                // Coalesce concurrent refresh attempts into one call
                if (!refreshPromise) {
                    refreshPromise = refreshAccessToken().finally(() => {
                        refreshPromise = null
                    })
                }
                const newAccess = await refreshPromise
                original.headers.set("Authorization", `Bearer ${newAccess}`)
                return api(original)
            } catch (refreshError) {
                tokenStore.clear()
                // Let the app decide what to do (ProtectedRoute will redirect)
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    },
)

export default api