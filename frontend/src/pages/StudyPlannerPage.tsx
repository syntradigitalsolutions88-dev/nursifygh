import { useEffect, useMemo, useState } from "react"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"

interface StudyBlock {
    id: string
    title: string
    courseOrTopic: string
    daySlot: string
    durationMinutes: number
    track: "RGN" | "RM" | "RPN" | "CHN"
    completed: boolean
}

const STORAGE_KEY_BLOCKS = "nursify_study_planner_blocks_v1"
const STORAGE_KEY_GOAL = "nursify_study_planner_goal_v1"

const TEMPLATES: Record<string, Array<Omit<StudyBlock, "id" | "completed">>> = {
    sprint: [
        {
            title: "High-Yield Past Questions & Rationale Breakdown",
            courseOrTopic: "Core Exam Readiness",
            daySlot: "Morning (04:00 – 05:30)",
            durationMinutes: 90,
            track: "RGN",
        },
        {
            title: "Obstetric & Paediatric Emergencies Rapid Review",
            courseOrTopic: "Maternal & Child Health",
            daySlot: "Evening (20:00 – 21:00)",
            durationMinutes: 60,
            track: "RM",
        },
        {
            title: "Spaced-Repetition Flashcards on Weak Topics",
            courseOrTopic: "Smart Revision Centre",
            daySlot: "Evening (21:00 – 21:45)",
            durationMinutes: 45,
            track: "CHN",
        },
    ],
    ward: [
        {
            title: "Post-Shift Clinical Reflection & Care Plan Notes",
            courseOrTopic: "Ward / CHPS Rotation",
            daySlot: "Evening (20:00 – 20:45)",
            durationMinutes: 45,
            track: "RGN",
        },
        {
            title: "Targeted 15-Question CBT Mini-Drill",
            courseOrTopic: "CBT Simulator",
            daySlot: "Evening (20:45 – 21:15)",
            durationMinutes: 30,
            track: "RPN",
        },
    ],
}

