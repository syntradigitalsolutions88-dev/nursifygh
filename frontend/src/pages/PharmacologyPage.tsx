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
        nursingCare: "Reconstitute with 1 mL 5% sodium bicarbonate, then dilute with 5 mL NS for IV (10 mg/mL) or 2 mL NS for IM (20 mg/mL); monitor blood glucose and urine output.",
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
    | "artesunate_stg"
    | "oxytocin_titration"
    | "peds_maintenance"
    | "reconstitution"
    | "oral_liquid"
    | "concentration"

type ActiveTab = "guide" | "calculator" | "drill"
type MassUnit = "mcg" | "mg" | "g"
type FreqCode = "STAT" | "OD" | "BD" | "TDS" | "QID" | "Q4H"

const MASS_TO_MG: Record<MassUnit, number> = {
    mcg: 0.001,
    mg: 1,
    g: 1000,
}

const FREQ_DIVISOR: Record<FreqCode, number> = {
    STAT: 1,
    OD: 1,
    BD: 2,
    TDS: 3,
    QID: 4,
    Q4H: 6,
}

interface DrillProblem {
    id: string
    category: string
    prompt: string
    answer: number
    unit: string
    tolerance: number
    solution: string
}

const BASE_DRILL_PROBLEMS: DrillProblem[] = [
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
        category: "Ghana STG Protocol",
        prompt: "A 14 kg child with severe malaria is prescribed IV Artesunate 3.0 mg/kg. After reconstituting the 60 mg vial to 10 mg/mL (6 mL total), how many mL do you withdraw?",
        answer: 4.2,
        tolerance: 0.1,
        unit: "mL",
        solution: "Dose = 14 kg × 3.0 mg/kg = 42 mg. Volume = 42 mg ÷ 10 mg/mL = 4.2 mL.",
    },
    {
        id: "d12",
        category: "Obstetric Infusion",
        prompt: "Oxytocin 10 IU is added to 1,000 mL Normal Saline (10 mU/mL). To deliver 4 mU/min using a 20 gtt/mL giving set, how many drops/min are required?",
        answer: 8,
        tolerance: 0.5,
        unit: "gtt/min",
        solution: "4 mU/min ÷ 10 mU/mL = 0.4 mL/min. 0.4 mL/min × 20 gtt/mL = 8 gtt/min.",
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
        prompt: "A 10 kg child is prescribed Amoxicillin 45 mg/kg/day divided TDS (every 8 hours). How many mg are given per single dose?",
        answer: 150,
        tolerance: 0.5,
        unit: "mg",
        solution: "Daily dose = 10 kg × 45 mg/kg/day = 450 mg/day. Divided TDS (÷ 3) = 150 mg/dose.",
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
        prompt: "Ordered: Digoxin 0.25 mg PO. Available tablets are 125 mcg each. How many tablets do you administer?",
        answer: 2,
        tolerance: 0.01,
        unit: "tablets",
        solution: "Convert 0.25 mg = 250 mcg; 250 mcg ÷ 125 mcg = 2 tablets.",
    },
    {
        id: "d18",
        category: "Ghana STG Protocol",
        prompt: "An adult weighing 55 kg with severe malaria is prescribed IV Artesunate 2.4 mg/kg (reconstituted to 10 mg/mL). How many mL are required?",
        answer: 13.2,
        tolerance: 0.1,
        unit: "mL",
        solution: "Dose = 55 kg × 2.4 mg/kg = 132 mg. Volume = 132 mg ÷ 10 mg/mL = 13.2 mL (use 3 × 60 mg vials).",
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

function buildRandomDrill(): DrillProblem {
    const generators: Array<() => DrillProblem> = [
        () => {
            const vol = [250, 500, 1000, 1500][Math.floor(Math.random() * 4)]
            const hrs = [3, 4, 6, 8, 12][Math.floor(Math.random() * 5)]
            const df = Math.random() > 0.5 ? 20 : 15
            const ans = Math.round((vol * df) / (hrs * 60))
            return {
                id: `gen-${Date.now()}`,
                category: "IV Drip Rate",
                prompt: `Infuse ${vol} mL of Ringer's Lactate over ${hrs} hours using a ${df} gtt/mL giving set. Calculate the drip rate in gtt/min (round to nearest whole drop).`,
                answer: ans,
                unit: "gtt/min",
                tolerance: 0.5,
                solution: `(${vol} mL × ${df} gtt/mL) ÷ (${hrs} × 60 = ${hrs * 60} min) = ${((vol * df) / (hrs * 60)).toFixed(2)} → ${ans} gtt/min.`,
            }
        },
        () => {
            const wt = [8, 11, 13, 15, 17, 19][Math.floor(Math.random() * 6)]
            const ans = Number(((wt * 3.0) / 10).toFixed(1))
            return {
                id: `gen-${Date.now()}`,
                category: "Ghana STG Protocol",
                prompt: `A child weighing ${wt} kg presents with severe malaria. Per Ghana STG (3.0 mg/kg for < 20 kg), IV Artesunate is reconstituted to 10 mg/mL. How many mL should be drawn up for the stat dose?`,
                answer: ans,
                unit: "mL",
                tolerance: 0.1,
                solution: `${wt} kg × 3.0 mg/kg = ${(wt * 3).toFixed(1)} mg ÷ 10 mg/mL = ${ans} mL.`,
            }
        },
        () => {
            const wt = [10, 12, 14, 16, 18][Math.floor(Math.random() * 5)]
            const mgKgDay = [30, 45, 60][Math.floor(Math.random() * 3)]
            const singleMg = (wt * mgKgDay) / 3
            const ans = Number(((singleMg / 125) * 5).toFixed(1))
            return {
                id: `gen-${Date.now()}`,
                category: "Paediatric mg/kg Dose",
                prompt: `A ${wt} kg child is ordered Amoxicillin ${mgKgDay} mg/kg/day divided TDS (every 8 hours). Suspension available is 125 mg/5 mL. How many mL do you give per single dose?`,
                answer: ans,
                unit: "mL",
                tolerance: 0.1,
                solution: `Daily = ${wt} × ${mgKgDay} = ${wt * mgKgDay} mg/day → Single dose (÷3) = ${singleMg} mg → (${singleMg} ÷ 125) × 5 mL = ${ans} mL.`,
            }
        },
        () => {
            const targetMu = [2, 4, 6, 8, 12][Math.floor(Math.random() * 5)]
            const df = Math.random() > 0.5 ? 20 : 15
            const mlPerMin = targetMu / 10
            const ans = Math.round(mlPerMin * df)
            return {
                id: `gen-${Date.now()}`,
                category: "Obstetric Infusion",
                prompt: `Oxytocin 10 IU is mixed in 1,000 mL Normal Saline (10 mU/mL). You need to infuse ${targetMu} mU/min using a ${df} gtt/mL giving set. What is the drip rate in gtt/min?`,
                answer: ans,
                unit: "gtt/min",
                tolerance: 0.5,
                solution: `${targetMu} mU/min ÷ 10 mU/mL = ${mlPerMin} mL/min × ${df} gtt/mL = ${(mlPerMin * df).toFixed(1)} → ${ans} gtt/min.`,
            }
        },
        () => {
            const ordG = [0.5, 0.75, 1.0, 1.5][Math.floor(Math.random() * 4)]
            const stockMg = 250
            const ans = (ordG * 1000) / stockMg
            return {
                id: `gen-${Date.now()}`,
                category: "Oral / Solid Dose",
                prompt: `Prescribed: Ciprofloxacin ${ordG} g PO. Available tablets: ${stockMg} mg. How many tablets do you give per dose?`,
                answer: ans,
                unit: "tablets",
                tolerance: 0.05,
                solution: `${ordG} g = ${ordG * 1000} mg; ${ordG * 1000} mg ÷ ${stockMg} mg = ${ans} tablets.`,
            }
        },
    ]
    return generators[Math.floor(Math.random() * generators.length)]()
}

export default function PharmacologyPage() {
    const [tab, setTab] = useState<ActiveTab>("guide")
    const [search, setSearch] = useState("")

    // Calculator state
    const [calcMode, setCalcMode] = useState<CalcMode>("iv_gtt_min")
    const [desiredDose, setDesiredDose] = useState("500")
    const [desiredUnit, setDesiredUnit] = useState<MassUnit>("mg")
    const [stockDose, setStockDose] = useState("250")
    const [stockUnit, setStockUnit] = useState<MassUnit>("mg")
    const [stockVolume, setStockVolume] = useState("5")

    const [totalVolumeMl, setTotalVolumeMl] = useState("1000")
    const [durationValue, setDurationValue] = useState("8")
    const [durationUnit, setDurationUnit] = useState<"hours" | "minutes">("hours")
    const [dropFactor, setDropFactor] = useState("20")

    const [weightKg, setWeightKg] = useState("14")
    const [dosePerKg, setDosePerKg] = useState("45")
    const [weightBasis, setWeightBasis] = useState<"per_dose" | "per_day">("per_day")
    const [frequency, setFrequency] = useState<FreqCode>("TDS")
    const [stockConcMgMl, setStockConcMgMl] = useState("25")
    const [maxDailyMg, setMaxDailyMg] = useState("1500")

    // Ghana STG Artesunate & Obstetric Oxytocin state
    const [artesunateRoute, setArtesunateRoute] = useState<"IV" | "IM">("IV")
    const [oxytocinUnits, setOxytocinUnits] = useState("10")
    const [oxytocinBagMl, setOxytocinBagMl] = useState("1000")
    const [oxytocinTargetMu, setOxytocinTargetMu] = useState("4")

    // Practice drill state
    const [drillPool, setDrillPool] = useState<DrillProblem[]>(BASE_DRILL_PROBLEMS)
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

    function applyPreset(preset: "malaria_peds" | "oxytocin_pph" | "amox_peds" | "ringers_8h" | "ceftriaxone_1g") {
        if (preset === "malaria_peds") {
            setCalcMode("artesunate_stg")
            setWeightKg("14")
            setArtesunateRoute("IV")
        } else if (preset === "oxytocin_pph") {
            setCalcMode("oxytocin_titration")
            setOxytocinUnits("10")
            setOxytocinBagMl("1000")
            setOxytocinTargetMu("4")
            setDropFactor("20")
        } else if (preset === "amox_peds") {
            setCalcMode("weight_dose")
            setWeightKg("12")
            setDosePerKg("45")
            setWeightBasis("per_day")
            setFrequency("TDS")
            setStockConcMgMl("25") // 125 mg / 5 mL = 25 mg/mL
            setMaxDailyMg("1500")
        } else if (preset === "ringers_8h") {
            setCalcMode("iv_gtt_min")
            setTotalVolumeMl("1000")
            setDurationValue("8")
            setDurationUnit("hours")
            setDropFactor("20")
        } else if (preset === "ceftriaxone_1g") {
            setCalcMode("reconstitution")
            setDesiredDose("1")
            setDesiredUnit("g")
            setStockDose("1000")
            setStockUnit("mg")
            setStockVolume("10")
        }
    }

    const calcResult = useMemo(() => {
        const n = (v: string) => {
            const parsed = parseFloat(v)
            return Number.isFinite(parsed) ? parsed : NaN
        }

        if (calcMode === "oral_liquid" || calcMode === "reconstitution") {
            const dRaw = n(desiredDose)
            const sRaw = n(stockDose)
            const v = n(stockVolume)
            if (dRaw <= 0 || sRaw <= 0 || v <= 0 || Number.isNaN(dRaw + sRaw + v)) {
                return { error: "Enter positive numbers for desired dose, available strength, and volume/unit." }
            }
            const dMg = dRaw * MASS_TO_MG[desiredUnit]
            const sMg = sRaw * MASS_TO_MG[stockUnit]
            const raw = (dMg / sMg) * v
            const rounded = Math.round(raw * 100) / 100
            const unitConvNote =
                desiredUnit !== stockUnit
                    ? `Unit conversion: ${dRaw} ${desiredUnit} = ${dMg} mg; ${sRaw} ${stockUnit} = ${sMg} mg. `
                    : ""
            const unitOut = calcMode === "reconstitution" ? "mL" : "mL / tablets"
            return {
                headline: `${rounded} ${unitOut}`,
                steps: `${unitConvNote}(${dMg} mg ÷ ${sMg} mg) × ${v} = ${rounded} ${unitOut}`,
                safety:
                    calcMode === "reconstitution"
                        ? "Label syringe immediately with drug name, concentration, date, and time; verify IV vs IM diluent."
                        : "Confirm unit consistency (mcg vs mg vs g) and verify whether tablets are scored before splitting.",
            }
        }

        if (calcMode === "iv_ml_hr") {
            const vol = n(totalVolumeMl)
            const dur = n(durationValue)
            if (vol <= 0 || dur <= 0 || Number.isNaN(vol + dur)) {
                return { error: "Enter positive numbers for total volume (mL) and duration." }
            }
            const hrs = durationUnit === "hours" ? dur : dur / 60
            const rate = Math.round((vol / hrs) * 10) / 10
            return {
                headline: `${rate} mL/hr`,
                steps: `${vol} mL ÷ ${hrs.toFixed(2)} hr = ${rate} mL/hr`,
                safety: "Inspect IV cannula site for phlebitis/infiltration and verify fluid balance chart every hour.",
            }
        }

        if (calcMode === "iv_gtt_min") {
            const vol = n(totalVolumeMl)
            const dur = n(durationValue)
            const factor = n(dropFactor)
            if (vol <= 0 || dur <= 0 || factor <= 0 || Number.isNaN(vol + dur + factor)) {
                return { error: "Enter positive numbers for volume (mL), duration, and drop factor (gtt/mL)." }
            }
            const minutes = durationUnit === "hours" ? dur * 60 : dur
            const exact = (vol * factor) / minutes
            const drops = Math.round(exact)
            const mlHr = Math.round((vol / (minutes / 60)) * 10) / 10
            const secPerDrop = drops > 0 ? (60 / drops).toFixed(1) : "—"
            return {
                headline: `${drops} gtt/min (${mlHr} mL/hr)`,
                steps: `(${vol} mL × ${factor} gtt/mL) ÷ ${minutes} min = ${exact.toFixed(2)} → ${drops} gtt/min (1 drop every ${secPerDrop} sec)`,
                safety: "Count drops over a full 60 seconds and confirm giving set drop factor (15, 20, or 60 gtt/mL) on packaging.",
            }
        }

        if (calcMode === "weight_dose") {
            const kg = n(weightKg)
            const perKg = n(dosePerKg)
            const conc = n(stockConcMgMl)
            const maxCap = n(maxDailyMg)
            if (kg <= 0 || perKg <= 0 || Number.isNaN(kg + perKg)) {
                return { error: "Enter positive numbers for weight (kg) and dose per kg." }
            }
            const totalBasis = kg * perKg
            const divisor = weightBasis === "per_day" ? FREQ_DIVISOR[frequency] : 1
            const singleMg = Math.round((totalBasis / divisor) * 100) / 100
            const dailyMg =
                weightBasis === "per_day"
                    ? Math.round(totalBasis * 100) / 100
                    : Math.round(totalBasis * FREQ_DIVISOR[frequency] * 100) / 100
            const hasConc = Number.isFinite(conc) && conc > 0
            const mlPerDose = hasConc ? Math.round((singleMg / conc) * 100) / 100 : null
            const exceedsMax = Number.isFinite(maxCap) && maxCap > 0 && dailyMg > maxCap

            return {
                headline: mlPerDose !== null ? `${singleMg} mg (${mlPerDose} mL) / dose` : `${singleMg} mg / dose`,
                steps:
                    weightBasis === "per_day"
                        ? `${kg} kg × ${perKg} mg/kg/day = ${dailyMg} mg/day ÷ ${divisor} (${frequency}) = ${singleMg} mg/dose${mlPerDose !== null ? ` → ${singleMg} mg ÷ ${conc} mg/mL = ${mlPerDose} mL` : ""}`
                        : `${kg} kg × ${perKg} mg/kg = ${singleMg} mg/dose (${dailyMg} mg/day at ${frequency})${mlPerDose !== null ? ` → ${mlPerDose} mL` : ""}`,
                safety: exceedsMax
                    ? `ALERT: Calculated daily total (${dailyMg} mg/day) exceeds configured max daily limit (${maxCap} mg/day). Consult prescriber.`
                    : `Total 24-hour dose: ${dailyMg} mg/day. Always verify weight in kg (never lbs) before paediatric dosing.`,
            }
        }

        if (calcMode === "artesunate_stg") {
            const kg = n(weightKg)
            if (kg <= 0 || Number.isNaN(kg)) {
                return { error: "Enter a valid patient weight in kg." }
            }
            const mgPerKg = kg < 20 ? 3.0 : 2.4
            const doseMg = Math.round(kg * mgPerKg * 100) / 100
            const conc = artesunateRoute === "IV" ? 10 : 20
            const volMl = Math.round((doseMg / conc) * 100) / 100
            const vials = Math.ceil(doseMg / 60)
            return {
                headline: `${volMl} mL ${artesunateRoute} (${doseMg} mg)`,
                steps: `Ghana STG (${kg < 20 ? "< 20 kg → 3.0 mg/kg" : "≥ 20 kg → 2.4 mg/kg"}): ${kg} kg × ${mgPerKg} = ${doseMg} mg ÷ ${conc} mg/mL = ${volMl} mL (prepare ${vials} × 60 mg vial${vials > 1 ? "s" : ""})`,
                safety:
                    artesunateRoute === "IV"
                        ? "Reconstitute each 60 mg vial with 1 mL 5% NaHCO3 + 5 mL Normal Saline (= 6 mL; 10 mg/mL). Give at 0 hr, 12 hr, and 24 hr."
                        : "Reconstitute each 60 mg vial with 1 mL 5% NaHCO3 + 2 mL Normal Saline (= 3 mL; 20 mg/mL) for deep IM injection.",
            }
        }

        if (calcMode === "oxytocin_titration") {
            const units = n(oxytocinUnits)
            const bagMl = n(oxytocinBagMl)
            const targetMu = n(oxytocinTargetMu)
            const df = n(dropFactor)
            if (units <= 0 || bagMl <= 0 || targetMu <= 0 || df <= 0 || Number.isNaN(units + bagMl + targetMu + df)) {
                return { error: "Enter positive values for Oxytocin IU, bag volume, target mU/min, and drop factor." }
            }
            const muPerMl = (units * 1000) / bagMl
            const mlPerMin = targetMu / muPerMl
            const mlPerHr = Math.round(mlPerMin * 60 * 10) / 10
            const gttMin = Math.round(mlPerMin * df)
            return {
                headline: `${gttMin} gtt/min (${mlPerHr} mL/hr)`,
                steps: `Conc: ${units * 1000} mU ÷ ${bagMl} mL = ${muPerMl} mU/mL → ${targetMu} mU/min ÷ ${muPerMl} = ${mlPerMin.toFixed(3)} mL/min × ${df} gtt/mL = ${gttMin} gtt/min`,
                safety: "Monitor FHR and uterine contractions every 15–30 min; stop infusion immediately if tachysystole (>5 contractions/10 min) or foetal distress occurs.",
            }
        }

        if (calcMode === "peds_maintenance") {
            const kg = n(weightKg)
            if (kg <= 0 || Number.isNaN(kg)) {
                return { error: "Enter child weight in kg." }
            }
            const first10 = Math.min(kg, 10) * 4
            const second10 = Math.min(Math.max(kg - 10, 0), 10) * 2
            const above20 = Math.max(kg - 20, 0) * 1
            const mlHr = Math.round((first10 + second10 + above20) * 10) / 10
            const ml24h = Math.round(mlHr * 24)
            return {
                headline: `${mlHr} mL/hr (${ml24h} mL / 24 hr)`,
                steps: `Holliday-Segar 4-2-1 rule for ${kg} kg: (${first10} + ${second10} + ${above20}) = ${mlHr} mL/hr (${mlHr} micro-drops/min on 60 gtt/mL burette)`,
                safety: "Use a paediatric burette chamber (60 gtt/mL) to prevent accidental fluid overload in children.",
            }
        }

        // concentration
        const s = n(stockDose)
        const v = n(stockVolume)
        if (s <= 0 || v <= 0 || Number.isNaN(s + v)) {
            return { error: "Enter positive numbers for total drug amount (mg) and total volume (mL)." }
        }
        const conc = Math.round((s / v) * 100) / 100
        const percentWv = Math.round(((s / 1000) / v) * 100 * 1000) / 1000
        return {
            headline: `${conc} mg/mL (${percentWv}% w/v)`,
            steps: `${s} mg ÷ ${v} mL = ${conc} mg/mL (${conc * 1000} mcg/mL)`,
            safety: "Double-check label concentration before drawing up high-alert or paediatric solutions.",
        }
    }, [
        calcMode,
        desiredDose,
        desiredUnit,
        stockDose,
        stockUnit,
        stockVolume,
        totalVolumeMl,
        durationValue,
        durationUnit,
        dropFactor,
        weightKg,
        dosePerKg,
        weightBasis,
        frequency,
        stockConcMgMl,
        maxDailyMg,
        artesunateRoute,
        oxytocinUnits,
        oxytocinBagMl,
        oxytocinTargetMu,
    ])

    const drillCategories = useMemo(
        () => ["All", ...Array.from(new Set(drillPool.map((d) => d.category)))],
        [drillPool]
    )
    const visibleDrills = useMemo(
        () => (drillCategory === "All" ? drillPool : drillPool.filter((d) => d.category === drillCategory)),
        [drillPool, drillCategory]
    )
    const safeDrillIdx = visibleDrills.length > 0 ? drillIdx % visibleDrills.length : 0
    const activeDrill = visibleDrills[safeDrillIdx] || drillPool[0]

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

    function handleGenerateRandomDrill() {
        const nextProblem = buildRandomDrill()
        setDrillPool((prev) => [nextProblem, ...prev])
        setDrillCategory("All")
        setDrillIdx(0)
        setUserAnswer("")
        setCheckedDrill(null)
    }

    return (
        <AppShell>
            <div className="max-w-3xl space-y-5 pb-24 sm:pb-8">
                <div>
                    <h1 className="text-h1">Pharmacology & Drug Calculations</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Ghanaian clinical drug monographs, multi-step dosage & protocol calculators, and N&MC exam drills.
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ["guide", `Drug Guide (${DRUG_MONOGRAPHS.length})`],
                            ["calculator", "Clinical Calculator (9 Modes)"],
                            ["drill", `Calculation Drill (${solvedIds.length}/${drillPool.length})`],
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
                        {/* Quick Ghana Ward Presets */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-on-surface-muted">Quick Ward Scenarios:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(
                                    [
                                        ["malaria_peds", "Severe Malaria IV Artesunate (14 kg)"],
                                        ["oxytocin_pph", "Oxytocin Titration (4 mU/min)"],
                                        ["amox_peds", "Paed Amoxicillin mg/kg/day"],
                                        ["ringers_8h", "Ringer's 1,000 mL / 8 hr"],
                                        ["ceftriaxone_1g", "Ceftriaxone 1 g Vial"],
                                    ] as const
                                ).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => applyPreset(key)}
                                        className="rounded-md border border-border bg-gray-50 px-2.5 py-1 text-xs font-medium text-on-surface hover:border-brand-700 hover:text-brand-700"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Calculator Mode Selector */}
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
                            {(
                                [
                                    ["iv_gtt_min", "IV gtt/min"],
                                    ["iv_ml_hr", "IV mL/hr"],
                                    ["weight_dose", "mg/kg & Frequency"],
                                    ["artesunate_stg", "Artesunate (Ghana STG)"],
                                    ["oxytocin_titration", "Oxytocin mU/min"],
                                    ["peds_maintenance", "4-2-1 Paed Fluids"],
                                    ["reconstitution", "Reconstitution"],
                                    ["oral_liquid", "Desired / Stock"],
                                    ["concentration", "mg/mL & % Strength"],
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
                                <div className="space-y-1">
                                    <Input
                                        label={`Duration (${durationUnit})`}
                                        type="number"
                                        step="any"
                                        value={durationValue}
                                        onChange={(e) => setDurationValue(e.target.value)}
                                    />
                                    <div className="flex gap-2 text-xs">
                                        {(["hours", "minutes"] as const).map((u) => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setDurationUnit(u)}
                                                className={`underline ${durationUnit === u ? "font-bold text-brand-700" : "text-on-surface-muted"}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {calcMode === "iv_gtt_min" && (
                                    <div className="space-y-1">
                                        <Input
                                            label="Drop Factor (gtt/mL)"
                                            type="number"
                                            value={dropFactor}
                                            onChange={(e) => setDropFactor(e.target.value)}
                                        />
                                        <div className="flex gap-2 text-xs text-on-surface-muted">
                                            {["15", "20", "60"].map((df) => (
                                                <button
                                                    key={df}
                                                    type="button"
                                                    onClick={() => setDropFactor(df)}
                                                    className="underline hover:text-brand-700"
                                                >
                                                    {df} gtt/mL
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {calcMode === "weight_dose" && (
                            <div className="space-y-3">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Input
                                        label="Patient Weight (kg)"
                                        type="number"
                                        step="any"
                                        value={weightKg}
                                        onChange={(e) => setWeightKg(e.target.value)}
                                    />
                                    <Input
                                        label={weightBasis === "per_day" ? "Dose (mg/kg/day)" : "Dose (mg/kg/dose)"}
                                        type="number"
                                        step="any"
                                        value={dosePerKg}
                                        onChange={(e) => setDosePerKg(e.target.value)}
                                    />
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-on-surface">Basis & Frequency</label>
                                        <div className="flex gap-1.5">
                                            <select
                                                value={weightBasis}
                                                onChange={(e) => setWeightBasis(e.target.value as "per_dose" | "per_day")}
                                                className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs font-medium"
                                            >
                                                <option value="per_day">mg/kg/day (split)</option>
                                                <option value="per_dose">mg/kg/dose (single)</option>
                                            </select>
                                            <select
                                                value={frequency}
                                                onChange={(e) => setFrequency(e.target.value as FreqCode)}
                                                className="rounded-lg border border-border bg-white px-2.5 py-2 text-xs font-medium"
                                            >
                                                {(["STAT", "OD", "BD", "TDS", "QID", "Q4H"] as FreqCode[]).map((f) => (
                                                    <option key={f} value={f}>
                                                        {f}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        label="Optional Stock Strength (mg/mL for mL volume)"
                                        type="number"
                                        step="any"
                                        value={stockConcMgMl}
                                        onChange={(e) => setStockConcMgMl(e.target.value)}
                                        placeholder="e.g. 25 for 125mg/5mL"
                                    />
                                    <Input
                                        label="Optional Max Safe Daily Dose (mg/day)"
                                        type="number"
                                        step="any"
                                        value={maxDailyMg}
                                        onChange={(e) => setMaxDailyMg(e.target.value)}
                                        placeholder="e.g. 1500"
                                    />
                                </div>
                            </div>
                        )}

                        {calcMode === "artesunate_stg" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input
                                    label="Patient Weight (kg)"
                                    type="number"
                                    step="any"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                />
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-on-surface">Administration Route</label>
                                    <div className="flex gap-2">
                                        {(["IV", "IM"] as const).map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setArtesunateRoute(r)}
                                                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${artesunateRoute === r
                                                        ? "border-brand-700 bg-brand-700 text-white"
                                                        : "border-border bg-gray-50 text-on-surface"
                                                    }`}
                                            >
                                                {r === "IV" ? "IV (10 mg/mL — 6 mL)" : "IM (20 mg/mL — 3 mL)"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {calcMode === "oxytocin_titration" && (
                            <div className="grid gap-4 sm:grid-cols-4">
                                <Input
                                    label="Oxytocin Added (IU)"
                                    type="number"
                                    step="any"
                                    value={oxytocinUnits}
                                    onChange={(e) => setOxytocinUnits(e.target.value)}
                                />
                                <Input
                                    label="IV Bag Volume (mL)"
                                    type="number"
                                    value={oxytocinBagMl}
                                    onChange={(e) => setOxytocinBagMl(e.target.value)}
                                />
                                <Input
                                    label="Ordered Rate (mU/min)"
                                    type="number"
                                    step="any"
                                    value={oxytocinTargetMu}
                                    onChange={(e) => setOxytocinTargetMu(e.target.value)}
                                />
                                <Input
                                    label="Drop Factor (gtt/mL)"
                                    type="number"
                                    value={dropFactor}
                                    onChange={(e) => setDropFactor(e.target.value)}
                                />
                            </div>
                        )}

                        {calcMode === "peds_maintenance" && (
                            <div className="max-w-xs">
                                <Input
                                    label="Child Weight (kg)"
                                    type="number"
                                    step="any"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
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
                                <div className="space-y-1">
                                    <Input
                                        label={`Desired Dose (${desiredUnit})`}
                                        type="number"
                                        step="any"
                                        value={desiredDose}
                                        onChange={(e) => setDesiredDose(e.target.value)}
                                    />
                                    <div className="flex gap-2 text-xs">
                                        {(["mcg", "mg", "g"] as MassUnit[]).map((u) => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setDesiredUnit(u)}
                                                className={`underline ${desiredUnit === u ? "font-bold text-brand-700" : "text-on-surface-muted"}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        label={`Available Strength (${stockUnit})`}
                                        type="number"
                                        step="any"
                                        value={stockDose}
                                        onChange={(e) => setStockDose(e.target.value)}
                                    />
                                    <div className="flex gap-2 text-xs">
                                        {(["mcg", "mg", "g"] as MassUnit[]).map((u) => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setStockUnit(u)}
                                                className={`underline ${stockUnit === u ? "font-bold text-brand-700" : "text-on-surface-muted"}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Input
                                    label={
                                        calcMode === "reconstitution"
                                            ? "Final Reconstituted Vol (mL)"
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
                        <div className="flex flex-wrap items-center justify-between gap-2">
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
                            <Button variant="secondary" onClick={handleGenerateRandomDrill}>
                                + New Random Problem
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-muted">
                            <span className="font-semibold text-on-surface">
                                Question {safeDrillIdx + 1} of {visibleDrills.length} • {activeDrill.category}
                            </span>
                            <span>
                                Mastered: {solvedIds.length}/{drillPool.length} • Unit: {activeDrill.unit}
                            </span>
                        </div>

                        <p className="text-sm sm:text-base font-medium text-on-surface leading-relaxed">
                            {activeDrill.prompt}{" "}
                            <Link
                                to={buildAiTutorUrl(
                                    `Walk step-by-step through this pharmacology calculation (${activeDrill.category}): ${activeDrill.prompt}`
                                )}
                                className="ml-2 text-xs font-medium text-brand-700 underline"
                            >
                                Ask AI Tutor to explain this calculation
                            </Link>
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