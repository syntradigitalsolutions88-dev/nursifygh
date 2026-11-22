import api from "./client"

export interface FlashcardReviewInfo {
    ease_factor: number
    interval_days: number
    repetitions: number
    lapses: number
    review_count: number
    correct_count: number
    is_bookmarked: boolean
    is_due: boolean
    is_weak: boolean
    next_review_at: string
}

export interface FlashcardItem {
    id: string
    course_id: string
    course_code: string
    course_title: string
    topic: string
    front: string
    back: string
    rationale: string
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    is_from_quiz: boolean
    review: FlashcardReviewInfo
}

export interface RevisionStats {
    due_count: number
    bookmarked_count: number
    total_cards: number
    accuracy_percent: number
    streak_days: number
    weak_topics: Array<{
        course_code: string
        course_title: string
        weak_cards: number
    }>
}

export async function fetchFlashcards(params?: { course?: string; mode?: string }) {
    const res = await api.get<{ results: FlashcardItem[]; count: number }>("/academics/flashcards/", { params })
    return res.data.results
}

export async function fetchRevisionStats() {
    const res = await api.get<RevisionStats>("/academics/flashcards/stats/")
    return res.data
}

export async function submitFlashcardReview(payload: {
    flashcard_id: string
    rating?: "again" | "hard" | "good" | "easy"
    toggle_bookmark?: boolean
}) {
    const res = await api.post<FlashcardItem>("/academics/flashcards/review/", payload)
    return res.data
}

export async function syncWeakQuizFlashcards() {
    const res = await api.post<{ created_count: number }>("/academics/flashcards/sync-weak/")
    return res.data
}

export async function createPersonalFlashcard(payload: {
    course_id: string
    topic?: string
    front: string
    back: string
    rationale?: string
    difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
}) {
    const res = await api.post<FlashcardItem>("/academics/flashcards/", payload)
    return res.data
}