export default function StudyPlannerPage() {
    const [blocks, setBlocks] = useState<StudyBlock[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_BLOCKS)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed) && parsed.length > 0) return parsed
            }
        } catch {
            // fallback
        }
        return TEMPLATES.sprint.map((b, i) => ({ ...b, id: `seed-${i}`, completed: false }))
    })

    const [examLabel, setExamLabel] = useState<string>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_GOAL + "_label") || "NMC Licensure / Semester Exams"
        } catch {
            return "NMC Licensure / Semester Exams"
        }
    })

    const [targetDate, setTargetDate] = useState<string>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_GOAL + "_date")
            if (saved) return saved
        } catch {
            // fallback
        }
        const d = new Date()
        d.setDate(d.getDate() + 14)
        return d.toISOString().slice(0, 10)
    })

    const [filter, setFilter] = useState<"all" | "active" | "completed">("all")
    const [title, setTitle] = useState("")
    const [courseOrTopic, setCourseOrTopic] = useState("")
    const [daySlot, setDaySlot] = useState("Evening (20:00 – 21:00)")
    const [durationMinutes, setDurationMinutes] = useState("60")
    const [track, setTrack] = useState<"RGN" | "RM" | "RPN" | "CHN">("RGN")
    const [notice, setNotice] = useState<{ variant: "info" | "warning"; text: string } | null>(null)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_BLOCKS, JSON.stringify(blocks))
        } catch {
            // ignore
        }
    }, [blocks])

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_GOAL + "_label", examLabel)
            localStorage.setItem(STORAGE_KEY_GOAL + "_date", targetDate)
        } catch {
            // ignore
        }
    }, [examLabel, targetDate])

    const countdown = useMemo(() => {
        if (!targetDate) return { daysLeft: 0, label: "Set a target exam or clinical rotation date" }
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const target = new Date(targetDate + "T00:00:00")
        const diffMs = target.getTime() - now.getTime()
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (Number.isNaN(days)) return { daysLeft: 0, label: "Invalid date" }
        if (days > 0) return { daysLeft: days, label: `${days} day${days === 1 ? "" : "s"} remaining` }
        if (days === 0) return { daysLeft: 0, label: "Target day is today!" }
        return { daysLeft: 0, label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past target date` }
    }, [targetDate])

    const stats = useMemo(() => {
        const totalMinutes = blocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0)
        const completedCount = blocks.filter((b) => b.completed).length
        return {
            totalBlocks: blocks.length,
            completedCount,
            totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        }
    }, [blocks])

    const visibleBlocks = useMemo(() => {
        if (filter === "active") return blocks.filter((b) => !b.completed)
        if (filter === "completed") return blocks.filter((b) => b.completed)
        return blocks
    }, [blocks, filter])

    function applyTemplate(key: "sprint" | "ward") {
        const preset = TEMPLATES[key].map((b, idx) => ({
            ...b,
            id: `${key}-${Date.now()}-${idx}`,
            completed: false,
        }))
        setBlocks(preset)
        setNotice({
            variant: "info",
            text: key === "sprint" ? "Applied Exam Sprint study blocks." : "Applied Ward/CHPS Shift study blocks.",
        })
    }

    function handleAddBlock(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim()) {
            setNotice({ variant: "warning", text: "Please enter a study focus or task title before adding." })
            return
        }
        const mins = Math.max(15, Math.min(360, parseInt(durationMinutes, 10) || 45))
        const item: StudyBlock = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: title.trim(),
            courseOrTopic: courseOrTopic.trim() || "Core Nursing Revision",
            daySlot: daySlot.trim() || "Evening Session",
            durationMinutes: mins,
            track,
            completed: false,
        }
        setBlocks((prev) => [item, ...prev])
        setTitle("")
        setCourseOrTopic("")
        setNotice({ variant: "info", text: "Added study block to your plan." })
    }

    function toggleBlock(id: string) {
        setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b)))
    }

    function deleteBlock(id: string) {
        setBlocks((prev) => prev.filter((b) => b.id !== id))
    }

    return (
        <AppShell>
            <div className="max-w-4xl space-y-6 pb-24 sm:pb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-h1">Smart Study Planner</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            Organise exam countdowns, ward/CHPS rotation prep, and daily study blocks offline.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => applyTemplate("sprint")}>
                            Exam Sprint Template
                        </Button>
                        <Button variant="secondary" onClick={() => applyTemplate("ward")}>
                            Ward Shift Template
                        </Button>
                    </div>
                </div>

                {notice && <Alert variant={notice.variant}>{notice.text}</Alert>}

                {/* Exam / Rotation Target Card */}
                <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-h4 text-on-surface">Exam / Clinical Milestone Target</h2>
                        <Badge variant="success">{countdown.label}</Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Milestone / Exam Name"
                            value={examLabel}
                            onChange={(e) => setExamLabel(e.target.value)}
                            placeholder="e.g. NMC RGN Licensure Exam or Mid-Semester"
                        />
                        <Input
                            label="Target Date"
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Planned Blocks</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{stats.totalBlocks}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Completed</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{stats.completedCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Planned Hours</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{stats.totalHours}h</p>
                    </div>
                </div>

                {/* Add Study Block Form */}
                <form onSubmit={handleAddBlock} className="rounded-2xl border border-border bg-white p-5 space-y-4">
                    <h2 className="text-h4 text-on-surface">Add Study Block</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Study Focus / Task"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Medical-Surgical Past Questions & Rationales"
                        />
                        <Input
                            label="Course or Clinical Topic"
                            value={courseOrTopic}
                            onChange={(e) => setCourseOrTopic(e.target.value)}
                            placeholder="e.g. Paediatric Nursing / Pharmacology"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Input
                            label="Time Slot"
                            value={daySlot}
                            onChange={(e) => setDaySlot(e.target.value)}
                            placeholder="e.g. Morning 04:00 – 05:30"
                        />
                        <Input
                            label="Duration (minutes)"
                            type="number"
                            min={15}
                            max={360}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                        />
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-on-surface">Programme Track</label>
                            <select
                                value={track}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setTrack(e.target.value as "RGN" | "RM" | "RPN" | "CHN")
                                }
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-on-surface"
                            >
                                <option value="RGN">RGN (General Nursing)</option>
                                <option value="RM">RM (Midwifery)</option>
                                <option value="RPN">RPN (Psychiatric Nursing)</option>
                                <option value="CHN">CHN (Community Health)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">+ Add Study Block</Button>
                    </div>
                </form>

                {/* Filter & Block List */}
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                ["all", `All (${blocks.length})`],
                                ["active", `Active (${blocks.filter((b) => !b.completed).length})`],
                                ["completed", `Completed (${stats.completedCount})`],
                            ] as Array<["all" | "active" | "completed", string]>
                        ).map(([mode, label]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setFilter(mode)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                    filter === mode
                                        ? "bg-brand-700 text-white"
                                        : "border border-border bg-white text-on-surface-muted hover:text-on-surface"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {visibleBlocks.length === 0 ? (
                        <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-on-surface-muted">
                            No study blocks in this view. Add a block above or load a template to plan your revision.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {visibleBlocks.map((b) => (
                                <div
                                    key={b.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-white p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={b.completed}
                                            onChange={() => toggleBlock(b.id)}
                                            className="mt-1 h-4 w-4 rounded border-border accent-brand-700"
                                        />
                                        <div>
                                            <p
                                                className={`text-sm font-semibold ${
                                                    b.completed ? "line-through text-on-surface-muted" : "text-on-surface"
                                                }`}
                                            >
                                                {b.title}
                                            </p>
                                            <p className="text-xs text-on-surface-muted">
                                                {b.courseOrTopic} • {b.daySlot} • {b.durationMinutes} min
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <Badge variant="neutral">{b.track}</Badge>
                                        <button
                                            type="button"
                                            onClick={() => deleteBlock(b.id)}
                                            className="rounded-lg border border-border px-2.5 py-1 text-xs text-on-surface-muted hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    )
}
