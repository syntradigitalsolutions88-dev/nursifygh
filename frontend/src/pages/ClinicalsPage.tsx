import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"
import { useAuth } from "../contexts/AuthContext"

interface ClinicalSkill {
    id: number
    procedure_name: string
    category: string
    completed_count: number
    required_count: number
}

interface ClinicalLog {
    id: number
    date_performed: string
    hospital: string
    ward: string
    supervisor_name: string
    notes: string
    created_at: string
}

const EMPTY_FORM = {
    date_performed: new Date().toISOString().slice(0, 10),
    hospital: "",
    ward: "",
    supervisor_name: "",
    notes: "",
}

export default function ClinicalsPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [addSkill, setAddSkill] = useState<ClinicalSkill | null>(null)
    const [editLog, setEditLog] = useState<{ log: ClinicalLog; skill: ClinicalSkill } | null>(null)
    const [historySkill, setHistorySkill] = useState<ClinicalSkill | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<{ log: ClinicalLog; skill: ClinicalSkill } | null>(null)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [downloading, setDownloading] = useState(false)
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    const { data: skills, isLoading } = useQuery({
        queryKey: ["clinical-skills"],
        queryFn: async () => {
            const res = await api.get("/accounts/clinical-skills/")
            return res.data as ClinicalSkill[]
        },
    })

    const { data: historyLogs } = useQuery({
        queryKey: ["clinical-logs", historySkill?.id],
        queryFn: async () => {
            if (!historySkill) return []
            const res = await api.get(`/accounts/clinical-skills/${historySkill.id}/logs/`)
            return res.data as ClinicalLog[]
        },
        enabled: !!historySkill,
    })

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["clinical-skills"] })
        queryClient.invalidateQueries({ queryKey: ["clinical-logs"] })
    }

    const createLog = useMutation({
        mutationFn: async (payload: { skill_id: number; data: typeof form }) => {
            await api.post("/accounts/clinical-skills/", {
                skill_id: payload.skill_id,
                action: "increment",
                ...payload.data,
            })
        },
        onSuccess: () => {
            invalidateAll()
            setAddSkill(null)
            setForm(EMPTY_FORM)
            showToast("Log saved ✓")
        },
        onError: () => showToast("Failed to save log.", "error"),
    })

    const updateLog = useMutation({
        mutationFn: async (payload: { log_id: number; data: typeof form }) => {
            await api.patch(`/accounts/clinical-logs/${payload.log_id}/`, payload.data)
        },
        onSuccess: () => {
            invalidateAll()
            setEditLog(null)
            setForm(EMPTY_FORM)
            showToast("Log updated ✓")
        },
        onError: () => showToast("Failed to update log.", "error"),
    })

    const deleteLog = useMutation({
        mutationFn: async (logId: number) => {
            await api.delete(`/accounts/clinical-logs/${logId}/`)
        },
        onSuccess: () => {
            invalidateAll()
            setConfirmDelete(null)
            showToast("Log deleted")
        },
        onError: () => showToast("Failed to delete log.", "error"),
    })

    async function downloadPdf() {
        setDownloading(true)
        showToast("Generating your PDF transcript...", "success")
        try {
            const res = await api.get("/accounts/clinical-skills/export/", {
                responseType: "blob",
            })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute(
                "download",
                `NMC_Logbook_${(user?.full_name ?? "student").replace(/\s+/g, "_")}.pdf`
            )
            document.body.appendChild(link)
            link.click()
            link.parentNode?.removeChild(link)
            window.URL.revokeObjectURL(url)
            showToast("Logbook downloaded successfully!")
        } catch {
            showToast("Failed to download PDF. Please try again.", "error")
        } finally {
            setDownloading(false)
        }
    }

    function openAddModal(skill: ClinicalSkill) {
        setForm(EMPTY_FORM)
        setAddSkill(skill)
    }

    function openEditModal(log: ClinicalLog, skill: ClinicalSkill) {
        setForm({
            date_performed: log.date_performed,
            hospital: log.hospital,
            ward: log.ward,
            supervisor_name: log.supervisor_name,
            notes: log.notes,
        })
        setEditLog({ log, skill })
    }

    // Loading state
    if (isLoading) {
        return (
            <AppShell>
                <div className="max-w-4xl mx-auto space-y-6 pb-10 animate-pulse">
                    <div className="h-8 bg-surface-subtle rounded w-1/3" />
                    <div className="h-4 bg-surface-subtle rounded w-2/3" />
                    <div className="grid grid-cols-3 gap-3">
                        <div className="h-24 bg-surface-subtle rounded-xl" />
                        <div className="h-24 bg-surface-subtle rounded-xl" />
                        <div className="h-24 bg-surface-subtle rounded-xl" />
                    </div>
                    <div className="h-64 bg-surface-subtle rounded-xl" />
                </div>
            </AppShell>
        )
    }

    const categories = skills?.reduce((acc, skill) => {
        if (!acc[skill.category]) acc[skill.category] = []
        acc[skill.category].push(skill)
        return acc
    }, {} as Record<string, ClinicalSkill[]>)

    const totalCompleted = skills?.reduce((sum, s) => sum + s.completed_count, 0) ?? 0
    const totalRequired = skills?.reduce((sum, s) => sum + s.required_count, 0) ?? 0
    const overallPercent = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0
    const completeSkills = skills?.filter(s => s.completed_count >= s.required_count).length ?? 0
    const totalSkills = skills?.length ?? 0

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-6 pb-10">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Clinical Tracker</p>
                        <h1 className="mt-1 text-h1">Your N&MC Logbook</h1>
                        <p className="text-sm text-on-surface-muted mt-2 leading-relaxed max-w-2xl">
                            Log every procedure you perform during clinical rotations. Your logbook is tailored for the{" "}
                            <strong className="text-brand-700">{user?.program_display || "Nursing"}</strong> program.
                        </p>
                    </div>
                    <div className="shrink-0">
                        <Button
                            variant="secondary"
                            onClick={downloadPdf}
                            disabled={downloading || totalCompleted === 0}
                            className="flex items-center gap-2 border-brand-200 text-brand-700 hover:bg-brand-50"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            {downloading ? "Generating PDF…" : "Download PDF"}
                        </Button>
                    </div>
                </div>

                {/* Stat Cards */}
                {skills && totalRequired > 0 && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-border bg-white p-4">
                                <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Procedures</p>
                                <p className="mt-1 text-2xl font-black text-on-surface">{totalCompleted} <span className="text-base font-medium text-on-surface-muted">/ {totalRequired}</span></p>
                                <p className="text-xs text-on-surface-muted mt-0.5">{totalSkills} total skills</p>
                            </div>
                            <div className="rounded-xl border border-border bg-white p-4">
                                <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Completed</p>
                                <p className="mt-1 text-2xl font-black text-green-700">{completeSkills}</p>
                                <p className="text-xs text-on-surface-muted mt-0.5">Fully logged</p>
                            </div>
                            <div className="rounded-xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-4 col-span-2 sm:col-span-1">
                                <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Progress</p>
                                <p className="mt-1 text-2xl font-black text-brand-700">{overallPercent}%</p>
                                <div className="mt-2 h-1.5 bg-brand-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${overallPercent}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <div className="border-b border-border overflow-x-auto">
                            <div className="flex gap-1 min-w-max">
                                <button
                                    onClick={() => setActiveCategory(null)}
                                    className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === null
                                            ? "text-brand-700"
                                            : "text-on-surface-muted hover:text-on-surface"
                                        }`}
                                >
                                    All Categories
                                    {activeCategory === null && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700" />}
                                </button>
                                {Object.entries(categories || {}).map(([category, catSkills]) => {
                                    const completed = catSkills.reduce((s, sk) => s + sk.completed_count, 0)
                                    const required = catSkills.reduce((s, sk) => s + sk.required_count, 0)
                                    return (
                                        <button
                                            key={category}
                                            onClick={() => setActiveCategory(category)}
                                            className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === category
                                                    ? "text-brand-700"
                                                    : "text-on-surface-muted hover:text-on-surface"
                                                }`}
                                        >
                                            {category}
                                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${activeCategory === category ? "bg-brand-100 text-brand-700" : "bg-surface-subtle text-on-surface-muted"
                                                }`}>
                                                {completed}/{required}
                                            </span>
                                            {activeCategory === category && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Categories */}
                {Object.entries(categories || {})
                    .filter(([category]) => !activeCategory || activeCategory === category)
                    .map(([category, catSkills]) => {
                        const catCompleted = catSkills.reduce((s, sk) => s + sk.completed_count, 0)
                        const catRequired = catSkills.reduce((s, sk) => s + sk.required_count, 0)
                        return (
                            <div key={category} className="space-y-3">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <h2 className="text-base font-bold text-on-surface">{category}</h2>
                                        <p className="text-xs text-on-surface-muted">{catCompleted} of {catRequired} procedures completed</p>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-border bg-white divide-y divide-border overflow-hidden shadow-sm">
                                    {catSkills.map((skill) => (
                                        <SkillRow
                                            key={skill.id}
                                            skill={skill}
                                            onAdd={() => openAddModal(skill)}
                                            onHistory={() => setHistorySkill(skill)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
            </div>

            {/* Add / Edit Modal */}
            {(addSkill || editLog) && (
                <Modal
                    title={addSkill ? "Log Procedure" : "Edit Log Entry"}
                    subtitle={addSkill?.procedure_name || editLog?.skill.procedure_name}
                    onClose={() => { setAddSkill(null); setEditLog(null) }}
                >
                    <div className="space-y-4">
                        <Field label="Date Performed" required>
                            <input
                                type="date"
                                value={form.date_performed}
                                onChange={(e) => setForm({ ...form, date_performed: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Hospital / Facility" required>
                            <input
                                type="text"
                                placeholder="e.g. Korle Bu Teaching Hospital"
                                value={form.hospital}
                                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Ward / Unit">
                            <input
                                type="text"
                                placeholder="e.g. Medical Ward A"
                                value={form.ward}
                                onChange={(e) => setForm({ ...form, ward: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Supervisor's Name" required>
                            <input
                                type="text"
                                placeholder="e.g. Sister Akosua Mensah"
                                value={form.supervisor_name}
                                onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Notes" hint="optional">
                            <textarea
                                placeholder="e.g. Assisted with 2 patients. Patient tolerated procedure well."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={3}
                                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
                            />
                        </Field>
                    </div>

                    <div className="mt-6 flex gap-2">
                        <Button
                            variant="secondary"
                            fullWidth
                            onClick={() => { setAddSkill(null); setEditLog(null) }}
                        >
                            Cancel
                        </Button>
                        <Button
                            fullWidth
                            onClick={() => {
                                if (addSkill) {
                                    createLog.mutate({ skill_id: addSkill.id, data: form })
                                } else if (editLog) {
                                    updateLog.mutate({ log_id: editLog.log.id, data: form })
                                }
                            }}
                            disabled={
                                createLog.isPending ||
                                updateLog.isPending ||
                                !form.hospital.trim() ||
                                !form.supervisor_name.trim()
                            }
                        >
                            {createLog.isPending || updateLog.isPending ? "Saving…" : "Save Log"}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* History Modal */}
            {historySkill && (
                <Modal
                    title="Procedure History"
                    subtitle={historySkill.procedure_name}
                    onClose={() => setHistorySkill(null)}
                    maxWidth="lg"
                >
                    {historyLogs && historyLogs.length > 0 ? (
                        <div className="space-y-2">
                            {historyLogs.map((log) => (
                                <div key={log.id} className="rounded-lg border border-border bg-white p-4 hover:border-brand-300 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                                                    {formatDate(log.date_performed)}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-on-surface mt-1">
                                                {log.hospital}{log.ward ? ` · ${log.ward}` : ""}
                                            </p>
                                            {log.supervisor_name && (
                                                <p className="text-xs text-on-surface-muted mt-1">
                                                    Supervisor: <strong className="text-on-surface">{log.supervisor_name}</strong>
                                                </p>
                                            )}
                                            {log.notes && (
                                                <p className="text-xs text-on-surface-muted mt-1.5 italic border-l-2 border-amber-300 pl-2">
                                                    "{log.notes}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => openEditModal(log, historySkill)}
                                                className="rounded-md px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ log, skill: historySkill })}
                                                className="rounded-md px-2.5 py-1 text-xs font-bold text-danger-700 hover:bg-danger-50 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-sm text-on-surface-muted">No logs recorded yet for this procedure.</p>
                            <button
                                onClick={() => { setHistorySkill(null); openAddModal(historySkill) }}
                                className="mt-3 text-xs font-bold text-brand-600 hover:underline"
                            >
                                + Add your first log
                            </button>
                        </div>
                    )}
                </Modal>
            )}

            {/* Delete Confirmation */}
            {confirmDelete && (
                <Modal title="Delete this log?" onClose={() => setConfirmDelete(null)} maxWidth="sm">
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                        <p className="text-sm text-red-900 leading-relaxed">
                            This will permanently remove the log from <strong>{formatDate(confirmDelete.log.date_performed)}</strong>. This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            fullWidth
                            onClick={() => deleteLog.mutate(confirmDelete.log.id)}
                            disabled={deleteLog.isPending}
                            className="!bg-danger-600 hover:!bg-danger-700"
                        >
                            {deleteLog.isPending ? "Deleting…" : "Delete Log"}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[60] rounded-lg px-4 py-3 shadow-xl text-sm font-medium text-white animate-in slide-in-from-top-4 duration-300 ${toast.type === "success" ? "bg-brand-700" : "bg-danger-600"
                    }`}>
                    {toast.message}
                </div>
            )}
        </AppShell>
    )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SkillRow({ skill, onAdd, onHistory }: {
    skill: ClinicalSkill
    onAdd: () => void
    onHistory: () => void
}) {
    const isComplete = skill.completed_count >= skill.required_count
    const percent = Math.min((skill.completed_count / skill.required_count) * 100, 100)

    return (
        <div className={`flex items-center justify-between gap-4 px-4 py-3.5 ${isComplete ? "bg-green-50/40" : ""}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface">{skill.procedure_name}</p>
                    {isComplete && (
                        <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            ✓ Complete
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-brand-500"}`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${isComplete ? "text-green-700" : "text-on-surface-muted"}`}>
                        {skill.completed_count} / {skill.required_count}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onHistory}
                    disabled={skill.completed_count === 0}
                    className="text-xs font-bold text-brand-700 hover:underline disabled:opacity-40 disabled:no-underline"
                >
                    History
                </button>
                <button
                    onClick={onAdd}
                    className="h-9 w-9 rounded-lg bg-brand-700 text-white hover:bg-brand-800 flex items-center justify-center text-lg font-bold transition-colors shadow-sm active:scale-95"
                    aria-label={`Add ${skill.procedure_name}`}
                >
                    +
                </button>
            </div>
        </div>
    )
}

function Modal({ title, subtitle, onClose, children, maxWidth = "md" }: {
    title: string
    subtitle?: string
    onClose: () => void
    children: React.ReactNode
    maxWidth?: "sm" | "md" | "lg"
}) {
    const maxW = maxWidth === "sm" ? "max-w-sm" : maxWidth === "lg" ? "max-w-2xl" : "max-w-md"
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className={`bg-white rounded-2xl w-full ${maxW} p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-on-surface">{title}</h2>
                        {subtitle && <p className="text-sm text-brand-700 mt-0.5 font-medium">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="text-on-surface-muted hover:text-on-surface text-2xl leading-none -mt-1" aria-label="Close">
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

function Field({ label, hint, required, children }: {
    label: string
    hint?: string
    required?: boolean
    children: React.ReactNode
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-on-surface mb-1.5">
                {label}
                {required && <span className="text-danger-600 ml-0.5">*</span>}
                {hint && <span className="text-xs font-normal text-on-surface-muted ml-1">({hint})</span>}
            </label>
            {children}
        </div>
    )
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}