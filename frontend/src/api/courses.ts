import api from "./client"
import type {
    Course,
    CourseDetail,
    QuizAttemptResult,
    QuizSubmitRequest,
} from "../types/api"

export async function listCourses(): Promise<Course[]> {
    const { data } = await api.get<Course[]>("/academics/courses/")
    return data
}

export async function getCourse(id: string): Promise<CourseDetail> {
    const { data } = await api.get<CourseDetail>(`/academics/courses/${id}/`)
    return data
}

export async function submitQuiz(
    payload: QuizSubmitRequest,
): Promise<QuizAttemptResult> {
    const { data } = await api.post<QuizAttemptResult>(
        "/academics/quizzes/submit/",
        payload,
    )
    return data
}

export async function getQuizHistory(): Promise<QuizAttemptResult[]> {
    // Paginated on the backend; unwrap the `results` array
    const { data } = await api.get<{
        count: number
        results: QuizAttemptResult[]
    }>("/academics/quizzes/history/")
    return data.results
}

export async function getQuizAttempt(id: string): Promise<QuizAttemptResult> {
    const attempts = await getQuizHistory()
    const found = attempts.find((a) => a.id === id)
    if (!found) {
        throw new Error("Quiz attempt not found")
    }
    return found
}

// ─── Smart quiz endpoint (unseen-first + review mode) ───────────

export interface SmartQuizOptions {
    mode?: string
    focusQuestion?: string
}

export interface SmartQuizResponse {
    questions: any[]
    total: number
    unseen_count: number
    seen_count: number
    missed_count?: number
}

export async function getSmartQuizQuestions(
    courseId: string,
    options?: SmartQuizOptions,
): Promise<SmartQuizResponse> {
    const params = new URLSearchParams()
    if (options?.mode) params.set("mode", options.mode)
    if (options?.focusQuestion) params.set("focus_question", options.focusQuestion)
    const query = params.toString()
    const { data } = await api.get<SmartQuizResponse>(
        `/academics/courses/${courseId}/questions/${query ? `?${query}` : ""}`,
    )
    return data
}

// ─── Daily Review Queue endpoint ────────────────────────────────

export interface DailyReviewQueueItem {
    question_id: string
    course_id: string
    course_code: string
    course_title: string
    question_preview: string
    times_missed: number
}

export interface DailyReviewQueueResponse {
    due_count: number
    missed_questions_count: number
    due_flashcards_count: number
    streak_days: number
    recommended_course_id: string | null
    queue_items: DailyReviewQueueItem[]
}

export async function getDailyReviewQueue(limit = 10): Promise<DailyReviewQueueResponse> {
    const { data } = await api.get<DailyReviewQueueResponse>(
        `/academics/daily-review-queue/?limit=${limit}`,
    )
    return data
}

// ─── Legacy (kept for other pages that may still use it) ────────

export async function getQuizQuestions(courseId: string): Promise<any[]> {
    const course = await getCourse(courseId)
    return (course as any).questions ?? []
}
