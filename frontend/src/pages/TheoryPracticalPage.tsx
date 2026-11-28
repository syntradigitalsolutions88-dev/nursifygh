import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import AppShell from "../components/shell/AppShell"
import api from "../api/client"
import {
    THEORY_PRACTICAL_BANK,
    type OsceStep,
    type PracticalScenario,
    type ProgramCode,
    type TheoryPracticalItem,
    type TheoryScenario,
} from "../data/theoryPracticalBank"

const PROGRAMS: Array<{ code: "ALL" | ProgramCode; label: string }> = [
    { code: "ALL", label: "All Programmes (6)" },
    { code: "RGN", label: "RGN (General)" },
    { code: "RM", label: "RM (Midwifery)" },
    { code: "RPN", label: "RPN (Mental Health)" },
    { code: "CHN", label: "CHN (Community)" },
    { code: "NAC", label: "NAC (Clinical)" },
    { code: "NAP", label: "NAP (Preventive)" },
]

const STORAGE_KEY = "nursify_tp_progress_v1"

interface SavedAttempt {
    bestScore: number
    totalMarks: number
    passed: boolean
    attempts: number
}

interface TheoryGradeResult {
    aiGraded?: boolean
    overallFeedback?: string
    earnedTotal: number
    totalMarks: number
    pct: number
    breakdown: Array<{
        id: string
        label: string
        maxMarks: number
        earned: number
        feedback?: string
        hits: number
        totalClusters: number
        pointResults: Array<{ point: string; matched: boolean }>
    }>
}

interface WrittenPracticalGradeResult {
    aiGraded?: boolean
    overallFeedback?: string
    finalScore: number
    totalMarks: number
    pct: number
    checklist: Array<{
        step: OsceStep
        covered: boolean
        awarded: number
    }>
}

const STOPWORDS = new Set([
    "with", "from", "into", "that", "this", "their", "then", "than", "only",
    "over", "under", "after", "before", "using", "used", "patient", "patients",
    "client", "mother", "baby", "child", "area", "site", "steps", "step",
    "procedure", "properly", "correctly", "safely", "ensure", "perform",
    "make", "take", "give", "keep", "check", "note", "both", "each", "same",
])

function loadProgress(): Record<string, SavedAttempt> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as Record<string, SavedAttempt>) : {}
    } catch {
        return {}
    }
}

function saveAttempt(id: string, score: number, totalMarks: number): Record<string, SavedAttempt> {
    const current = loadProgress()
    const prev = current[id]
    const bestScore = prev ? Math.max(prev.bestScore, score) : score
    const passed = (bestScore / totalMarks) * 100 >= 50
    const updated: Record<string, SavedAttempt> = {
        ...current,
        [id]: {
            bestScore,
            totalMarks,
            passed,
            attempts: (prev?.attempts ?? 0) + 1,
        },
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
        // ignore storage quota issues
    }
    return updated
}

function spoilerFreePlaceholder(raw: string, index: number): string {
    const clean = raw.trim()
    if (!clean.toLowerCase().startsWith("e.g.")) return clean
    return `Point ${index + 1}: Write a clear, complete clinical sentence answering what the question demands...`
}

