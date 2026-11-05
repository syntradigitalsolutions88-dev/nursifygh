import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AxiosError } from "axios"

import { useAuth } from "../contexts/AuthContext"

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: string } | null)?.from ?? "/dashboard"

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            await login({ email, password })
            navigate(from, { replace: true })
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.response?.status === 401) {
                    setError("Incorrect email or password.")
                } else if (err.response?.data?.detail) {
                    setError(String(err.response.data.detail))
                } else {
                    setError("Login failed. Please try again.")
                }
            } else {
                setError("Network error. Is the backend running?")
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="card max-w-md w-full">
                <h1 className="text-2xl font-bold text-brand-700">Welcome back</h1>
                <p className="mt-1 text-sm text-gray-500">Log in to continue studying.</p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input mt-1"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input mt-1"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={submitting} className="btn-primary w-full">
                        {submitting ? "Logging in…" : "Log in"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-brand-600 hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}