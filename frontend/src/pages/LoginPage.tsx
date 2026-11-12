import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AxiosError } from "axios"

import AuthLayout from "../components/shell/AuthLayout"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import { useAuth } from "../contexts/AuthContext"

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: string } | null)?.from ?? "/dashboard"

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
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
        <AuthLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">Welcome back</h1>
                <p className="mt-2 text-sm text-on-surface-muted">
                    Log in to your account to continue studying.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
                <Input
                    label="Email address"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                />

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-on-surface">
                            Password
                        </label>
                        <Link
                            to="/forgot-password"
                            className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showPassword ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Button type="submit" fullWidth loading={submitting} size="lg" className="mt-2">
                    {submitting ? "Logging in…" : "Log in to dashboard"}
                </Button>
            </form>

            <div className="mt-8 text-center text-sm text-on-surface-muted">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                    Create one for free
                </Link>
            </div>
        </AuthLayout>
    )
}