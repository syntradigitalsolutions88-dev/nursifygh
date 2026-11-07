import { useState, type FormEvent } from "react"
import { AxiosError } from "axios"

import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Avatar from "../components/ui/Avatar"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import api from "../api/client"

export default function ProfilePage() {
    const { user } = useAuth()
    if (!user) return null

    return (
        <AppShell>
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-h1">Profile</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Your account and subscription details.
                    </p>
                </div>

                {/* Account info card */}
                <div className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-center gap-4">
                        <Avatar name={user.full_name} size="lg" />
                        <div className="min-w-0">
                            <h2 className="text-h3 truncate">{user.full_name}</h2>
                            <p className="text-body-sm text-on-surface-muted truncate">{user.email}</p>
                        </div>
                    </div>

                    <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-body-sm">
                        <div>
                            <dt className="text-caption">Level</dt>
                            <dd className="mt-1 font-medium text-on-surface">{user.level_display}</dd>
                        </div>
                        <div>
                            <dt className="text-caption">Program</dt>
                            <dd className="mt-1 font-medium text-on-surface">{user.program_display}</dd>
                        </div>
                        <div>
                            <dt className="text-caption">Institution</dt>
                            <dd className="mt-1 font-medium text-on-surface">
                                {user.institution || "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-caption">Phone</dt>
                            <dd className="mt-1 font-medium text-on-surface">
                                {user.phone_number || "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-caption">Member since</dt>
                            <dd className="mt-1 font-medium text-on-surface">
                                {new Date(user.date_joined).toLocaleDateString()}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Subscription card */}
                <div className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-h4">Subscription</h2>
                            <p className="mt-1 text-body-sm text-on-surface-muted">
                                {user.has_active_subscription
                                    ? "Your semester pass is active."
                                    : "Subscribe for full access to all courses and care plans."}
                            </p>
                        </div>
                        {user.has_active_subscription ? (
                            <Badge variant="success">Active</Badge>
                        ) : (
                            <Badge variant="danger">Not subscribed</Badge>
                        )}
                    </div>

                    {user.has_active_subscription && user.subscription_expires_at && (
                        <p className="mt-4 text-body-sm text-on-surface">
                            Expires{" "}
                            <span className="font-medium">
                                {new Date(user.subscription_expires_at).toLocaleDateString()}
                            </span>
                        </p>
                    )}
                </div>

                {/* Change password card */}
                <ChangePasswordCard />
            </div>
        </AppShell>
    )
}

function ChangePasswordCard() {
    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [confirm, setConfirm] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        if (next !== confirm) {
            setError("New passwords do not match.")
            return
        }

        setSubmitting(true)
        try {
            await api.post("/accounts/password/change/", {
                current_password: current,
                new_password: next,
            })
            setSuccess(true)
            setCurrent("")
            setNext("")
            setConfirm("")
        } catch (err) {
            if (err instanceof AxiosError && err.response?.data) {
                const data = err.response.data as Record<string, unknown>
                // DRF returns either {detail: ...} or {field: [errors]}
                if (typeof data.detail === "string") {
                    setError(data.detail)
                } else if (Array.isArray(data.current_password)) {
                    setError(String(data.current_password[0]))
                } else if (Array.isArray(data.new_password)) {
                    setError(String(data.new_password[0]))
                } else {
                    setError("Could not update password. Please try again.")
                }
            } else {
                setError("Network error. Please try again.")
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="text-h4">Change password</h2>
            <p className="mt-1 text-body-sm text-on-surface-muted">
                Enter your current password and choose a new one.
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
                <Input
                    label="Current password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder="Your current password"
                />
                <Input
                    label="New password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    placeholder="At least 8 characters"
                />
                <Input
                    label="Confirm new password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                />

                {error && <Alert variant="danger">{error}</Alert>}
                {success && (
                    <Alert variant="success">Password changed successfully.</Alert>
                )}

                <Button type="submit" loading={submitting}>
                    {submitting ? "Updating…" : "Update password"}
                </Button>
            </form>
        </div>
    )
}