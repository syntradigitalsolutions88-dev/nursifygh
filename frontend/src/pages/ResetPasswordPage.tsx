import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { AxiosError } from "axios"

import AuthLayout from "../components/shell/AuthLayout"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import { confirmPasswordReset } from "../api/auth"

export default function ResetPasswordPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const uid = params.get("uid") ?? ""
    const token = params.get("token") ?? ""

    const [password, setPassword] = useState("")
    const [passwordConfirm, setPasswordConfirm] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        if (password !== passwordConfirm) {
            setError("Passwords do not match.")
            return
        }

        setSubmitting(true)
        try {
            await confirmPasswordReset({
                uid,
                token,
                new_password: password,
            })
            navigate("/login?reset=success", { replace: true })
        } catch (err) {
            if (err instanceof AxiosError && err.response?.data?.detail) {
                setError(String(err.response.data.detail))
            } else {
                setError("Could not reset password. The link may have expired.")
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (!uid || !token) {
        return (
            <AuthLayout>
                <div className="rounded-xl border border-border bg-white p-6 sm:p-8 shadow-sm">
                    <h1 className="text-h2 text-brand-700">Invalid reset link</h1>
                    <p className="mt-2 text-body-sm text-on-surface-muted">
                        This password reset link is missing required information. Please
                        request a new one.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline"
                    >
                        Request new reset link →
                    </Link>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <div className="rounded-xl border border-border bg-white p-6 sm:p-8 shadow-sm">
                <h1 className="text-h2 text-brand-700">Choose a new password</h1>
                <p className="mt-1.5 text-body-sm text-on-surface-muted">
                    Pick a strong password you haven't used before.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-4">
                    <Input
                        label="New password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                    />
                    <Input
                        label="Confirm new password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="Repeat password"
                    />

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Button type="submit" fullWidth loading={submitting} size="lg">
                        {submitting ? "Saving…" : "Save new password"}
                    </Button>
                </form>
            </div>
        </AuthLayout>
    )
}