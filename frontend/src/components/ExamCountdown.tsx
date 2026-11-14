import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { api } from "../api/client"

export default function ExamCountdown() {
    const { user, setUser } = useAuth()
    const [examDate, setExamDate] = useState(user?.exam_date || "")
    const [isEditing, setIsEditing] = useState(!user?.exam_date)
    const [saving, setSaving] = useState(false)

    // Calculate days left
    const daysLeft = examDate
        ? Math.ceil((new Date(examDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        : null

    const handleSave = async () => {
        if (!examDate) return
        setSaving(true)
        try {
            // PATCH request to update the user's profile
            const res = await api.patch("/accounts/me/", { exam_date: examDate })
            // Update local auth context so it persists across page refreshes
            if (setUser) setUser(res.data)
            setIsEditing(false)
        } catch (err) {
            console.error("Failed to save exam date", err)
            alert("Failed to save date. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    if (isEditing) {
        return (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📅</span>
                    <p className="text-sm font-bold text-brand-900">Set Exam Date</p>
                </div>
                <p className="text-xs text-brand-800 mb-3">Track your days to the N&MC exam.</p>
                <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-lg border border-brand-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                    onClick={handleSave}
                    disabled={saving || !examDate}
                    className="mt-2 w-full rounded-lg bg-brand-700 py-2 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Date"}
                </button>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-border bg-gradient-to-br from-brand-800 to-brand-900 p-5 shadow-sm flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
            <div className="relative z-10">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-brand-100">Exam Countdown</p>
                    <button onClick={() => setIsEditing(true)} className="text-xs text-brand-200 hover:text-white underline">
                        Edit
                    </button>
                </div>

                <div className="mt-2 flex items-end gap-1">
                    <p className="text-4xl font-black">{daysLeft !== null && daysLeft > 0 ? daysLeft : 0}</p>
                    <p className="text-sm font-medium text-brand-200 mb-1.5">Days Left</p>
                </div>

                <p className="text-xs text-brand-200 mt-2">
                    Target: {new Date(examDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
            </div>
        </div>
    )
}