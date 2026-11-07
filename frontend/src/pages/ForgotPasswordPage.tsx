import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { AxiosError } from "axios"

import AuthLayout from "../components/shell/AuthLayout"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import { requestPasswordReset } from "../api/auth"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            await requestPasswordReset(email)
            setSubmitted(true)
        } catch (err) {
            if (err instanceof AxiosError && err.response?.data?.detail) {
                setError(String(err.response.data.detail))
            } else {
                setError("Could not send reset link. Please try again.")
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AuthLayout>
            <div className="rounded-xl border border-border bg-white p-6 sm:p-8 shadow-sm">
                {submitted ? (
                    <>
                        <h1 className="text-h2 text-brand-700">Check your email</h1>
                        <p className="mt-2 text-body-sm text-on-surface-muted">
                            If an account exists for <strong>{email}</strong>, we've sent a
                            password reset link. The link expires in 60 minutes.
                        </p>
                        <p className="mt-4 text-body-sm text-on-surface-muted">
                            Didn't receive the email? Check your spam folder, or{" "}
                            <button
                                onClick={() => setSubmitted(false)}
                                className="text-brand-700 hover:underline"
                            >
                                try a different email
                            </button>
                            .
                        </p>
                        <Link
                            to="/login"
                            className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline"
                        >
                            ← Back to login
                        </Link>
                    </>
                ) : (
                    <>
                        <h1 className="text-h2 text-brand-700">Forgot your password?</h1>
                        <p className="mt-1.5 text-body-sm text-on-surface-muted">
                            Enter your email and we'll send you a link to reset your password.
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

                            {error && <Alert variant="danger">{error}</Alert>}

                            <Button type="submit" fullWidth loading={submitting} size="lg">
                                {submitting ? "Sending…" : "Send reset link"}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-on-surface-muted">
                            Remembered it?{" "}
                            <Link to="/login" className="font-medium text-brand-700 hover:underline">
                                Log in
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </AuthLayout>
    )
}