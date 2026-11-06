import { useState, type FormEvent } from "react"

import type { CreateSmartGoalRequest } from "../types/api"

interface Props {
    onSubmit: (payload: CreateSmartGoalRequest) => Promise<void>
    onCancel: () => void
    submitting: boolean
}

export default function SmartGoalForm({ onSubmit, onCancel, submitting }: Props) {
    const [specific, setSpecific] = useState("")
    const [measurable, setMeasurable] = useState("")
    const [achievable, setAchievable] = useState("")
    const [relevant, setRelevant] = useState("")
    const [timeBound, setTimeBound] = useState("")

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        await onSubmit({
            specific: specific.trim(),
            measurable: measurable.trim(),
            achievable: achievable.trim(),
            relevant: relevant.trim(),
            time_bound: timeBound.trim(),
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-gray-50 p-4">
            <div>
                <label className="block text-xs font-medium text-gray-600">
                    <span className="text-brand-700 font-bold">S</span> — Specific
                </label>
                <input
                    type="text"
                    required
                    maxLength={500}
                    value={specific}
                    onChange={(e) => setSpecific(e.target.value)}
                    className="input mt-1"
                    placeholder="What exactly will be achieved?"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600">
                    <span className="text-brand-700 font-bold">M</span> — Measurable
                </label>
                <input
                    type="text"
                    required
                    maxLength={500}
                    value={measurable}
                    onChange={(e) => setMeasurable(e.target.value)}
                    className="input mt-1"
                    placeholder="How will progress be measured?"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600">
                    <span className="text-brand-700 font-bold">A</span> — Achievable
                </label>
                <input
                    type="text"
                    required
                    maxLength={500}
                    value={achievable}
                    onChange={(e) => setAchievable(e.target.value)}
                    className="input mt-1"
                    placeholder="Is this achievable given the patient's condition?"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600">
                    <span className="text-brand-700 font-bold">R</span> — Relevant
                </label>
                <input
                    type="text"
                    required
                    maxLength={500}
                    value={relevant}
                    onChange={(e) => setRelevant(e.target.value)}
                    className="input mt-1"
                    placeholder="Why does this matter for this patient?"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600">
                    <span className="text-brand-700 font-bold">T</span> — Time-bound
                </label>
                <input
                    type="text"
                    required
                    maxLength={200}
                    value={timeBound}
                    onChange={(e) => setTimeBound(e.target.value)}
                    className="input mt-1"
                    placeholder="By when? e.g. 'Within 24 hours of admission'"
                />
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
                    {submitting ? "Saving…" : "Save goal"}
                </button>
            </div>
        </form>
    )
}