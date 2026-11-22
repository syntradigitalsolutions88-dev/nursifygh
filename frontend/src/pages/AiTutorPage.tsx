import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import api from "../api/client"

interface TutorMessage {
    id: string
    role: "user" | "tutor"
    content: string
    framework?: string
}

const QUICK_PROMPTS = [
    "Cell biology: organelles, ATP production & membrane transport",
    "Cardiovascular anatomy & physiology: blood flow & conduction",
    "Chemistry: acids, bases, pH buffers & chemical bonding",
    "Magnesium sulfate toxicity signs & antidote in severe pre-eclampsia",
    "Postpartum haemorrhage (PPH) immediate nursing priorities",
    "Incidence vs. prevalence & core epidemiological measures",
]

function normalizeTypos(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/cadio[a-z]*/g, "cardiovascular")
        .replace(/cardi[a-z]*/g, "cardiovascular")
        .replace(/mitocondr[a-z]*/g, "mitochondria")
        .replace(/cel[l]*\s+biol[a-z]*/g, "cell biology")
        .replace(/osmos[a-z]*/g, "osmosis")
        .replace(/difus[a-z]*/g, "diffusion")
        .replace(/chemistr[a-z]*/g, "chemistry")
        .replace(/biol[a-z]*/g, "biology")
        .replace(/anatom[a-z]*/g, "anatomy")
        .replace(/physiolog[a-z]*/g, "physiology")
        .replace(/pharm[a-z]*/g, "pharmacology")
        .replace(/megnesium/g, "magnesium")
        .replace(/pre-?eclam[a-z]*/g, "pre-eclampsia")
        .replace(/haemorr[a-z]*|hemorr[a-z]*/g, "haemorrhage")
        .replace(/nefron[a-z]*/g, "nephron")
        .replace(/sinaps[a-z]*/g, "synapse")
}

function isGreetingOnly(raw: string): boolean {
    const cleaned = raw.trim().toLowerCase().replace(/[^a-z\s]/g, "")
    return /^(hi|hello|hey|good morning|good afternoon|good evening|medaase|akwaba)(\s+(tutor|there|coach))?$/.test(cleaned)
}

