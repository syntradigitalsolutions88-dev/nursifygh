/**
 * TypeScript mirrors of the backend's DRF serializers.
 */

export type StudentLevel = 100 | 200 | 300
export type NursingProgram = "GENERAL" | "MIDWIFERY" | "PSYCHIATRIC" | "COMMUNITY"

export interface User {
    id: string
    email: string
    full_name: string
    phone_number: string
    level: StudentLevel
    level_display: string
    program: NursingProgram
    program_display: string
    institution: string
    exam_date: string | null
    has_seen_tour: boolean
    is_subscribed: boolean
    has_paid: boolean
    is_on_trial: boolean
    subscription_expires_at: string | null
    has_active_subscription: boolean
    date_joined: string
    is_ambassador: boolean
    referral_code: string | null
    referred_by: string | null
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
    program: NursingProgram
    institution: string
    password: string
    password_confirm: string
    referred_by?: string
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
    program: NursingProgram
    program_display: string
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
    program: NursingProgram
    program_display: string
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

// ---------------------------------------------------------------------------
// Care plans
// ---------------------------------------------------------------------------
export interface NandaDiagnosis {
    id: string
    code: string
    label: string
    domain: string
    domain_display: string
    definition: string
    defining_characteristics: string
    related_factors: string
    edition_year: number
}

export interface CarePlanTemplateSummary {
    id: string
    title: string
    description: string
    primary_diagnosis: string
    primary_diagnosis_label: string
    primary_diagnosis_domain: string
    course: string | null
    is_published: boolean
}

export interface SmartGoal {
    id: string
    specific: string
    measurable: string
    achievable: string
    relevant: string
    time_bound: string
    position: number
}

export interface Intervention {
    id: string
    action: string
    rationale: string
    position: number
}

export interface CarePlanSummary {
    id: string
    title: string
    primary_diagnosis: string
    primary_diagnosis_label: string
    is_public: boolean
    is_submitted: boolean
    submitted_at: string | null
    goal_count: number
    intervention_count: number
    created_at: string
    updated_at: string
}

export interface CarePlanDetail {
    id: string
    title: string
    patient_scenario: string
    primary_diagnosis: NandaDiagnosis
    source_template: string | null
    is_public: boolean
    is_submitted: boolean
    submitted_at: string | null
    goals: SmartGoal[]
    interventions: Intervention[]
    created_at: string
    updated_at: string
}

export interface CreateCarePlanRequest {
    title: string
    patient_scenario: string
    primary_diagnosis: string
    is_public: boolean
}

export interface CreateSmartGoalRequest {
    specific: string
    measurable: string
    achievable: string
    relevant: string
    time_bound: string
}

export interface CreateInterventionRequest {
    action: string
    rationale: string
}

export interface CarePlanShareLink {
    id: string
    token: string
    expires_at: string
    revoked: boolean
    created_at: string
}

export interface PublicCarePlan {
    id: string
    title: string
    patient_scenario: string
    student_name: string
    student_level_display?: string
    student_program_display?: string
    student_institution?: string
    primary_diagnosis: NandaDiagnosis
    goals: SmartGoal[]
    interventions: Intervention[]
    view_count: number
    average_rating: number | null
    rating_count: number
    created_at: string
    updated_at: string
}

export interface CreateRatingRequest {
    score: number
    comment?: string
}

export interface CarePlanRating {
    id: string
    rater_email: string
    score: number
    comment: string
    created_at: string
    updated_at: string
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export interface PaymentTransaction {
    id: string
    provider: "PAYSTACK" | "HUBTEL"
    provider_display: string
    reference: string
    provider_reference: string
    amount_ghs: string
    status: "PENDING" | "SUCCESS" | "FAILED" | "ABANDONED"
    status_display: string
    duration_days: number
    authorization_url: string
    initiated_at: string
    completed_at: string | null
}

export interface InitiateCheckoutRequest {
    provider?: "PAYSTACK" | "HUBTEL"
    amount_ghs?: string
    duration_days?: number
    reference?: string
}

// ---------------------------------------------------------------------------
// Ambassador
// ---------------------------------------------------------------------------
export interface AmbassadorStats {
    referral_code: string
    total_earned: string
    pending_payout: string
    paid_out: string
    referral_count: number
    recent: {
        amount: string
        referred_email: string
        is_paid_out: boolean
        date: string
    }[]
}