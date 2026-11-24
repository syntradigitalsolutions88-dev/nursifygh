import { Link } from "react-router-dom"
import { buildAiTutorUrl } from "../utils/tutorPrompt"
import { useMemo, useState } from "react"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"

interface DrugMonograph {
    id: string
    name: string
    drugClass: string
    routes: string
    mechanism: string
    indications: string
    contraindications: string
    adverseEffects: string
    nursingCare: string
    patientTeaching: string
}

const DRUG_MONOGRAPHS: DrugMonograph[] = [
    {
        id: "artesunate-iv",
        name: "Artesunate",
        drugClass: "Antimalarial (Artemisinin derivative)",
        routes: "IV / IM",
        mechanism: "Rapidly reduces parasite biomass by generating free radicals/reactive intermediates that damage parasite proteins and membranes.",
        indications: "Severe malaria (first-line parenteral therapy in adults and children when oral treatment is not tolerated).",
        contraindications: "Known severe hypersensitivity to artesunate or artemisinin derivatives.",
        adverseEffects: "Dizziness, nausea, delayed haemolytic anaemia (monitor post-treatment), mild transient transaminase elevation.",
        nursingCare: "Reconstitute and dilute strictly per protocol immediately before use; monitor vital signs, blood glucose (hypoglycaemia risk), and urine output.",
        patientTeaching: "Complete the full oral antimalarial follow-up course once able to swallow safely; sleep under a treated mosquito net and seek early care for fever.",
    },
    {
        id: "oxytocin-iv",
        name: "Oxytocin",
        drugClass: "Uterotonic (Posterior pituitary hormone)",
        routes: "IV infusion / IM",
        mechanism: "Binds to myometrial oxytocin receptors to stimulate rhythmic uterine contractions and promotes milk ejection via mammary myoepithelial cells.",
        indications: "Active management / prevention and treatment of postpartum haemorrhage (PPH); supervised induction or augmentation of labour.",
        contraindications: "Cephalopelvic disproportion or unfavourable presentation where vaginal birth is contraindicated, uterine rupture risk, hypertonic uterine contractions.",
        adverseEffects: "Uterine hyperstimulation, foetal distress/bradycardia, hypotension (with rapid IV bolus), water intoxication with prolonged high-volume infusion.",
        nursingCare: "Titrate IV infusion carefully; monitor uterine firmness, lochia/vaginal bleeding, maternal BP/pulse, and foetal heart rate/contraction pattern.",
        patientTeaching: "Report severe abdominal pain, dizziness, heavy bleeding, or headache immediately; understand how firm uterine contraction prevents bleeding.",
    },
    {
        id: "mgso4",
        name: "Magnesium Sulfate (MgSO4)",
        drugClass: "Anticonvulsant / Membrane & CNS stabiliser",
        routes: "IV / IM",
        mechanism: "Decreases acetylcholine release at neuromuscular junctions and reduces CNS excitability to prevent and treat eclamptic seizures.",
        indications: "Prevention and control of seizures in severe pre-eclampsia and eclampsia.",
        contraindications: "Heart block, severe unadjusted renal failure, respiratory depression.",
        adverseEffects: "Loss of deep tendon (patellar) reflexes, respiratory depression (<12–16 breaths/min), oliguria (<30 mL/hr or <100 mL/4 hr), flushing/warmth.",
        nursingCare: "Assess patellar reflexes, respiratory rate, and hourly urine output before dosing; keep 10% calcium gluconate ready at bedside as antidote.",
        patientTeaching: "Report blurred vision, severe frontal headache, epigastric pain, chest tightness, or shortness of breath immediately.",
    },
    {
        id: "furosemide",
        name: "Furosemide",
        drugClass: "Loop Diuretic",
        routes: "PO / IV / IM",
        mechanism: "Inhibits Na+/K+/2Cl- cotransport in the thick ascending limb of the loop of Henle, promoting rapid excretion of sodium, chloride, and water.",
        indications: "Acute pulmonary oedema, fluid overload in heart failure, renal or hepatic oedema, hypertensive crisis adjunct.",
        contraindications: "Anuria, severe hypokalaemia or hyponatraemia, severe dehydration/hypovolaemia.",
        adverseEffects: "Hypokalaemia, dehydration, orthostatic hypotension, ototoxicity/tinnitus (especially with rapid high-dose IV push), electrolyte imbalance.",
        nursingCare: "Track strict intake/output, daily weights, BP, and serum electrolytes (especially K+); administer morning oral doses to avoid sleep disruption.",
        patientTeaching: "Change positions slowly when standing up to prevent dizziness; report ringing in ears, muscle cramps, or palpitations.",
    },
    {
        id: "amoxicillin",
        name: "Amoxicillin",
        drugClass: "Aminopenicillin Antibacterial",
        routes: "PO",
        mechanism: "Inhibits bacterial cell wall peptidoglycan synthesis by binding penicillin-binding proteins, leading to cell lysis.",
        indications: "Community-acquired respiratory infections, otitis media, urinary/biliary infections, and selected dental/skin infections per treatment guidelines.",
        contraindications: "History of immediate/severe IgE-mediated hypersensitivity (anaphylaxis) to penicillins.",
        adverseEffects: "Diarrhoea, nausea, rash, candidiasis; rare severe hypersensitivity or Clostridioides difficile-associated diarrhoea.",
        nursingCare: "Check allergy status before every dose; observe for rash or wheezing; verify paediatric weight-based dosing and suspension measuring accuracy.",
        patientTeaching: "Finish the entire prescribed course even if symptoms improve early; report rash, swelling, or severe/bloody diarrhoea promptly.",
    },
    {
        id: "gentamicin",
        name: "Gentamicin",
        drugClass: "Aminoglycoside Antibiotic",
        routes: "IV / IM",
        mechanism: "Irreversibly binds the 30S bacterial ribosomal subunit to inhibit protein synthesis, exhibiting concentration-dependent bactericidal activity.",
        indications: "Serious Gram-negative infections, neonatal/sepsis regimens (with beta-lactam coverage), complicated intra-abdominal or urinary infections.",
        contraindications: "Known aminoglycoside hypersensitivity; use with extreme caution in renal impairment or myasthenia gravis.",
        adverseEffects: "Nephrotoxicity, ototoxicity (vestibular and cochlear damage), neuromuscular blockade.",
        nursingCare: "Monitor renal function (creatinine/urine output), signs of hearing/balance changes, and exact infusion/injection timing.",
        patientTeaching: "Report ringing in the ears, dizziness/loss of balance, or reduced urine output right away.",
    },
    {
        id: "ceftriaxone",
        name: "Ceftriaxone",
        drugClass: "Third-Generation Cephalosporin Antibacterial",
        routes: "IV / IM",
        mechanism: "Binds penicillin-binding proteins to inhibit bacterial cell wall synthesis, offering broad Gram-positive and Gram-negative coverage including CNS penetration.",
        indications: "Severe pneumonia, sepsis, meningitis, complicated typhoid/enteric or urinary infections per clinical protocol.",
        contraindications: "Severe immediate hypersensitivity to ceftriaxone or cephalosporins; avoid calcium-containing IV solutions concurrently in neonates.",
        adverseEffects: "Injection-site pain/phlebitis, diarrhoea, rash, biliary sludging/pseudolithiasis with prolonged high doses.",
        nursingCare: "Verify allergies prior to administration, check line compatibility (never mix with calcium-containing IV fluids), and monitor infusion site and bowel habits.",
        patientTeaching: "Report rash, itching, wheezing, or persistent/watery diarrhoea promptly and complete prescribed therapy.",
    },
    {
        id: "hydralazine",
        name: "Hydralazine",
        drugClass: "Direct Arterial Vasodilator (Antihypertensive)",
        routes: "IV / IM / PO",
        mechanism: "Relaxes vascular smooth muscle directly—predominantly arterioles—lowering peripheral vascular resistance and blood pressure.",
        indications: "Severe pregnancy-induced hypertension / severe pre-eclampsia when rapid blood pressure control is ordered alongside seizure prophylaxis.",
        contraindications: "Coronary artery disease, mitral valvular rheumatic heart disease, dissecting aortic aneurysm, hypersensitivity.",
        adverseEffects: "Reflex tachycardia, headache, flushing, palpitations, hypotension (especially if BP drops too abruptly).",
        nursingCare: "Monitor BP and pulse frequently during IV titration, keep client supine/safe to prevent orthostatic drops, and monitor foetal heart rate in pregnancy.",
        patientTeaching: "Report severe headache, racing heart, chest discomfort, or dizziness when changing posture.",
    },
    {
        id: "misoprostol",
        name: "Misoprostol",
        drugClass: "Prostaglandin E1 Analogue (Uterotonic)",
        routes: "PO / Sublingual / Rectal",
        mechanism: "Binds myometrial prostaglandin receptors to stimulate strong uterine contractions and cervical softening.",
        indications: "Prevention and treatment of postpartum haemorrhage (especially where oxytocin is unavailable or insufficient) and obstetric protocols per guidance.",
        contraindications: "Do not confuse dosing/routes across indications; avoid inappropriate uterotonic use when contraindicated in pregnancy/labour.",
        adverseEffects: "Shivering/rigors, transient fever, abdominal cramping, diarrhoea, nausea.",
        nursingCare: "Confirm exact indication, dose, and route; monitor uterine tone, bleeding, temperature, and vital signs; distinguish brief drug-induced fever from infection.",
        patientTeaching: "Expect mild cramping or temporary shivering/warmth if explained by care team, and report heavy bleeding or persistent severe pain.",
    },
    {
        id: "salbutamol",
        name: "Salbutamol (Albuterol)",
        drugClass: "Short-Acting Beta-2 Adrenergic Agonist (Bronchodilator)",
        routes: "Inhaled (MDI / Nebuliser) / PO / IV",
        mechanism: "Stimulates beta-2 receptors in bronchial smooth muscle to increase cyclic AMP, causing bronchodilation and reduced airway resistance.",
        indications: "Acute bronchospasm, asthma exacerbations, reversible airway obstruction.",
        contraindications: "Hypersensitivity to salbutamol; caution in tachyarrhythmias, hyperthyroidism, or severe cardiovascular disease.",
        adverseEffects: "Fine skeletal muscle tremor, tachycardia, palpitations, nervousness, mild hypokalaemia with high/frequent doses.",
        nursingCare: "Assess respiratory rate, work of breathing, breath sounds, and SpO2 before and after treatment; teach proper spacer/inhaler technique.",
        patientTeaching: "Use spacer with metered-dose inhaler for better lung delivery, rinse mouth if using concurrent inhaled corticosteroids, and seek urgent help if relief fails.",
    },
    {
        id: "diazepam",
        name: "Diazepam",
        drugClass: "Benzodiazepine (Anticonvulsant / Anxiolytic / Sedative)",
        routes: "IV / Rectal / PO",
        mechanism: "Enhances gamma-aminobutyric acid (GABA-A) receptor activity in the CNS, increasing chloride influx and dampening neuronal excitability.",
        indications: "Acute seizure termination, severe agitation/status management per protocol, procedural anxiety/sedation.",
        contraindications: "Severe respiratory depression, acute narrow-angle glaucoma, myasthenia gravis, known hypersensitivity.",
        adverseEffects: "Sedation/drowsiness, respiratory depression, hypotension, ataxia, dizziness (especially when combined with other CNS depressants).",
        nursingCare: "Keep suction, oxygen, and airway equipment ready; monitor respiratory rate, SpO2, level of consciousness, and fall safety after administration.",
        patientTeaching: "Avoid driving, operating machinery, or alcohol/unprescribed sedatives while sedated or drowsy.",
    },
    {
        id: "ors-electrolytes",
        name: "Oral Rehydration Salts (ORS)",
        drugClass: "Electrolyte & Fluid Replacement Therapy",
        routes: "PO",
        mechanism: "Uses sodium-glucose coupled transport in the small intestine to promote absorption of sodium and water despite secretory or osmotic diarrhoea.",
        indications: "Prevention and treatment of dehydration from acute watery diarrhoea in children and adults.",
        contraindications: "Severe intractable vomiting preventing oral retention, paralytic ileus, intestinal obstruction, or severe shock requiring immediate IV resuscitation first.",
        adverseEffects: "Mild vomiting if given too fast in large gulps; periorbital puffiness/hypernatraemia if over-concentrated or given without water access.",
        nursingCare: "Mix powder in exact recommended volume of safe water, give small frequent sips/spoonfuls, reassess hydration status, and continue age-appropriate feeding.",
        patientTeaching: "Prepare fresh solution daily, discard unused mixed solution after 24 hours, and return immediately for persistent vomiting, lethargy, or blood in stool.",
    },
]

