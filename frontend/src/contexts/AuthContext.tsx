import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"

import * as authApi from "../api/auth"
import { tokenStore } from "../api/client"
import type { LoginRequest, RegisterRequest, User } from "../types/api"

interface AuthContextValue {
    user: User | null
    setUser: (user: User | null) => void
    isLoading: boolean
    login: (payload: LoginRequest) => Promise<User>
    register: (payload: RegisterRequest) => Promise<User>
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const queryClient = useQueryClient()

    const refreshUser = useCallback(async () => {
        if (!tokenStore.access) {
            setUser(null)
            return
        }
        try {
            const me = await authApi.getCurrentUser()
            setUser(me)
        } catch {
            // If token is expired or user is deleted, force logout
            tokenStore.clear()
            setUser(null)
        }
    }, [])

    // On mount: if we have a token, try to fetch the user
    useEffect(() => {
        let cancelled = false
        async function bootstrap() {
            if (!tokenStore.access) {
                setIsLoading(false)
                return
            }
            try {
                const me = await authApi.getCurrentUser()
                if (!cancelled) setUser(me)
            } catch {
                tokenStore.clear()
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        bootstrap()
        return () => {
            cancelled = true
        }
    }, [])

    // Re-fetch user data every 5 minutes so that trial expirations and
    // subscription changes take effect without needing a manual reload.
    useEffect(() => {
        if (!user) return
        const interval = setInterval(() => {
            refreshUser()
        }, 5 * 60 * 1000) // 5 minutes
        return () => clearInterval(interval)
    }, [user, refreshUser])

    const login = useCallback(
        async (payload: LoginRequest) => {
            const me = await authApi.login(payload)
            queryClient.clear()
            setUser(me)
            return me
        },
        [queryClient],
    )

    const register = useCallback(
        async (payload: RegisterRequest) => {
            const me = await authApi.register(payload)
            queryClient.clear()
            setUser(me)
            return me
        },
        [queryClient],
    )

    const logout = useCallback(() => {
        authApi.logout()
        setUser(null)
        queryClient.clear()
    }, [queryClient])

    const value = useMemo<AuthContextValue>(
        () => ({ user, setUser, isLoading, login, register, logout, refreshUser }),
        [user, isLoading, login, register, logout, refreshUser],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error("useAuth must be used inside <AuthProvider>")
    }
    return ctx
}