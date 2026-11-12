import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import api from "../api/client"

export default function ExamCountdown() {
    const { user, refreshUser } = useAuth()
    const [editing, setEditing] = useState(false)
    const [dateValue, setDateValue] = useState(
        user?.exam_date ? user.exam_date.slice(0, 10) : ""
    )
    const [saving, setSaving] = useState(false)

    if (!user) return null

    async function handleSave() {
        if (!dateValue) return
        setSaving(true)
        try {
            await api.patch("/accounts/me/", { exam_date: dateValue })
            await refreshUser()
            setEditing(false)
        } catch {
            // silent
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="rounded-xl border border-border bg-white p-5 space-y-3">
                <p className="text-sm font-bold text-on-surface">Set your NMC exam date</p>
                <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving || !dateValue}
                        className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-subtle"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    if (!user.exam_date) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="w-full rounded-xl border border-dashed border-border bg-white p-5 text-left hover:border-brand-300 transition-colors"
            >
                <p className="text-sm font-bold text-on-surface">⏳ Set your NMC exam date</p>
                <p className="text-xs text-on-surface-muted mt-1">
                    See how many days you have left to prepare
                </p>
            </button>
        )
    }

    const examDate = new Date(user.exam_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysLeft = Math.ceil(
        (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    return (
        <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
            <p className="text-xs font-bold text-brand-800 uppercase tracking-wider">
                NMC Exam Countdown
            </p>
            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black text-brand-700">
                    {daysLeft > 0 ? daysLeft : 0}
                </span>
                <span className="text-sm font-medium text-brand-800">days left</span>
            </div>
            <p className="mt-2 text-xs text-on-surface-muted">
                Target:{" "}
                {examDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                })}
            </p>
            <button
                onClick={() => setEditing(true)}
                className="mt-3 text-xs font-medium text-brand-700 hover:underline"
            >
                Change date
            </button>
        </div>
    )
}
