import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import api from "../api/client"

interface TutorMessage {
    id: string
    role: "user" | "tutor"
    content: string
    framework?: string
    modeLabel?: string
    topicHint?: string
}

interface SavedPearl {
    id: string
    title: string
    content: string
    savedAt: string
}

type StudyModeId = "breakdown" | "mcq" | "osce" | "pharma" | "careplan" | "compare"

interface StudyMode {
    id: StudyModeId
    label: string
    shortDesc: string
    instruction: string
}

const STUDY_MODES: StudyMode[] = [
    {
        id: "breakdown",
        label: "Step-by-Step Breakdown",
        shortDesc: "Clear pathophysiology, core principles & bedside takeaways",
        instruction: "Explain step by step in clear, structured nursing and science terms with clinical takeaways:",
    },
    {
        id: "mcq",
        label: "N&MC Exam Drill (3 MCQs)",
        shortDesc: "3 licensure-style questions with options A–D & rationales",
        instruction: "Create 3 Ghanaian N&MC licensure-style multiple-choice questions (options A, B, C, D) with the correct answer and detailed clinical rationale for each on:",
    },
    {
        id: "osce",
        label: "OSCE & Ward Checklist",
        shortDesc: "Practical steps, equipment, IPC & critical safety stops",
        instruction: "Provide a step-by-step OSCE & ward practical checklist including preparation/equipment, infection prevention, numbered clinical steps, and critical safety alerts for:",
    },
    {
        id: "pharma",
        label: "Drug & Dosage Safety",
        shortDesc: "Mechanism, ward dosing, toxicity signs, antidote & checks",
        instruction: "Give a clinical pharmacology safety guide covering mechanism of action, standard dosing/reconstitution, key nursing assessments, toxicity warning signs, and antidote for:",
    },
    {
        id: "careplan",
        label: "NANDA Care Plan",
        shortDesc: "Assessment cues, PES diagnosis, SMART goals & rationales",
        instruction: "Build a structured NANDA-I / NIC / NOC nursing care plan with subjective & objective assessment cues, PES nursing diagnosis, SMART goals, and prioritized interventions with rationales for:",
    },
    {
        id: "compare",
        label: "Compare & Contrast",
        shortDesc: "Side-by-side differences, clinical clues & exam traps",
        instruction: "Compare and contrast the key clinical features, pathophysiology, diagnostic clues, management differences, and N&MC exam traps for:",
    },
]

const PROGRAMMES = ["All Tracks", "RGN", "RM", "RPN", "CHN", "NAC", "NAP"]
const LEVELS = ["All Levels", "Level 100", "Level 200", "Level 300"]

const TOPIC_CATEGORIES: Record<string, string[]> = {
    "All High-Yield": [
        "Magnesium sulfate toxicity signs & antidote in severe pre-eclampsia",
        "Postpartum haemorrhage (PPH) immediate nursing priorities",
        "Cell biology: organelles, ATP production & membrane transport",
        "Cardiovascular anatomy & physiology: blood flow & conduction",
        "Incidence vs. prevalence & core epidemiological measures",
        "Artesunate IV/IM reconstitution & severe malaria monitoring",
    ],
    "Midwifery & Obstetric": [
        "Magnesium sulfate toxicity signs & antidote in severe pre-eclampsia",
        "Postpartum haemorrhage (PPH) immediate nursing priorities",
        "Active management of the third stage of labour (AMTSL)",
        "Partograph alert and action lines in labour monitoring",
    ],
    "Medical-Surgical": [
        "Acute decompensated heart failure & loop diuretic priorities",
        "Diabetic ketoacidosis (DKA) fluid & insulin replacement sequence",
        "Pre-operative and post-operative airway & haemorrhage checks",
        "Blood transfusion reaction signs & immediate nursing actions",
    ],
    "Pharmacology": [
        "Artesunate IV/IM reconstitution & severe malaria monitoring",
        "Oxytocin IV infusion titration & uterine hyperstimulation checks",
        "Furosemide electrolyte monitoring & ototoxicity precautions",
        "IV drip rate calculation formula (drops/min & mL/hr) with examples",
    ],
    "Community & Epi": [
        "Incidence vs. prevalence & core epidemiological measures",
        "Cholera outbreak case management & ORS Plan A, B, C",
        "Ghana EPI cold chain management & vaccine storage temperatures",
        "Home visit priorities for newly diagnosed pulmonary tuberculosis",
    ],
    "Science Foundations": [
        "Cell biology: organelles, ATP production & membrane transport",
        "Cardiovascular anatomy & physiology: blood flow & conduction",
        "Chemistry: acids, bases, pH buffers & chemical bonding",
        "Nephron filtration, reabsorption & fluid-electrolyte balance",
    ],
}

