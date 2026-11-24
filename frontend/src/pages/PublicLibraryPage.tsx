import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listPublicPlans } from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"
import { buildAiTutorUrl } from "../utils/tutorPrompt"

interface MasterPlanCard {
    id: string
    title: string
    primary_diagnosis_domain: string
    primary_diagnosis_label: string
    patient_scenario: string
    nanda_pes: string
    smart_goals: string[]
    interventions: Array<{ action: string; rationale: string }>
    student_name: string
    isLocalSample?: boolean
}

const MASTER_SAMPLE_PLANS: MasterPlanCard[] = [
    {
        id: "sample-preeclampsia",
        title: "Severe Pre-Eclampsia & Eclampsia Seizure Prevention",
        primary_diagnosis_domain: "Obstetric",
        primary_diagnosis_label: "Ineffective Tissue Perfusion / Risk for Maternal-Fetal Injury",
        patient_scenario:
            "31-year-old G2P1 at 35 weeks gestation admitted with BP 168/112 mmHg, severe frontal headache, blurred vision, and proteinuria.",
        nanda_pes:
            "Risk for Maternal and Fetal Injury related to severe gestational hypertension, cerebral vasospasm, and uteroplacental insufficiency.",
        smart_goals: [
            "Client will remain free from eclamptic seizures throughout hospitalization.",
            "Diastolic BP will stabilize safely below 100-105 mmHg within 2 hours of ordered antihypertensive therapy.",
            "Respiratory rate will stay >= 12-16 breaths/min, patellar reflexes present, and urine output >= 30 mL/hr during MgSO4 infusion.",
        ],
        interventions: [
            {
                action: "Maintain a quiet, low-stimulation environment with padded side rails and suction/oxygen ready.",
                rationale: "Reduces sensory triggers for seizures and protects airway/safety if convulsion occurs.",
            },
            {
                action: "Administer prescribed Magnesium Sulfate and check respiratory rate, patellar reflexes, and hourly urine output before/during therapy.",
                rationale: "Prevents eclamptic seizures while detecting magnesium toxicity early (keep 10% calcium gluconate at bedside).",
            },
            {
                action: "Monitor maternal BP/pulse and fetal heart rate closely during ordered antihypertensive administration.",
                rationale: "Prevents precipitous hypotension that could compromise uteroplacental perfusion.",
            },
        ],
        student_name: "NursifyGH Official",
        isLocalSample: true,
    },
    {
        id: "sample-pph",
        title: "Primary Postpartum Haemorrhage (Uterine Atony)",
        primary_diagnosis_domain: "Obstetric",
        primary_diagnosis_label: "Deficient Fluid Volume & Haemodynamic Instability",
        patient_scenario:
            "28-year-old Para 2 mother 35 minutes post-vaginal delivery with brisk vaginal bleeding, soft boggy uterus above umbilicus, and BP 88/54 mmHg.",
        nanda_pes:
            "Deficient Fluid Volume related to active postpartum uterine bleeding secondary to uterine atony as evidenced by boggy fundus, tachycardia (118/min), and hypotension (88/54 mmHg).",
        smart_goals: [
            "Uterine fundus will become firm and midline at or below the umbilicus within 15 minutes of intervention.",
            "Systolic BP will improve >= 100 mmHg and heart rate trend below 100/min within 1 hour of resuscitation.",
        ],
        interventions: [
            {
                action: "Call for immediate multidisciplinary help and perform gentle, continuous fundal massage until uterus is firm.",
                rationale: "Mechanical stimulation promotes myometrial contraction to compress open placental site vessels.",
            },
            {
                action: "Administer prescribed uterotonic therapy and establish large-bore IV access for isotonic fluid resuscitation.",
                rationale: "Sustains uterine tone and restores circulating intravascular volume.",
            },
            {
                action: "Assess and empty a distended urinary bladder per protocol while monitoring pad weight, vitals, and lochia.",
                rationale: "A full bladder displaces the uterus upward and prevents effective contraction.",
            },
        ],
        student_name: "NursifyGH Official",
        isLocalSample: true,
    },
    {
        id: "sample-malaria-paed",
        title: "Severe Paediatric Malaria with Hyperpyrexia & Vomiting",
        primary_diagnosis_domain: "Paediatric",
        primary_diagnosis_label: "Hyperthermia & Risk for Deficient Fluid Volume / Hypoglycaemia",
        patient_scenario:
            "3-year-old child (12 kg) brought with 2 days of fever (39.4°C), repeated vomiting, lethargy, and positive malaria RDT.",
        nanda_pes:
            "Hyperthermia and Risk for Acute Complications related to Plasmodium parasitaemia and persistent vomiting as evidenced by T 39.4°C, lethargy, and inability to retain oral fluids.",
        smart_goals: [
            "Child's axillary temperature will decrease below 38.0°C safely within 4 hours.",
            "Child will maintain euglycaemia and adequate hydration while receiving parenteral antimalarial care.",
        ],
        interventions: [
            {
                action: "Assess ABCDE and paediatric danger signs immediately, check blood glucose, and initiate prescribed IV/IM artesunate.",
                rationale: "Lethargy and vomiting are severe malaria danger signs requiring prompt parenteral antimalarial therapy and hypoglycaemia screening.",
            },
            {
                action: "Administer prescribed antipyretic, keep child lightly clothed in a well-ventilated room, and avoid ice baths.",
                rationale: "Lowers core temperature safely without inducing shivering or rebound thermogenesis.",
            },
            {
                action: "Educate caregiver on completing oral follow-up antimalarial therapy once tolerating feeds and nightly ITN use.",
                rationale: "Prevents recrudescence and reduces future malaria reinfection.",
            },
        ],
        student_name: "NursifyGH Official",
        isLocalSample: true,
    },
    {
        id: "sample-postop-lap",
        title: "Day-2 Post-Laparotomy Acute Pain & Atelectasis Prevention",
        primary_diagnosis_domain: "Medical-Surgical",
        primary_diagnosis_label: "Acute Pain & Ineffective Breathing Pattern",
        patient_scenario:
            "41-year-old post-abdominal surgery client reporting 7/10 incisional pain on movement, shallow breaths, and diminished bibasilar breath sounds.",
        nanda_pes:
            "Ineffective Breathing Pattern related to abdominal incisional pain and guarding as evidenced by shallow respirations and pain score 7/10.",
        smart_goals: [
            "Client will report incisional pain reduced to <= 3/10 within 45 minutes of prescribed analgesia.",
            "Client will perform 10 supported deep breaths hourly and ambulate safely with assistance during shift.",
        ],
        interventions: [
            {
                action: "Administer prescribed analgesia 30 minutes prior to respiratory exercises or ambulation and teach pillow/hand incision splinting.",
                rationale: "Reducing pain and supporting the incision minimizes splinting and promotes full alveolar expansion.",
            },
            {
                action: "Auscultate lung bases, monitor SpO2, lock bed wheels, and check orthostatic tolerance before assisted walking.",
                rationale: "Detects early atelectasis and prevents post-operative falls or drain dislodgement.",
            },
        ],
        student_name: "NursifyGH Official",
        isLocalSample: true,
    },
    {
        id: "sample-asthma",
        title: "Acute Asthma Exacerbation & Ineffective Airway Clearance",
        primary_diagnosis_domain: "Medical-Surgical",
        primary_diagnosis_label: "Impaired Gas Exchange & Ineffective Airway Clearance",
        patient_scenario:
            "24-year-old student presenting with expiratory wheezing, accessory muscle use, RR 30/min, and SpO2 90% on room air.",
        nanda_pes:
            "Impaired Gas Exchange related to bronchospasm, airway inflammation, and mucus plugging as evidenced by SpO2 90%, tachypnoea, and diffuse wheezing.",
        smart_goals: [
            "Client's SpO2 will improve and remain >= 94-95% with reduced work of breathing within 1 hour of bronchodilator therapy.",
            "Client will demonstrate correct metered-dose inhaler + spacer technique prior to discharge.",
        ],
        interventions: [
            {
                action: "Place client in high-Fowler's position, administer titrated supplemental oxygen, and give prescribed inhaled bronchodilators/corticosteroids.",
                rationale: "Upright posture maximizes diaphragmatic excursion while beta-2 agonists relax bronchial smooth muscle.",
            },
            {
                action: "Monitor SpO2, respiratory rate, peak flow/speech ability, and watch for silent chest as a critical deterioration sign.",
                rationale: "Disappearance of wheezes with poor air entry indicates severe airflow obstruction requiring urgent escalation.",
            },
        ],
        student_name: "NursifyGH Official",
        isLocalSample: true,
    },
    {
        id: "sample-delirium",
        title: "Acute Delirium & Fall Prevention in an Older Adult",
        primary_diagnosis_domain: "Gerontological",
        primary_diagnosis_label: "Acute Confusion & Risk for Falls",
        patient_scenario:
            "74-year-old client admitted with urinary tract infection who becomes acutely disoriented and restless at night, attempting to climb out of bed.",
        nanda_pes:
            "Acute Confusion related to acute urinary infection and unfamiliar hospital environment as evidenced by sudden nocturnal disorientation and restlessness.",
        smart_goals: [
            "Client will remain free from falls and physical injury throughout hospital stay.",
            "Client will show improved orientation to person and place within 24-48 hours as infection and hydration are treated.",
        ],
        interventions: [
            {
                action: "Assess reversible delirium triggers (infection, hypoxia, dehydration, pain, urinary retention, medications) and report promptly.",
                rationale: "Acute confusion in older adults is an urgent symptom of underlying physiological stress rather than normal aging.",
            },
            {
                action: "Provide calm frequent reorientation, soft lighting, clear walkways, low bed height, and accessible call bell without punitive restraints.",
                rationale: "Reduces sensory misinterpretation and fall risk while preserving dignity and circulation.",
            },
        ],
        student_name: "NursifyGH Official",
        isLocalSample: true,
    },
]

