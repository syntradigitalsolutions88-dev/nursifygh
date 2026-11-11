import { useState, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { extractPastPaper, saveExtractedQuestions, type ExtractedQuestion } from "../api/pastPaper"
import { getCourse } from "../api/courses"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"

type Extracted = ExtractedQuestion & { id: string; selectedCorrect: string | null }

export default function PastPaperUploadPage() {
    const { courseId } = useParams<{ courseId: string }>()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [extracting, setExtracting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [questions, setQuestions] = useState<Extracted[] | null>(null)

    const { data: course } = useQuery({
        queryKey: ["course", courseId],
        queryFn: () => getCourse(courseId!),
        enabled: !!courseId,
    })

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (!f) return
        setFile(f)
        setPreview(URL.createObjectURL(f))
        setQuestions(null)
        setError(null)
    }

    async function handleExtract() {
        if (!file) return
        setExtracting(true)
        setError(null)
        try {
            const result = await extractPastPaper(file)
            setQuestions(
                result.questions.map((q, i) => ({
                    ...q,
                    id: `q-${i}-${Date.now()}`,
                    selectedCorrect: q.correct_answer || null,
                }))
            )
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to extract. Try a clearer photo.")
        } finally {
            setExtracting(false)
        }
    }

    function updateQuestion(id: string, updates: Partial<Extracted>) {
        if (!questions) return
        setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)))
    }

    function updateOption(qid: string, idx: number, value: string) {
        if (!questions) return
        setQuestions(
            questions.map((q) => {
                if (q.id !== qid) return q
                const opts = [...q.options]
                opts[idx] = value
                return { ...q, options: opts }
            })
        )
    }

    function removeQuestion(id: string) {
        if (!questions) return
        setQuestions(questions.filter((q) => q.id !== id))
    }

    async function handleSave() {
        if (!questions || !courseId) return
        const ready = questions.filter(
            (q) => q.question_text.trim() && q.options.length >= 2 && q.selectedCorrect
        )
        if (ready.length === 0) {
            setError("No complete questions. Each question needs a correct answer selected.")
            return
        }
        setSaving(true)
        setError(null)
        try {
            await saveExtractedQuestions({
                course_id: courseId,
                questions: ready.map((q) => ({
                    question_text: q.question_text.trim(),
                    choices: q.options.map((opt, i) => ({
                        text: opt.replace(/^[A-D]\.\s*/, "").trim(),
                        is_correct: q.selectedCorrect === String.fromCharCode(65 + i),
                    })),
                    rationale: q.rationale.trim(),
                })),
            })
            // Questions are now PENDING — go to submissions page to track them
            navigate("/my-submissions")
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to save. Try again.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto space-y-6 pb-10">
                <div>
                    <h1 className="text-2xl font-bold text-on-surface">Upload past paper</h1>
                    <p className="text-sm text-on-surface-muted mt-1">
                        {course?.title || "Course"}{course?.code ? ` · ${course.code}` : ""}
                    </p>
                    <p className="text-sm text-on-surface-muted mt-2">
                        Upload a photo of any N&MC past paper. AI extracts the questions,
                        then you review and submit them for approval.
                    </p>
                </div>

                {!questions && (
                    <div className="rounded-xl border border-border bg-white p-6">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            className="hidden"
                        />
                        {!preview ? (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full rounded-lg border-2 border-dashed border-border py-12 text-center hover:border-brand-300 transition-colors"
                            >
                                <p className="text-4xl mb-2">📸</p>
                                <p className="text-sm font-medium text-on-surface">Tap to upload an image</p>
                                <p className="text-xs text-on-surface-muted mt-1">JPG, PNG, or photo of your past paper</p>
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <img src={preview} alt="Past paper preview" className="w-full rounded-lg border border-border" />
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={() => { setFile(null); setPreview(null) }}>
                                        Change image
                                    </Button>
                                    <Button onClick={handleExtract} loading={extracting} disabled={extracting}>
                                        {extracting ? "Extracting…" : "Extract questions"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {error && <Alert variant="danger">{error}</Alert>}

                {questions && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-on-surface">
                                    {questions.length} question{questions.length !== 1 ? "s" : ""} extracted
                                </p>
                                <p className="text-xs text-on-surface-muted mt-0.5">
                                    Review, edit any errors, and select the correct answer for each.
                                </p>
                            </div>
                            <Button variant="secondary" onClick={() => { setQuestions(null); setFile(null); setPreview(null) }}>
                                Start over
                            </Button>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            <strong>⚠️ Heads up:</strong> Submitted questions go through a review process
                            before appearing in the quiz. Our team verifies accuracy within 24 hours.
                        </div>

                        {questions.map((q, idx) => (
                            <div key={q.id} className="rounded-xl border border-border bg-white overflow-hidden">
                                <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-4 py-2">
                                    <span className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider">
                                        Question {idx + 1}
                                    </span>
                                    <button onClick={() => removeQuestion(q.id)} className="text-xs font-medium text-danger-700 hover:underline">
                                        Remove
                                    </button>
                                </div>
                                <div className="p-4 space-y-3">
                                    <textarea
                                        value={q.question_text}
                                        onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                                        rows={3}
                                        className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none"
                                    />
                                    <div className="space-y-2">
                                        {q.options.map((opt, i) => {
                                            const letter = String.fromCharCode(65 + i)
                                            const isSelected = q.selectedCorrect === letter
                                            return (
                                                <div key={i} className={`flex items-start gap-2 rounded-lg border p-2 ${isSelected ? "border-green-400 bg-green-50" : "border-border"}`}>
                                                    <button
                                                        onClick={() => updateQuestion(q.id, { selectedCorrect: isSelected ? null : letter })}
                                                        className={`mt-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-green-600 bg-green-600 text-white" : "border-gray-400"}`}
                                                    >
                                                        {isSelected && "✓"}
                                                    </button>
                                                    <span className="text-xs font-bold pt-1.5 text-on-surface-muted w-4">{letter}.</span>
                                                    <input
                                                        type="text"
                                                        value={opt.replace(/^[A-D]\.\s*/, "")}
                                                        onChange={(e) => updateOption(q.id, i, `${letter}. ${e.target.value}`)}
                                                        className="flex-1 bg-transparent border-none text-sm focus:outline-none"
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex gap-2 justify-end">
                            <Button variant="secondary" onClick={() => navigate(`/courses`)}>Cancel</Button>
                            <Button onClick={handleSave} loading={saving}>
                                {saving ? "Submitting…" : `Submit ${questions.length} question${questions.length !== 1 ? "s" : ""} for review`}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}