import { useEffect, useMemo, useState } from "react"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import api from "../api/client"

interface CourseOption {
    id: string
    code: string
    title: string
}

interface FlashcardItem {
    id: string
    course: string | null
    course_code: string
    course_title: string
    topic: string
    front: string
    back: string
    source_type: string
    is_bookmarked: boolean
    is_due: boolean
    ease_factor: number
    interval_days: number
    repetitions: number
    times_reviewed: number
    times_correct: number
    recall_accuracy: number
}

interface RevisionStats {
    total_cards: number
    due_today: number
    streak_days: number
    recall_accuracy: number
    bookmarked_count: number
    weak_topics_count: number
}

type FilterMode = "due" | "all" | "weak" | "bookmarked"

export default function RevisionPage() {
    const [cards, setCards] = useState<FlashcardItem[]>([])
    const [courses, setCourses] = useState<CourseOption[]>([])
    const [stats, setStats] = useState<RevisionStats>({
        total_cards: 0,
        due_today: 0,
        streak_days: 0,
        recall_accuracy: 0,
        bookmarked_count: 0,
        weak_topics_count: 0,
    })

    const [filter, setFilter] = useState<FilterMode>("due")
    const [courseFilter, setCourseFilter] = useState<string>("")
    const [activeIndex, setActiveIndex] = useState<number>(0)
    const [isFlipped, setIsFlipped] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const [submittingReview, setSubmittingReview] = useState<boolean>(false)
    const [syncingWeak, setSyncingWeak] = useState<boolean>(false)
    const [showCreateForm, setShowCreateForm] = useState<boolean>(false)
    const [creating, setCreating] = useState<boolean>(false)
    const [banner, setBanner] = useState<{ variant: "success" | "info" | "danger"; text: string } | null>(null)

    // New flashcard form state
    const [newCourseId, setNewCourseId] = useState<string>("")
    const [newTopic, setNewTopic] = useState<string>("")
    const [newFront, setNewFront] = useState<string>("")
    const [newBack, setNewBack] = useState<string>("")

    async function loadRevisionData(targetFilter: FilterMode = filter, targetCourse: string = courseFilter) {
        setLoading(true)
        try {
            const params: Record<string, string> = { filter: targetFilter }
            if (targetCourse) params.course_id = targetCourse

            const [cardsRes, statsRes, coursesRes] = await Promise.all([
                api.get("/academics/flashcards/", { params }),
                api.get("/academics/flashcards/stats/"),
                courses.length ? Promise.resolve({ data: courses }) : api.get("/academics/courses/"),
            ])

            const nextCards: FlashcardItem[] = Array.isArray(cardsRes.data)
                ? cardsRes.data
                : cardsRes.data?.results ?? []

            setCards(nextCards)
            setActiveIndex(0)
            setIsFlipped(false)

            if (statsRes.data) {
                setStats(statsRes.data)
            }

            if (!courses.length) {
                const rawCourses = Array.isArray(coursesRes.data)
                    ? coursesRes.data
                    : coursesRes.data?.results ?? []
                setCourses(
                    rawCourses.map((c: CourseOption) => ({
                        id: c.id,
                        code: c.code,
                        title: c.title,
                    }))
                )
            }
        } catch {
            setBanner({
                variant: "danger",
                text: "Could not load your revision deck right now. Check your connection and try again.",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRevisionData(filter, courseFilter)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, courseFilter])

    const currentCard = cards[activeIndex] ?? null

    async function handleRateCard(rating: "again" | "hard" | "good" | "easy") {
        if (!currentCard || submittingReview) return
        setSubmittingReview(true)
        setBanner(null)
        try {
            await api.post("/academics/flashcards/review/", {
                card_id: currentCard.id,
                rating,
            })
            await loadRevisionData(filter, courseFilter)
        } catch {
            setBanner({
                variant: "danger",
                text: "Failed to record review rating. Please try again.",
            })
        } finally {
            setSubmittingReview(false)
        }
    }

    // Keyboard shortcuts: Space to flip, 1-4 to rate when flipped
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement | null)?.tagName
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
            if (!currentCard) return

            if (e.code === "Space") {
                e.preventDefault()
                setIsFlipped((f) => !f)
            } else if (isFlipped) {
                if (e.key === "1") handleRateCard("again")
                if (e.key === "2") handleRateCard("hard")
                if (e.key === "3") handleRateCard("good")
                if (e.key === "4") handleRateCard("easy")
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCard, isFlipped, submittingReview])

    async function handleCreateCard(e: React.FormEvent) {
        e.preventDefault()
        if (!newFront.trim() || !newBack.trim()) {
            setBanner({ variant: "danger", text: "Enter both the question/prompt and answer before saving." })
            return
        }
        setCreating(true)
        setBanner(null)
        try {
            await api.post("/academics/flashcards/", {
                course_id: newCourseId || null,
                topic: newTopic.trim() || "General Nursing",
                front: newFront.trim(),
                back: newBack.trim(),
            })
            setNewTopic("")
            setNewFront("")
            setNewBack("")
            setShowCreateForm(false)
            setBanner({ variant: "success", text: "Personal flashcard saved to your revision deck." })
            if (filter === "due") {
                setFilter("all")
            } else {
                await loadRevisionData(filter, courseFilter)
            }
        } catch {
            setBanner({ variant: "danger", text: "Could not save flashcard. Please check your inputs." })
        } finally {
            setCreating(false)
        }
    }

    async function handleSyncWeakQuizCards() {
        setSyncingWeak(true)
        setBanner(null)
        try {
            const res = await api.post("/academics/flashcards/sync-weak/")
            const createdCount = res.data?.created_count ?? 0
            setBanner({
                variant: createdCount > 0 ? "success" : "info",
                text:
                    createdCount > 0
                        ? `Added ${createdCount} flashcard${createdCount === 1 ? "" : "s"} from your missed quiz questions.`
                        : "No new missed quiz questions to convert right now.",
            })
            await loadRevisionData(filter, courseFilter)
        } catch {
            setBanner({ variant: "danger", text: "Unable to sync missed quiz cards right now." })
        } finally {
            setSyncingWeak(false)
        }
    }

    async function handleToggleBookmark(card: FlashcardItem) {
        try {
            const res = await api.patch(`/academics/flashcards/${card.id}/`, {
                is_bookmarked: !card.is_bookmarked,
            })
            const updatedBookmarked = Boolean(res.data?.is_bookmarked ?? !card.is_bookmarked)
            setCards((prev) =>
                prev.map((item) => (item.id === card.id ? { ...item, is_bookmarked: updatedBookmarked } : item))
            )
            setStats((prev) => ({
                ...prev,
                bookmarked_count: Math.max(0, prev.bookmarked_count + (updatedBookmarked ? 1 : -1)),
            }))
        } catch {
            setBanner({ variant: "danger", text: "Could not update bookmark status." })
        }
    }

    const courseOptions = useMemo(
        () => [
            { value: "", label: "All Courses" },
            ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` })),
        ],
        [courses]
    )

    const createCourseOptions = useMemo(
        () => [
            { value: "", label: "General / Unassigned" },
            ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` })),
        ],
        [courses]
    )

    return (
        <AppShell>
            <div className="max-w-4xl space-y-6 pb-24 sm:pb-8">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-h1">Smart Revision Centre</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            Spaced-repetition flashcards, weak-topic drills, and daily revision streaks for RGN, RM, RPN &amp; CHN.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleSyncWeakQuizCards}
                            disabled={syncingWeak}
                        >
                            {syncingWeak ? "Syncing..." : "⚡ Pull Missed Quiz Cards"}
                        </Button>
                        <Button onClick={() => setShowCreateForm((v) => !v)}>
                            {showCreateForm ? "Close Form" : "+ New Card"}
                        </Button>
                    </div>
                </div>

                {banner && (
                    <Alert variant={banner.variant}>
                        {banner.text}
                    </Alert>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Due Today</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{stats.due_today ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Streak</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{stats.streak_days ?? 0}d</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Recall Accuracy</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{stats.recall_accuracy ?? 0}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Bookmarked</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{stats.bookmarked_count ?? 0}</p>
                    </div>
                </div>

                {/* Create Card Form */}
                {showCreateForm && (
                    <form
                        onSubmit={handleCreateCard}
                        className="rounded-2xl border border-border bg-white p-5 space-y-4"
                    >
                        <h2 className="text-h4 text-on-surface">Create Revision Flashcard</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-on-surface">
                                    Course (optional)
                                </label>
                                <select
                                    value={newCourseId}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCourseId(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-on-surface"
                                >
                                    {createCourseOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Input
                                label="Topic / Clinical Area"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                placeholder="e.g. Obstetric Emergencies, Pharmacology"
                            />
                        </div>
                        <Input
                            label="Front (Question / Concept)"
                            value={newFront}
                            onChange={(e) => setNewFront(e.target.value)}
                            placeholder="e.g. What is the antidote for Magnesium Sulfate toxicity?"
                        />
                        <Input
                            label="Back (Answer / Clinical Rationale)"
                            value={newBack}
                            onChange={(e) => setNewBack(e.target.value)}
                            placeholder="e.g. 10% Calcium Gluconate IV slowly while monitoring airway & reflexes."
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={creating}>
                                {creating ? "Saving..." : "Save Flashcard"}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Filter Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                        {(
                            [
                                ["due", "Due Today"],
                                ["all", "All Cards"],
                                ["weak", "Weak Topics"],
                                ["bookmarked", "Bookmarked"],
                            ] as Array<[FilterMode, string]>
                        ).map(([mode, label]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setFilter(mode)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === mode
                                        ? "bg-brand-700 text-white"
                                        : "border border-border bg-white text-on-surface-muted hover:text-on-surface"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="w-full sm:w-64">
                        <select
                            value={courseFilter}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCourseFilter(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-on-surface"
                        >
                            {courseOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Active Flashcard Stage */}
                {loading ? (
                    <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-on-surface-muted">
                        Loading revision flashcards...
                    </div>
                ) : !currentCard ? (
                    <div className="rounded-2xl border border-border bg-white p-8 text-center space-y-3">
                        <p className="text-h4 text-on-surface">No flashcards in this view yet.</p>
                        <p className="text-sm text-on-surface-muted">
                            Switch to &ldquo;All Cards&rdquo;, pull cards from your missed quiz questions, or create your own flashcard.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setFilter("all")}>
                                View All Cards
                            </Button>
                            <Button onClick={() => setShowCreateForm(true)}>+ Create Flashcard</Button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-white p-5 sm:p-7 space-y-5">
                        {/* Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                {currentCard.course_code && <Badge variant="neutral">{currentCard.course_code}</Badge>}
                                <span className="text-xs font-medium text-on-surface-muted">{currentCard.topic}</span>
                                <span className="text-xs text-on-surface-muted">
                                    • Recall: {currentCard.recall_accuracy ?? 0}%
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-on-surface-muted">
                                    Card {activeIndex + 1} / {cards.length}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleToggleBookmark(currentCard)}
                                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-on-surface hover:bg-gray-50"
                                >
                                    {currentCard.is_bookmarked ? "★ Saved" : "☆ Save"}
                                </button>
                            </div>
                        </div>

                        {/* Front Prompt */}
                        <div className="rounded-xl bg-gray-50 p-5 sm:p-6 border border-border">
                            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted mb-2">
                                Question / Prompt
                            </p>
                            <p className="text-base sm:text-lg font-medium text-on-surface leading-relaxed">
                                {currentCard.front}
                            </p>

                            {!isFlipped && (
                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <Button onClick={() => setIsFlipped(true)}>Show Answer (Space)</Button>
                                    {cards.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsFlipped(false)
                                                setActiveIndex((prev) => (prev + 1) % cards.length)
                                            }}
                                            className="text-xs font-medium text-on-surface-muted hover:text-on-surface"
                                        >
                                            Skip card →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Back Answer + SM-2 Rating Controls */}
                        {isFlipped && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-1.5">
                                        Answer &amp; Clinical Takeaway
                                    </p>
                                    <p className="text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-line">
                                        {currentCard.back}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-on-surface-muted mb-2">
                                        Rate your recall to schedule next review (keys 1–4):
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <button
                                            type="button"
                                            disabled={submittingReview}
                                            onClick={() => handleRateCard("again")}
                                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-center transition hover:bg-red-100 disabled:opacity-50"
                                        >
                                            <span className="block text-xs font-bold text-red-700">Again (1)</span>
                                            <span className="block text-[11px] text-red-600">~4 hours</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submittingReview}
                                            onClick={() => handleRateCard("hard")}
                                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center transition hover:bg-amber-100 disabled:opacity-50"
                                        >
                                            <span className="block text-xs font-bold text-amber-800">Hard (2)</span>
                                            <span className="block text-[11px] text-amber-700">Short step</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submittingReview}
                                            onClick={() => handleRateCard("good")}
                                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center transition hover:bg-emerald-100 disabled:opacity-50"
                                        >
                                            <span className="block text-xs font-bold text-emerald-800">Good (3)</span>
                                            <span className="block text-[11px] text-emerald-700">Standard</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submittingReview}
                                            onClick={() => handleRateCard("easy")}
                                            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-center transition hover:bg-sky-100 disabled:opacity-50"
                                        >
                                            <span className="block text-xs font-bold text-sky-800">Easy (4)</span>
                                            <span className="block text-[11px] text-sky-700">Longer gap</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    )
}