export default function PublicLibraryPage() {
    const [search, setSearch] = useState("")
    const [domainFilter, setDomainFilter] = useState("All")
    const [selectedSample, setSelectedSample] = useState<MasterPlanCard | null>(null)

    const { data: plans, isLoading } = useQuery({
        queryKey: ["public-plans"],
        queryFn: listPublicPlans,
        retry: 1,
    })

    const combinedPlans: MasterPlanCard[] = useMemo(() => {
        const apiMapped: MasterPlanCard[] = (plans || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            primary_diagnosis_domain: p.primary_diagnosis_domain || "Clinical",
            primary_diagnosis_label: p.primary_diagnosis_label || "",
            patient_scenario: p.patient_scenario || "",
            nanda_pes: p.primary_diagnosis_label || "",
            smart_goals: (p.goals || []).map((g: any) => g.statement || String(g)),
            interventions: (p.interventions || []).map((iv: any) => ({
                action: iv.action || String(iv),
                rationale: iv.rationale || "",
            })),
            student_name: p.student_name || "NursifyGH Official",
            isLocalSample: false,
        }))
        return apiMapped.length > 0 ? [...apiMapped, ...MASTER_SAMPLE_PLANS] : MASTER_SAMPLE_PLANS
    }, [plans])

    const domains = useMemo(
        () => ["All", ...Array.from(new Set(combinedPlans.map((p) => p.primary_diagnosis_domain)))],
        [combinedPlans]
    )

    const filteredPlans = useMemo(() => {
        const q = search.trim().toLowerCase()
        return combinedPlans.filter((p) => {
            const matchesDomain = domainFilter === "All" || p.primary_diagnosis_domain === domainFilter
            const matchesSearch =
                !q ||
                p.title.toLowerCase().includes(q) ||
                p.primary_diagnosis_label?.toLowerCase().includes(q) ||
                p.patient_scenario?.toLowerCase().includes(q)
            return matchesDomain && matchesSearch
        })
    }, [combinedPlans, domainFilter, search])

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-6 pb-24 sm:pb-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Community &amp; Faculty Library</p>
                        <h1 className="mt-1 text-3xl font-serif font-bold text-on-surface">Master Care Plans</h1>
                        <p className="mt-2 text-sm text-on-surface-muted max-w-2xl">
                            Browse A-grade NANDA-I / NIC / NOC nursing care plans across Ghanaian clinical specialties. Inspect PES diagnoses, SMART goals, and rationales—or build your own.
                        </p>
                    </div>
                    <Link to="/careplans/new">
                        <Button>+ Create a Plan</Button>
                    </Link>
                </div>

                {/* Search & Domain Filters */}
                <div className="space-y-3">
                    <div className="relative max-w-xl">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by diagnosis, condition, or scenario (e.g., Pre-Eclampsia, PPH, Malaria)..."
                            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
                        />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {domains.map((dom) => (
                            <button
                                key={dom}
                                type="button"
                                onClick={() => setDomainFilter(dom)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                    domainFilter === dom
                                        ? "bg-brand-700 text-white"
                                        : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {dom}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected Sample Care Plan Reader */}
                {selectedSample && (
                    <div className="rounded-2xl border-2 border-brand-600 bg-white p-6 space-y-4 shadow-md">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded border border-brand-100">
                                    {selectedSample.primary_diagnosis_domain} • Master Reference Plan
                                </span>
                                <h2 className="mt-2 text-xl font-bold text-gray-900">{selectedSample.title}</h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    to={buildAiTutorUrl(
                                        `Help me study and expand this nursing care plan: ${selectedSample.title}. Scenario: ${selectedSample.patient_scenario}`
                                    )}
                                    className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                                >
                                    Ask AI Tutor →
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSample(null)}
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-800">
                            <span className="font-bold">Clinical Scenario: </span>
                            {selectedSample.patient_scenario}
                        </div>

                        <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-4 text-sm text-emerald-950">
                            <span className="font-bold">NANDA-I Nursing Diagnosis (PES): </span>
                            {selectedSample.nanda_pes}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    SMART Outcomes / Goals
                                </h3>
                                <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700 list-disc pl-4">
                                    {selectedSample.smart_goals.map((g, idx) => (
                                        <li key={idx}>{g}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    Priority Interventions &amp; Rationales
                                </h3>
                                <div className="space-y-2.5 text-xs sm:text-sm">
                                    {selectedSample.interventions.map((iv, idx) => (
                                        <div key={idx} className="rounded-lg bg-gray-50 p-2.5">
                                            <p className="font-semibold text-gray-900">{iv.action}</p>
                                            {iv.rationale && (
                                                <p className="mt-1 text-gray-600">
                                                    <span className="font-semibold">Rationale: </span>
                                                    {iv.rationale}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading && <div className="py-12 text-center text-gray-500 animate-pulse">Loading library...</div>}

                {/* Grid */}
                {!isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlans.map((plan) => {
                            const cardBody = (
                                <>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-1 rounded border border-brand-100">
                                                {plan.primary_diagnosis_domain || "Clinical"}
                                            </span>
                                            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                                ★ 5.0
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-brand-700 transition-colors">
                                            {plan.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                                            {plan.patient_scenario}
                                        </p>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs font-medium text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {plan.smart_goals.length || 3} Goals
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                {plan.interventions.length || 3} Interventions
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold">
                                                {plan.student_name?.charAt(0) || "N"}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700">{plan.student_name || "NursifyGH Official"}</span>
                                        </div>
                                        <span className="text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                            View Plan <span aria-hidden="true">→</span>
                                        </span>
                                    </div>
                                </>
                            )

                            if (plan.isLocalSample) {
                                return (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSample(plan)
                                            window.scrollTo({ top: 0, behavior: "smooth" })
                                        }}
                                        className="group text-left flex flex-col rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-400 hover:shadow-lg transition-all"
                                    >
                                        {cardBody}
                                    </button>
                                )
                            }

                            return (
                                <Link
                                    key={plan.id}
                                    to={`/library/${plan.id}`}
                                    className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-400 hover:shadow-lg transition-all"
                                >
                                    {cardBody}
                                </Link>
                            )
                        })}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && filteredPlans.length === 0 && (
                    <div className="py-24 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                        <p className="text-gray-500 font-medium">No care plans found matching &ldquo;{search}&rdquo;</p>
                        <button
                            onClick={() => {
                                setSearch("")
                                setDomainFilter("All")
                            }}
                            className="mt-2 text-sm text-brand-600 font-bold hover:underline"
                        >
                            Reset filters
                        </button>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
