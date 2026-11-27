import { useEffect, useState } from "react"
import AppShell from "../components/shell/AppShell"
import api from "../api/client"
import {
  getAdminNotifications,
  adminNotificationAction,
  getAdminFeedback,
  adminFeedbackAction,
  type BroadcastItem,
  type FeedbackItem,
} from "../api/admin"

interface BroadcastTemplate {
  id: string
  category: string
  title: string
  message: string
  action_url: string
  action_label: string
  notification_type: string
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<"broadcasts" | "feedback">("broadcasts")
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([])
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [notificationType, setNotificationType] = useState("INFO")
  const [targetProgram, setTargetProgram] = useState("")
  const [targetLevel, setTargetLevel] = useState<string>("")
  const [targetPaidOnly, setTargetPaidOnly] = useState(false)
  const [actionUrl, setActionUrl] = useState("")
  const [actionLabel, setActionLabel] = useState("")
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  async function loadAll() {
    setLoading(true)
    setError("")
    try {
      const [notifRes, fbRes, tplRes] = await Promise.all([
        getAdminNotifications(),
        getAdminFeedback(),
        api.get("/accounts/admin/broadcast-templates/").catch(() => ({ data: { templates: [] } })),
      ])
      setBroadcasts(notifRes?.broadcasts || notifRes?.results || [])
      setFeedbackList(fbRes?.feedback || fbRes?.results || [])
      setTemplates(tplRes?.data?.templates || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.detail || "Failed to load data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  function applyTemplate(tpl: BroadcastTemplate) {
    setTitle(tpl.title)
    setMessage(tpl.message)
    setNotificationType(tpl.notification_type || "INFO")
    setActionUrl(tpl.action_url || "")
    setActionLabel(tpl.action_label || "")
    setNotice(`Loaded template: ${tpl.category}`)
  }

  async function handleGenerateAi() {
    if (aiTopic.trim().length < 5) {
      setError("Describe the topic in at least 5 characters.")
      return
    }
    setGeneratingAi(true)
    setError("")
    try {
      const { data } = await api.post("/accounts/admin/generate-broadcast/", { topic: aiTopic.trim() })
      if (data?.title) setTitle(data.title)
      if (data?.message) setMessage(data.message)
      if (data?.suggested_type) setNotificationType(data.suggested_type)
      if (typeof data?.suggested_action_url === "string") setActionUrl(data.suggested_action_url)
      if (typeof data?.suggested_action_label === "string") setActionLabel(data.suggested_action_label)
      setNotice("AI draft generated.")
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not generate AI broadcast.")
    } finally {
      setGeneratingAi(false)
    }
  }

  async function handleCreateBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSubmitting(true)
    setError("")
    setNotice("")
    try {
      await adminNotificationAction({
        action: "create_broadcast",
        title: title.trim(),
        message: message.trim(),
        notification_type: notificationType,
        target_program: targetProgram,
        target_level: targetLevel ? Number(targetLevel) : null,
        target_paid_only: targetPaidOnly,
        action_url: actionUrl.trim() && !actionUrl.trim().startsWith("/") && !actionUrl.trim().startsWith("http") ? `/${actionUrl.trim()}` : actionUrl.trim(),
        action_label: actionLabel.trim(),
      })
      setTitle("")
      setMessage("")
      setActionUrl("")
      setActionLabel("")
      setNotice("Broadcast published successfully!")
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.detail || "Could not create broadcast.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBroadcastAction(action: "toggle_broadcast" | "delete_broadcast", broadcastId: string) {
    setError("")
    setNotice("")
    try {
      await adminNotificationAction({ action, broadcast_id: broadcastId })
      setNotice("Broadcast updated.")
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update broadcast.")
    }
  }

  async function handleFeedbackReply(feedbackId: string) {
    const response = (replyDrafts[feedbackId] || "").trim()
    if (!response) return
    setError("")
    setNotice("")
    try {
      await adminFeedbackAction({ action: "reply", feedback_id: feedbackId, response })
      setNotice("Reply sent and student notified!")
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to send reply.")
    }
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Broadcasts &amp; Student Feedback</h1>
            <p className="text-sm text-slate-600">Send targeted announcements and reply to student feedback.</p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setTab("broadcasts")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "broadcasts" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}>
              Broadcasts ({broadcasts.length})
            </button>
            <button type="button" onClick={() => setTab("feedback")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "feedback" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}>
              Student Feedback ({feedbackList.length})
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        {tab === "broadcasts" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 space-y-2.5">
                <p className="text-xs font-bold uppercase text-emerald-800">AI Broadcast Writer</p>
                <div className="flex gap-2">
                  <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Topic hint..." className="flex-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs" />
                  <button type="button" disabled={generatingAi} onClick={handleGenerateAi} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">
                    {generatingAi ? "..." : "Draft"}
                  </button>
                </div>
                {templates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {templates.map((tpl) => (
                      <button key={tpl.id} type="button" onClick={() => applyTemplate(tpl)} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                        {tpl.category}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleCreateBroadcast} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">New Broadcast</h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
                  <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                    <select value={notificationType} onChange={(e) => setNotificationType(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      <option value="INFO">Info</option>
                      <option value="SUCCESS">Success</option>
                      <option value="WARNING">Warning</option>
                      <option value="FEATURE">Feature</option>
                      <option value="EXAM">Exam</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Program</label>
                    <select value={targetProgram} onChange={(e) => setTargetProgram(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      <option value="">All Programs</option>
                      <option value="GENERAL">RGN</option>
                      <option value="MIDWIFERY">RM</option>
                      <option value="PSYCHIATRIC">RPN</option>
                      <option value="COMMUNITY">CHN</option>
                      <option value="NAC">NAC</option>
                      <option value="NAP">NAP</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Level</label>
                    <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      <option value="">All Levels</option>
                      <option value="100">Level 100</option>
                      <option value="200">Level 200</option>
                      <option value="300">Level 300</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-5 text-xs font-medium text-slate-700">
                    <input type="checkbox" checked={targetPaidOnly} onChange={(e) => setTargetPaidOnly(e.target.checked)} />
                    Paid only
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Action URL</label>
                    <input type="text" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="/courses" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Button Label</label>
                    <input type="text" value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} placeholder="Practice Now" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                  {submitting ? "Sending..." : "Publish Broadcast"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading...</div>
              ) : broadcasts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">No broadcasts yet.</div>
              ) : (
                broadcasts.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${item.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          {item.status || (item.is_active ? "LIVE" : "INACTIVE")}
                        </span>
                        <span className="text-slate-500">{item.target_program || "All Programs"} · {item.target_level ? `Level ${item.target_level}` : "All Levels"}</span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-600 whitespace-pre-line">{item.message}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => handleBroadcastAction("toggle_broadcast", item.id)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium">
                        {item.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" onClick={() => handleBroadcastAction("delete_broadcast", item.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600">
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
            {feedbackList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">No student feedback yet.</div>
            ) : (
              feedbackList.map((fb) => (
                <div key={fb.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-700 mr-2">{fb.feedback_type}</span>
                      <span className="text-sm font-semibold text-slate-900">{fb.subject}</span>
                      <p className="text-xs text-slate-500">From {fb.user_name || fb.user_email}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100">{fb.status}</span>
                  </div>
                  <p className="text-sm text-slate-700">{fb.message}</p>
                  <div className="flex gap-2">
                    <input type="text" value={replyDrafts[fb.id] ?? fb.admin_response ?? ""} onChange={(e) => setReplyDrafts((p) => ({ ...p, [fb.id]: e.target.value }))} placeholder="Write admin reply..." className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <button type="button" onClick={() => handleFeedbackReply(fb.id)} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
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
