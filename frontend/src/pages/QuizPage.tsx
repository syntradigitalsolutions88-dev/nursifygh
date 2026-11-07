import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation } from "@tanstack/react-query"

import { getQuizQuestions, submitQuiz } from "../api/courses"
import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"
import type { QuizSubmitRequest } from "../types/api"

export default function QuizPage() {
    const { courseId } = useParams<{ courseId: string }>()
    const { user } = useAuth()
    const [questionCount, setQuestionCount] = useState<number | "all">(10)
    const [hasStarted, setHasStarted] = useState(false)

    const { data: questions, isLoading } = useQuery({
        queryKey: ["quiz-questions", courseId],
        queryFn: () => getQuizQuestions(courseId!),
        enabled: !!user?.has_active_subscription && !!courseId,
    })

    if (!user) return null

    if (isLoading) {
        return (
            <AppShell>
                <div className="rounded-xl border border-border bg-white p-8 text-center">
                    <p className="text-on-surface-muted">Loading quiz…</p>
                </div>
            </AppShell>
        )
    }

    if (!questions || questions.length === 0) {
        return (
            <AppShell>
                <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center">
                    <p className="text-body-sm font-medium text-on-surface">
                        No questions available yet
                    </p>
                    <p className="mt-1 text-xs text-on-surface-muted">
                        This course's questions are coming soon.
                    </p>
                    <Link to="/courses" className="mt-4 inline-block">
                        <Button variant="secondary" size="sm">← Back to courses</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    const totalQuestions = questions.length
    const selectedCount = questionCount === "all" ? totalQuestions : Math.min(questionCount, totalQuestions)

    if (hasStarted) {
        const shuffled = [...questions].sort(() => Math.random() - 0.5)
        const quizQuestions = shuffled.slice(0, selectedCount)
        return <QuizInProgress questions={quizQuestions} courseId={courseId!} />
    }

    const presets = [10, 20, 30, 50].filter((n) => n < totalQuestions)
    if (totalQuestions > 0) presets.push(totalQuestions === questionCount ? 0 : totalQuestions)
    const uniquePresets = Array.from(new Set(presets)).filter((n) => n > 0)

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <Link
                    to="/courses"
                    className="inline-flex items-center gap-1 text-xs text-on-surface-muted hover:text-brand-700"
                >
                    ← Back to courses
                </Link>

                <div>
                    <p className="text-caption text-brand-700 font-medium">Practice Quiz</p>
                    <h1 className="mt-1 text-h2">
                        {totalQuestions} question{totalQuestions === 1 ? "" : "s"} available
                    </h1>
                    <p className="mt-2 text-body-sm text-on-surface-muted">
                        Choose how many questions you want to practice. Questions will be randomly selected.
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-white p-6 space-y-5">
                    <div>
                        <p className="text-h4 text-on-surface">How many questions?</p>
                        <p className="mt-1 text-xs text-on-surface-muted">
                            Pick a quick preset or enter a custom number.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {uniquePresets.map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setQuestionCount(n === totalQuestions ? "all" : n)}
                                className={`rounded-lg border p-3 text-center transition-all ${(n === totalQuestions ? questionCount === "all" : questionCount === n)
                                    ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm"
                                    : "border-border bg-white text-on-surface hover:border-brand-300"
                                    }`}
                            >
                                <p className="text-h4">{n === totalQuestions ? "All" : n}</p>
                                <p className="mt-0.5 text-[10px] text-on-surface-muted">
                                    {n === totalQuestions ? "Every question" : "questions"}
                                </p>
                            </button>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-border">
                        <label className="text-xs font-medium text-on-surface-muted">
                            Or enter a custom amount (1-{totalQuestions}):
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={totalQuestions}
                            value={questionCount === "all" ? totalQuestions : questionCount}
                            onChange={(e) => {
                                const v = parseInt(e.target.value)
                                if (isNaN(v)) return
                                const clamped = Math.max(1, Math.min(v, totalQuestions))
                                setQuestionCount(clamped === totalQuestions ? "all" : clamped)
                            }}
                            className="mt-2 w-full rounded-lg border border-border bg-surface-subtle px-3 py-2 text-base focus:outline-none focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-brand-900">Ready to practice?</p>
                            <p className="mt-1 text-xs text-brand-800">
                                {selectedCount} question{selectedCount === 1 ? "" : "s"} · ~{Math.ceil(selectedCount * 1.2)} min
                            </p>
                        </div>
                        <Button size="lg" onClick={() => setHasStarted(true)}>
                            Start practice →
                        </Button>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}

// The actual quiz-taking component — submits to the backend for grading
function QuizInProgress({ questions, courseId }: { questions: any[]; courseId: string }) {
    const navigate = useNavigate()
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [submitError, setSubmitError] = useState<string | null>(null)

    const submitMutation = useMutation({
        mutationFn: submitQuiz,
        onSuccess: (result) => {
            navigate(`/quizzes/results/${result.id}`)
        },
        onError: (err: any) => {
            const detail = err?.response?.data
            if (detail && typeof detail === "object") {
                // Flatten DRF field errors into a readable message
                const messages = Object.entries(detail).map(
                    ([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`
                )
                setSubmitError(messages.join(" · "))
            } else {
                setSubmitError("Failed to submit quiz. Please try again.")
            }
        },
    })

    const totalQuestions = questions.length
    const answeredCount = Object.keys(answers).length
    const canSubmit = answeredCount > 0 && !submitMutation.isPending

    function getChoices(q: any): { id: string; text: string; position: number }[] {
        const raw = q.choices ?? q.options ?? []
        if (!Array.isArray(raw)) return []
        return raw
            .map((c: any, idx: number) => ({
                id: String(c.id ?? c.key ?? idx),
                text: c.text ?? c.label ?? c.value ?? String(c),
                position: typeof c.position === "number" ? c.position : idx,
            }))
            .sort((a, b) => a.position - b.position)
    }

    function getQuestionText(q: any): string {
        return q.text ?? q.question_text ?? q.prompt ?? ""
    }

    function handleSubmit() {
        setSubmitError(null)

        // Match the exact QuizSubmitRequest shape
        const payload: QuizSubmitRequest = {
            course_id: courseId,
            answers: questions.map((q) => ({
                question_id: String(q.id),
                choice_id: answers[String(q.id)] ?? null,
            })),
        }

        submitMutation.mutate(payload)
    }

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <div className="flex items-center justify-between text-xs text-on-surface-muted mb-2">
                        <span>{answeredCount} of {totalQuestions} answered</span>
                        <span>{submitMutation.isPending ? "Submitting…" : "In progress"}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden">
                        <div
                            className="h-full bg-brand-600 transition-all"
                            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                        />
                    </div>
                </div>

                {questions.map((q, i) => {
                    const choices = getChoices(q)
                    const selectedChoiceId = answers[String(q.id)]

                    return (
                        <div key={String(q.id)} className="rounded-xl border border-border bg-white p-5">
                            <div className="flex items-start gap-3">
                                <span className="text-sm font-medium text-on-surface-muted">{i + 1}.</span>
                                <p className="text-base text-on-surface font-medium">{getQuestionText(q)}</p>
                            </div>
                            <div className="mt-4 space-y-2">
                                {choices.map((choice) => {
                                    const isSelected = selectedChoiceId === choice.id

                                    return (
                                        <button
                                            key={choice.id}
                                            type="button"
                                            disabled={submitMutation.isPending}
                                            onClick={() =>
                                                setAnswers((prev) => ({ ...prev, [String(q.id)]: choice.id }))
                                            }
                                            className={`w-full rounded-lg border p-3 text-left text-sm transition-all ${isSelected
                                                ? "border-brand-600 bg-brand-50"
                                                : "border-border bg-white hover:border-brand-300"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-brand-600 bg-brand-600" : "border-border"
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <span className="text-on-surface">{choice.text}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                {submitError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-800">{submitError}</p>
                    </div>
                )}

                <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-brand-900">
                            {answeredCount === totalQuestions
                                ? "All questions answered"
                                : `${totalQuestions - answeredCount} remaining`}
                        </p>
                    </div>
                    <Button
                        size="lg"
                        disabled={!canSubmit}
                        loading={submitMutation.isPending}
                        onClick={handleSubmit}
                    >
                        {submitMutation.isPending ? "Submitting…" : "Submit quiz →"}
                    </Button>
                </div>
            </div>
        </AppShell>
    )
}