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

    const login = useCallback(
        async (payload: LoginRequest) => {
            const me = await authApi.login(payload)
            // Clear stale cache from a previous session before hydrating new data
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
        // Wipe all TanStack Query cache so the next user never sees the
        // previous user's courses, quiz history, care plans, or profile data.
        queryClient.clear()
    }, [queryClient])

    const refreshUser = useCallback(async () => {
        if (!tokenStore.access) {
            setUser(null)
            return
        }
        const me = await authApi.getCurrentUser()
        setUser(me)
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({ user, isLoading, login, register, logout, refreshUser }),
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