const PEARLS_STORAGE_KEY = "nursify_ai_tutor_saved_pearls_v1"

function normalizeTypos(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/cadio[a-z]*/gi, "cardiovascular")
        .replace(/cardi[a-z]*/gi, "cardiovascular")
        .replace(/mitocondr[a-z]*/gi, "mitochondria")
        .replace(/cel[l]*\s+biol[a-z]*/gi, "cell biology")
        .replace(/osmos[a-z]*/gi, "osmosis")
        .replace(/difus[a-z]*/gi, "diffusion")
        .replace(/chemistr[a-z]*/gi, "chemistry")
        .replace(/biol[a-z]*/gi, "biology")
        .replace(/anatom[a-z]*/gi, "anatomy")
        .replace(/physiolog[a-z]*/gi, "physiology")
        .replace(/pharm[a-z]*/gi, "pharmacology")
        .replace(/megnesiu[a-z]*/gi, "magnesium")
        .replace(/pre-?eclam[a-z]*/gi, "pre-eclampsia")
        .replace(/(haemorr|hemorr)[a-z]*/gi, "haemorrhage")
        .replace(/nefron[a-z]*/gi, "nephron")
        .replace(/sinaps[a-z]*/gi, "synapse")
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
        q.includes("redox")
    ) {
        return {
            subject: "Chemistry & Biochemistry Foundations",
            definition:
                "Chemistry examines matter, atomic/molecular structure, chemical bonding, reactions, and acid-base/equilibrium changes—essential for physiology, pharmacology, and clinical laboratory interpretation.",
            corePrinciples: [
                "**Structure & Bonding:** Ionic bonds transfer electrons while covalent bonds share electron pairs; polarity and hydrogen bonding govern solubility and protein folding.",
                "**Stoichiometry & Solutions:** Concentration links moles or mass to volume (molarity, % w/v, mEq/L), ensuring accurate drug dilutions and IV electrolyte therapy.",
                "**Acids, Bases & Buffers:** Acids donate H+ ions and bases accept H+; the bicarbonate/carbonic acid buffer system maintains blood pH between 7.35 and 7.45.",
                "**Energetics & Redox:** Oxidation-reduction reactions drive cellular respiration and ATP synthesis.",
            ],
            application: `For **${trimmed}**, identify the chemical species or buffer system first, track conservation of charge/protons, and connect it to physiological or bedside lab values.`,
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
        q.includes("enzyme") ||
        q.includes("biology") ||
        q.includes("microbiology")
    ) {
        return {
            subject: "Cell & Molecular Biology",
            definition:
                "Cell and molecular biology explain how cells, organelles, membranes, genetic pathways, and microorganisms sustain homeostasis and respond to clinical interventions.",
            corePrinciples: [
                "**Cell Architecture:** The plasma membrane controls selective transport; nucleus stores DNA; ribosomes synthesize proteins; ER/Golgi package proteins; mitochondria generate ATP.",
                "**Membrane Transport:** Diffusion and osmosis move passively down gradients without ATP, while active pumps (such as Na+/K+-ATPase) consume ATP to move solutes against gradients.",
                "**Genetics & Enzymes:** DNA -> mRNA -> protein directs cell function; enzymes lower activation energy and are sensitive to pH and temperature.",
                "**Microbiology & IPC:** Bacteria, viruses, fungi, and parasites require targeted antimicrobials, vaccines, and strict infection-prevention precautions.",
            ],
            application: `When answering **${trimmed}**, state the cellular structure or transport mechanism involved, whether ATP is required, and the clinical effect when disrupted.`,
        }
    }

    if (
        q.includes("cardiovascular") ||
        q.includes("heart") ||
        q.includes("blood") ||
        q.includes("artery") ||
        q.includes("vein") ||
        q.includes("pressure") ||
        q.includes("cardiac") ||
        q.includes("anatomy") ||
        q.includes("physiology") ||
        q.includes("kidney") ||
        q.includes("nephron") ||
        q.includes("lung") ||
        q.includes("respiratory") ||
        q.includes("neuron") ||
        q.includes("synapse")
    ) {
        return {
            subject: "Human Anatomy & Physiology",
            definition:
                "Anatomy defines body structures and spatial relationships, while physiology explains how organs and systems maintain homeostasis through feedback mechanisms.",
            corePrinciples: [
                "**Homeostasis & Feedback:** Negative feedback stabilizes blood pressure, oxygenation, blood glucose, and core temperature within safe physiological ranges.",
                "**Haemodynamic Flow:** Systemic veins -> Right Atrium -> Right Ventricle -> Pulmonary Circuit -> Left Atrium -> Left Ventricle -> Aorta, governed by Cardiac Output (HR × SV) and Systemic Vascular Resistance.",
                "**Organ Integration:** Respiratory gas exchange, renal filtration/reabsorption, and autonomic neuro-endocrine signalling coordinate continuously.",
            ],
            application: `For **${trimmed}**, trace the anatomical pathway or physiological loop step by step and note how altered perfusion or oxygenation presents clinically.`,
        }
    }

    return {
        subject: "Clinical Nursing, Midwifery & Science Reasoning",
        definition:
            "Structured clinical reasoning integrates pathophysiology, patient assessment cues, pharmacology safety, and Ghanaian N&MC standards of care.",
        corePrinciples: [
            "**Assessment & Triage (ABCDE):** Prioritize Airway, Breathing, Circulation, Disability, and Exposure before secondary interventions.",
            "**Pathophysiology to Bedside Action:** Link underlying disease mechanisms directly to early warning signs and targeted nursing interventions.",
            "**Safety & Documentation:** Verify the rights of medication administration, contraindications, patient education, and accurate clinical charting.",
        ],
        application: `For **${trimmed}**, organize your answer into (1) core definition, (2) prioritized assessment & nursing interventions, and (3) safety checks or exam rationales.`,
    }
}