type CalcMode =
    | "iv_gtt_min"
    | "iv_ml_hr"
    | "weight_dose"
    | "reconstitution"
    | "oral_liquid"
    | "concentration"
type ActiveTab = "guide" | "calculator" | "drill"

interface DrillProblem {
    id: string
    category: string
    prompt: string
    answer: number
    unit: string
    tolerance: number
    solution: string
}

const DRILL_PROBLEMS: DrillProblem[] = [
    {
        id: "d1",
        category: "Oral / Solid Dose",
        prompt: "Ordered: Amoxicillin 500 mg PO. Available: Capsules 250 mg each. How many capsules do you administer?",
        answer: 2,
        tolerance: 0.01,
        unit: "capsules",
        solution: "Desired (500 mg) ÷ Stock (250 mg) = 2 capsules.",
    },
    {
        id: "d2",
        category: "IV Drip Rate",
        prompt: "Infuse 500 mL normal saline over 4 hours using a 20 gtt/mL set. What is the rate in gtt/min (nearest whole drop)?",
        answer: 42,
        tolerance: 0.5,
        unit: "gtt/min",
        solution: "(500 mL × 20 gtt/mL) ÷ (4 × 60 = 240 min) = 41.67 → 42 gtt/min.",
    },
    {
        id: "d3",
        category: "Paediatric mg/kg Dose",
        prompt: "Child weighs 12 kg. Ordered: Paracetamol 15 mg/kg single dose. How many mg do you give?",
        answer: 180,
        tolerance: 0.5,
        unit: "mg",
        solution: "Weight (12 kg) × Dose per kg (15 mg/kg) = 180 mg.",
    },
    {
        id: "d4",
        category: "Concentration",
        prompt: "A vial contains 250 mg in 5 mL. What is the concentration in mg/mL?",
        answer: 50,
        tolerance: 0.5,
        unit: "mg/mL",
        solution: "Total drug (250 mg) ÷ Total volume (5 mL) = 50 mg/mL.",
    },
    {
        id: "d5",
        category: "IV Infusion Rate",
        prompt: "Infuse 1,000 mL of isotonic fluid over 8 hours. What is the rate in mL/hr?",
        answer: 125,
        tolerance: 0.5,
        unit: "mL/hr",
        solution: "Total volume (1,000 mL) ÷ Hours (8 hr) = 125 mL/hr.",
    },
    {
        id: "d6",
        category: "Oral Liquid Dose",
        prompt: "Ordered: 150 mg oral suspension. Available: 100 mg per 5 mL. How many mL do you draw up?",
        answer: 7.5,
        tolerance: 0.1,
        unit: "mL",
        solution: "(Desired 150 mg ÷ Stock 100 mg) × 5 mL = 1.5 × 5 = 7.5 mL.",
    },
    {
        id: "d7",
        category: "IV Drip Rate",
        prompt: "Infuse 1,000 mL over 10 hours with a 15 gtt/mL macro-drip set. What is the rate in gtt/min (nearest whole drop)?",
        answer: 25,
        tolerance: 0.5,
        unit: "gtt/min",
        solution: "(1,000 mL × 15 gtt/mL) ÷ (10 × 60 = 600 min) = 15,000 ÷ 600 = 25 gtt/min.",
    },
    {
        id: "d8",
        category: "Paediatric mg/kg Dose",
        prompt: "A child weighs 16 kg and is ordered 10 mg/kg of a medication. What is the single dose in mg?",
        answer: 160,
        tolerance: 0.5,
        unit: "mg",
        solution: "16 kg × 10 mg/kg = 160 mg.",
    },
    {
        id: "d9",
        category: "Reconstitution",
        prompt: "A powder vial of 500 mg is reconstituted to a final volume of 10 mL. You need 250 mg. How many mL do you administer?",
        answer: 5,
        tolerance: 0.1,
        unit: "mL",
        solution: "(250 mg ÷ 500 mg) × 10 mL = 0.5 × 10 = 5 mL.",
    },
    {
        id: "d10",
        category: "Oral / Solid Dose",
        prompt: "Ordered: 1 g of a medication PO. Available tablets are 500 mg each. How many tablets do you give?",
        answer: 2,
        tolerance: 0.01,
        unit: "tablets",
        solution: "Convert 1 g = 1,000 mg; 1,000 mg ÷ 500 mg = 2 tablets.",
    },
    {
        id: "d11",
        category: "IV Infusion Rate",
        prompt: "Infuse 600 mL over 6 hours. How many mL/hr should the infusion run?",
        answer: 100,
        tolerance: 0.5,
        unit: "mL/hr",
        solution: "600 mL ÷ 6 hr = 100 mL/hr.",
    },
    {
        id: "d12",
        category: "Concentration",
        prompt: "An ampoule contains 80 mg in 2 mL. What is the strength in mg/mL?",
        answer: 40,
        tolerance: 0.5,
        unit: "mg/mL",
        solution: "80 mg ÷ 2 mL = 40 mg/mL.",
    },
    {
        id: "d13",
        category: "IV Drip Rate",
        prompt: "Infuse 240 mL over 2 hours using a 60 gtt/mL micro-drip set. What is the rate in gtt/min?",
        answer: 120,
        tolerance: 0.5,
        unit: "gtt/min",
        solution: "(240 mL × 60 gtt/mL) ÷ (2 × 60 = 120 min) = 14,400 ÷ 120 = 120 gtt/min.",
    },
    {
        id: "d14",
        category: "Paediatric mg/kg Dose",
        prompt: "A 9 kg infant is ordered a single dose of 20 mg/kg. How many mg is the dose?",
        answer: 180,
        tolerance: 0.5,
        unit: "mg",
        solution: "9 kg × 20 mg/kg = 180 mg.",
    },
    {
        id: "d15",
        category: "Oral Liquid Dose",
        prompt: "Ordered: 250 mg oral liquid. Stock bottle reads 125 mg per 5 mL. How many mL do you give?",
        answer: 10,
        tolerance: 0.1,
        unit: "mL",
        solution: "(250 mg ÷ 125 mg) × 5 mL = 2 × 5 = 10 mL.",
    },
    {
        id: "d16",
        category: "Reconstitution",
        prompt: "A 1,000 mg vial is reconstituted to 10 mL. You need 750 mg. How many mL do you draw up?",
        answer: 7.5,
        tolerance: 0.1,
        unit: "mL",
        solution: "(750 mg ÷ 1,000 mg) × 10 mL = 0.75 × 10 = 7.5 mL.",
    },
    {
        id: "d17",
        category: "Oral / Solid Dose",
        prompt: "Ordered: 0.5 g of a medication PO. Available tablets are 250 mg each. How many tablets do you administer?",
        answer: 2,
        tolerance: 0.01,
        unit: "tablets",
        solution: "Convert 0.5 g = 500 mg; 500 mg ÷ 250 mg = 2 tablets.",
    },
    {
        id: "d18",
        category: "IV Infusion Rate",
        prompt: "Infuse 1,500 mL over 12 hours. What is the rate in mL/hr?",
        answer: 125,
        tolerance: 0.5,
        unit: "mL/hr",
        solution: "1,500 mL ÷ 12 hr = 125 mL/hr.",
    },
    {
        id: "d19",
        category: "Concentration",
        prompt: "A solution contains 500 mg in 250 mL. What is the concentration in mg/mL?",
        answer: 2,
        tolerance: 0.1,
        unit: "mg/mL",
        solution: "500 mg ÷ 250 mL = 2 mg/mL.",
    },
    {
        id: "d20",
        category: "IV Drip Rate",
        prompt: "Infuse 300 mL over 3 hours with a 20 gtt/mL giving set. What is the rate in gtt/min (nearest whole drop)?",
        answer: 33,
        tolerance: 0.5,
        unit: "gtt/min",
        solution: "(300 mL × 20 gtt/mL) ÷ (3 × 60 = 180 min) = 6,000 ÷ 180 = 33.33 → 33 gtt/min.",
    },
]

