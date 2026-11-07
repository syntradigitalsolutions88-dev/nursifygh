/**
 * Simple PII detection for patient scenario input.
 * Warns users if they type what looks like patient-identifying data.
 *
 * This is a best-effort guard, not a guarantee. Encourages good practice.
 */

export interface PIIWarning {
    matched: string
    type: string
    message: string
}

const PATTERNS: { regex: RegExp; type: string; message: string }[] = [
    {
        regex: /\bGHA-\d{9}-\d\b/g,
        type: "Ghana Card ID",
        message: "This looks like a Ghana Card number. Replace with 'Patient ID' or leave blank.",
    },
    {
        regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
        type: "National ID pattern",
        message: "This looks like a national ID number. Remove it — only initials are needed.",
    },
    {
        regex: /\b[Bb]ed\s*\d+/g,
        type: "Bed number",
        message: "Bed numbers should not be stored. Use ward name instead.",
    },
    {
        regex: /\b(?:M|F)\s*\/?\s*\d{1,3}\s*(?:yrs?|years?)\b/g,
        type: "Possible full age format",
        message: "Age alone is fine (e.g., '45-year-old'), but avoid full identifying info.",
    },
    {
        regex: /\b\d{10}\b/g,
        type: "Phone number",
        message: "This looks like a phone number. Patient phone numbers should not be stored.",
    },
]

export function detectPII(text: string): PIIWarning[] {
    const warnings: PIIWarning[] = []
    for (const { regex, type, message } of PATTERNS) {
        const matches = text.match(regex)
        if (matches) {
            matches.forEach((matched) => {
                warnings.push({ matched, type, message })
            })
        }
    }
    return warnings
}

export function isLikelySafe(text: string): boolean {
    return detectPII(text).length === 0
}