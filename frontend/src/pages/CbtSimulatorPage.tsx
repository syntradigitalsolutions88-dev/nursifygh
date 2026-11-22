import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { buildAiTutorUrl } from "../utils/tutorPrompt"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"

interface CbtQuestion {
    id: string
    domain: string
    prompt: string
    options: Array<{ key: string; text: string }>
    correctKey: string
    rationale: string
}

const CBT_QUESTIONS: CbtQuestion[] = [
    // Midwifery & Obstetric Safety (4)
    {
        id: "mw-1",
        domain: "Midwifery & Obstetric Safety",
        prompt:
            "A woman at 36 weeks gestation receiving intravenous magnesium sulfate for severe pre-eclampsia has a respiratory rate of 10 breaths/min and absent patellar reflexes. What is the priority nursing action?",
        options: [
            { key: "A", text: "Stop the magnesium sulfate infusion immediately, assess airway/breathing, and prepare 10% calcium gluconate" },
            { key: "B", text: "Increase the infusion rate to complete seizure prophylaxis faster" },
            { key: "C", text: "Administer oral paracetamol and recheck in 2 hours" },
            { key: "D", text: "Place her flat in a supine position with no monitoring" },
        ],
        correctKey: "A",
        rationale:
            "Respiratory depression (<12–16/min) and loss of deep tendon reflexes indicate magnesium toxicity. Stopping the infusion immediately and having 10% calcium gluconate ready is essential.",
    },
    {
        id: "mw-2",
        domain: "Midwifery & Obstetric Safety",
        prompt:
            "Forty minutes after vaginal delivery, a mother has heavy vaginal bleeding and a soft, boggy uterus above the umbilicus. Which action should you take first?",
        options: [
            { key: "A", text: "Call for help, massage the fundus until firm, check bladder distension, and support uterotonic/IV resuscitation" },
            { key: "B", text: "Wait 45 minutes to observe if bleeding subsides spontaneously" },
            { key: "C", text: "Ambulate the mother to the washroom unassisted" },
            { key: "D", text: "Apply a tight abdominal binder without assessing uterine tone" },
        ],
        correctKey: "A",
        rationale:
            "Uterine atony is a primary cause of postpartum haemorrhage. Rapid escalation, fundal massage, bladder emptying, and uterotonic/fluid resuscitation are critical.",
    },
    {
        id: "mw-3",
        domain: "Midwifery & Obstetric Safety",
        prompt:
            "During antenatal care at 32 weeks, a pregnant woman reports severe persistent frontal headache, blurred vision, and epigastric pain. What do these symptoms primarily warn of?",
        options: [
            { key: "A", text: "Impending eclampsia / severe pre-eclampsia requiring urgent blood pressure and neurological assessment" },
            { key: "B", text: "Normal third-trimester ligament stretching with no urgency" },
            { key: "C", text: "Mild iron deficiency requiring routine next-month review" },
            { key: "D", text: "Resolved morning sickness" },
        ],
        correctKey: "A",
        rationale:
            "Persistent headache, visual disturbances, and epigastric pain in pre-eclampsia signal central nervous system irritability and hepatic/vascular involvement—urgent evaluation is vital.",
    },
    {
        id: "mw-4",
        domain: "Midwifery & Obstetric Safety",
        prompt:
            "Which parameter must be checked regularly before and during maintenance magnesium sulfate therapy in pre-eclampsia?",
        options: [
            { key: "A", text: "Respiratory rate, deep tendon (patellar) reflexes, and hourly urine output" },
            { key: "B", text: "Nail polish colour and hair texture only" },
            { key: "C", text: "Daily weight gain over 3 weeks" },
            { key: "D", text: "Peak expiratory flow meter readings only" },
        ],
        correctKey: "A",
        rationale:
            "Magnesium is excreted renally and depresses neuromuscular transmission; checking respiratory rate, patellar reflexes, and urine output detects toxicity early.",
    },

    // Paediatrics & Child Health (4)
    {
        id: "paed-1",
        domain: "Paediatrics & Child Health",
        prompt:
            "A 3-year-old child weighing 12 kg is prescribed paracetamol 15 mg/kg for high fever. What is the correct single dose in milligrams?",
        options: [
            { key: "A", text: "120 mg" },
            { key: "B", text: "180 mg" },
            { key: "C", text: "240 mg" },
            { key: "D", text: "300 mg" },
        ],
        correctKey: "B",
        rationale:
            "12 kg × 15 mg/kg = 180 mg. Always verify paediatric weight-based calculations before administration.",
    },
    {
        id: "paed-2",
        domain: "Paediatrics & Child Health",
        prompt:
            "A 2-year-old with acute watery diarrhoea is lethargic, has sunken eyes, and drinks poorly when offered fluids. Which hydration classification and care priority fits best?",
        options: [
            { key: "A", text: "Severe dehydration / danger signs—initiate urgent resuscitation/rehydration protocol and close monitoring" },
            { key: "B", text: "No dehydration—send home with no follow-up or zinc" },
            { key: "C", text: "Withhold all oral and intravenous fluids for 12 hours" },
            { key: "D", text: "Give solid heavy meals immediately while ignoring lethargy" },
        ],
        correctKey: "A",
        rationale:
            "Lethargy and inability/poor ability to drink in a child with diarrhoea indicate severe dehydration or danger signs requiring prompt rehydration and close observation.",
    },
    {
        id: "paed-3",
        domain: "Paediatrics & Child Health",
        prompt:
            "Why is checking blood glucose important in a child presenting with severe malaria and altered consciousness or persistent vomiting?",
        options: [
            { key: "A", text: "Hypoglycaemia is a dangerous, treatable complication in severe malaria and poor oral intake" },
            { key: "B", text: "Blood glucose replaces the need to check temperature or breathing" },
            { key: "C", text: "Malaria parasites directly convert into insulin" },
            { key: "D", text: "It is only done after discharge" },
        ],
        correctKey: "A",
        rationale:
            "Children with severe malaria and reduced intake are vulnerable to hypoglycaemia, which can worsen neurological status if missed.",
    },
    {
        id: "paed-4",
        domain: "Paediatrics & Child Health",
        prompt:
            "When counselling a caregiver after a child recovers from acute febrile illness, which prevention measure is essential in malaria-endemic areas?",
        options: [
            { key: "A", text: "Consistent nightly use of an insecticide-treated mosquito net and prompt care-seeking for new fever" },
            { key: "B", text: "Leaving stagnant water containers uncovered near sleeping areas" },
            { key: "C", text: "Skipping follow-up once the child smiles once" },
            { key: "D", text: "Sharing leftover unprescribed antibiotics from neighbours" },
        ],
        correctKey: "A",
        rationale:
            "Insecticide-treated bed nets and timely clinical evaluation for recurrent fever help prevent repeat infections and severe progression.",
    },

    // Pharmacology & IV Therapy (4)
    {
        id: "pharm-1",
        domain: "Pharmacology & IV Therapy",
        prompt:
            "You need to infuse 500 mL of isotonic fluid over 4 hours using a giving set calibrated at 20 gtt/mL. What is the drip rate in drops per minute (rounded to the nearest whole drop)?",
        options: [
            { key: "A", text: "25 gtt/min" },
            { key: "B", text: "35 gtt/min" },
            { key: "C", text: "42 gtt/min" },
            { key: "D", text: "60 gtt/min" },
        ],
        correctKey: "C",
        rationale:
            "(500 mL × 20 gtt/mL) ÷ (4 × 60 = 240 min) = 10,000 ÷ 240 = 41.67 → 42 gtt/min.",
    },
    {
        id: "pharm-2",
        domain: "Pharmacology & IV Therapy",
        prompt:
            "Amoxicillin 500 mg PO is ordered, and 250 mg capsules are available. How many capsules should you administer?",
        options: [
            { key: "A", text: "1 capsule" },
            { key: "B", text: "2 capsules" },
            { key: "C", text: "3 capsules" },
            { key: "D", text: "4 capsules" },
        ],
        correctKey: "B",
        rationale:
            "Desired ÷ Stock = 500 mg ÷ 250 mg = 2 capsules.",
    },
    {
        id: "pharm-3",
        domain: "Pharmacology & IV Therapy",
        prompt:
            "A vial contains 250 mg of medication in 5 mL of solution. What is the concentration strength in mg/mL?",
        options: [
            { key: "A", text: "25 mg/mL" },
            { key: "B", text: "50 mg/mL" },
            { key: "C", text: "100 mg/mL" },
            { key: "D", text: "125 mg/mL" },
        ],
        correctKey: "B",
        rationale:
            "250 mg ÷ 5 mL = 50 mg/mL.",
    },
    {
        id: "pharm-4",
        domain: "Pharmacology & IV Therapy",
        prompt:
            "Before administering any high-alert or intravenous medication, what is the safest nursing habit?",
        options: [
            { key: "A", text: "Verify the patient, drug, dose, route, time, and expiry/concentration—and perform an independent double-check when indicated" },
            { key: "B", text: "Rely on memory when the ward is busy without checking the label" },
            { key: "C", text: "Administer unlabeled syringes left on a trolley" },
            { key: "D", text: "Skip allergy checks for repeat admissions" },
        ],
        correctKey: "A",
        rationale:
            "Systematic verification and independent double-checking on high-alert drugs prevent serious medication errors.",
    },

    // Nursing Ethics & Consent (4)
    {
        id: "eth-1",
        domain: "Nursing Ethics & Consent",
        prompt:
            "A mentally competent adult patient refuses a recommended diagnostic procedure after full explanation of risks, benefits, and alternatives. What should the nurse do?",
        options: [
            { key: "A", text: "Respect the patient's informed refusal, document the discussion objectively, and notify the attending clinician" },
            { key: "B", text: "Proceed with the procedure anyway to protect the patient" },
            { key: "C", text: "Ask a cleaner or bystander to persuade the patient" },
            { key: "D", text: "Discharge the patient immediately without documentation" },
        ],
        correctKey: "A",
        rationale:
            "Autonomous, competent adults have the right to refuse treatment after informed disclosure. Clear documentation and timely clinical communication safeguard both patient rights and continuity of care.",
    },
    {
        id: "eth-2",
        domain: "Nursing Ethics & Consent",
        prompt:
            "A classmate asks you for the name and diagnosis of a patient you cared for during clinical placement. Which principle governs your response?",
        options: [
            { key: "A", text: "Patient confidentiality—do not share identifiable patient details outside authorised care duties" },
            { key: "B", text: "Share the details as long as you do not post them on social media" },
            { key: "C", text: "Share the chart photos in a student group chat for study" },
            { key: "D", text: "Disclose information whenever someone asks politely" },
        ],
        correctKey: "A",
        rationale:
            "Patient confidentiality applies in clinical areas, classrooms, and online spaces; clinical learning must never expose identifiable patient information.",
    },
    {
        id: "eth-3",
        domain: "Nursing Ethics & Consent",
        prompt:
            "You realise you administered a dose at the wrong time or missed a scheduled dose. What is the ethical and professional action?",
        options: [
            { key: "A", text: "Assess the patient immediately for safety effects, report promptly to the senior/prescriber, and document factually" },
            { key: "B", text: "Hide the error and hope no one notices" },
            { key: "C", text: "Blame a student nurse without checking facts" },
            { key: "D", text: "Falsify the drug chart to match the scheduled time" },
        ],
        correctKey: "A",
        rationale:
            "Patient safety comes first: immediate assessment, transparent escalation, and accurate documentation protect the patient and support safe systems.",
    },
    {
        id: "eth-4",
        domain: "Nursing Ethics & Consent",
        prompt:
            "What does informed consent require before a non-emergency clinical procedure?",
        options: [
            { key: "A", text: "Clear explanation of purpose, expected benefits, key risks, and alternatives in language the patient understands, voluntarily agreed to" },
            { key: "B", text: "A signature obtained while the patient is sedated or confused without explanation" },
            { key: "C", text: "Medical jargon only so the patient feels reassured" },
            { key: "D", text: "Consent from a distant relative when a competent adult can decide" },
        ],
        correctKey: "A",
        rationale:
            "Valid informed consent requires comprehension, voluntariness, and decision-making capacity.",
    },

    // Medical-Surgical & Infection Prevention (4)
    {
        id: "ms-1",
        domain: "Medical-Surgical & Infection Prevention",
        prompt:
            "During post-operative care on day 2 after abdominal surgery, a patient rates incisional pain 7/10 and avoids deep breathing. Which intervention best supports respiratory recovery?",
        options: [
            { key: "A", text: "Administer prescribed analgesia, splint the incision with a pillow/hands during deep breathing/coughing, and assist gradual mobilisation" },
            { key: "B", text: "Keep the patient strictly immobile in bed for 5 days" },
            { key: "C", text: "Avoid analgesia so the patient stays drowsy and quiet" },
            { key: "D", text: "Remove the dressing without hand hygiene to inspect the wound" },
        ],
        correctKey: "A",
        rationale:
            "Controlling pain and splinting the incision reduces splinting-related shallow breathing/atelectasis and supports safe early ambulation.",
    },
    {
        id: "ms-2",
        domain: "Medical-Surgical & Infection Prevention",
        prompt:
            "When is alcohol-based hand rub generally less reliable than soap and running water for hand hygiene?",
        options: [
            { key: "A", text: "When hands are visibly soiled/dirty or after exposure to spore-forming organisms such as Clostridioides difficile" },
            { key: "B", text: "Before putting on clean examination gloves" },
            { key: "C", text: "After touching a patient's intact skin briefly" },
            { key: "D", text: "Before preparing a clean medication tray" },
        ],
        correctKey: "A",
        rationale:
            "Physical washing with soap and water removes visible soil/organic matter and mechanically reduces spores where alcohol rub alone is insufficient.",
    },
    {
        id: "ms-3",
        domain: "Medical-Surgical & Infection Prevention",
        prompt:
            "A patient with an indwelling urinary catheter develops fever, flank discomfort, and cloudy/malodorous urine. What is a key nursing priority?",
        options: [
            { key: "A", text: "Assess vitals and catheter drainage patency/flow, keep the collection bag below bladder level without touching the floor, and notify the clinician" },
            { key: "B", text: "Lift the urine bag above the bladder and empty it into an unwashed basin" },
            { key: "C", text: "Disconnect the catheter tubing repeatedly to flush air in" },
            { key: "D", text: "Ignore fever because catheterised patients always have fever" },
        ],
        correctKey: "A",
        rationale:
            "Maintaining closed drainage, gravity flow (bag below bladder level), assessment, and medical review helps address catheter-associated infection safely.",
    },
    {
        id: "ms-4",
        domain: "Medical-Surgical & Infection Prevention",
        prompt:
            "Which practice prevents sharps injuries during clinical procedures?",
        options: [
            { key: "A", text: "Dispose of needles/syringes immediately into a puncture-resistant sharps container at point of use without recapping two-handed" },
            { key: "B", text: "Hold used needles in your hand while walking across the ward" },
            { key: "C", text: "Overfill sharps boxes until needles stick out of the top" },
            { key: "D", text: "Place used sharps on kidney dishes for later sorting" },
        ],
        correctKey: "A",
        rationale:
            "Immediate point-of-use disposal into proper sharps containers and avoiding risky recapping are core bloodborne pathogen protections.",
    },

    // Fundamentals & Vital Signs (4)
    {
        id: "fund-1",
        domain: "Fundamentals & Vital Signs",
        prompt:
            "When assessing an adult's radial pulse, which three characteristics should you note?",
        options: [
            { key: "A", text: "Rate (beats per minute), rhythm (regular or irregular), and amplitude/strength (e.g., bounding, normal, weak/thready)" },
            { key: "B", text: "Blood group, haemoglobin level, and serum sodium" },
            { key: "C", text: "Pupil size, visual acuity, and tendon reflexes" },
            { key: "D", text: "Bowel sounds, skin turgor, and urine specific gravity" },
        ],
        correctKey: "A",
        rationale:
            "A complete pulse assessment evaluates rate, rhythm, and force/amplitude.",
    },
    {
        id: "fund-2",
        domain: "Fundamentals & Vital Signs",
        prompt:
            "A patient's blood pressure cuff is noticeably too narrow for a large adult upper arm. What error can this cause?",
        options: [
            { key: "A", text: "Falsely elevated blood pressure readings" },
            { key: "B", text: "Falsely low oxygen saturation" },
            { key: "C", text: "Accurate core body temperature" },
            { key: "D", text: "Elimination of pulse pressure" },
        ],
        correctKey: "A",
        rationale:
            "An undersized cuff requires extra pressure to compress the artery, producing falsely high blood pressure measurements.",
    },
    {
        id: "fund-3",
        domain: "Fundamentals & Vital Signs",
        prompt:
            "A patient is short of breath and has a respiratory rate of 28 breaths/min with accessory muscle use. Which position typically eases breathing best unless contraindicated?",
        options: [
            { key: "A", text: "Fowler's or high-Fowler's position (upright/semi-upright) with oxygen and pulse oximetry support as ordered" },
            { key: "B", text: "Flat prone position face-down with head turned" },
            { key: "C", text: "Trendelenburg position (head lower than feet)" },
            { key: "D", text: "Tightly wrapped chest binder" },
        ],
        correctKey: "A",
        rationale:
            "Upright/semi-upright positioning reduces diaphragmatic pressure from abdominal organs and supports chest expansion.",
    },
    {
        id: "fund-4",
        domain: "Fundamentals & Vital Signs",
        prompt:
            "What is the most reliable way to confirm a patient's identity before giving medication or taking a specimen?",
        options: [
            { key: "A", text: "Ask the patient to state their full name and date of birth (or ID) and check against the wristband/chart—not just calling out a bed number" },
            { key: "B", text: "Assume whoever is lying in Bed 4 is the patient listed for Bed 4" },
            { key: "C", text: "Ask a nearby visitor if the name sounds right" },
            { key: "D", text: "Rely only on the room sign" },
        ],
        correctKey: "A",
        rationale:
            "Active patient identification using at least two identifiers against official records prevents wrong-patient errors.",
    },
]

