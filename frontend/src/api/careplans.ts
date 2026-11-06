import api from "./client"
import type {
    CarePlanDetail,
    CarePlanSummary,
    CarePlanTemplateSummary,
    CreateCarePlanRequest,
    CreateInterventionRequest,
    CreateSmartGoalRequest,
    Intervention,
    NandaDiagnosis,
    SmartGoal,
} from "../types/api"

// ---------------------------------------------------------------------------
// NANDA catalog
// ---------------------------------------------------------------------------
export async function listNanda(params?: {
    domain?: string
}): Promise<NandaDiagnosis[]> {
    const { data } = await api.get<NandaDiagnosis[]>("/careplans/nanda/", {
        params,
    })
    return data
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export async function listTemplates(params?: {
    course?: string
    diagnosis?: string
}): Promise<CarePlanTemplateSummary[]> {
    const { data } = await api.get<{
        count: number
        results: CarePlanTemplateSummary[]
    }>("/careplans/templates/", { params })
    return data.results
}

// ---------------------------------------------------------------------------
// Care plans
// ---------------------------------------------------------------------------
export async function listCarePlans(): Promise<CarePlanSummary[]> {
    const { data } = await api.get<{
        count: number
        results: CarePlanSummary[]
    }>("/careplans/plans/")
    return data.results
}

export async function getCarePlan(id: string): Promise<CarePlanDetail> {
    const { data } = await api.get<CarePlanDetail>(`/careplans/plans/${id}/`)
    return data
}

export async function createCarePlan(
    payload: CreateCarePlanRequest,
): Promise<CarePlanDetail> {
    const { data } = await api.post<CarePlanDetail>(
        "/careplans/plans/create/",
        payload,
    )
    return data
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export async function createGoal(
    planId: string,
    payload: CreateSmartGoalRequest,
): Promise<SmartGoal> {
    const { data } = await api.post<SmartGoal>(
        `/careplans/plans/${planId}/goals/`,
        payload,
    )
    return data
}

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------
export async function createIntervention(
    planId: string,
    payload: CreateInterventionRequest,
): Promise<Intervention> {
    const { data } = await api.post<Intervention>(
        `/careplans/plans/${planId}/interventions/`,
        payload,
    )
    return data
}

// ---------------------------------------------------------------------------
// Submit for grading
// ---------------------------------------------------------------------------
export async function submitCarePlan(planId: string): Promise<CarePlanDetail> {
    const { data } = await api.post<CarePlanDetail>(
        `/careplans/plans/${planId}/submit/`,
        {},
    )
    return data
}