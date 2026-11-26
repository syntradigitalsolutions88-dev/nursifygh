import { useEffect, useState } from "react"
import AppShell from "../components/shell/AppShell"
import {
  getAdminNotifications,
  adminNotificationAction,
  getAdminFeedback,
  adminFeedbackAction,
  type BroadcastItem,
  type FeedbackItem,
} from "../api/admin"

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<"broadcasts" | "feedback">("broadcasts")
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([])
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // Broadcast form
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [notificationType, setNotificationType] = useState("INFO")
  const [targetProgram, setTargetProgram] = useState("ALL")
  const [targetLevel, setTargetLevel] = useState<string>("")
  const [targetPaidOnly, setTargetPaidOnly] = useState(false)
  const [actionUrl, setActionUrl] = useState("")
  const [actionLabel, setActionLabel] = useState("")

  // Feedback reply drafts
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  async function loadAll() {
    setLoading(true)
    setError("")
    try {
      const [notifRes, fbRes] = await Promise.all([
        getAdminNotifications(),
        getAdminFeedback(),
      ])
      setBroadcasts(notifRes?.broadcasts || notifRes?.results || notifRes || [])
      setFeedbackList(fbRes?.feedback || fbRes?.results || fbRes || [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load admin notifications and feedback.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleCreateBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSubmitting(true)
    setError("")
    setNotice("")
    try {
      await adminNotificationAction({
        action: "create",
        title: title.trim(),
        message: message.trim(),
        notification_type: notificationType,
        target_program: targetProgram === "ALL" ? "" : targetProgram,
        target_level: targetLevel ? Number(targetLevel) : null,
        target_paid_only: targetPaidOnly,
        action_url: actionUrl.trim(),
        action_label: actionLabel.trim(),
      })
      setTitle("")
      setMessage("")
      setActionUrl("")
      setActionLabel("")
      setNotice("Broadcast published successfully.")
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not create broadcast.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBroadcastAction(action: string, id: string) {
    setError("")
    setNotice("")
    try {
      await adminNotificationAction({ action, id, broadcast_id: id })
      setNotice(`Broadcast ${action} updated.`)
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to ${action} broadcast.`)
    }
  }

  async function handleFeedbackReply(id: string, status = "RESOLVED") {
    const admin_response = (replyDrafts[id] || "").trim()
    setError("")
    setNotice("")
    try {
      await adminFeedbackAction({
        action: "respond",
        id,
        feedback_id: id,
        status,
        admin_response,
      })
      setNotice("Feedback response saved.")
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update feedback.")
    }
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Broadcasts &amp; Student Feedback</h1>
            <p className="text-sm text-slate-600">
              Send targeted in-app announcements to RGN, RM, RPN &amp; CHN students and respond to student feedback.
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("broadcasts")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === "broadcasts" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Broadcasts ({Array.isArray(broadcasts) ? broadcasts.length : 0})
            </button>
            <button
              type="button"
              onClick={() => setTab("feedback")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === "feedback" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Student Feedback ({Array.isArray(feedbackList) ? feedbackList.length : 0})
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        {tab === "broadcasts" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleCreateBroadcast}
              className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">New Broadcast</h2>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Level 100 & 200 Mock Exams Live!"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="INFO">Info</option>
                    <option value="SUCCESS">Success / Update</option>
                    <option value="WARNING">Reminder / Alert</option>
                    <option value="PROMO">Promotion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Program</label>
                  <select
                    value={targetProgram}
                    onChange={(e) => setTargetProgram(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="ALL">All Programs</option>
                    <option value="GENERAL">RGN (General)</option>
                    <option value="MIDWIFERY">RM (Midwifery)</option>
                    <option value="PSYCHIATRIC">RPN (Psychiatric)</option>
                    <option value="COMMUNITY">CHN (Community)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Level</label>
                  <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">All Levels</option>
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 pt-5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetPaidOnly}
                    onChange={(e) => setTargetPaidOnly(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Paid subscribers only
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Action URL (optional)</label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/courses"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Button Label</label>
                  <input
                    type="text"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="Start Practising"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Publish Broadcast"}
              </button>
            </form>

            <div className="lg:col-span-2 space-y-3">
              {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
                  Loading broadcasts...
                </div>
              ) : !Array.isArray(broadcasts) || broadcasts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
                  No broadcasts created yet.
                </div>
              ) : (
                broadcasts.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === "LIVE" || item.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.status || (item.is_active ? "LIVE" : "INACTIVE")}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {item.target_program || "All Programs"} · {item.target_level ? `Level ${item.target_level}` : "All Levels"}
                        </span>
                        {typeof item.audience_size === "number" && (
                          <span className="text-xs text-slate-400">({item.audience_size} recipients)</span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-600 whitespace-pre-line">{item.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleBroadcastAction("toggle", item.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {item.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBroadcastAction("delete", item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
                Loading student feedback...
              </div>
            ) : !Array.isArray(feedbackList) || feedbackList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
                No student feedback submitted yet.
              </div>
            ) : (
              feedbackList.map((fb) => (
                <div key={fb.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mr-2">
                        {fb.feedback_type}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{fb.subject}</span>
                      <p className="text-xs text-slate-500">
                        From {fb.user_name || fb.user_email} {fb.age ? `· ${fb.age}` : ""}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {fb.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{fb.message}</p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <input
                      type="text"
                      value={replyDrafts[fb.id] ?? fb.admin_response ?? ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [fb.id]: e.target.value }))}
                      placeholder="Write admin reply..."
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleFeedbackReply(fb.id, "RESOLVED")}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Save &amp; Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
