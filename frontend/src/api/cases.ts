import api from "./client"

export interface CaseStageOption {
    key: string
    text: string
}

export interface CaseStageItem {
    id: string
    step_number: number
    title: string
    vitals_summary: string
    clinical_update: string
    question_prompt: string
    options: CaseStageOption[]
}

export interface ClinicalCaseItem {
    id: string
    program?: string
    program_label?: string
    course_code: string | null
    title: string
    condition_tag: string
    setting: string
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    difficulty_display: string
    patient_summary: string
    learning_objectives: string
    stage_count: number
    stages: CaseStageItem[]
    attempt: {
        current_step: number
        correct_steps: number
        total_steps: number
        answers_map: Record<string, string>
        completed_at: string | null
    } | null
}

export interface StageAnswerFeedback {
    is_correct: boolean
    selected_key: string
    correct_key: string | null
    rationale: string
    nursing_takeaway: string
    attempt: NonNullable<ClinicalCaseItem["attempt"]>
}

export async function fetchClinicalCases(params?: { difficulty?: string; program?: string }) {
    const queryParams: Record<string, string> = {}
    if (params?.difficulty) queryParams.difficulty = params.difficulty
    if (params?.program) queryParams.program = params.program

    const res = await api.get<{ results?: ClinicalCaseItem[] } | ClinicalCaseItem[]>("/academics/cases/", {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    })
    if (Array.isArray(res.data)) return res.data
    return res.data.results ?? []
}

export async function submitCaseStageAnswer(caseId: string, stepNumber: number, selectedKey: string) {
    const res = await api.post<StageAnswerFeedback>(`/academics/cases/${caseId}/answer/`, {
        step_number: stepNumber,
        selected_key: selectedKey,
    })
    return res.data
}

export async function resetCaseAttempt(caseId: string) {
    const res = await api.delete<{ reset: boolean }>(`/academics/cases/${caseId}/`)
    return res.data
}