export default function PharmacologyPage() {
    const [tab, setTab] = useState<ActiveTab>("guide")
    const [search, setSearch] = useState("")

    // Calculator state
    const [calcMode, setCalcMode] = useState<CalcMode>("iv_gtt_min")
    const [desiredDose, setDesiredDose] = useState("500")
    const [stockDose, setStockDose] = useState("250")
    const [stockVolume, setStockVolume] = useState("5")
    const [totalVolumeMl, setTotalVolumeMl] = useState("500")
    const [durationHours, setDurationHours] = useState("4")
    const [dropFactor, setDropFactor] = useState("20")
    const [weightKg, setWeightKg] = useState("12")
    const [dosePerKg, setDosePerKg] = useState("15")

    // Practice drill state
    const [drillCategory, setDrillCategory] = useState("All")
    const [drillIdx, setDrillIdx] = useState(0)
    const [userAnswer, setUserAnswer] = useState("")
    const [solvedIds, setSolvedIds] = useState<string[]>([])
    const [checkedDrill, setCheckedDrill] = useState<null | { correct: boolean; message: string }>(null)

    const filteredDrugs = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return DRUG_MONOGRAPHS
        return DRUG_MONOGRAPHS.filter(
            (d) =>
                d.name.toLowerCase().includes(q) ||
                d.drugClass.toLowerCase().includes(q) ||
                d.routes.toLowerCase().includes(q) ||
                d.indications.toLowerCase().includes(q) ||
                d.nursingCare.toLowerCase().includes(q)
        )
    }, [search])

    const calcResult = useMemo(() => {
        const n = (v: string) => {
            const parsed = parseFloat(v)
            return Number.isFinite(parsed) ? parsed : NaN
        }

        if (calcMode === "oral_liquid") {
            const d = n(desiredDose)
            const s = n(stockDose)
            const v = n(stockVolume)
            if (d <= 0 || s <= 0 || v <= 0 || Number.isNaN(d + s + v)) {
                return { error: "Enter positive numbers for desired dose, stock strength, and stock unit/volume." }
            }
            const raw = (d / s) * v
            const rounded = Math.round(raw * 100) / 100
            return {
                headline: `${rounded} (units/mL)`,
                steps: `(${d} ÷ ${s}) × ${v} = ${rounded}`,
                safety: "Verify dose against patient weight/age and confirm unit consistency before administering.",
            }
        }

        if (calcMode === "iv_ml_hr") {
            const vol = n(totalVolumeMl)
            const hrs = n(durationHours)
            if (vol <= 0 || hrs <= 0 || Number.isNaN(vol + hrs)) {
                return { error: "Enter positive numbers for total volume (mL) and hours." }
            }
            const rate = Math.round((vol / hrs) * 10) / 10
            return {
                headline: `${rate} mL/hr`,
                steps: `${vol} mL ÷ ${hrs} hr = ${rate} mL/hr`,
                safety: "Check pump/infusion line patency and monitor infusion site regularly.",
            }
        }

        if (calcMode === "iv_gtt_min") {
            const vol = n(totalVolumeMl)
            const hrs = n(durationHours)
            const factor = n(dropFactor)
            if (vol <= 0 || hrs <= 0 || factor <= 0 || Number.isNaN(vol + hrs + factor)) {
                return { error: "Enter positive numbers for volume (mL), hours, and drop factor (gtt/mL)." }
            }
            const minutes = hrs * 60
            const exact = (vol * factor) / minutes
            const drops = Math.round(exact)
            return {
                headline: `${drops} gtt/min (exact: ${exact.toFixed(2)})`,
                steps: `(${vol} mL × ${factor} gtt/mL) ÷ (${hrs} × 60 = ${minutes} min) = ${exact.toFixed(2)} → ${drops} gtt/min`,
                safety: "Count drops over a full 60 seconds and re-verify drop factor on the giving set packaging.",
            }
        }

        if (calcMode === "weight_dose") {
            const kg = n(weightKg)
            const perKg = n(dosePerKg)
            if (kg <= 0 || perKg <= 0 || Number.isNaN(kg + perKg)) {
                return { error: "Enter positive numbers for weight (kg) and dose per kg." }
            }
            const total = Math.round(kg * perKg * 100) / 100
            return {
                headline: `${total} mg`,
                steps: `${kg} kg × ${perKg} mg/kg = ${total} mg`,
                safety: "Always verify maximum safe single/daily dose limits for paediatric or fragile patients.",
            }
        }

        if (calcMode === "concentration") {
            const s = n(stockDose)
            const v = n(stockVolume)
            if (s <= 0 || v <= 0 || Number.isNaN(s + v)) {
                return { error: "Enter positive numbers for total drug amount (mg) and total volume (mL)." }
            }
            const conc = Math.round((s / v) * 100) / 100
            return {
                headline: `${conc} mg/mL`,
                steps: `${s} mg ÷ ${v} mL = ${conc} mg/mL`,
                safety: "Double-check label concentration before drawing up high-alert or paediatric solutions.",
            }
        }

        // reconstitution
        const d = n(desiredDose)
        const s = n(stockDose)
        const v = n(stockVolume)
        if (d <= 0 || s <= 0 || v <= 0 || Number.isNaN(d + s + v)) {
            return { error: "Enter positive numbers for desired dose, reconstituted strength, and volume (mL)." }
        }
        const ml = Math.round(((d / s) * v) * 100) / 100
        return {
            headline: `${ml} mL`,
            steps: `(${d} ÷ ${s}) × ${v} mL = ${ml} mL`,
            safety: "Check final concentration after diluent addition and verify route (IV push vs. infusion vs. IM).",
        }
    }, [calcMode, desiredDose, stockDose, stockVolume, totalVolumeMl, durationHours, dropFactor, weightKg, dosePerKg])

    const drillCategories = useMemo(
        () => ["All", ...Array.from(new Set(DRILL_PROBLEMS.map((d) => d.category)))],
        []
    )
    const visibleDrills = useMemo(
        () => (drillCategory === "All" ? DRILL_PROBLEMS : DRILL_PROBLEMS.filter((d) => d.category === drillCategory)),
        [drillCategory]
    )
    const safeDrillIdx = visibleDrills.length > 0 ? drillIdx % visibleDrills.length : 0
    const activeDrill = visibleDrills[safeDrillIdx] || DRILL_PROBLEMS[0]

    function handleCheckDrill() {
        const numeric = parseFloat(userAnswer)
        const expected = activeDrill.answer
        if (Number.isNaN(numeric)) {
            setCheckedDrill({
                correct: false,
                message: `Enter a numeric value. Solution: ${activeDrill.solution}`,
            })
            return
        }
        const ok = Math.abs(numeric - expected) <= activeDrill.tolerance
        if (ok && !solvedIds.includes(activeDrill.id)) {
            setSolvedIds((prev) => [...prev, activeDrill.id])
        }
        setCheckedDrill({
            correct: ok,
            message: ok
                ? `Correct! ${activeDrill.solution}`
                : `Expected ${activeDrill.answer} ${activeDrill.unit}. ${activeDrill.solution}`,
        })
    }

    return (
        <AppShell>
            <div className="max-w-3xl space-y-5 pb-24 sm:pb-8">
                <div>
                    <h1 className="text-h1">Pharmacology & Drug Calculations</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Ghanaian clinical drug monographs, deterministic dosage formulas, and exam calculation drills.
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ["guide", `Drug Guide (${DRUG_MONOGRAPHS.length})`],
                            ["calculator", "Dosage Calculator"],
                            ["drill", `Calculation Drill (${solvedIds.length}/${DRILL_PROBLEMS.length})`],
                        ] as Array<[ActiveTab, string]>
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${tab === key
                                    ? "bg-brand-700 text-white"
                                    : "border border-border bg-white text-on-surface-muted hover:text-on-surface"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === "guide" && (
                    <div className="space-y-4">
                        <Input
                            label="Search drug, route, or clinical indication"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="e.g. Oxytocin, Magnesium Sulfate, malaria, diuretic, IV"
                        />

                        {filteredDrugs.length === 0 ? (
                            <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-on-surface-muted">
                                No matching drug monograph found for &ldquo;{search}&rdquo;.
                            </div>
                        ) : (
                            filteredDrugs.map((drug) => (
                                <div key={drug.id} className="rounded-xl border border-border bg-white p-5 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h2 className="text-h4 text-on-surface">{drug.name}</h2>
                                            <p className="text-xs text-on-surface-muted">Routes: {drug.routes}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="neutral">{drug.drugClass}</Badge>
                                            <Link
                                                to={buildAiTutorUrl(
                                                    `Give me a clinical nursing summary, priority safety checks, and exam tips for ${drug.name} (${drug.drugClass}).`
                                                )}
                                                className="text-xs font-semibold text-brand-700 underline"
                                            >
                                                Ask AI Tutor →
                                            </Link>
                                        </div>
                                    </div>
                                    <p className="text-xs sm:text-sm text-on-surface-muted">
                                        <span className="font-semibold text-on-surface">Mechanism: </span>
                                        {drug.mechanism}
                                    </p>
                                    <p className="text-xs sm:text-sm text-on-surface-muted">
                                        <span className="font-semibold text-on-surface">Indications: </span>
                                        {drug.indications}
                                    </p>
                                    <p className="text-xs sm:text-sm text-on-surface-muted">
                                        <span className="font-semibold text-on-surface">Contraindications: </span>
                                        {drug.contraindications}
                                    </p>
                                    <p className="text-xs sm:text-sm text-on-surface-muted">
                                        <span className="font-semibold text-on-surface">Adverse Effects: </span>
                                        {drug.adverseEffects}
                                    </p>
                                    <div className="rounded-lg bg-gray-50 border border-border p-3 text-xs sm:text-sm text-on-surface space-y-1">
                                        <p>
                                            <span className="font-bold">Nursing Responsibilities: </span>
                                            {drug.nursingCare}
                                        </p>
                                        <p className="text-on-surface-muted">
                                            <span className="font-semibold text-on-surface">Patient Education: </span>
                                            {drug.patientTeaching}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {tab === "calculator" && (
                    <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 space-y-4">
                        <div className="flex flex-wrap gap-1.5">
                            {(
                                [
                                    ["iv_gtt_min", "IV gtt/min"],
                                    ["iv_ml_hr", "IV mL/hr"],
                                    ["weight_dose", "mg/kg Dose"],
                                    ["reconstitution", "Reconstitution"],
                                    ["oral_liquid", "Desired / Stock"],
                                    ["concentration", "mg/mL Strength"],
                                ] as Array<[CalcMode, string]>
                            ).map(([m, lbl]) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setCalcMode(m)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${calcMode === m
                                            ? "bg-brand-700 text-white"
                                            : "border border-border bg-gray-50 text-on-surface-muted"
                                        }`}
                                >
                                    {lbl}
                                </button>
                            ))}
                        </div>

                        {(calcMode === "iv_ml_hr" || calcMode === "iv_gtt_min") && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Input
                                    label="Total Volume (mL)"
                                    type="number"
                                    value={totalVolumeMl}
                                    onChange={(e) => setTotalVolumeMl(e.target.value)}
                                />
                                <Input
                                    label="Duration (hours)"
                                    type="number"
                                    step="any"
                                    value={durationHours}
                                    onChange={(e) => setDurationHours(e.target.value)}
                                />
                                {calcMode === "iv_gtt_min" && (
                                    <Input
                                        label="Drop Factor (gtt/mL)"
                                        type="number"
                                        value={dropFactor}
                                        onChange={(e) => setDropFactor(e.target.value)}
                                    />
                                )}
                            </div>
                        )}

                        {calcMode === "weight_dose" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input
                                    label="Patient Weight (kg)"
                                    type="number"
                                    step="any"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                />
                                <Input
                                    label="Ordered Dose (mg/kg)"
                                    type="number"
                                    step="any"
                                    value={dosePerKg}
                                    onChange={(e) => setDosePerKg(e.target.value)}
                                />
                            </div>
                        )}

                        {calcMode === "concentration" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input
                                    label="Total Drug Amount (mg)"
                                    type="number"
                                    step="any"
                                    value={stockDose}
                                    onChange={(e) => setStockDose(e.target.value)}
                                />
                                <Input
                                    label="Total Solution Volume (mL)"
                                    type="number"
                                    step="any"
                                    value={stockVolume}
                                    onChange={(e) => setStockVolume(e.target.value)}
                                />
                            </div>
                        )}

                        {(calcMode === "oral_liquid" || calcMode === "reconstitution") && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Input
                                    label="Desired Dose"
                                    type="number"
                                    step="any"
                                    value={desiredDose}
                                    onChange={(e) => setDesiredDose(e.target.value)}
                                />
                                <Input
                                    label="Available Strength"
                                    type="number"
                                    step="any"
                                    value={stockDose}
                                    onChange={(e) => setStockDose(e.target.value)}
                                />
                                <Input
                                    label={
                                        calcMode === "reconstitution"
                                            ? "Diluent / Reconstituted Vol (mL)"
                                            : "Per Unit / Volume (mL or tab)"
                                    }
                                    type="number"
                                    step="any"
                                    value={stockVolume}
                                    onChange={(e) => setStockVolume(e.target.value)}
                                />
                            </div>
                        )}

                        {"error" in calcResult ? (
                            <Alert variant="danger">{calcResult.error}</Alert>
                        ) : (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                                    Calculated Result
                                </p>
                                <p className="text-xl font-bold text-emerald-950">{calcResult.headline}</p>
                                <p className="font-mono text-xs text-emerald-900">{calcResult.steps}</p>
                                <p className="text-xs text-emerald-800 pt-1">
                                    <span className="font-semibold">Safety Check: </span>
                                    {calcResult.safety}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {tab === "drill" && (
                    <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 space-y-4">
                        <div className="flex flex-wrap gap-1.5">
                            {drillCategories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                        setDrillCategory(cat)
                                        setDrillIdx(0)
                                        setUserAnswer("")
                                        setCheckedDrill(null)
                                    }}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${drillCategory === cat
                                            ? "bg-brand-700 text-white"
                                            : "border border-border bg-gray-50 text-on-surface-muted hover:text-on-surface"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-muted">
                            <span className="font-semibold text-on-surface">
                                Question {safeDrillIdx + 1} of {visibleDrills.length} • {activeDrill.category}
                            </span>
                            <span>
                                Mastered: {solvedIds.length}/{DRILL_PROBLEMS.length} • Unit: {activeDrill.unit}
                            </span>
                        </div>

                        <p className="text-sm sm:text-base font-medium text-on-surface leading-relaxed">
                            {activeDrill.prompt} <Link to={buildAiTutorUrl(`Walk step-by-step through this pharmacology calculation (${activeDrill.category}): ${activeDrill.prompt}`)} className="ml-2 text-xs font-medium text-brand-700 underline">Ask AI Tutor to explain this calculation</Link>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                            <div className="flex-1">
                                <Input
                                    label={`Your Answer (${activeDrill.unit})`}
                                    type="number"
                                    step="any"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder="Enter number"
                                />
                            </div>
                            <Button onClick={handleCheckDrill}>Check Answer</Button>
                        </div>

                        {checkedDrill && (
                            <Alert variant={checkedDrill.correct ? "success" : "warning"}>
                                {checkedDrill.message}
                            </Alert>
                        )}

                        <div className="flex justify-between pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setDrillIdx((i) => (i - 1 + visibleDrills.length) % visibleDrills.length)
                                    setUserAnswer("")
                                    setCheckedDrill(null)
                                }}
                            >
                                ← Previous
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setDrillIdx((i) => (i + 1) % visibleDrills.length)
                                    setUserAnswer("")
                                    setCheckedDrill(null)
                                }}
                            >
                                Next Question →
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