function buildAcademicTutorResponse(
    question: string,
    mode: StudyModeId = "breakdown"
): { content: string; framework: string } {
    const trimmed = question.trim()
    const q = normalizeTypos(trimmed)

    if (isGreetingOnly(trimmed)) {
        return {
            framework: "NursifyGH Clinical & Science Study Studio • Ready",
            content: [
                "Welcome to your **NursifyGH Study Studio**. Select your **Programme Track**, **Level**, and **Study Mode** above, or ask any question across nursing, midwifery, pharmacology, anatomy, biology, or chemistry.",
                "**What we can do together:**",
                "- **Step-by-Step Breakdown:** Clear pathophysiology, anatomy, and science explanations.",
                "- **N&MC Exam Drill:** 3 licensure-style MCQs with rationales on any topic.",
                "- **OSCE & Ward Checklist:** Practical steps, equipment, and safety alerts.",
                "- **NANDA Care Plan & Drug Safety:** Ready-to-study PES diagnoses, SMART goals, and dosage/toxicity checks.",
            ].join("\n\n"),
        }
    }

    if (mode === "mcq") {
        return {
            framework: "N&MC Licensure Exam Drill • 3 Practice Questions",
            content: [
                `### Practice Drill: ${trimmed}`,
                "**Question 1 (Clinical Priority):** A patient presents with acute complications related to this condition. Which nursing action takes **highest immediate priority**?\n- A. Complete routine admission paperwork\n- B. Perform focused ABCDE and vital-sign assessment and escalate instability\n- C. Schedule discharge teaching for next week\n- D. Wait 4 hours before re-evaluating\n\n**Correct Answer:** **B** — *Rationale:* Immediate airway, breathing, circulation, and haemodynamic stabilization always precede routine tasks in acute clinical care.",
                "**Question 2 (Safety & Monitoring):** Which clinical finding requires **immediate intervention** during management?\n- A. Stable vital signs within normal baseline\n- B. Progressive deterioration in respiratory rate, level of consciousness, or urine output\n- C. Patient verbalizing understanding of instructions\n- D. Normal capillary refill under 2 seconds\n\n**Correct Answer:** **B** — *Rationale:* Deteriorating respiratory effort, neuro status, or oliguria (< 30 mL/hr) signals early decompensation or treatment toxicity.",
                "**Question 3 (Patient Education & Prevention):** Which statement by the patient indicates **effective teaching**?\n- A. \"I will stop my prescribed therapy as soon as I feel slightly better.\"\n- B. \"I know the danger signs to report immediately and will attend follow-up review.\"\n- C. \"I can double my dose if I miss one.\"\n- D. \"Follow-up monitoring is unnecessary once discharged.\"\n\n**Correct Answer:** **B** — *Rationale:* Early recognition of red-flag symptoms and adherence to follow-up prevent relapse and severe morbidity.",
            ].join("\n\n"),
        }
    }

    if (mode === "osce") {
        return {
            framework: "OSCE & Ward Practical Station Checklist",
            content: [
                `### OSCE Station Guide: ${trimmed}`,
                "**1. Preparation & Infection Prevention (IPC):**\n- Perform hand hygiene and don appropriate PPE.\n- Assemble and inspect all sterile/clean equipment on a clean trolley.\n- Greet the patient, verify identity, explain the procedure clearly, and obtain informed consent.",
                "**2. Core Clinical Procedure Steps:**\n- Establish baseline vital signs (BP, Pulse, RR, Temp, SpO2) and focused physical assessment.\n- Execute the clinical intervention systematically using aseptic technique and maintaining patient privacy and comfort.\n- Monitor patient tolerance continuously throughout the procedure.",
                "**3. Critical Safety Stops & Documentation:**\n- **Stop & Escalate:** Immediately halt and notify the clinician/supervisor if airway compromise, severe hypotension, haemorrhage, or adverse reaction occurs.\n- Dispose of sharps and clinical waste in colour-coded bins, perform hand hygiene, and document time, findings, and patient response accurately.",
            ].join("\n\n"),
        }
    }

    if (mode === "careplan") {
        return {
            framework: "NANDA-I / NIC / NOC Care Plan Builder",
            content: [
                `### Nursing Care Plan: ${trimmed}`,
                "**1. Assessment Cues:**\n- **Subjective:** Patient reports distressing symptoms, discomfort, or anxiety related to condition.\n- **Objective:** Altered vital signs, physical examination findings, or laboratory/diagnostic abnormalities.",
                "**2. Nursing Diagnosis (PES Format):**\n- **Problem:** Impaired physiological stability / Acute risk for complications *related to* underlying pathophysiological process *as evidenced by* clinical signs and vital-sign changes.",
                "**3. SMART Outcome / Goal:**\n- Patient will demonstrate stabilized vital signs, improved comfort, and absence of acute complications within **4–24 hours** of targeted nursing care.",
                "**4. Interventions & Rationales:**\n- **Monitor Vital Signs & Focused Status (q1–4h):** *Rationale:* Detects early haemodynamic or respiratory deterioration promptly.\n- **Administer Prescribed Therapy Safely:** *Rationale:* Targets underlying etiology while preventing medication errors or toxicity.\n- **Educate Patient & Caregiver on Red-Flag Signs:** *Rationale:* Promotes adherence and timely reporting of complications.",
            ].join("\n\n"),
        }
    }

    if (q.includes("magnesium") || q.includes("mgso4") || q.includes("pre-eclampsia") || q.includes("eclampsia")) {
        return {
            framework: "Obstetric Safety & High-Alert Medication Protocol",
            content: [
                "**1. Clinical Priority:** Severe pre-eclampsia—especially with persistent headache, visual disturbances, or epigastric pain—carries a high risk of eclamptic seizures and maternal-fetal compromise.",
                "**2. Essential Safety Monitoring (Before & During MgSO4):**\n- **Respiratory Rate:** Must be **>= 12–16 breaths/min**.\n- **Deep Tendon (Patellar) Reflexes:** Must be **present**.\n- **Hourly Urine Output:** Must be **>= 30 mL/hr** (since magnesium is excreted renally).",
                "**3. Toxicity Recognition & Antidote:**\n- Loss of patellar reflexes, respiratory depression, or oliguria signals **magnesium toxicity**.\n- **Action:** Stop the MgSO4 infusion immediately, support airway/oxygenation, notify the obstetric team urgently, and administer **10% Calcium Gluconate (1 g IV slowly)** as the antidote.",
            ].join("\n\n"),
        }
    }

    if (q.includes("pph") || q.includes("postpartum") || q.includes("haemorrhage") || q.includes("bleeding")) {
        return {
            framework: "ABCDE + Uterine Tone Obstetric Priority",
            content: [
                "**1. Immediate Escalation:** Call for urgent obstetric/midwifery help—primary postpartum haemorrhage (> 500 mL vaginal or > 1,000 mL caesarean) can cause rapid hypovolaemic shock.",
                "**2. Focused Assessment (4 Ts — Tone, Tissue, Trauma, Thrombin):**\n- Assess airway, breathing, circulation, uterine tone (firm vs. soft/boggy), bladder fullness, and ongoing blood loss.",
                "**3. Priority Interventions:**\n- Perform **fundal massage** to stimulate uterine contraction.\n- Empty a distended bladder (catheterize if needed) so the uterus can contract effectively.\n- Establish two large-bore IV lines, administer prescribed uterotonics (**Oxytocin** per protocol), draw blood for grouping/cross-matching, and monitor BP, pulse, and SpO2 continuously.",
            ].join("\n\n"),
        }
    }

    if (q.includes("incidence") || q.includes("prevalence") || q.includes("epidemiology") || q.includes("biostatistics")) {
        return {
            framework: "Epidemiology & Biostatistics • Core Distinctions",
            content: [
                "**1. Incidence vs. Prevalence:**\n- **Incidence** measures **NEW cases** developing in a population at risk over a specified time period (measures risk and speed of spread).\n- **Prevalence** measures **ALL existing cases** (both new and pre-existing) in a defined population at a specific point or period (measures overall disease burden).",
                "**2. Key Formula Relationship:**\n- $\\text{Prevalence} \\approx \\text{Incidence} \\times \\text{Average Duration of Disease}$\n- Chronic illnesses with long survival (e.g., hypertension, diabetes) have **high prevalence** even when annual incidence is moderate.",
                "**3. Exam Clue:** Look for *\"newly diagnosed cases over X months\"* for **Incidence**, and *\"total proportion currently living with the condition\"* for **Prevalence**.",
            ].join("\n\n"),
        }
    }

    const domain = extractSubjectAndFocus(trimmed, q)
    return {
        framework: `${domain.subject} • Structured Breakdown`,
        content: [
            `**Core Definition:** ${domain.definition}`,
            "**Key Principles & Mechanisms:**\n" + domain.corePrinciples.map((line) => `- ${line}`).join("\n"),
            `**Clinical & Exam Application:** ${domain.application}`,
        ].join("\n\n"),
    }
}