function extractSubjectAndFocus(trimmed: string, q: string): {
    subject: string
    definition: string
    corePrinciples: string[]
    application: string
} {
    if (
        q.includes("chemistry") ||
        q.includes("atom") ||
        q.includes("molecule") ||
        q.includes("bond") ||
        q.includes("covalent") ||
        q.includes("ionic") ||
        q.includes("ph") ||
        q.includes("acid") ||
        q.includes("base") ||
        q.includes("buffer") ||
        q.includes("mole") ||
        q.includes("molarity") ||
        q.includes("solution") ||
        q.includes("electrolyte") ||
        q.includes("oxidation") ||
        q.includes("reduction") ||
        q.includes("redox") ||
        q.includes("equilibrium") ||
        q.includes("organic") ||
        q.includes("functional group")
    ) {
        return {
            subject: "Chemistry & Biochemistry Foundations",
            definition: `Chemistry examines matter, atomic/molecular structure, chemical bonding, reactions, and energetic/equilibrium changes—critical for understanding physiology, acid-base balance, pharmacology, and clinical laboratory values.`,
            corePrinciples: [
                "Structure & Bonding: Electrons govern reactivity—ionic bonds involve electron transfer and electrostatic attraction, while covalent bonds share electron pairs; polarity and hydrogen bonding shape solubility and macromolecule folding.",
                "Stoichiometry & Solutions: Concentration links moles/mass to volume (e.g., molarity, mass/volume percent, and milliequivalents), ensuring exact dilutions and dosage/electrolyte reasoning.",
                "Acids, Bases & Buffers: Acids donate H+ (protons) and bases accept H+; physiological buffer systems (such as bicarbonate/carbonic acid) resist sharp pH shifts to protect enzyme activity and oxygen transport.",
                "Energetics & Redox: Exothermic vs. endothermic changes and oxidation-reduction (electron loss/gain) drive metabolic pathways like cellular respiration.",
            ],
            application: `For "${trimmed}", identify the chemical species or reaction type first, track conservation of mass/charge/protons, and connect the molecular behavior to physiological function or lab interpretation.`,
        }
    }

    if (
        q.includes("cell") ||
        q.includes("organelle") ||
        q.includes("mitochondria") ||
        q.includes("atp") ||
        q.includes("osmosis") ||
        q.includes("diffusion") ||
        q.includes("dna") ||
        q.includes("rna") ||
        q.includes("protein") ||
        q.includes("mitosis") ||
        q.includes("meiosis") ||
        q.includes("enzyme") ||
        q.includes("biology") ||
        q.includes("microbiology") ||
        q.includes("bacteria") ||
        q.includes("virus")
    ) {
        return {
            subject: "Cell & Molecular Biology",
            definition: `Biology—and especially cell and molecular biology—explains how living units (cells, organelles, genetic information, membranes, and microbes) maintain homeostasis, generate energy, and respond to stimuli.`,
            corePrinciples: [
                "Cell Architecture & Organelles: The plasma membrane regulates selective exchange; the nucleus houses genetic instructions; ribosomes synthesize proteins; endoplasmic reticulum and Golgi process/sort proteins; lysosomes digest waste; mitochondria generate ATP via oxidative phosphorylation.",
                "Transport Across Membranes: Passive transport (simple/facilitated diffusion and osmosis of water down its water potential / tonicity gradient) requires no ATP, whereas active transport (like the Na+/K+-ATPase pump) uses ATP to move solutes against gradients.",
                "Genetics & Enzymes: DNA -> mRNA -> protein drives cellular specialization; enzymes lower activation energy and depend on temperature, pH, and substrate concentration.",
                "Microbiology & Host Defense: Bacteria, viruses, fungi, and parasites differ in structure, replication, and susceptibility to antimicrobials, vaccines, and infection-prevention barriers.",
            ],
            application: `When answering "${trimmed}", state what structure or process is involved, how energy or concentration gradients drive it, and what happens when regulation or membrane integrity fails.`,
        }
    }

    if (
        q.includes("cardiovascular") ||
        q.includes("heart") ||
        q.includes("blood") ||
        q.includes("artery") ||
        q.includes("vein") ||
        q.includes("capillary") ||
        q.includes("pressure") ||
        q.includes("cardiac") ||
        q.includes("anatomy") ||
        q.includes("physiology") ||
        q.includes("kidney") ||
        q.includes("nephron") ||
        q.includes("lung") ||
        q.includes("respiratory") ||
        q.includes("nervous") ||
        q.includes("neuron") ||
        q.includes("synapse")
    ) {
        return {
            subject: "Human Anatomy & Physiology",
            definition: `Anatomy defines body structures and spatial relationships, while physiology explains how those structures work together across cells, tissues, organs, and systems to maintain internal stability (homeostasis).`,
            corePrinciples: [
                "Structure-Function & Homeostasis: Every organ system uses negative feedback (and occasional positive feedback) to keep variables like blood pressure, oxygenation, pH, and perfusion within safe limits.",
                "Cardiovascular & Haemodynamic Flow: Blood moves from systemic veins -> right atrium -> right ventricle -> pulmonary circuit -> left atrium -> left ventricle -> systemic arteries/capillaries, governed by cardiac output (HR × SV) and systemic vascular resistance.",
                "Neuro-Humoral & Organ Integration: Autonomic signalling, endocrine hormones, respiratory gas exchange, and renal filtration/reabsorption coordinate continuously.",
            ],
            application: `For "${trimmed}", trace the anatomical pathway or physiological feedback loop step by step, then note how changes in flow, resistance, oxygenation, or electrolyte balance affect the patient.`,
        }
    }

    return {
        subject: "General Science, Health & Clinical Reasoning",
        definition: `Science and health reasoning build reliable explanations from clear definitions, mechanistic principles, empirical evidence, and structured step-by-step problem solving.`,
        corePrinciples: [
            "Define & Isolate Variables: Clarify the core concept, given quantities/conditions, and what is being asked or compared.",
            "Trace Cause, Mechanism & Effect: Connect underlying structure, chemical/biological laws, or clinical pathophysiologic pathways to observed outcomes.",
            "Verify Units, Boundaries & Exceptions: Check SI/clinical units, assumptions, and safety limits or contraindications.",
        ],
        application: `For "${trimmed}", break the question into (1) core definition/principle, (2) step-by-step mechanism or calculation, and (3) practical or clinical takeaway.`,
    }
}

