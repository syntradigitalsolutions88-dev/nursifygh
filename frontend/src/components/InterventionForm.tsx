import { useState, type FormEvent } from "react"

import type { CreateInterventionRequest } from "../types/api"

interface Props {
    onSubmit: (payload: CreateInterventionRequest) => Promise<void>
    onCancel: () => void
    submitting: boolean
}

export default function InterventionForm({ onSubmit, onCancel, submitting }: Props) {
    const [action, setAction] = useState("")
    const [rationale, setRationale] = useState("")

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        await onSubmit({
            action: action.trim(),
            rationale: rationale.trim(),
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-gray-50 p-4">
            <div>
                <label className="block text-xs font-medium text-gray-600">
                    Nursing action
                </label>
                <textarea
                    required
                    rows={2}
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="input mt-1"
                    placeholder="e.g. Perform wound dressing with sterile technique every 24 hours"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600">
                    Scientific rationale <span className="text-red-600">*</span>
                </label>
                <textarea
                    required
                    rows={3}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    className="input mt-1"
                    placeholder="e.g. Sterile technique prevents introduction of exogenous pathogens into the wound bed"
                />
                <p className="mt-1 text-xs text-gray-500">
                    Required. Explain the nursing science behind this action.
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-secondary text-sm"
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button type="submit" className="btn-primary text-sm" disabled={submitting}>
                    {submitting ? "Saving…" : "Save intervention"}
                </button>
            </div>
        </form>
    )
}