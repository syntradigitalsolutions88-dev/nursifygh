import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"

import * as authApi from "../api/auth"
import { tokenStore } from "../api/client"
import type {
    LoginRequest,
    RegisterRequest,
    User,
} from "../types/api"

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

    const login = useCallback(async (payload: LoginRequest) => {
        const me = await authApi.login(payload)
        setUser(me)
        return me
    }, [])

    const register = useCallback(async (payload: RegisterRequest) => {
        const me = await authApi.register(payload)
        setUser(me)
        return me
    }, [])

    const logout = useCallback(() => {
        authApi.logout()
        setUser(null)
    }, [])

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