function buildAcademicTutorResponse(question: string): { content: string; framework: string } {
    const trimmed = question.trim()
    const q = normalizeTypos(trimmed)

    if (isGreetingOnly(trimmed)) {
        return {
            framework: "NursifyGH Universal Science & Clinical Tutor • Ready",
            content: [
                "Welcome. Ask me anything across chemistry, biology, anatomy & physiology, pharmacology, nursing/midwifery care, or exam questions—even with quick typos.",
                "How would you like to dive in?",
                "• Chemistry & Biochemistry: Atomic structure, bonding, stoichiometry/molarity, pH/buffers, redox, and metabolic pathways.",
                "• Biology & Anatomy/Physiology: Cell organelles, osmosis/diffusion, genetics, cardiovascular/respiratory/renal systems, and microbiology.",
                "• Nursing, Pharmacology & Exams: Clinical priorities, drug safety/calculations, care plans, and multiple-choice rationales.",
            ].join("\n"),
        }
    }

    if (q.includes("medical term") || q.includes("terminology") || q.includes("prefix") || q.includes("suffix") || q.includes("root word")) {
        return {
            framework: "Medical Terminology • Structural & Clinical Guide",
            content: [
                "Core Definition: Medical terminology is the standardized clinical language used to describe anatomy, pathology, diagnostic procedures, and interventions precisely across health teams and health records.",
                "1. Word Components:",
                "• Root Word: The core meaning of the term, usually referring to a body part, organ, or system (e.g., cardi/o = heart, hepat/o = liver, nephr/o = kidney).",
                "• Prefix: Placed at the beginning to modify meaning—such as location, number, time, or status (e.g., tachy- = fast, brady- = slow, dys- = difficult/painful/abnormal).",
                "• Suffix: Placed at the end to indicate a condition, process, procedure, or disorder (e.g., -itis = inflammation, -ectomy = surgical removal, -megaly = enlargement).",
                "• Combining Vowel: Usually 'o' (sometimes 'i' or 'a'), used to link a root to a suffix starting with a consonant (e.g., hepat/o + -itis -> hepatitis; cardi/o + -megaly -> cardiomegaly).",
                "2. Academic & Clinical Precision Tip: Always define the suffix first, then the prefix, then the root—and avoid unapproved abbreviations in formal clinical documentation.",
            ].join("\n"),
        }
    }

    if (q.includes("magnesium") || q.includes("mgso4") || q.includes("pre-eclampsia") || q.includes("eclampsia")) {
        return {
            framework: "Obstetric Safety & High-Alert Medication Protocol",
            content: [
                "1. Clinical Priority: Severe pre-eclampsia—especially when accompanied by persistent headache, visual disturbances, or epigastric pain—carries a high risk of eclamptic seizures and maternal-fetal compromise.",
                "2. Essential Safety Monitoring: Prior to and during magnesium sulfate (MgSO4) therapy, verify respiratory rate (typically >= 12–16 breaths/min), deep tendon (patellar) reflexes, and hourly urine output (typically >= 30 mL/hr).",
                "3. Toxicity Recognition & Response: Respiratory depression, loss of patellar reflexes, or marked oliguria signals magnesium toxicity. Immediately hold/stop the infusion, maintain airway/oxygenation, notify the obstetric team urgently, and have 10% calcium gluconate readily available as the antidote.",
                "4. Exam Reasoning Rule: Link physiological signs directly to toxicity and safety before selecting supportive interventions.",
            ].join("\n"),
        }
    }

    if (q.includes("pph") || q.includes("postpartum") || q.includes("haemorrhage") || q.includes("bleeding")) {
        return {
            framework: "ABCDE + Uterine Tone Clinical Priority",
            content: [
                "1. Immediate Escalation: Call for senior/obstetric assistance early—primary postpartum haemorrhage can cause rapid hypovolaemic decompensation.",
                "2. Focused Assessment: Assess airway, breathing, and circulation alongside uterine tone (firm vs. soft/boggy), bladder distension, and estimated blood loss.",
                "3. Priority Interventions: Perform gentle fundal massage to stimulate uterine contraction, empty a distended bladder if indicated, support prescribed uterotonic therapy (such as oxytocin per protocol) and IV fluid/blood resuscitation, and monitor BP, pulse, and SpO2 closely.",
                "4. Exam Reasoning Rule: When a boggy uterus and heavy post-delivery bleeding are present, uterine tone assessment and team escalation take immediate priority.",
            ].join("\n"),
        }
    }

    if (q.includes("incidence") || q.includes("prevalence") || q.includes("epidemiology") || q.includes("biostatistics") || q.includes("rate")) {
        return {
            framework: "Epidemiology & Biostatistics • Core Distinctions",
            content: [
                "1. Incidence vs. Prevalence:",
                "• Incidence measures NEW cases of a disease developing in a population at risk over a specified time period (reflects risk and transmission/onset).",
                "• Prevalence measures ALL existing cases (both new and pre-existing) in a defined population at a point in time or over a period (reflects overall disease burden).",
                "2. Key Relationship: Prevalence increases when incidence rises or when duration of illness increases (e.g., chronic conditions or slower recovery without cure).",
                "3. Exam Tip: Look for time-window and 'new cases' phrasing for incidence versus 'all existing cases' or 'snapshot/burden' for prevalence.",
            ].join("\n"),
        }
    }

    if (q.includes("care plan") || q.includes("nanda") || q.includes("smart")) {
        return {
            framework: "NANDA-I / NIC / NOC Structured Care Planning",
            content: [
                "1. Assessment: Synthesize subjective cues (symptoms reported by the patient/caregiver) with objective clinical data (vitals, physical findings, diagnostic results).",
                "2. Nursing Diagnosis (PES Format): State the Problem (NANDA-I label), related-to (underlying etiology/contributing factor), and as-evidenced-by (defining clinical signs/symptoms).",
                "3. SMART Outcome / Goal: Write a Specific, Measurable, Achievable, Relevant, and Time-bound patient outcome.",
                "4. Interventions & Evaluation: Pair nursing actions with clear physiological/safety rationales, then evaluate whether the patient met the expected outcome within the set timeframe.",
            ].join("\n"),
        }
    }

    const domain = extractSubjectAndFocus(trimmed, q)
    return {
        framework: `${domain.subject} • Structured Breakdown`,
        content: [
            `Topic: "${trimmed}"`,
            `1. Core Definition: ${domain.definition}`,
            "2. Key Principles & Mechanisms:",
            ...domain.corePrinciples.map((line) => `• ${line}`),
            `3. How to Apply This: ${domain.application}`,
            "4. Next Study Step: Ask me to quiz you on this topic, walk through a worked calculation/example, or compare two closely related concepts.",
        ].join("\n"),
    }
}

