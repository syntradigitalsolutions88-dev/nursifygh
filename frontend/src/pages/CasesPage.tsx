import { Link } from "react-router-dom"
import { buildAiTutorUrl } from "../utils/tutorPrompt"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import {
    fetchClinicalCases,
    resetCaseAttempt,
    submitCaseStageAnswer,
    type ClinicalCaseItem,
    type StageAnswerFeedback,
} from "../api/cases"

interface LocalCaseStage {
    id?: string
    step_number: number
    title: string
    vitals_summary: string
    clinical_update: string
    question_prompt: string
    options: Array<{ key: string; text: string }>
    correct_key: string
    rationale: string
    nursing_takeaway: string
}

interface LocalClinicalCase extends ClinicalCaseItem {
    local_stages: LocalCaseStage[]
}

const FALLBACK_CASES: LocalClinicalCase[] = [
    {
        id: "case-malaria-paed",
        program: "GENERAL",
        program_label: "RGN • General Nursing",
        title: "Fever, Lethargy & Vomiting in a 3-Year-Old Child",
        condition_tag: "Paediatric Severe Malaria",
        difficulty: "INTERMEDIATE",
        difficulty_display: "Intermediate",
        course_code: "PAED 201",
        learning_objectives: "Recognise paediatric danger signs and prioritise safe supportive and antimalarial care.",
        stage_count: 2,
        setting: "Paediatric Ward / Out-Patient Clinic",
        patient_summary:
            "A 3-year-old child weighing 12 kg is brought in by a caregiver with 2 days of high fever, repeated vomiting, and marked drowsiness.",
        attempt: null,
        stages: [
            {
                step_number: 1,
                id: "stage-1-1",
                title: "Initial Triage & Danger Signs",
                vitals_summary: "T 39.4°C • P 136/min • RR 34/min • Weight 12 kg",
                clinical_update:
                    "The child is lethargic, cannot keep fluids down due to vomiting, and has a positive malaria rapid diagnostic test.",
                question_prompt: "What is your immediate nursing priority on arrival?",
                options: [
                    { key: "A", text: "Assess ABCs and danger signs, check blood glucose/temperature, and prepare urgent parenteral antimalarial & supportive care" },
                    { key: "B", text: "Send the caregiver home with oral tablets and return in 5 days" },
                    { key: "C", text: "Delay assessment until lab smear results return in 3 hours" },
                    { key: "D", text: "Give a cold ice bath to drop temperature abruptly" },
                ],
            },
            {
                step_number: 2,
                id: "stage-2-2",
                title: "Weight-Based Supportive & Safety Care",
                vitals_summary: "T 38.6°C • P 124/min • RR 28/min • Alert to voice",
                clinical_update:
                    "Parenteral artesunate therapy is initiated and IV access is patent. Caregiver asks how to prevent future episodes.",
                question_prompt: "Which nursing instruction best strengthens ongoing safety and prevention?",
                options: [
                    { key: "A", text: "Monitor vitals, hydration, and blood glucose closely, complete prescribed follow-up treatment once oral intake is safe, and use an insecticide-treated bed net nightly" },
                    { key: "B", text: "Stop all follow-up once the child's fever drops for 2 hours" },
                    { key: "C", text: "Avoid all fluids until discharge" },
                    { key: "D", text: "Rely only on herbal steam baths" },
                ],
            },
        ],
        local_stages: [
            {
                step_number: 1,
                id: "stage-3-1",
                title: "Initial Triage & Danger Signs",
                vitals_summary: "T 39.4°C • P 136/min • RR 34/min • Weight 12 kg",
                clinical_update:
                    "The child is lethargic, cannot keep fluids down due to vomiting, and has a positive malaria rapid diagnostic test.",
                question_prompt: "What is your immediate nursing priority on arrival?",
                options: [
                    { key: "A", text: "Assess ABCs and danger signs, check blood glucose/temperature, and prepare urgent parenteral antimalarial & supportive care" },
                    { key: "B", text: "Send the caregiver home with oral tablets and return in 5 days" },
                    { key: "C", text: "Delay assessment until lab smear results return in 3 hours" },
                    { key: "D", text: "Give a cold ice bath to drop temperature abruptly" },
                ],
                correct_key: "A",
                rationale:
                    "Lethargy and persistent vomiting in a young child with malaria are clinical danger signs requiring prompt stabilization, glucose/vital monitoring, and parenteral therapy.",
                nursing_takeaway:
                    "Always pair danger-sign recognition in children with airway/breathing/circulation checks and blood glucose awareness.",
            },
            {
                step_number: 2,
                id: "stage-4-2",
                title: "Weight-Based Supportive & Safety Care",
                vitals_summary: "T 38.6°C • P 124/min • RR 28/min • Alert to voice",
                clinical_update:
                    "Parenteral artesunate therapy is initiated and IV access is patent. Caregiver asks how to prevent future episodes.",
                question_prompt: "Which nursing instruction best strengthens ongoing safety and prevention?",
                options: [
                    { key: "A", text: "Monitor vitals, hydration, and blood glucose closely, complete prescribed follow-up treatment once oral intake is safe, and use an insecticide-treated bed net nightly" },
                    { key: "B", text: "Stop all follow-up once the child's fever drops for 2 hours" },
                    { key: "C", text: "Avoid all fluids until discharge" },
                    { key: "D", text: "Rely only on herbal steam baths" },
                ],
                correct_key: "A",
                rationale:
                    "Safe recovery depends on close monitoring, completing full prescribed antimalarial therapy, and consistent vector prevention such as treated bed nets.",
                nursing_takeaway:
                    "Clear caregiver discharge teaching bridges acute hospital care and long-term community prevention.",
            },
        ],
    },
]

