import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"

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
    const queryClient = useQueryClient()
    const [addSkill, setAddSkill] = useState<ClinicalSkill | null>(null)
    const [editLog, setEditLog] = useState<{ log: ClinicalLog; skill: ClinicalSkill } | null>(null)
    const [historySkill, setHistorySkill] = useState<ClinicalSkill | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<{ log: ClinicalLog; skill: ClinicalSkill } | null>(null)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
    const [form, setForm] = useState(EMPTY_FORM)

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
            showToast("Log saved")
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
            showToast("Log updated")
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

    if (isLoading) {
        return <div className="p-10 text-center text-on-surface-muted">Loading…</div>
    }

    const categories = skills?.reduce((acc, skill) => {
        if (!acc[skill.category]) acc[skill.category] = []
        acc[skill.category].push(skill)
        return acc
    }, {} as Record<string, ClinicalSkill[]>)

    const totalCompleted = skills?.reduce((sum, s) => sum + s.completed_count, 0) ?? 0
    const totalRequired = skills?.reduce((sum, s) => sum + s.required_count, 0) ?? 0
    const overallPercent = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto space-y-8 pb-10">
                <div>
                    <h1 className="text-2xl font-bold text-on-surface">Clinical Tracker</h1>
                    <p className="text-sm text-on-surface-muted mt-1.5 leading-relaxed">
                        Log every procedure you perform during clinical rotations. Each entry records the
                        date, hospital, ward, and supervisor — ready for your N&amp;MC logbook.
                    </p>
                </div>

                {/* Progress */}
                {skills && totalRequired > 0 && (
                    <div className="rounded-xl border border-border bg-white p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-on-surface-muted">Overall progress</p>
                            <p className="text-sm font-semibold text-on-surface">
                                {totalCompleted} of {totalRequired} · {overallPercent}%
                            </p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${overallPercent}%` }} />
                        </div>
                    </div>
                )}

                {/* Categories */}
                {Object.entries(categories || {}).map(([category, catSkills]) => (
                    <div key={category} className="space-y-2">
                        <h2 className="text-sm font-semibold text-on-surface px-1">{category}</h2>
                        <div className="rounded-xl border border-border bg-white divide-y divide-border overflow-hidden">
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
                ))}
            </div>

            {/* Add / Edit Modal */}
            {(addSkill || editLog) && (
                <Modal
                    title={addSkill ? "Log procedure" : "Edit log"}
                    subtitle={addSkill?.procedure_name || editLog?.skill.procedure_name}
                    onClose={() => { setAddSkill(null); setEditLog(null) }}
                >
                    <div className="space-y-4">
                        <Field label="Date performed" required>
                            <input
                                type="date"
                                value={form.date_performed}
                                onChange={(e) => setForm({ ...form, date_performed: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Hospital / Facility" required>
                            <input
                                type="text"
                                placeholder="e.g. Korle Bu Teaching Hospital"
                                value={form.hospital}
                                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Ward / Unit">
                            <input
                                type="text"
                                placeholder="e.g. Medical Ward A"
                                value={form.ward}
                                onChange={(e) => setForm({ ...form, ward: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Supervisor's name" required>
                            <input
                                type="text"
                                placeholder="e.g. Sister Akosua Mensah"
                                value={form.supervisor_name}
                                onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                        </Field>

                        <Field label="Notes" hint="optional">
                            <textarea
                                placeholder="e.g. Assisted with 2 patients. Patient tolerated procedure well."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={3}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
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
                            {createLog.isPending || updateLog.isPending ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* History Modal */}
            {historySkill && (
                <Modal
                    title="Procedure history"
                    subtitle={historySkill.procedure_name}
                    onClose={() => setHistorySkill(null)}
                    maxWidth="lg"
                >
                    {historyLogs && historyLogs.length > 0 ? (
                        <div className="space-y-2">
                            {historyLogs.map((log) => (
                                <div key={log.id} className="rounded-lg border border-border bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-on-surface">
                                                {formatDate(log.date_performed)}
                                            </p>
                                            <p className="text-sm text-on-surface-muted mt-0.5">
                                                {log.hospital}{log.ward ? ` · ${log.ward}` : ""}
                                            </p>
                                            {log.supervisor_name && (
                                                <p className="text-xs text-on-surface-muted mt-1">
                                                    Supervisor: {log.supervisor_name}
                                                </p>
                                            )}
                                            {log.notes && (
                                                <p className="text-xs text-on-surface-muted mt-1 italic">
                                                    "{log.notes}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => openEditModal(log, historySkill)}
                                                className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ log, skill: historySkill })}
                                                className="rounded-md px-2 py-1 text-xs font-medium text-danger-700 hover:bg-danger-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-on-surface-muted text-center py-6">
                            No logs recorded yet.
                        </p>
                    )}
                </Modal>
            )}

            {/* Delete Confirmation */}
            {confirmDelete && (
                <Modal title="Delete this log?" onClose={() => setConfirmDelete(null)} maxWidth="sm">
                    <p className="text-sm text-on-surface-muted leading-relaxed">
                        This will permanently remove the log from <strong>{formatDate(confirmDelete.log.date_performed)}</strong>.
                        This action can't be undone.
                    </p>
                    <div className="mt-5 flex gap-2">
                        <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            fullWidth
                            onClick={() => deleteLog.mutate(confirmDelete.log.id)}
                            disabled={deleteLog.isPending}
                            className="!bg-danger-600 hover:!bg-danger-700"
                        >
                            {deleteLog.isPending ? "Deleting…" : "Delete"}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[60] rounded-lg px-4 py-3 shadow-xl text-sm font-medium text-white ${toast.type === "success" ? "bg-brand-700" : "bg-danger-600"}`}>
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
        <div className={`flex items-center justify-between gap-4 px-4 py-3 ${isComplete ? "bg-green-50/40" : ""}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-on-surface">{skill.procedure_name}</p>
                    {isComplete && (
                        <span className="inline-flex items-center rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Complete
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-brand-500"}`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <span className="text-xs text-on-surface-muted">
                        {skill.completed_count} / {skill.required_count}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onHistory}
                    disabled={skill.completed_count === 0}
                    className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-40 disabled:no-underline"
                >
                    History
                </button>
                <button
                    onClick={onAdd}
                    className="h-8 w-8 rounded-lg bg-brand-700 text-white hover:bg-brand-800 flex items-center justify-center text-lg font-bold"
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
                        {subtitle && <p className="text-sm text-brand-700 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="text-on-surface-muted hover:text-on-surface text-2xl leading-none -mt-1">×</button>
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
            <label className="block text-sm font-medium text-on-surface mb-1.5">
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