function formatClock(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function shuffleArray<T>(items: T[]): T[] {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

function gradeTheoryFallback(scenario: TheoryScenario, responses: Record<string, string[]>): TheoryGradeResult {
    let earnedTotal = 0
    const breakdown = scenario.subQuestions.map((sq) => {
        const combinedText = (responses[sq.id] || []).join(" ").toLowerCase()
        const pointResults = sq.conceptClusters.map((cluster, idx) => {
            const matched = cluster.some((kw) => combinedText.includes(kw.toLowerCase()))
            return { point: sq.modelPoints[idx] || cluster[0], matched }
        })
        const hits = pointResults.filter((p) => p.matched).length
        const ratio = sq.conceptClusters.length > 0 ? hits / sq.conceptClusters.length : 0
        const earned = Math.round(ratio * sq.marks * 2) / 2
        earnedTotal += earned
        return {
            id: sq.id,
            label: sq.label,
            maxMarks: sq.marks,
            earned,
            hits,
            totalClusters: sq.conceptClusters.length,
            pointResults,
        }
    })
    const pct = Math.round((earnedTotal / scenario.totalMarks) * 100)
    return { aiGraded: false, earnedTotal, totalMarks: scenario.totalMarks, pct, breakdown }
}

function gradeWrittenPracticalFallback(
    scenario: PracticalScenario,
    writtenSections: { prep: string; exec: string; post: string }
): WrittenPracticalGradeResult {
    const fullText = `${writtenSections.prep} ${writtenSections.exec} ${writtenSections.post}`
        .toLowerCase()
        .replace(/[^a-z0-9\s/-]/g, " ")
    const validSteps = scenario.steps.filter((s) => !s.isDistractor)
    let earned = 0

    const checklist = validSteps.map((step) => {
        const tokens = step.text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(
                (w) =>
                    (w.length >= 4 && !STOPWORDS.has(w)) ||
                    ["iv", "im", "bp", "rr", "ors", "cct", "nex", "fhr", "90", "24", "15", "30", "60"].includes(w)
            )
        const uniqueTokens = Array.from(new Set(tokens))
        const matches = uniqueTokens.filter((tok) => fullText.includes(tok.slice(0, Math.max(4, tok.length - 1))))
        const threshold = uniqueTokens.length <= 2 ? 1 : Math.max(2, Math.ceil(uniqueTokens.length * 0.35))
        const covered = matches.length >= threshold
        const awarded = covered ? step.marks : 0
        earned += awarded
        return { step, covered, awarded }
    })

    const finalScore = Math.min(scenario.totalMarks, earned)
    const pct = Math.round((finalScore / scenario.totalMarks) * 100)
    return { aiGraded: false, finalScore, totalMarks: scenario.totalMarks, pct, checklist }
}

function gradePracticalSequence(scenario: PracticalScenario, selectedIds: string[]) {
    const validSteps = scenario.steps.filter((s) => !s.isDistractor)
    const stepMap = new Map(scenario.steps.map((s) => [s.id, s]))
    const validPosMap = new Map(validSteps.map((s, idx) => [s.id, idx]))

    let earned = 0
    let penalty = 0
    const seenPositions: number[] = []

    const stepResults = selectedIds.map((id) => {
        const step = stepMap.get(id)!
        if (step.isDistractor) {
            penalty += 2
            return { step, status: "distractor" as const, marksAwarded: -2 }
        }
        const pos = validPosMap.get(id) ?? 0
        const prevMax = seenPositions.length > 0 ? Math.max(...seenPositions) : -1
        const inOrder = pos > prevMax
        seenPositions.push(pos)
        const awarded = inOrder ? step.marks : Math.round(step.marks * 0.5 * 2) / 2
        earned += awarded
        return {
            step,
            status: inOrder ? ("correct-order" as const) : ("out-of-order" as const),
            marksAwarded: awarded,
        }
    })

    const finalScore = Math.max(0, Math.min(scenario.totalMarks, Math.round((earned - penalty) * 2) / 2))
    const pct = Math.round((finalScore / scenario.totalMarks) * 100)
    return { finalScore, totalMarks: scenario.totalMarks, pct, stepResults, validSteps }
}

export default function TheoryPracticalPage() {
    const [programFilter, setProgramFilter] = useState<"ALL" | ProgramCode>("ALL")
    const [typeFilter, setTypeFilter] = useState<"ALL" | "THEORY" | "PRACTICAL">("ALL")
    const [searchQuery, setSearchQuery] = useState("")
    const [activeItem, setActiveItem] = useState<TheoryPracticalItem | null>(null)
    const [progress, setProgress] = useState<Record<string, SavedAttempt>>(() => loadProgress())
    const [copiedScript, setCopiedScript] = useState(false)
    const [isGrading, setIsGrading] = useState(false)
    const [remoteCtrl, setRemoteCtrl] = useState<{
        simulator_enabled: boolean
        ai_examiner_enabled: boolean
        theory_mode_enabled: boolean
        practical_mode_enabled: boolean
        sequence_drill_enabled: boolean
        enabled_programs: string[]
        default_theory_minutes: number
        default_practical_minutes: number
        pass_mark_percent: number
        announcement_banner: string
    } | null>(null)

    useEffect(() => {
        api.get("/academics/tp-control/")
            .then((r) => {
                if (r?.data && typeof r.data === "object") setRemoteCtrl(r.data)
            })
            .catch(() => {})
    }, [])

    // Exam Countdown Timer
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [timerPaused, setTimerPaused] = useState(false)

    // Theory state
    const [theoryInputs, setTheoryInputs] = useState<Record<string, string[]>>({})
    const [theoryResult, setTheoryResult] = useState<TheoryGradeResult | null>(null)

    // Practical state
    const [practicalMode, setPracticalMode] = useState<"WRITE" | "SEQUENCE">("WRITE")
    const [writtenPractical, setWrittenPractical] = useState({ prep: "", exec: "", post: "" })
    const [writtenPracticalResult, setWrittenPracticalResult] = useState<WrittenPracticalGradeResult | null>(null)
    const [shuffledOptions, setShuffledOptions] = useState<OsceStep[]>([])
    const [selectedStepIds, setSelectedStepIds] = useState<string[]>([])
    const [practicalSeqGraded, setPracticalSeqGraded] = useState(false)

    const passThreshold = remoteCtrl?.pass_mark_percent ?? 50
    const isSubmitted = Boolean(theoryResult || writtenPracticalResult || practicalSeqGraded)

    useEffect(() => {
        if (!activeItem || isSubmitted || timerPaused || secondsLeft <= 0) return
        const id = window.setInterval(() => {
            setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
        }, 1000)
        return () => window.clearInterval(id)
    }, [activeItem, isSubmitted, timerPaused, secondsLeft])

    const theoryCount = useMemo(
        () => THEORY_PRACTICAL_BANK.filter((i) => i.examType === "THEORY").length,
        []
    )
    const practicalCount = useMemo(
        () => THEORY_PRACTICAL_BANK.filter((i) => i.examType === "PRACTICAL").length,
        []
    )

    const filteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return THEORY_PRACTICAL_BANK.filter((item) => {
            if (programFilter !== "ALL" && item.program !== programFilter) return false
            if (typeFilter !== "ALL" && item.examType !== typeFilter) return false
            if (!q) return true
            const body = item.examType === "THEORY" ? item.scenarioText : item.stationPrompt
            return (
                item.title.toLowerCase().includes(q) ||
                item.courseTag.toLowerCase().includes(q) ||
                body.toLowerCase().includes(q)
            )
        })
    }, [programFilter, typeFilter, searchQuery])

    const statsSummary = useMemo(() => {
        const entries = Object.values(progress)
        const completed = entries.length
        const passed = entries.filter((e) => e.passed).length
        return { completed, passed }
    }, [progress])

    function openScenario(item: TheoryPracticalItem) {
        setActiveItem(item)
        setTheoryResult(null)
        setWrittenPracticalResult(null)
        setPracticalSeqGraded(false)
        setCopiedScript(false)
        setIsGrading(false)
        setSecondsLeft(item.timeMinutes * 60)
        setTimerPaused(false)

        if (item.examType === "THEORY") {
            const init: Record<string, string[]> = {}
            item.subQuestions.forEach((sq) => {
                init[sq.id] = Array.from({ length: sq.expectedCount }, () => "")
            })
            setTheoryInputs(init)
        } else {
            setWrittenPractical({ prep: "", exec: "", post: "" })
            setShuffledOptions(shuffleArray(item.steps))
            setSelectedStepIds([])
        }
    }

    function updateTheoryLine(sqId: string, index: number, value: string) {
        setTheoryInputs((prev) => {
            const arr = [...(prev[sqId] || [])]
            arr[index] = value
            return { ...prev, [sqId]: arr }
        })
    }

    function toggleStep(id: string) {
        if (practicalSeqGraded) return
        setSelectedStepIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    function moveStep(index: number, dir: -1 | 1) {
        if (practicalSeqGraded) return
        const target = index + dir
        if (target < 0 || target >= selectedStepIds.length) return
        setSelectedStepIds((prev) => {
            const copy = [...prev]
            ;[copy[index], copy[target]] = [copy[target], copy[index]]
            return copy
        })
    }

    const seqPracticalResult = useMemo(
        () =>
            activeItem?.examType === "PRACTICAL" && practicalSeqGraded && practicalMode === "SEQUENCE"
                ? gradePracticalSequence(activeItem, selectedStepIds)
                : null,
        [activeItem, practicalSeqGraded, practicalMode, selectedStepIds]
    )

    async function handleSubmitTheory() {
        if (!activeItem || activeItem.examType !== "THEORY" || isGrading) return
        setIsGrading(true)
        const fallbackRes = gradeTheoryFallback(activeItem, theoryInputs)

        try {
            const payload = {
                exam_type: "THEORY",
                scenario_id: activeItem.id,
                program: activeItem.program,
                title: activeItem.title,
                scenario: activeItem.scenarioText,
                total_marks: activeItem.totalMarks,
                sections: activeItem.subQuestions.map((sq) => ({
                    id: sq.id,
                    label: sq.label,
                    prompt: sq.prompt,
                    max_marks: sq.marks,
                    model_points: sq.modelPoints,
                    student_answers: theoryInputs[sq.id] || [],
                })),
            }
            if (remoteCtrl?.ai_examiner_enabled !== false) {
                const res = await api.post("/academics/grade-script/", payload, { timeout: 24000 })
                if (res?.data?.ai_graded && Array.isArray(res.data?.breakdown)) {
                    const aiRes: TheoryGradeResult = {
                        aiGraded: true,
                        overallFeedback: res.data.overallFeedback || "",
                        earnedTotal: res.data.earnedTotal,
                        totalMarks: res.data.totalMarks,
                        pct: res.data.pct,
                        breakdown: res.data.breakdown,
                    }
                    setTheoryResult(aiRes)
                    setProgress(saveAttempt(activeItem.id, aiRes.earnedTotal, activeItem.totalMarks))
                    setIsGrading(false)
                    return
                }
            }
        } catch {
            // Fall through smoothly to local rubric grader
        }

        setTheoryResult(fallbackRes)
        setProgress(saveAttempt(activeItem.id, fallbackRes.earnedTotal, activeItem.totalMarks))
        setIsGrading(false)
    }

    async function handleSubmitWrittenPractical() {
        if (!activeItem || activeItem.examType !== "PRACTICAL" || isGrading) return
        setIsGrading(true)
        const fallbackRes = gradeWrittenPracticalFallback(activeItem, writtenPractical)
        const validSteps = activeItem.steps.filter((s) => !s.isDistractor)

        try {
            const payload = {
                exam_type: "PRACTICAL",
                program: activeItem.program,
                title: activeItem.title,
                scenario: activeItem.stationPrompt,
                total_marks: activeItem.totalMarks,
                checklist: validSteps,
                student_sections: writtenPractical,
            }
            const res = await api.post("/academics/grade-script/", payload, { timeout: 24000 })
            if (res.data?.ai_graded && Array.isArray(res.data?.checklist)) {
                const aiRes: WrittenPracticalGradeResult = {
                    aiGraded: true,
                    overallFeedback: res.data.overallFeedback || "",
                    finalScore: res.data.finalScore,
                    totalMarks: res.data.totalMarks,
                    pct: res.data.pct,
                    checklist: res.data.checklist,
                }
                setWrittenPracticalResult(aiRes)
                setProgress(saveAttempt(activeItem.id, aiRes.finalScore, activeItem.totalMarks))
                setIsGrading(false)
                return
            }
        } catch {
            // Fall through smoothly to local checklist grader
        }

        setWrittenPracticalResult(fallbackRes)
        setProgress(saveAttempt(activeItem.id, fallbackRes.finalScore, activeItem.totalMarks))
        setIsGrading(false)
    }

    function handleSubmitSequencePractical() {
        if (!activeItem || activeItem.examType !== "PRACTICAL") return
        const score = gradePracticalSequence(activeItem, selectedStepIds).finalScore
        setPracticalSeqGraded(true)
        setProgress(saveAttempt(activeItem.id, score, activeItem.totalMarks))
    }

    function handleCopyRevisionScript() {
        if (!activeItem) return
        let text = `NursifyGH N&MC Revision Script — [${activeItem.program}] ${activeItem.title}\n`
        if (activeItem.examType === "THEORY" && theoryResult) {
            text += `Score: ${theoryResult.earnedTotal}/${activeItem.totalMarks} (${theoryResult.pct}%)\n`
            if (theoryResult.overallFeedback) text += `Examiner Feedback: ${theoryResult.overallFeedback}\n`
            text += `\nScenario: ${activeItem.scenarioText}\n\n`
            activeItem.subQuestions.forEach((sq) => {
                text += `${sq.label}\nOfficial Key Points:\n`
                sq.modelPoints.forEach((pt) => {
                    text += ` - ${pt}\n`
                })
                text += `\n`
            })
        } else if (activeItem.examType === "PRACTICAL") {
            const sc = writtenPracticalResult?.finalScore ?? seqPracticalResult?.finalScore ?? 0
            text += `OSCE Score: ${sc}/${activeItem.totalMarks}\n\nOfficial 20-Mark OSCE Checklist:\n`
            activeItem.steps
                .filter((s) => !s.isDistractor)
                .forEach((s, i) => {
                    text += `${i + 1}. [${s.stage}] ${s.text} (${s.marks} marks)\n`
                })
        }
        if (activeItem.examinerPearl) {
            text += `\nExaminer's Clinical Pearl: ${activeItem.examinerPearl}\n`
        }
        navigator.clipboard?.writeText(text)
        setCopiedScript(true)
        window.setTimeout(() => setCopiedScript(false), 2500)
    }

    const aiTutorLink = useMemo(() => {
        if (!activeItem) return "/ai-tutor"
        if (activeItem.examType === "THEORY") {
            const studentSummary = activeItem.subQuestions
                .map((sq) => `${sq.label}: ${(theoryInputs[sq.id] || []).filter(Boolean).join("; ")}`)
                .join("\n")
            const prompt = `Discuss my Ghanaian N&MC ${activeItem.program} theory script for "${activeItem.title}" (20 marks):\nScenario: ${activeItem.scenarioText}\n\nMy Written Answer:\n${studentSummary}`
            return `/ai-tutor?prompt=${encodeURIComponent(prompt)}`
        }
        const prompt =
            practicalMode === "WRITE"
                ? `Discuss my Ghanaian N&MC ${activeItem.program} written practical answer for "${activeItem.title}":\nPreparation: ${writtenPractical.prep}\nExecution: ${writtenPractical.exec}\nPost-Procedure: ${writtenPractical.post}`
                : `Explain the step-by-step sequence and clinical rationale for this Ghanaian N&MC ${activeItem.program} OSCE station: "${activeItem.title}"`
        return `/ai-tutor?prompt=${encodeURIComponent(prompt)}`
    }, [activeItem, theoryInputs, practicalMode, writtenPractical])

    return (
        <AppShell>
            <div className="mx-auto max-w-4xl space-y-5 pb-16">
                {/* Header & Exam Clock */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    AI Semantic Examiner + N&amp;MC Rubric
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    Completed: {statsSummary.completed}/{THEORY_PRACTICAL_BANK.length} • Passed:{" "}
                                    {statsSummary.passed}
                                </span>
                            </div>
                            <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                                Theory &amp; Practical Exam Simulator
                            </h1>
                            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                                Write full-sentence answers in your own words across RGN, RM, RPN, CHN, NAC, and NAP. Our AI Examiner recognizes clinical synonyms, awards partial credit, and shows the official N&amp;MC marking scheme.
                            </p>
                        </div>

                        {activeItem && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div
                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                                        secondsLeft <= 60
                                            ? "border-rose-300 bg-rose-50 text-rose-800"
                                            : secondsLeft <= 180
                                            ? "border-amber-300 bg-amber-50 text-amber-900"
                                            : "border-slate-200 bg-slate-50 text-slate-800"
                                    }`}
                                >
                                    <span>⏱ {formatClock(secondsLeft)}</span>
                                    {!isSubmitted && (
                                        <button
                                            type="button"
                                            onClick={() => setTimerPaused((p) => !p)}
                                            className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-100"
                                        >
                                            {timerPaused ? "Resume" : "Pause"}
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveItem(null)}
                                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    ← All Stations
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {!activeItem ? (
                    <>
                        {/* Filters & Search */}
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap gap-2">
                                {PROGRAMS.map((p) => (
                                    <button
                                        key={p.code}
                                        type="button"
                                        onClick={() => setProgramFilter(p.code)}
                                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                            programFilter === p.code
                                                ? "bg-emerald-700 text-white"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap gap-2">
                                    {(
                                        [
                                            { code: "ALL", label: `All Modes (${THEORY_PRACTICAL_BANK.length})` },
                                            { code: "THEORY", label: `Theory & Care Plans (${theoryCount})` },
                                            { code: "PRACTICAL", label: `Practical / OSCE (${practicalCount})` },
                                        ] as const
                                    ).map((t) => (
                                        <button
                                            key={t.code}
                                            type="button"
                                            onClick={() => setTypeFilter(t.code)}
                                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                                typeFilter === t.code
                                                    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search condition, drug, or procedure..."
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none sm:w-64"
                                />
                            </div>
                        </div>

                        {/* Scenario Cards */}
                        {filteredItems.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-600">
                                No matching Theory or Practical stations found. Try clearing your search filter.
                            </div>
                        ) : (
                            <div className="grid gap-3.5 sm:grid-cols-2">
                                {filteredItems.map((item) => {
                                    const saved = progress[item.id]
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-300"
                                        >
                                            <div>
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                                                            {item.program}
                                                        </span>
                                                        <span
                                                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                                                item.examType === "THEORY"
                                                                    ? "bg-amber-50 text-amber-800"
                                                                    : "bg-sky-50 text-sky-800"
                                                            }`}
                                                        >
                                                            {item.examType === "THEORY"
                                                                ? "Theory • 20 Marks"
                                                                : "Practical OSCE • 20 Marks"}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            {item.timeMinutes} mins
                                                        </span>
                                                    </div>

                                                    {saved && (
                                                        <span
                                                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                                saved.passed
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : "bg-amber-100 text-amber-800"
                                                            }`}
                                                        >
                                                            Best: {saved.bestScore}/{saved.totalMarks}
                                                        </span>
                                                    )}
                                                </div>

                                                <h2 className="mt-2.5 text-base font-bold text-slate-900">{item.title}</h2>
                                                <p className="mt-1 text-xs font-medium text-emerald-700">{item.courseTag}</p>
                                                <p className="mt-2 line-clamp-3 text-xs text-slate-600">
                                                    {item.examType === "THEORY" ? item.scenarioText : item.stationPrompt}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => openScenario(item)}
                                                className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                                            >
                                                {item.examType === "THEORY"
                                                    ? saved
                                                        ? "Retake Theory Questions →"
                                                        : "Answer Theory Questions →"
                                                    : saved
                                                    ? "Repeat Practical Station →"
                                                    : "Attempt Practical Station →"}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                ) : activeItem.examType === "THEORY" ? (
                    /* ==================== THEORY EXAM VIEW ==================== */
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-md bg-slate-900 px-2 py-0.5 font-bold text-white">
                                    {activeItem.program}
                                </span>
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                                    Structured Theory • {activeItem.totalMarks} Marks
                                </span>
                                <span className="text-slate-500">{activeItem.courseTag}</span>
                            </div>
                            <h2 className="mt-2 text-lg font-bold text-slate-900">{activeItem.title}</h2>
                            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 sm:text-sm">
                                <strong>Clinical Scenario:</strong> {activeItem.scenarioText}
                            </div>
                            <p className="mt-2.5 text-xs text-slate-500">
                                Write complete clinical sentences in your own words. Our AI Examiner evaluates meaning, clinical synonyms, and rationales for partial or full credit.
                            </p>
                        </div>

                        {theoryResult && (
                            <div
                                className={`space-y-3 rounded-2xl border p-5 ${
                                    theoryResult.pct >= passThreshold
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                                        : "border-amber-300 bg-amber-50 text-amber-950"
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-xs font-bold uppercase tracking-wide">
                                                Examiner Marking Summary (N&amp;MC 50% Pass Standard)
                                            </p>
                                            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                                {theoryResult.aiGraded
                                                    ? "✨ Graded by AI Semantic Examiner"
                                                    : "⚡ Instant Rubric Grader"}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xl font-extrabold">
                                            Score: {theoryResult.earnedTotal} / {theoryResult.totalMarks} ({theoryResult.pct}%) —{" "}
                                            {theoryResult.pct >= passThreshold ? "PASS" : "NEEDS REVISION"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyRevisionScript}
                                            className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50"
                                        >
                                            {copiedScript ? "✓ Copied Revision Sheet" : "Copy Revision Script"}
                                        </button>
                                        <Link
                                            to={aiTutorLink}
                                            className="rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-900"
                                        >
                                            Discuss With AI Tutor →
                                        </Link>
                                    </div>
                                </div>

                                {theoryResult.overallFeedback && (
                                    <div className="rounded-xl border border-emerald-200 bg-white/95 p-3.5 text-xs text-slate-800">
                                        <strong className="text-slate-900">📋 Examiner&apos;s Overall Feedback:</strong>{" "}
                                        {theoryResult.overallFeedback}
                                    </div>
                                )}

                                {activeItem.examinerPearl && (
                                    <div className="rounded-xl border border-emerald-200 bg-white/90 p-3.5 text-xs text-slate-800">
                                        <strong className="text-emerald-800">💡 N&amp;MC Examiner&apos;s Clinical Pearl:</strong>{" "}
                                        {activeItem.examinerPearl}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeItem.subQuestions.map((sq) => {
                            const lines = theoryInputs[sq.id] || []
                            const gradedSection = theoryResult?.breakdown.find((b) => b.id === sq.id)
                            const isSubmittedTheory = Boolean(theoryResult)
                            return (
                                <div key={sq.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">{sq.label}</h3>
                                        {gradedSection && (
                                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                                                Awarded: {gradedSection.earned} / {gradedSection.maxMarks} ({gradedSection.hits}/
                                                {gradedSection.totalClusters} points)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-slate-800 sm:text-sm">{sq.prompt}</p>
                                    <div className="space-y-2.5">
                                        {lines.map((val, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <span className="mt-2.5 text-xs font-bold text-slate-400">{idx + 1}.</span>
                                                <textarea
                                                    rows={3}
                                                    disabled={isSubmittedTheory || isGrading}
                                                    value={val}
                                                    onChange={(e) => updateTheoryLine(sq.id, idx, e.target.value)}
                                                    placeholder={spoilerFreePlaceholder(sq.placeholder, idx)}
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none disabled:bg-slate-50 sm:text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {gradedSection && (
                                        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                                            {gradedSection.feedback && (
                                                <p className="rounded-lg bg-white p-2.5 text-slate-800 shadow-2xs">
                                                    <strong className="text-emerald-800">Examiner Note:</strong>{" "}
                                                    {gradedSection.feedback}
                                                </p>
                                            )}
                                            <p className="font-bold text-slate-900">Official Marking Scheme &amp; Script Feedback:</p>
                                            <ul className="space-y-1.5 text-slate-700">
                                                {gradedSection.pointResults.map((pr, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span
                                                            className={
                                                                pr.matched
                                                                    ? "shrink-0 font-bold text-emerald-700"
                                                                    : "shrink-0 font-bold text-rose-600"
                                                            }
                                                        >
                                                            {pr.matched ? "✓ Covered:" : "✗ Missed:"}
                                                        </span>
                                                        <span>{pr.point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        <div className="flex flex-wrap justify-end gap-2">
                            {!theoryResult ? (
                                <button
                                    type="button"
                                    disabled={isGrading}
                                    onClick={handleSubmitTheory}
                                    className="rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60 sm:text-sm"
                                >
                                    {isGrading
                                        ? "AI Examiner Marking Script..."
                                        : "Submit & Mark Theory Script (20 Marks)"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openScenario(activeItem)}
                                    className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 sm:text-sm"
                                >
                                    Retake This Theory Question
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ==================== PRACTICAL / OSCE VIEW ==================== */
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-md bg-slate-900 px-2 py-0.5 font-bold text-white">
                                        {activeItem.program}
                                    </span>
                                    <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-800">
                                        Practical OSCE • {activeItem.totalMarks} Marks
                                    </span>
                                    <span className="text-slate-500">{activeItem.courseTag}</span>
                                </div>
                                <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                                    <button
                                        type="button"
                                        disabled={isGrading}
                                        onClick={() => {
                                            setPracticalMode("WRITE")
                                            setWrittenPracticalResult(null)
                                            setPracticalSeqGraded(false)
                                        }}
                                        className={`rounded-lg px-3 py-1 transition ${
                                            practicalMode === "WRITE"
                                                ? "bg-white text-emerald-800 shadow-xs"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        ✍️ Write Answer
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isGrading}
                                        onClick={() => {
                                            setPracticalMode("SEQUENCE")
                                            setWrittenPracticalResult(null)
                                            setPracticalSeqGraded(false)
                                        }}
                                        className={`rounded-lg px-3 py-1 transition ${
                                            practicalMode === "SEQUENCE"
                                                ? "bg-white text-emerald-800 shadow-xs"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        🧩 Sequence Drill
                                    </button>
                                </div>
                            </div>
                            <h2 className="mt-2 text-lg font-bold text-slate-900">{activeItem.title}</h2>
                            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 sm:text-sm">
                                <strong>Practical Station Demand:</strong> {activeItem.stationPrompt}
                            </div>
                        </div>

                        {(writtenPracticalResult || seqPracticalResult) && (
                            <div
                                className={`space-y-3 rounded-2xl border p-5 ${
                                    (writtenPracticalResult?.pct ?? seqPracticalResult?.pct ?? 0) >= passThreshold
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                                        : "border-amber-300 bg-amber-50 text-amber-950"
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-xs font-bold uppercase tracking-wide">OSCE Examiner Marking Result</p>
                                            {writtenPracticalResult && (
                                                <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                                    {writtenPracticalResult.aiGraded
                                                        ? "✨ Graded by AI Semantic Examiner"
                                                        : "⚡ Instant Checklist Grader"}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xl font-extrabold">
                                            Score: {writtenPracticalResult?.finalScore ?? seqPracticalResult?.finalScore} /{" "}
                                            {activeItem.totalMarks} ({writtenPracticalResult?.pct ?? seqPracticalResult?.pct}%) —{" "}
                                            {(writtenPracticalResult?.pct ?? seqPracticalResult?.pct ?? 0) >= passThreshold
                                                ? "COMPETENT"
                                                : "REPEAT STATION"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyRevisionScript}
                                            className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50"
                                        >
                                            {copiedScript ? "✓ Copied Checklist" : "Copy OSCE Checklist"}
                                        </button>
                                        <Link
                                            to={aiTutorLink}
                                            className="rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-900"
                                        >
                                            Discuss With AI Tutor →
                                        </Link>
                                    </div>
                                </div>

                                {writtenPracticalResult?.overallFeedback && (
                                    <div className="rounded-xl border border-emerald-200 bg-white/95 p-3.5 text-xs text-slate-800">
                                        <strong className="text-slate-900">📋 Examiner&apos;s Overall Feedback:</strong>{" "}
                                        {writtenPracticalResult.overallFeedback}
                                    </div>
                                )}

                                {activeItem.examinerPearl && (
                                    <div className="rounded-xl border border-emerald-200 bg-white/90 p-3.5 text-xs text-slate-800">
                                        <strong className="text-emerald-800">💡 N&amp;MC Examiner&apos;s Clinical Pearl:</strong>{" "}
                                        {activeItem.examinerPearl}
                                    </div>
                                )}
                            </div>
                        )}

                        {practicalMode === "WRITE" ? (
                            <div className="space-y-4">
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        1. Preparation Phase (Greeting, Consent, Hand Hygiene, Equipment &amp; Privacy)
                                    </h3>
                                    <textarea
                                        rows={3}
                                        disabled={Boolean(writtenPracticalResult) || isGrading}
                                        value={writtenPractical.prep}
                                        onChange={(e) => setWrittenPractical((p) => ({ ...p, prep: e.target.value }))}
                                        placeholder="Write full sentences describing patient identification, consent, hand hygiene, trolley assembly, and privacy..."
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none disabled:bg-slate-50 sm:text-sm"
                                    />
                                </div>

                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        2. Procedure Execution (Step-by-Step Clinical Actions &amp; Safety Checks)
                                    </h3>
                                    <textarea
                                        rows={5}
                                        disabled={Boolean(writtenPracticalResult) || isGrading}
                                        value={writtenPractical.exec}
                                        onChange={(e) => setWrittenPractical((p) => ({ ...p, exec: e.target.value }))}
                                        placeholder="Write out the step-by-step clinical actions, measurements, asepsis, and safety checks in full sentences..."
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none disabled:bg-slate-50 sm:text-sm"
                                    />
                                </div>

                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        3. Post-Procedure Care (Comfort, Waste/Sharps Disposal, Handwashing &amp; Documentation)
                                    </h3>
                                    <textarea
                                        rows={3}
                                        disabled={Boolean(writtenPracticalResult) || isGrading}
                                        value={writtenPractical.post}
                                        onChange={(e) => setWrittenPractical((p) => ({ ...p, post: e.target.value }))}
                                        placeholder="Write how you leave the patient comfortable, dispose waste/sharps safely, wash hands, and document..."
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none disabled:bg-slate-50 sm:text-sm"
                                    />
                                </div>

                                {writtenPracticalResult && (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs">
                                        <h3 className="text-sm font-bold text-slate-900">Official 20-Mark OSCE Checklist Breakdown</h3>
                                        <ul className="mt-3 space-y-2 text-slate-700">
                                            {writtenPracticalResult.checklist.map((item) => (
                                                <li key={item.step.id} className="flex items-start gap-2">
                                                    <span
                                                        className={
                                                            item.awarded > 0
                                                                ? "shrink-0 font-bold text-emerald-700"
                                                                : "shrink-0 font-bold text-rose-600"
                                                        }
                                                    >
                                                        {item.awarded > 0
                                                            ? `✓ +${item.awarded}/${item.step.marks}m`
                                                            : `✗ 0/${item.step.marks}m`}
                                                    </span>
                                                    <span>
                                                        <strong>[{item.step.stage}]</strong> {item.step.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex flex-wrap justify-end gap-2">
                                    {!writtenPracticalResult ? (
                                        <button
                                            type="button"
                                            disabled={
                                                isGrading ||
                                                (!writtenPractical.prep.trim() &&
                                                    !writtenPractical.exec.trim() &&
                                                    !writtenPractical.post.trim())
                                            }
                                            onClick={handleSubmitWrittenPractical}
                                            className="rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 sm:text-sm"
                                        >
                                            {isGrading
                                                ? "AI Examiner Marking Practical..."
                                                : "Submit & Mark Written Practical (20 Marks)"}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openScenario(activeItem)}
                                            className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 sm:text-sm"
                                        >
                                            Retake Practical Question
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4">
                                        <h3 className="text-sm font-bold text-slate-900">1. Tap Valid Clinical Actions (Avoid Traps)</h3>
                                        <div className="space-y-2">
                                            {shuffledOptions.map((step) => {
                                                const isPicked = selectedStepIds.includes(step.id)
                                                return (
                                                    <button
                                                        key={step.id}
                                                        type="button"
                                                        disabled={practicalSeqGraded}
                                                        onClick={() => toggleStep(step.id)}
                                                        className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                                                            isPicked
                                                                ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-950"
                                                                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span>{step.text}</span>
                                                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                                                {isPicked ? "Selected ✓" : "+ Add"}
                                                            </span>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            2. Your Ordered OSCE Sequence ({selectedStepIds.length})
                                        </h3>
                                        {selectedStepIds.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                                                Tap steps on the left to build your sequence here.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedStepIds.map((id, idx) => {
                                                    const step = activeItem.steps.find((s) => s.id === id)!
                                                    const res = seqPracticalResult?.stepResults.find((r) => r.step.id === id)
                                                    return (
                                                        <div
                                                            key={id}
                                                            className={`rounded-xl border p-3 text-xs ${
                                                                !res
                                                                    ? "border-slate-200 bg-slate-50"
                                                                    : res.status === "distractor"
                                                                    ? "border-rose-300 bg-rose-50 text-rose-950"
                                                                    : res.status === "out-of-order"
                                                                    ? "border-amber-300 bg-amber-50 text-amber-950"
                                                                    : "border-emerald-300 bg-emerald-50 text-emerald-950"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <span className="font-bold">Step {idx + 1}:</span> {step.text}
                                                                    {res?.status === "distractor" && (
                                                                        <p className="mt-1 font-semibold text-rose-700">
                                                                            ⛔ Unsafe Trap (-2 marks): {step.distractorReason}
                                                                        </p>
                                                                    )}
                                                                    {res?.status === "out-of-order" && (
                                                                        <p className="mt-1 font-semibold text-amber-800">
                                                                            ⚠ Valid step, out of sequence (+{res.marksAwarded}/{step.marks})
                                                                        </p>
                                                                    )}
                                                                    {res?.status === "correct-order" && (
                                                                        <p className="mt-1 font-semibold text-emerald-800">
                                                                            ✓ Correct sequence (+{res.marksAwarded}/{step.marks})
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {!practicalSeqGraded && (
                                                                    <div className="flex shrink-0 items-center gap-1">
                                                                        <button type="button" onClick={() => moveStep(idx, -1)} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold">↑</button>
                                                                        <button type="button" onClick={() => moveStep(idx, 1)} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold">↓</button>
                                                                        <button type="button" onClick={() => toggleStep(id)} className="rounded border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700">×</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap justify-end gap-2">
                                    {!practicalSeqGraded ? (
                                        <button
                                            type="button"
                                            disabled={selectedStepIds.length === 0}
                                            onClick={handleSubmitSequencePractical}
                                            className="rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 sm:text-sm"
                                        >
                                            Submit &amp; Auto-Mark Sequence (20 Marks)
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openScenario(activeItem)}
                                            className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 sm:text-sm"
                                        >
                                            Repeat Sequence Drill
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    )
}
