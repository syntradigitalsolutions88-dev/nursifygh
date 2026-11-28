import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import AppShell from "../components/shell/AppShell"
import api from "../api/client"

interface ControlConfig {
    simulator_enabled: boolean
    ai_examiner_enabled: boolean
    theory_mode_enabled: boolean
    practical_mode_enabled: boolean
    sequence_drill_enabled: boolean
    enabled_programs: string[]
    enabled_programs_csv: string
    default_theory_minutes: number
    default_practical_minutes: number
    pass_mark_percent: number
    announcement_banner: string
}

interface ActivityLogRow {
    id: number
    student_name: string
    student_email: string
    program: string
    scenario_title: string
    mode: string
    score: number
    total_marks: number
    percentage: number
    passed: boolean
    ai_graded: boolean
    created_at: string
}

interface OverviewStats {
    total_users: number
    total_attempts: number
    passed_attempts: number
    pass_rate: number
    avg_percentage: number
    ai_graded_attempts: number
}

const ALL_PROGS = ["RGN", "RM", "RPN", "CHN", "NAC", "NAP"]

const DEFAULT_CFG: ControlConfig = {
    simulator_enabled: true,
    ai_examiner_enabled: true,
    theory_mode_enabled: true,
    practical_mode_enabled: true,
    sequence_drill_enabled: true,
    enabled_programs: [...ALL_PROGS],
    enabled_programs_csv: ALL_PROGS.join(","),
    default_theory_minutes: 25,
    default_practical_minutes: 10,
    pass_mark_percent: 50,
    announcement_banner: "",
}

