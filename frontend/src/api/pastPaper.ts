import api from "./client"

export interface ExtractedQuestion {
    question_text: string
    options: string[]
    correct_answer: string | null
    rationale: string
}

export interface ExtractionResult {
    questions: ExtractedQuestion[]
}

export async function extractPastPaper(imageFile: File): Promise<ExtractionResult> {
    const formData = new FormData()
    formData.append("image", imageFile)

    const { data } = await api.post<ExtractionResult>(
        "/academics/past-paper/extract/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 90000 }
    )
    return data
}

export interface SaveQuestionsRequest {
    course_id: string
    questions: {
        question_text: string
        choices: { text: string; is_correct: boolean }[]
        rationale: string
    }[]
}

export async function saveExtractedQuestions(payload: SaveQuestionsRequest) {
    const { data } = await api.post("/academics/past-paper/save/", payload)
    return data
}