export default function AiTutorPage() {
    const [searchParams] = useSearchParams()
    const handledParamRef = useRef<string | null>(null)
    const threadEndRef = useRef<HTMLDivElement | null>(null)

    const [selectedProgramme, setSelectedProgramme] = useState<string>("All Tracks")
    const [selectedLevel, setSelectedLevel] = useState<string>("All Levels")
    const [selectedMode, setSelectedMode] = useState<StudyModeId>("breakdown")
    const [activeCategory, setActiveCategory] = useState<string>("All High-Yield")

    const [prompt, setPrompt] = useState("")
    const [sending, setSending] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [savedPearls, setSavedPearls] = useState<SavedPearl[]>(() => {
        try {
            const raw = localStorage.getItem(PEARLS_STORAGE_KEY)
            return raw ? (JSON.parse(raw) as SavedPearl[]) : []
        } catch {
            return []
        }
    })
    const [showPearlsDrawer, setShowPearlsDrawer] = useState(false)

    const [messages, setMessages] = useState<TutorMessage[]>([
        {
            id: "welcome-1",
            role: "tutor",
            framework: "NursifyGH Clinical & Science Study Studio • Ready",
            content:
                "Choose your **Programme Track**, **Level**, and **Study Mode** above, or tap any high-yield topic below. Ask me for step-by-step pathophysiology, **3-question N&MC drills**, **OSCE checklists**, **NANDA care plans**, or **drug safety checks**.",
        },
    ])

    useEffect(() => {
        try {
            localStorage.setItem(PEARLS_STORAGE_KEY, JSON.stringify(savedPearls))
        } catch {
            // ignore storage quota errors
        }
    }, [savedPearls])

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, [messages, sending])

    const currentMode = STUDY_MODES.find((m) => m.id === selectedMode) || STUDY_MODES[0]

    async function askTutor(rawTopic: string, overrideMode?: StudyModeId) {
        const cleanTopic = rawTopic.trim()
        if (!cleanTopic || sending) return

        const activeModeObj =
            STUDY_MODES.find((m) => m.id === (overrideMode || selectedMode)) || currentMode

        const contextTags: string[] = []
        if (selectedProgramme !== "All Tracks") contextTags.push(selectedProgramme)
        if (selectedLevel !== "All Levels") contextTags.push(selectedLevel)
        const trackBadge = contextTags.length > 0 ? ` [${contextTags.join(" • ")}]` : ""

        const userDisplay = `${cleanTopic}`
        const apiPrompt = `${activeModeObj.instruction} ${cleanTopic}${
            contextTags.length > 0
                ? ` (Tailor specifically for Ghanaian N&MC ${contextTags.join(" ")} curriculum and clinical practice.)`
                : " (Tailor for Ghanaian N&MC nursing & midwifery students.)"
        }`

        const userMsg: TutorMessage = {
            id: `u-${Date.now()}`,
            role: "user",
            content: userDisplay,
            modeLabel: `${activeModeObj.label}${trackBadge}`,
        }
        setMessages((prev) => [...prev, userMsg])
        setPrompt("")
        setSending(true)

        try {
            const history = messages
                .slice(1)
                .slice(-6)
                .map((m) => ({
                    role: m.role === "tutor" ? "assistant" : "user",
                    content: m.content,
                }))
            const res = await api.post("/academics/tutor/", { prompt: apiPrompt, history })
            const fallback = buildAcademicTutorResponse(cleanTopic, activeModeObj.id)
            const replyText =
                typeof res.data?.reply === "string" && res.data.reply.trim()
                    ? res.data.reply.trim()
                    : fallback.content
            const frameworkLabel =
                typeof res.data?.framework === "string" && res.data.framework.trim()
                    ? res.data.framework.trim()
                    : `${activeModeObj.label}${trackBadge}`

            setMessages((prev) => [
                ...prev,
                {
                    id: `t-${Date.now() + 1}`,
                    role: "tutor",
                    content: replyText,
                    framework: frameworkLabel,
                    topicHint: cleanTopic,
                },
            ])
        } catch {
            const fallback = buildAcademicTutorResponse(cleanTopic, activeModeObj.id)
            setMessages((prev) => [
                ...prev,
                {
                    id: `t-${Date.now() + 1}`,
                    role: "tutor",
                    content: fallback.content,
                    framework: `${fallback.framework}${trackBadge}`,
                    topicHint: cleanTopic,
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

    function handleCopy(id: string, text: string) {
        navigator.clipboard?.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
    }

    function handleSavePearl(msg: TutorMessage) {
        const title = msg.topicHint || msg.framework || "Clinical Study Note"
        if (savedPearls.some((p) => p.content === msg.content)) return
        setSavedPearls((prev) => [
            {
                id: `pearl-${Date.now()}`,
                title,
                content: msg.content,
                savedAt: new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                }),
            },
            ...prev,
        ])
    }

    function handleClearChat() {
        setMessages((prev) => prev.slice(0, 1))
    }

    function startVoiceDictation() {
        const win = window as unknown as Record<string, unknown>
        const SpeechRec = (win.SpeechRecognition || win.webkitSpeechRecognition) as
            | (new () => {
                  lang: string
                  interimResults: boolean
                  maxAlternatives: number
                  onstart: (() => void) | null
                  onend: (() => void) | null
                  onerror: (() => void) | null
                  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
                  start: () => void
              })
            | undefined

        if (!SpeechRec) {
            alert("Voice dictation is not supported in this browser. Please type your question below.")
            return
        }

        try {
            const recognition = new SpeechRec()
            recognition.lang = "en-GH"
            recognition.interimResults = false
            recognition.maxAlternatives = 1
            recognition.onstart = () => setIsListening(true)
            recognition.onend = () => setIsListening(false)
            recognition.onerror = () => setIsListening(false)
            recognition.onresult = (event) => {
                const spoken = event.results?.[0]?.[0]?.transcript || ""
                if (spoken.trim()) {
                    setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${spoken.trim()}` : spoken.trim()))
                }
            }
            recognition.start()
        } catch {
            setIsListening(false)
        }
    }

    const visibleTopics = TOPIC_CATEGORIES[activeCategory] || TOPIC_CATEGORIES["All High-Yield"]

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-5 pb-28 sm:pb-10">
                {/* Clinical Study Studio Header */}
                <div className="rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#0f766e] p-5 sm:p-6 text-white shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100">
                                    <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                                    NursifyGH AI Study Studio
                                </span>
                                <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                                    N&amp;MC Curriculum Aligned
                                </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                                AI Nursing, Midwifery &amp; Science Tutor
                            </h1>
                            <p className="text-sm text-emerald-50/95 leading-relaxed">
                                Master pathophysiology, pharmacology, OSCE checklists, NANDA care plans, and N&amp;MC exam rationales tailored to your track.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowPearlsDrawer((v) => !v)}
                                className="rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-2 text-xs font-bold text-white transition-colors"
                            >
                                Saved Notes ({savedPearls.length})
                            </button>
                            {messages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleClearChat}
                                    className="rounded-xl bg-black/20 hover:bg-black/30 border border-white/15 px-3 py-2 text-xs font-semibold text-emerald-100 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Track & Level Selector */}
                    <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200 mb-1.5">
                                Programme Track
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {PROGRAMMES.map((prog) => (
                                    <button
                                        key={prog}
                                        type="button"
                                        onClick={() => setSelectedProgramme(prog)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                            selectedProgramme === prog
                                                ? "bg-white text-[#064e3b] shadow-xs"
                                                : "bg-white/12 text-white hover:bg-white/20"
                                        }`}
                                    >
                                        {prog}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200 mb-1.5">
                                Academic Level
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {LEVELS.map((lvl) => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => setSelectedLevel(lvl)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                            selectedLevel === lvl
                                                ? "bg-white text-[#064e3b] shadow-xs"
                                                : "bg-white/12 text-white hover:bg-white/20"
                                        }`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Saved Study Pearls Drawer */}
                {showPearlsDrawer && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    Saved Study Pearls &amp; Exam Notes ({savedPearls.length})
                                </h2>
                                <p className="text-xs text-slate-600">
                                    Pinned explanations saved on this device for quick pre-exam revision.
                                </p>
                            </div>
                            {savedPearls.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSavedPearls([])}
                                    className="text-xs font-semibold text-red-700 hover:underline"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        {savedPearls.length === 0 ? (
                            <p className="text-sm text-slate-700 bg-white rounded-xl border border-slate-200 p-3.5">
                                No saved notes yet. Tap <strong>Save Note</strong> under any AI Tutor explanation to pin it here.
                            </p>
                        ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {savedPearls.map((pearl) => (
                                    <div
                                        key={pearl.id}
                                        className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                {pearl.title}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-slate-500">{pearl.savedAt}</span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSavedPearls((prev) =>
                                                            prev.filter((item) => item.id !== pearl.id)
                                                        )
                                                    }
                                                    className="text-xs font-semibold text-red-600 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-700 line-clamp-3 whitespace-pre-line">
                                            {pearl.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 6 Interactive Study Mode Selector */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            1. Choose Study Mode
                        </p>
                        <span className="text-xs font-semibold text-brand-700">
                            Active: {currentMode.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {STUDY_MODES.map((mode) => {
                            const active = mode.id === selectedMode
                            return (
                                <button
                                    key={mode.id}
                                    type="button"
                                    onClick={() => setSelectedMode(mode.id)}
                                    className={`rounded-xl border p-3 text-left transition-all ${
                                        active
                                            ? "border-brand-700 bg-brand-50/80 ring-1 ring-brand-700"
                                            : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <p
                                        className={`text-sm font-bold leading-snug ${
                                            active ? "text-brand-900" : "text-slate-900"
                                        }`}
                                    >
                                        {mode.label}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600 leading-snug">
                                        {mode.shortDesc}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Categorized High-Yield Prompt Library */}
                <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {Object.keys(TOPIC_CATEGORIES).map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategory(cat)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                                    activeCategory === cat
                                        ? "bg-brand-700 text-white"
                                        : "bg-white border border-slate-200 text-slate-700 hover:border-brand-400"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {visibleTopics.map((qp) => (
                            <button
                                key={qp}
                                type="button"
                                onClick={() => askTutor(qp)}
                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 hover:border-brand-400 hover:bg-brand-50/50 transition-colors text-left shadow-2xs flex items-center justify-between gap-2"
                            >
                                <span>{qp}</span>
                                <span className="text-brand-700 font-bold shrink-0">→</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation Thread & Composer */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5 shadow-sm">
                    <div className="space-y-4">
                        {messages.map((m) => {
                            const isSaved = savedPearls.some((p) => p.content === m.content)
                            return (
                                <div
                                    key={m.id}
                                    className={`rounded-2xl p-4 sm:p-5 ${
                                        m.role === "user"
                                            ? "bg-brand-700 text-white ml-auto max-w-2xl shadow-xs"
                                            : "bg-slate-50 border border-slate-200 text-slate-900"
                                    }`}
                                >
                                    {m.role === "user" && m.modeLabel && (
                                        <div className="mb-1.5">
                                            <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
                                                {m.modeLabel}
                                            </span>
                                        </div>
                                    )}

                                    {m.role === "tutor" && m.framework && (
                                        <div className="mb-2.5">
                                            <Badge variant="neutral">{m.framework}</Badge>
                                        </div>
                                    )}

                                    {m.role === "user" ? (
                                        <p className="text-[15px] leading-relaxed whitespace-pre-line">
                                            {m.content}
                                        </p>
                                    ) : (
                                        <div
                                            className="text-[15px] leading-relaxed text-slate-900
                                            [&_p]:mb-3 [&_p:last-child]:mb-0
                                            [&_strong]:font-bold [&_strong]:text-slate-950
                                            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ul]:space-y-1.5
                                            [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_ol]:space-y-1.5
                                            [&_li]:pl-1 [&_li]:marker:text-brand-700
                                            [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-[15px] [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-1.5 [&_h1]:mt-3 [&_h2]:mt-3 [&_h3]:mt-2 [&_h1]:text-slate-950 [&_h2]:text-slate-950 [&_h3]:text-slate-950
                                            [&_code]:bg-slate-200/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-brand-900"
                                        >
                                            <ReactMarkdown>{m.content}</ReactMarkdown>
                                        </div>
                                    )}

                                    {/* Interactive Action Bar under each AI Tutor answer */}
                                    {m.role === "tutor" && m.id !== "welcome-1" && (
                                        <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                                            {m.topicHint && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => askTutor(m.topicHint!, "mcq")}
                                                        className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-bold text-brand-800 hover:bg-brand-50 transition-colors"
                                                    >
                                                        Quiz Me on This
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => askTutor(m.topicHint!, "osce")}
                                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-brand-300 transition-colors"
                                                    >
                                                        OSCE Steps
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            askTutor(
                                                                `Explain ${m.topicHint} in very simple, beginner-friendly language with a clear everyday analogy`
                                                            )
                                                        }
                                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-brand-300 transition-colors"
                                                    >
                                                        Simplify
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleSavePearl(m)}
                                                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                                    isSaved
                                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
                                                }`}
                                            >
                                                {isSaved ? "Saved ✓" : "Save Note"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleCopy(m.id, m.content)}
                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors ml-auto"
                                            >
                                                {copiedId === m.id ? "Copied ✓" : "Copy"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {sending && (
                            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-brand-600 animate-bounce" />
                                    <span
                                        className="h-2.5 w-2.5 rounded-full bg-brand-600 animate-bounce"
                                        style={{ animationDelay: "150ms" }}
                                    />
                                    <span
                                        className="h-2.5 w-2.5 rounded-full bg-brand-600 animate-bounce"
                                        style={{ animationDelay: "300ms" }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-slate-700">
                                    Preparing {currentMode.label.toLowerCase()}...
                                </span>
                            </div>
                        )}
                        <div ref={threadEndRef} />
                    </div>

                    {/* Composer with Voice Input */}
                    <form onSubmit={handleSubmit} className="pt-4 border-t border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <label
                                htmlFor="ai-tutor-prompt"
                                className="text-sm font-bold text-slate-900"
                            >
                                Ask a topic or clinical question ({currentMode.label})
                            </label>
                            {selectedProgramme !== "All Tracks" || selectedLevel !== "All Levels" ? (
                                <span className="text-xs font-semibold text-brand-700">
                                    {[selectedProgramme, selectedLevel]
                                        .filter((x) => !x.startsWith("All"))
                                        .join(" • ")}
                                </span>
                            ) : null}
                        </div>

                        <div className="flex items-stretch gap-2">
                            <button
                                type="button"
                                onClick={startVoiceDictation}
                                title="Speak your question"
                                className={`shrink-0 rounded-xl border px-3.5 flex items-center justify-center transition-colors ${
                                    isListening
                                        ? "border-red-300 bg-red-50 text-red-700 animate-pulse"
                                        : "border-slate-300 bg-slate-50 text-slate-700 hover:border-brand-500 hover:text-brand-700"
                                }`}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                    />
                                </svg>
                            </button>

                            <input
                                id="ai-tutor-prompt"
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Pre-eclampsia MgSO4 protocol, DKA care plan, cardiac cycle, or covalent bonding..."
                                className="flex-1 min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />

                            <Button type="submit" disabled={sending || !prompt.trim()}>
                                {sending ? "Working..." : "Ask Tutor"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppShell>
    )
}
