export function buildAiTutorUrl(prompt: string): string {
    const params = new URLSearchParams({ q: prompt.trim() })
    return `/ai-tutor?${params.toString()}`
}
