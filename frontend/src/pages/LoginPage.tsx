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
            <div className="rounded-xl border border-border bg-white p-6 sm:p-8 shadow-sm">
                <h1 className="text-h2 text-brand-700">Welcome back</h1>
                <p className="mt-1.5 text-body-sm text-on-surface-muted">
                    Log in to continue studying.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                    <Input
                        label="Password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                    <div className="flex justify-end -mt-2">
                        <Link
                            to="/forgot-password"
                            className="text-xs font-medium text-brand-600 hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Button type="submit" fullWidth loading={submitting} size="lg">
                        {submitting ? "Logging in…" : "Log in"}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-on-surface-muted">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="font-medium text-brand-700 hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
}