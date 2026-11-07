import api from "./client"
import type {
    CarePlanDetail,
    CarePlanRating,
    CarePlanShareLink,
    CarePlanSummary,
    CarePlanTemplateSummary,
    CreateCarePlanRequest,
    CreateInterventionRequest,
    CreateRatingRequest,
    CreateSmartGoalRequest,
    Intervention,
    NandaDiagnosis,
    PublicCarePlan,
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
// Care plans (owner-scoped)
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

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------
export async function createShareLink(
    planId: string,
    daysValid = 30,
): Promise<CarePlanShareLink> {
    const { data } = await api.post<CarePlanShareLink>(
        `/careplans/plans/${planId}/share/`,
        { days_valid: daysValid },
    )
    return data
}

export async function getSharedPlan(token: string): Promise<PublicCarePlan> {
    // PUBLIC endpoint — no auth header needed but our interceptor is harmless
    const { data } = await api.get<PublicCarePlan>(
        `/careplans/shared/${token}/`,
    )
    return data
}

// ---------------------------------------------------------------------------
// Public library
// ---------------------------------------------------------------------------
export async function listPublicPlans(): Promise<PublicCarePlan[]> {
    const { data } = await api.get<{
        count: number
        results: PublicCarePlan[]
    }>("/careplans/public/")
    return data.results
}
export async function getPublicPlan(id: string): Promise<PublicCarePlan> {
    const { data } = await api.get<PublicCarePlan>(`/careplans/public/${id}/`)
    return data
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------
export async function rateCarePlan(
    planId: string,
    payload: CreateRatingRequest,
): Promise<CarePlanRating> {
    const { data } = await api.post<CarePlanRating>(
        `/careplans/plans/${planId}/ratings/`,
        payload,
    )
    return data
}