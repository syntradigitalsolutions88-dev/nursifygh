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
                <div className="rounded-xl border border-border bg-white p-8 text-center animate-pulse">
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
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link to="/courses">
                            <Button variant="secondary" size="sm">← Back to courses</Button>
                        </Link>
                        <Link to={`/courses/${courseId}/upload`}>
                            <Button size="sm">📸 Upload past paper</Button>
                        </Link>
                    </div>
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
                    className="inline-flex items-center gap-1 text-xs text-on-surface-muted hover:text-brand-700 font-medium"
                >
                    ← Back to courses
                </Link>

                <div>
                    <p className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">Practice Quiz</p>
                    <h1 className="mt-1 text-3xl font-serif font-bold text-gray-900">
                        {totalQuestions} question{totalQuestions === 1 ? "" : "s"} available
                    </h1>
                    <p className="mt-2 text-sm text-on-surface-muted">
                        Choose how many questions you want to practice. Questions will be randomly selected.
                    </p>
                </div>

                {/* Past Paper Upload Card */}
                <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-on-surface">Have a past paper photo?</p>
                            <p className="text-xs text-on-surface-muted mt-0.5">
                                Upload it and AI will extract the questions for this course.
                            </p>
                        </div>
                        <Link to={`/courses/${courseId}/upload`}>
                            <Button variant="secondary" size="sm">📸 Upload</Button>
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
                    <div>
                        <p className="text-lg font-bold text-gray-900">How many questions?</p>
                        <p className="mt-1 text-xs text-gray-500">
                            Pick a quick preset or enter a custom number.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {uniquePresets.map((n) => {
                            const isActive = (n === totalQuestions ? questionCount === "all" : questionCount === n)
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setQuestionCount(n === totalQuestions ? "all" : n)}
                                    className={`rounded-xl border-2 p-4 text-center transition-all ${isActive
                                        ? "border-brand-500 bg-brand-50 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50"
                                        }`}
                                >
                                    <p className={`text-xl font-bold ${isActive ? "text-brand-800" : "text-gray-700"}`}>
                                        {n === totalQuestions ? "All" : n}
                                    </p>
                                    <p className={`mt-0.5 text-[10px] uppercase tracking-wider font-semibold ${isActive ? "text-brand-600" : "text-gray-400"}`}>
                                        {n === totalQuestions ? "Every Q" : "questions"}
                                    </p>
                                </button>
                            )
                        })}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
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
                            className="mt-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-lg font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                </div>

                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-base font-bold text-brand-900">Ready to practice?</p>
                            <p className="mt-1 text-sm text-brand-800 font-medium">
                                {selectedCount} question{selectedCount === 1 ? "" : "s"} · ~{Math.ceil(selectedCount * 1.2)} min
                            </p>
                        </div>
                        <Button size="lg" className="w-full sm:w-auto bg-brand-700 hover:bg-brand-800 text-white shadow-md shadow-brand-500/20" onClick={() => setHasStarted(true)}>
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
            // Because the backend now returns { id: ... } instantly, this redirect is instant!
            navigate(`/quizzes/results/${result.id}`)
        },
        onError: (err: any) => {
            const detail = err?.response?.data
            if (detail && typeof detail === "object") {
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
            <div className="max-w-4xl mx-auto pb-32">

                {/* Sticky Progress Header */}
                <div className="sticky top-[60px] lg:top-[72px] z-20 bg-white/95 backdrop-blur-md border border-gray-200 py-3 px-4 mb-8 -mx-4 sm:mx-0 sm:rounded-xl sm:shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to={`/courses`} className="text-gray-400 hover:text-gray-700 hidden sm:block">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>
                        <div>
                            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Practice Exam</p>
                            <p className="text-sm font-bold text-gray-900">{answeredCount} of {totalQuestions} answered</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32 sm:w-48 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand-500 transition-all duration-300"
                            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                    {questions.map((q, i) => {
                        const choices = getChoices(q)
                        const selectedChoiceId = answers[String(q.id)]

                        return (
                            <div key={String(q.id)} className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
                                <div className="flex gap-4 mb-6">
                                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold text-sm border border-brand-100">
                                        {i + 1}
                                    </span>
                                    <h3 className="text-lg font-semibold text-gray-900 leading-relaxed mt-1">
                                        {getQuestionText(q)}
                                    </h3>
                                </div>

                                <div className="space-y-3 pl-0 sm:pl-12">
                                    {choices.map((choice) => {
                                        const isSelected = selectedChoiceId === choice.id
                                        return (
                                            <label
                                                key={choice.id}
                                                className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected
                                                    ? "border-brand-500 bg-brand-50/50 shadow-sm"
                                                    : "border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <div className="flex items-center h-5 mt-0.5">
                                                    <input
                                                        type="radio"
                                                        name={`question-${q.id}`}
                                                        checked={isSelected}
                                                        onChange={() => setAnswers((prev) => ({ ...prev, [String(q.id)]: choice.id }))}
                                                        className="w-5 h-5 text-brand-600 border-gray-300 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <span className={`ml-3 text-sm sm:text-base ${isSelected ? "text-brand-900 font-medium" : "text-gray-700"}`}>
                                                    {choice.text}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {submitError && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-800">{submitError}</p>
                    </div>
                )}

                {/* Sticky Submit Bar */}
                <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 p-4 lg:pl-60 print:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-sm font-bold text-gray-900">
                                {answeredCount === totalQuestions ? "All questions answered!" : `${totalQuestions - answeredCount} questions remaining`}
                            </p>
                            <p className="text-xs text-gray-500 hidden sm:block">
                                {answeredCount === totalQuestions ? "Click submit to see your score and rationales." : "You can still change your answers."}
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-sm transition-all ${canSubmit
                                ? "bg-brand-700 hover:bg-brand-800 text-white shadow-brand-500/20 shadow-lg"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            {submitMutation.isPending ? "Submitting…" : "Submit quiz →"}
                        </button>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}