const DOMAINS = [
    "All Domains",
    "Midwifery & Obstetric Safety",
    "Paediatrics & Child Health",
    "Pharmacology & IV Therapy",
    "Nursing Ethics & Consent",
    "Medical-Surgical & Infection Prevention",
    "Fundamentals & Vital Signs",
]

function formatClock(totalSeconds: number): string {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60)
    const secs = Math.max(0, totalSeconds) % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export default function CbtSimulatorPage() {
    const [selectedDomain, setSelectedDomain] = useState<string>("All Domains")
    const [questionLimit, setQuestionLimit] = useState<number>(10)
    const [activePool, setActivePool] = useState<CbtQuestion[]>(CBT_QUESTIONS.slice(0, 10))
    const [durationMinutes, setDurationMinutes] = useState<number>(15)
    const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60)
    const [started, setStarted] = useState<boolean>(false)
    const [submitted, setSubmitted] = useState<boolean>(false)
    const [currentIdx, setCurrentIdx] = useState<number>(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [flagged, setFlagged] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (!started || submitted) return
        const timer = window.setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(timer)
                    setSubmitted(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => window.clearInterval(timer)
    }, [started, submitted])

    const domainPool = useMemo(() => {
        if (selectedDomain === "All Domains") return CBT_QUESTIONS
        return CBT_QUESTIONS.filter((q) => q.domain === selectedDomain)
    }, [selectedDomain])

    const configuredPool = useMemo(() => {
        return domainPool.slice(0, Math.min(questionLimit, domainPool.length))
    }, [domainPool, questionLimit])

    const activeQ = activePool[currentIdx] || activePool[0]

    const scoreSummary = useMemo(() => {
        let correct = 0
        const missed: CbtQuestion[] = []
        for (const q of activePool) {
            if (answers[q.id] === q.correctKey) {
                correct += 1
            } else {
                missed.push(q)
            }
        }
        const total = activePool.length
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0
        return { correct, total, pct, missed }
    }, [answers, activePool])

    function startExam(mins: number, customPool?: CbtQuestion[]) {
        const pool = customPool && customPool.length > 0 ? customPool : configuredPool
        setActivePool(pool)
        setDurationMinutes(mins)
        setSecondsLeft(mins * 60)
        setAnswers({})
        setFlagged({})
        setCurrentIdx(0)
        setSubmitted(false)
        setStarted(true)
    }

    function toggleFlag(qId: string) {
        setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }))
    }

    return (
        <AppShell>
            <div className="max-w-4xl space-y-6 pb-24 sm:pb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-h1">CBT Examination Simulator</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            {CBT_QUESTIONS.length} exam-style nursing &amp; midwifery questions across 6 core domains with rationales and AI Tutor follow-up.
                        </p>
                    </div>
                    {started && !submitted && (
                        <div className="rounded-xl border border-border bg-white px-4 py-2 text-right">
                            <span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted">
                                Time Remaining
                            </span>
                            <span className="font-mono text-lg font-bold text-brand-700">
                                {formatClock(secondsLeft)}
                            </span>
                        </div>
                    )}
                </div>

                {!started ? (
                    <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
                        <div className="space-y-2">
                            <h2 className="text-h3 text-on-surface">Configure Timed CBT Session</h2>
                            <p className="text-sm text-on-surface-muted">
                                {domainPool.length} question{domainPool.length === 1 ? "" : "s"} in selected domain • Starting {configuredPool.length} question{configuredPool.length === 1 ? "" : "s"}.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                                Focus Domain
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {DOMAINS.map((dom) => (
                                    <button
                                        key={dom}
                                        type="button"
                                        onClick={() => setSelectedDomain(dom)}
                                        className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                                            selectedDomain === dom
                                                ? "bg-brand-700 text-white"
                                                : "border border-border bg-gray-50 text-on-surface hover:bg-gray-100"
                                        }`}
                                    >
                                        {dom}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                                Number of Questions
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {[4, 10, 24].map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        onClick={() => setQuestionLimit(count)}
                                        className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                                            questionLimit === count
                                                ? "bg-brand-700 text-white"
                                                : "border border-border bg-gray-50 text-on-surface"
                                        }`}
                                    >
                                        {count === 24 ? `All (${domainPool.length})` : `Up to ${count}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                                Timer Duration
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {[10, 15, 30].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                            setDurationMinutes(m)
                                            setSecondsLeft(m * 60)
                                        }}
                                        className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                                            durationMinutes === m
                                                ? "bg-brand-700 text-white"
                                                : "border border-border bg-gray-50 text-on-surface"
                                        }`}
                                    >
                                        {m} Minutes
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button onClick={() => startExam(durationMinutes, configuredPool)}>
                            Start CBT Exam ({configuredPool.length} Qs)
                        </Button>
                    </div>
                ) : !submitted ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-muted">
                                <span>
                                    Answered: {Object.keys(answers).length}/{activePool.length} • Flagged:{" "}
                                    {Object.values(flagged).filter(Boolean).length}
                                </span>
                                <Button variant="secondary" onClick={() => setSubmitted(true)}>
                                    Submit Exam
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {activePool.map((q, idx) => {
                                    const isCurrent = idx === currentIdx
                                    const isAnswered = Boolean(answers[q.id])
                                    const isFlagged = Boolean(flagged[q.id])
                                    return (
                                        <button
                                            key={q.id}
                                            type="button"
                                            onClick={() => setCurrentIdx(idx)}
                                            className={`h-9 w-9 rounded-lg text-xs font-bold transition ${
                                                isCurrent
                                                    ? "bg-brand-700 text-white"
                                                    : isFlagged
                                                    ? "border-2 border-amber-500 bg-amber-50 text-amber-900"
                                                    : isAnswered
                                                    ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                                                    : "border border-border bg-white text-on-surface-muted"
                                            }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="neutral">{activeQ.domain}</Badge>
                                    <span className="text-xs text-on-surface-muted">
                                        Question {currentIdx + 1} of {activePool.length}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleFlag(activeQ.id)}
                                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-on-surface hover:bg-gray-50"
                                >
                                    {flagged[activeQ.id] ? "🚩 Flagged" : "🏳 Flag for Review"}
                                </button>
                            </div>

                            <p className="text-base font-medium text-on-surface leading-relaxed">{activeQ.prompt}</p>

                            <div className="space-y-2.5">
                                {activeQ.options.map((opt) => {
                                    const selected = answers[activeQ.id] === opt.key
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setAnswers((prev) => ({ ...prev, [activeQ.id]: opt.key }))}
                                            className={`w-full rounded-xl border p-3.5 text-left text-sm transition ${
                                                selected
                                                    ? "border-brand-700 bg-brand-50/50 font-medium text-on-surface"
                                                    : "border-border bg-white text-on-surface-muted hover:bg-gray-50"
                                            }`}
                                        >
                                            <span className="font-bold text-on-surface mr-2">{opt.key}.</span>
                                            {opt.text}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Button
                                    variant="secondary"
                                    disabled={currentIdx === 0}
                                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                                >
                                    ← Previous
                                </Button>
                                {currentIdx < activePool.length - 1 ? (
                                    <Button onClick={() => setCurrentIdx((i) => Math.min(activePool.length - 1, i + 1))}>
                                        Next Question →
                                    </Button>
                                ) : (
                                    <Button onClick={() => setSubmitted(true)}>Finish &amp; Grade Exam</Button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Alert variant={scoreSummary.pct >= 70 ? "success" : "warning"}>
                            Score: {scoreSummary.correct}/{scoreSummary.total} ({scoreSummary.pct}%) — Review the rationales below or drill missed questions to lock in accuracy.
                        </Alert>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {scoreSummary.missed.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={() => startExam(durationMinutes, scoreSummary.missed)}
                                >
                                    Drill Missed Questions ({scoreSummary.missed.length})
                                </Button>
                            )}
                            <Button
                                onClick={() => {
                                    setStarted(false)
                                    setSubmitted(false)
                                }}
                            >
                                New Session
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {activePool.map((q, idx) => {
                                const picked = answers[q.id]
                                const isRight = picked === q.correctKey
                                const tutorPrompt = [
                                    `Explain the clinical and exam rationale for this ${q.domain} CBT question:`,
                                    `Question: ${q.prompt}`,
                                    `Key Answer: ${q.correctKey}${picked ? ` (Student selected: ${picked})` : ""}`,
                                    `Rationale: ${q.rationale}`,
                                ].join("\n")
                                const tutorUrl = buildAiTutorUrl(tutorPrompt)
                                return (
                                    <div key={q.id} className="rounded-xl border border-border bg-white p-5 space-y-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-on-surface-muted">
                                                Q{idx + 1} • {q.domain}
                                            </span>
                                            <Badge variant={isRight ? "success" : "warning"}>
                                                {isRight ? "Correct" : `Your answer: ${picked || "None"} • Key: ${q.correctKey}`}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-semibold text-on-surface">{q.prompt}</p>
                                        <p className="text-xs sm:text-sm text-on-surface-muted">{q.rationale}</p>
                                        <div className="pt-1">
                                            <Link
                                                to={tutorUrl}
                                                className="inline-block text-xs font-semibold text-brand-700 hover:underline"
                                            >
                                                Ask AI Tutor to explain rationale →
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