export default function AdminControlCenterPage() {
    const [cfg, setCfg] = useState<ControlConfig>(DEFAULT_CFG)
    const [stats, setStats] = useState<OverviewStats>({
        total_users: 0,
        total_attempts: 0,
        passed_attempts: 0,
        pass_rate: 0,
        avg_percentage: 0,
        ai_graded_attempts: 0,
    })
    const [logs, setLogs] = useState<ActivityLogRow[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [statusMsg, setStatusMsg] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    async function loadOverview() {
        setLoading(true)
        setErrorMsg(null)
        try {
            const res = await api.get("/academics/tp-admin-overview/")
            if (res.data?.config) setCfg({ ...DEFAULT_CFG, ...res.data.config })
            if (res.data?.stats) setStats(res.data.stats)
            if (Array.isArray(res.data?.recent_logs)) setLogs(res.data.recent_logs)
        } catch (err: unknown) {
            const detail =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                "Unable to load Control Center data. Ensure you are logged in with a staff/admin account."
            setErrorMsg(detail)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOverview()
    }, [])

    function toggleProgram(code: string) {
        setCfg((prev) => {
            const exists = prev.enabled_programs.includes(code)
            const next = exists
                ? prev.enabled_programs.filter((p) => p !== code)
                : [...prev.enabled_programs, code]
            const safeList = next.length > 0 ? next : ["RGN"]
            return {
                ...prev,
                enabled_programs: safeList,
                enabled_programs_csv: safeList.join(","),
            }
        })
    }

    async function handleSaveSettings(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setStatusMsg(null)
        setErrorMsg(null)
        try {
            const res = await api.post("/academics/tp-control/", {
                ...cfg,
                enabled_programs: cfg.enabled_programs.join(","),
            })
            setCfg({ ...DEFAULT_CFG, ...res.data })
            setStatusMsg("Control Center settings saved and applied live across the platform.")
        } catch {
            setErrorMsg("Failed to save settings. Check backend server and staff permissions.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <AppShell>
            <div className="mx-auto max-w-5xl space-y-6 pb-16">
                {/* Header */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                                NursifyGH Master Control Center
                            </span>
                            <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                                Platform &amp; Feature Control Center
                            </h1>
                            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                                Control the Theory &amp; Practical Simulator, AI Semantic Examiner, timers, programmes, and monitor live student activity—synced with Django Admin.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={loadOverview}
                                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                ↻ Refresh Activity
                            </button>
                            <a
                                href="http://127.0.0.1:8000/admin/"
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                                Open Django Admin (/admin) ↗
                            </a>
                        </div>
                    </div>
                </div>

                {statusMsg && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
                        ✓ {statusMsg}
                    </div>
                )}
                {errorMsg && (
                    <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-900">
                        ⚠ {errorMsg}
                    </div>
                )}

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Registered Users</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">{stats.total_users}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">T&amp;P Attempts Logged</p>
                        <p className="mt-1 text-2xl font-extrabold text-emerald-700">{stats.total_attempts}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Pass Rate</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">{stats.pass_rate}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">AI Examiner Graded</p>
                        <p className="mt-1 text-2xl font-extrabold text-sky-700">{stats.ai_graded_attempts}</p>
                    </div>
                </div>

                {/* Feature Toggles & Exam Parameters */}
                <form onSubmit={handleSaveSettings} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Feature Switches &amp; AI Examiner Controls</h2>
                            <p className="text-xs text-slate-500">Changes take effect immediately for students and mirror Django Admin.</p>
                        </div>
                        <Link to="/theory-practical" className="text-xs font-semibold text-emerald-700 hover:underline">
                            Preview Simulator →
                        </Link>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {(
                            [
                                ["simulator_enabled", "Theory & Practical Simulator", "Enable/disable the 36-scenario simulator"],
                                ["ai_examiner_enabled", "AI Semantic Examiner", "Use AI grading with synonym & partial credit"],
                                ["theory_mode_enabled", "Theory & Care Plans (20m)", "Allow structured 20-mark written theory scenarios"],
                                ["practical_mode_enabled", "Practical / OSCE Written", "Allow written Prep/Execution/Post-Care grading"],
                                ["sequence_drill_enabled", "OSCE Sequence Drill", "Allow interactive step-ordering & trap drill"],
                            ] as const
                        ).map(([key, title, desc]) => (
                            <label
                                key={key}
                                className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50"
                            >
                                <div>
                                    <p className="text-xs font-bold text-slate-900">{title}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={cfg[key]}
                                    onChange={(e) => setCfg((prev) => ({ ...prev, [key]: e.target.checked }))}
                                    className="mt-0.5 h-4 w-4 accent-emerald-700"
                                />
                            </label>
                        ))}
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-bold text-slate-800">Active Ghanaian Programmes</p>
                        <div className="flex flex-wrap gap-2">
                            {ALL_PROGS.map((code) => {
                                const active = cfg.enabled_programs.includes(code)
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => toggleProgram(code)}
                                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                                            active
                                                ? "bg-emerald-700 text-white"
                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                    >
                                        {code} {active ? "✓" : "✕"}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Theory Timer (mins)</label>
                            <input
                                type="number"
                                min={5}
                                max={180}
                                value={cfg.default_theory_minutes}
                                onChange={(e) =>
                                    setCfg((p) => ({ ...p, default_theory_minutes: Number(e.target.value) || 25 }))
                                }
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">OSCE Station Timer (mins)</label>
                            <input
                                type="number"
                                min={3}
                                max={120}
                                value={cfg.default_practical_minutes}
                                onChange={(e) =>
                                    setCfg((p) => ({ ...p, default_practical_minutes: Number(e.target.value) || 10 }))
                                }
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Pass Threshold (%)</label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={cfg.pass_mark_percent}
                                onChange={(e) =>
                                    setCfg((p) => ({ ...p, pass_mark_percent: Number(e.target.value) || 50 }))
                                }
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">
                            Exam Hall Notice / Banner Message (optional)
                        </label>
                        <input
                            type="text"
                            maxLength={240}
                            value={cfg.announcement_banner}
                            onChange={(e) => setCfg((p) => ({ ...p, announcement_banner: e.target.value }))}
                            placeholder="e.g., N&MC Licensure Mock Week: All 36 Theory & OSCE stations open with AI Examiner."
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                            {saving ? "Saving Controls..." : "Save Control Center Settings"}
                        </button>
                    </div>
                </form>

                {/* Student Activity Monitor */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Live Student Theory &amp; OSCE Activity</h2>
                            <p className="text-xs text-slate-500">Recent submissions graded on the platform</p>
                        </div>
                        <div className="flex gap-2 text-xs">
                            <Link to="/admin-activity" className="font-semibold text-emerald-700 hover:underline">
                                Full Student Activity →
                            </Link>
                            <Link to="/admin-commissions" className="font-semibold text-slate-600 hover:underline">
                                Commissions →
                            </Link>
                        </div>
                    </div>

                    {loading ? (
                        <p className="py-6 text-center text-xs text-slate-500">Loading student attempt logs...</p>
                    ) : logs.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-500">
                            No Theory or Practical submissions logged yet. Once students submit scripts, attempts appear here and in Django Admin.
                        </p>
                    ) : (
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                                        <th className="py-2 pr-3">Student</th>
                                        <th className="py-2 pr-3">Prog</th>
                                        <th className="py-2 pr-3">Station</th>
                                        <th className="py-2 pr-3">Mode</th>
                                        <th className="py-2 pr-3">Score</th>
                                        <th className="py-2 pr-3">Grader</th>
                                        <th className="py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.map((row) => (
                                        <tr key={row.id}>
                                            <td className="py-2.5 pr-3 font-semibold text-slate-900">{row.student_name}</td>
                                            <td className="py-2.5 pr-3 font-bold text-slate-700">{row.program}</td>
                                            <td className="py-2.5 pr-3 text-slate-800">{row.scenario_title}</td>
                                            <td className="py-2.5 pr-3 text-slate-600">{row.mode}</td>
                                            <td className="py-2.5 pr-3 font-bold text-slate-900">
                                                {row.score}/{row.total_marks} ({row.percentage}%)
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                    {row.ai_graded ? "AI Examiner" : "Rubric"}
                                                </span>
                                            </td>
                                            <td className="py-2.5">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                        row.passed
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : "bg-amber-100 text-amber-800"
                                                    }`}
                                                >
                                                    {row.passed ? "PASS" : "RETRY"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    )
}
