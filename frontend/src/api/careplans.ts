import api from "./client"
import type {
    CarePlanDetail,
    CarePlanSummary,
    CarePlanTemplateSummary,
    CreateCarePlanRequest,
    NandaDiagnosis,
} from "../types/api"

export async function listNanda(params?: { domain?: string }): Promise<NandaDiagnosis[]> {
    const { data } = await api.get<NandaDiagnosis[]>("/careplans/nanda/", { params })
    return data
}

export async function listTemplates(params?: {
    course?: string
    diagnosis?: string
}): Promise<CarePlanTemplateSummary[]> {
    // Templates are paginated on the backend
    const { data } = await api.get<{
        count: number
        results: CarePlanTemplateSummary[]
    }>("/careplans/templates/", { params })
    return data.results
}

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