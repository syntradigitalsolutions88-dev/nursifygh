/**
 * TypeScript mirrors of the backend's DRF serializers.
 */

export type StudentLevel = 100 | 200 | 300

export interface User {
    id: string
    email: string
    full_name: string
    phone_number: string
    level: StudentLevel
    level_display: string
    institution: string
    is_subscribed: boolean
    subscription_expires_at: string | null
    has_active_subscription: boolean
    date_joined: string
}

export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    access: string
    refresh: string
}

export interface RegisterRequest {
    email: string
    full_name: string
    phone_number: string
    level: StudentLevel
    institution: string
    password: string
    password_confirm: string
}

export interface RefreshResponse {
    access: string
}

// ---------------------------------------------------------------------------
// Academics — courses, quizzes
// ---------------------------------------------------------------------------
export interface Course {
    id: string
    code: string
    title: string
    category: string
    category_display: string
    level: StudentLevel
    level_display: string
    semester: string
    semester_display: string
    question_count: number
}

export interface Choice {
    id: string
    text: string
    position: number
}

export interface Question {
    id: string
    text: string
    choices: Choice[]
}

export interface CourseDetail {
    id: string
    code: string
    title: string
    description: string
    category: string
    category_display: string
    level: StudentLevel
    level_display: string
    semester: string
    semester_display: string
    questions: Question[]
}

export interface QuizAnswerInput {
    question_id: string
    choice_id: string | null
}

export interface QuizSubmitRequest {
    course_id: string
    answers: QuizAnswerInput[]
}

export interface ChoiceResult {
    id: string
    text: string
    position: number
}

export interface QuestionResult {
    id: string
    text: string
    rationale: string
    choices: ChoiceResult[]
    correct_choice_id: string | null
}

export interface QuizAnswerResult {
    question: QuestionResult
    selected_choice_id: string | null
    is_correct: boolean
}

export interface QuizAttemptResult {
    id: string
    course_id: string
    course_code: string
    course_title: string
    total_questions: number
    correct_answers: number
    score_percentage: string
    started_at: string
    completed_at: string | null
    answers: QuizAnswerResult[]
}