export default function CasesPage() {
    const queryClient = useQueryClient()
    const [difficulty, setDifficulty] = useState<string>("")
    const [programFilter, setProgramFilter] = useState<string>("")
    const [activeCaseId, setActiveCaseId] = useState<string | null>(null)
    const [stepIndex, setStepIndex] = useState<number>(0)
    const [selectedKey, setSelectedKey] = useState<string>("")
    const [feedback, setFeedback] = useState<StageAnswerFeedback | null>(null)
    const [localAnswers, setLocalAnswers] = useState<Record<string, Record<string, string>>>({})

    const { data: apiCases = [], isLoading, error } = useQuery({
        queryKey: ["clinical-cases", difficulty, programFilter],
        queryFn: () =>
            fetchClinicalCases({
                difficulty: difficulty || undefined,
                program: programFilter || undefined,
            }),
        retry: 1,
    })

    const usingFallback = Boolean(error) || (!isLoading && apiCases.length === 0 && !programFilter && !difficulty)

    const cases: ClinicalCaseItem[] = useMemo(() => {
        const baseList: ClinicalCaseItem[] = usingFallback ? FALLBACK_CASES : apiCases
        return baseList.filter((c) => {
            if (difficulty && c.difficulty !== difficulty) return false
            if (programFilter && c.program !== programFilter) return false
            return true
        })
    }, [usingFallback, apiCases, difficulty, programFilter])

    const activeCase: ClinicalCaseItem | undefined = cases.find((c) => c.id === activeCaseId)
    const activeStage = activeCase?.stages[stepIndex]

    const answerMutation = useMutation({
        mutationFn: async ({ caseId, step, key }: { caseId: string; step: number; key: string }) => {
            if (usingFallback) {
                const localCase = FALLBACK_CASES.find((c) => c.id === caseId)
                const localStage = localCase?.local_stages.find((s) => s.step_number === step)
                const isCorrect = localStage ? localStage.correct_key === key : false
                const prevMap = localAnswers[caseId] || {}
                const nextMap = { ...prevMap, [String(step)]: key }
                setLocalAnswers((prev) => ({ ...prev, [caseId]: nextMap }))
                const totalSteps = localCase?.local_stages.length || 1
                const correctSteps = (localCase?.local_stages || []).filter(
                    (st) => nextMap[String(st.step_number)] === st.correct_key
                ).length

                const result: StageAnswerFeedback = {
                    selected_key: key,
                    is_correct: isCorrect,
                    correct_key: localStage?.correct_key || "A",
                    rationale: localStage?.rationale || "Review clinical priorities and safety cues for this stage.",
                    nursing_takeaway: localStage?.nursing_takeaway || "",
                    attempt: {
                        current_step: Math.min(step + 1, totalSteps),
                        total_steps: totalSteps,
                        correct_steps: correctSteps,
                        completed_at: step >= totalSteps ? new Date().toISOString() : null,
                        answers_map: nextMap,
                    },
                }
                return result
            }
            return submitCaseStageAnswer(caseId, step, key)
        },
        onSuccess: (data) => {
            setFeedback(data)
            if (!usingFallback) {
                queryClient.invalidateQueries({ queryKey: ["clinical-cases"] })
            }
        },
    })

    function openCase(c: ClinicalCaseItem) {
        setActiveCaseId(c.id)
        const startIdx = c.attempt?.current_step
            ? Math.min(Math.max(c.attempt.current_step - 1, 0), Math.max(c.stages.length - 1, 0))
            : 0
        setStepIndex(startIdx)
        const existingKey =
            localAnswers[c.id]?.[String(c.stages[startIdx]?.step_number ?? 1)] ||
            c.attempt?.answers_map?.[String(c.stages[startIdx]?.step_number ?? 1)] ||
            ""
        setSelectedKey(existingKey)
        setFeedback(null)
    }

    async function replayCase(c: ClinicalCaseItem) {
        setStepIndex(0)
        setSelectedKey("")
        setFeedback(null)
        if (usingFallback) {
            setLocalAnswers((prev) => {
                const copy = { ...prev }
                delete copy[c.id]
                return copy
            })
        } else {
            await resetCaseAttempt(c.id)
            queryClient.invalidateQueries({ queryKey: ["clinical-cases"] })
        }
    }

    return (
        <AppShell>
            <div className="max-w-3xl space-y-5 pb-24 sm:pb-8">
                <div>
                    <h1 className="text-h1">Clinical Case Studies</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Step-by-step Ghanaian patient scenarios across RGN, RM, RPN, CHN, NAC, and NAP.
                    </p>
                </div>

                {activeCase && activeStage ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveCaseId(null)
                                    setFeedback(null)
                                }}
                                className="text-sm font-medium text-brand-700 hover:underline"
                            >
                                ← All Clinical Cases
                            </button>
                            <span className="text-sm font-semibold text-on-surface-muted">
                                Stage {stepIndex + 1} of {activeCase.stages.length}
                            </span>
                        </div>

                        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {activeCase.program_label && <Badge variant="neutral">{activeCase.program_label}</Badge>}
                                <Badge variant="neutral">{activeCase.condition_tag}</Badge>
                                <Badge variant="success">{activeCase.difficulty_display}</Badge>
                                <span className="text-sm text-slate-700">{activeCase.setting}</span>
                            </div>

                            <h2 className="text-h2">{activeCase.title}</h2>

                            <div className="rounded-xl bg-gray-50 border border-border p-3.5 text-base text-on-surface leading-relaxed">
                                <span className="font-bold text-on-surface">Presenting Scenario: </span>
                                {activeCase.patient_summary}
                            </div>

                            <div className="border-t border-border pt-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                    <h3 className="text-base font-bold text-on-surface">
                                        {activeStage.step_number}. {activeStage.title}{" "}
                                        <Link
                                            to={buildAiTutorUrl(
                                                `Case: ${activeCase.title} | Stage ${activeStage.step_number}: ${activeStage.title} | Vitals: ${activeStage.vitals_summary} | Update: ${activeStage.clinical_update} | Question: ${activeStage.question_prompt}`
                                            )}
                                            className="ml-2 inline-flex shrink-0 items-center whitespace-nowrap text-sm font-semibold text-brand-700 underline"
                                        >
                                            Ask AI Tutor about this case stage →
                                        </Link>
                                    </h3>
                                    {activeStage.vitals_summary && (
                                        <span className="font-mono text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-md">
                                            {activeStage.vitals_summary}
                                        </span>
                                    )}
                                </div>

                                <p className="text-[15px] text-slate-700 leading-relaxed">
                                    {activeStage.clinical_update}
                                </p>

                                <p className="pt-1 text-sm font-semibold text-on-surface">
                                    {activeStage.question_prompt}
                                </p>

                                <div className="space-y-2">
                                    {activeStage.options.map((opt) => {
                                        const isSelected = selectedKey === opt.key
                                        return (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedKey(opt.key)
                                                    setFeedback(null)
                                                }}
                                                className={`w-full text-left rounded-xl border p-3.5 text-base transition ${isSelected
                                                        ? "border-brand-700 bg-brand-50/50 font-medium text-on-surface"
                                                        : "border-border bg-white text-on-surface hover:bg-gray-50"
                                                    }`}
                                            >
                                                <span className="font-bold mr-2">{opt.key}.</span>
                                                {opt.text}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                                    <Button
                                        disabled={!selectedKey}
                                        loading={answerMutation.isPending}
                                        onClick={() =>
                                            answerMutation.mutate({
                                                caseId: activeCase.id,
                                                step: activeStage.step_number,
                                                key: selectedKey,
                                            })
                                        }
                                    >
                                        Check Decision
                                    </Button>

                                    {feedback && stepIndex + 1 < activeCase.stages.length && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                const nextIdx = stepIndex + 1
                                                setStepIndex(nextIdx)
                                                setSelectedKey(
                                                    feedback.attempt.answers_map?.[
                                                    String(activeCase.stages[nextIdx].step_number)
                                                    ] || ""
                                                )
                                                setFeedback(null)
                                            }}
                                        >
                                            Next Stage →
                                        </Button>
                                    )}
                                </div>

                                {feedback && (
                                    <div className="mt-4 space-y-2">
                                        <Alert variant={feedback.is_correct ? "success" : "warning"}>
                                            {feedback.is_correct
                                                ? "Strong clinical reasoning! "
                                                : `Review this point (Recommended option: ${feedback.correct_key || "—"}). `}
                                            {feedback.rationale}
                                        </Alert>
                                        {feedback.nursing_takeaway && (
                                            <p className="text-sm text-slate-700 px-1">
                                                <span className="font-semibold text-on-surface">Key Takeaway: </span>
                                                {feedback.nursing_takeaway}
                                            </p>
                                        )}
                                        {stepIndex + 1 >= activeCase.stages.length && (
                                            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-on-surface">
                                                        Case Completed — Score: {feedback.attempt.correct_steps}/{feedback.attempt.total_steps}
                                                    </p>
                                                    <p className="text-sm text-slate-700">
                                                        Review rationales above or reset to replay from Stage 1.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => replayCase(activeCase)}
                                                    >
                                                        Replay Case
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setActiveCaseId(null)
                                                            setFeedback(null)
                                                        }}
                                                    >
                                                        All Cases
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Programme Filter */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                ["", "All Programmes"],
                                ["GENERAL", "RGN (General)"],
                                ["MIDWIFERY", "RM (Midwifery)"],
                                ["PSYCHIATRIC", "RPN (Psychiatric)"],
                                ["COMMUNITY", "CHN (Community)"],
                                ["NAC", "NAC"],
                                ["NAP", "NAP"],
                            ].map(([val, label]) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setProgramFilter(val)}
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${programFilter === val
                                            ? "bg-brand-700 text-white"
                                            : "border border-border bg-white text-on-surface-muted hover:text-on-surface"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Difficulty Filter */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                ["", "All Levels"],
                                ["BEGINNER", "Beginner"],
                                ["INTERMEDIATE", "Intermediate"],
                                ["ADVANCED", "Advanced"],
                            ].map(([val, label]) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setDifficulty(val)}
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${difficulty === val
                                            ? "bg-brand-700 text-white"
                                            : "border border-border bg-white text-on-surface-muted hover:text-on-surface"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {isLoading ? (
                            <div className="rounded-xl border border-border bg-white p-10 text-center text-[15px] text-slate-700">
                                Loading clinical cases…
                            </div>
                        ) : cases.length === 0 ? (
                            <div className="rounded-xl border border-border bg-white p-8 text-center text-[15px] text-slate-700">
                                No clinical cases match the selected programme and difficulty filters.
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {cases.map((c) => {
                                    const localMap = localAnswers[c.id]
                                    return (
                                        <div
                                            key={c.id}
                                            className="rounded-xl border border-border bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                                        >
                                            <div className="space-y-1.5 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {c.program_label && <Badge variant="neutral">{c.program_label}</Badge>}
                                                    <Badge variant="neutral">{c.condition_tag}</Badge>
                                                    <Badge variant="success">{c.difficulty_display}</Badge>
                                                    {c.attempt?.completed_at && (
                                                        <Badge variant="warning">
                                                            Score: {c.attempt.correct_steps}/{c.attempt.total_steps}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h2 className="text-h4 text-on-surface">{c.title}</h2>
                                                <p className="text-base text-on-surface-muted line-clamp-2">
                                                    {c.patient_summary}
                                                </p>
                                            </div>
                                            <Button onClick={() => openCase(c)} className="shrink-0">
                                                {c.attempt || localMap ? "Continue Case" : "Start Case"}
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppShell>
    )
}