export default function AiTutorPage() {
    const [searchParams] = useSearchParams()
    const handledParamRef = useRef<string | null>(null)
    const [prompt, setPrompt] = useState("")
    const [sending, setSending] = useState(false)
    const [messages, setMessages] = useState<TutorMessage[]>([
        {
            id: "welcome-1",
            role: "tutor",
            framework: "NursifyGH Universal Science & Clinical Tutor",
            content:
                "Ask any question in chemistry, biology, anatomy & physiology, pharmacology, nursing/midwifery care, or exam prep—I understand common typos and give clear, structured explanations.",
        },
    ])

    async function askTutor(textToSend: string) {
        const clean = textToSend.trim()
        if (!clean || sending) return

        const userMsg: TutorMessage = {
            id: `u-${Date.now()}`,
            role: "user",
            content: clean,
        }
        setMessages((prev) => [...prev, userMsg])
        setPrompt("")
        setSending(true)

        try {
            const res = await api.post("/academics/tutor/", { prompt: clean })
            const fallback = buildAcademicTutorResponse(clean)
            const replyText =
                typeof res.data?.reply === "string" && res.data.reply.trim()
                    ? res.data.reply.trim()
                    : fallback.content
            const frameworkLabel =
                typeof res.data?.framework === "string" && res.data.framework.trim()
                    ? res.data.framework.trim()
                    : fallback.framework

            setMessages((prev) => [
                ...prev,
                {
                    id: `t-${Date.now() + 1}`,
                    role: "tutor",
                    content: replyText,
                    framework: frameworkLabel,
                },
            ])
        } catch {
            const fallback = buildAcademicTutorResponse(clean)
            setMessages((prev) => [
                ...prev,
                {
                    id: `t-${Date.now() + 1}`,
                    role: "tutor",
                    content: fallback.content,
                    framework: fallback.framework,
                },
            ])
        } finally {
            setSending(false)
        }
    }

    useEffect(() => {
        const qParam = searchParams.get("q")
        if (qParam && qParam.trim() && handledParamRef.current !== qParam) {
            handledParamRef.current = qParam
            askTutor(qParam)
        }
    }, [searchParams])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        askTutor(prompt)
    }

    return (
        <AppShell>
            <div className="max-w-4xl space-y-5 pb-24 sm:pb-8">
                <div>
                    <h1 className="text-h1">AI Nursing &amp; Science Tutor</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Broad explanations across chemistry, biology, anatomy &amp; physiology, pharmacology, clinical nursing, and exam rationales.
                    </p>
                </div>

                {/* Quick Prompt Chips */}
                <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((qp) => (
                        <button
                            key={qp}
                            type="button"
                            onClick={() => askTutor(qp)}
                            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-on-surface hover:bg-gray-50 text-left"
                        >
                            {qp}
                        </button>
                    ))}
                </div>

                {/* Conversation Thread */}
                <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 space-y-4">
                    <div className="space-y-3">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`rounded-xl p-4 ${
                                    m.role === "user"
                                        ? "bg-brand-700 text-white ml-auto max-w-2xl"
                                        : "bg-gray-50 border border-border text-on-surface"
                                }`}
                            >
                                {m.role === "tutor" && m.framework && (
                                    <div className="mb-2">
                                        <Badge variant="neutral">{m.framework}</Badge>
                                    </div>
                                )}
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">{m.content}</p>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
                        <div className="flex-1">
                            <Input
                                label="Ask anything in chemistry, biology, anatomy, pharmacology, or nursing"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Explain cell organelles, covalent vs ionic bonding, cardiac cycle, or MgSO4 safety"
                            />
                        </div>
                        <div className="sm:self-end">
                            <Button type="submit" disabled={sending}>
                                {sending ? "Thinking..." : "Ask Tutor"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppShell>
    )
}
