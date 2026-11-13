import { useEffect } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading, refreshUser } = useAuth()
    const location = useLocation()

    // Every time the route changes, verify the user's subscription status
    useEffect(() => {
        if (user) {
            refreshUser()
        }
    }, [location.pathname])

    if (isLoading) {
        return <div className="p-10 text-center text-on-surface-muted">Loading…</div>
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />
    }

    return <>{children}</>
}