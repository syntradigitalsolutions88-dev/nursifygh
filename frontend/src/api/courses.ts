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
    // There is no dedicated detail endpoint yet — list and find by ID.
    const attempts = await getQuizHistory()
    const found = attempts.find((a) => a.id === id)
    if (!found) {
        throw new Error("Quiz attempt not found")
    }
    return found
}
// Extracts questions from a course detail response.
// The backend includes questions in the course detail payload.
export async function getQuizQuestions(courseId: string): Promise<any[]> {
    const course = await getCourse(courseId)
    // Try common field names — the backend should return `questions` on the course
    return (course as any).questions ?? []
}