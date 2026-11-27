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
    {
        id: "mw-exp-1",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Antenatal BP & danger signs): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Tell client to rest at home and ignore blurred vision' }, { key: "B", text: 'Give sedatives without checking blood pressure' }, { key: "C", text: 'Wait until next routine monthly clinic visit' }, { key: "D", text: 'Check BP, urine protein, and fetal status, and report headache or visual changes promptly' }],
        correctKey: "D",
        rationale: 'In Midwifery & Obstetric Safety, antenatal bp & danger signs requires prioritizing safe, timely nursing care: Check BP, urine protein, and fetal status, and report headache or visual changes promptly.',
    },
    {
        id: "mw-exp-2",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Third stage active management): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Wait 90 minutes before checking uterine tone' }, { key: "B", text: 'Skip uterotonic unless heavy bleeding starts' }, { key: "C", text: 'Give uterotonic after ruling out second twin, apply controlled cord traction with counter-traction, and massage fundus' }, { key: "D", text: 'Pull strongly on cord without guarding uterus' }],
        correctKey: "C",
        rationale: 'In Midwifery & Obstetric Safety, third stage active management requires prioritizing safe, timely nursing care: Give uterotonic after ruling out second twin, apply controlled cord traction with counter-traction, and massage fundus.',
    },
    {
        id: "mw-exp-3",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Newborn initial stabilization): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give routine bath before checking breathing' }, { key: "B", text: 'Warm, dry, stimulate, clear airway if needed, and assess breathing and heart rate' }, { key: "C", text: 'Delay warming and drying until 5-minute check' }, { key: "D", text: 'Shake infant vigorously to trigger crying' }],
        correctKey: "B",
        rationale: 'In Midwifery & Obstetric Safety, newborn initial stabilization requires prioritizing safe, timely nursing care: Warm, dry, stimulate, clear airway if needed, and assess breathing and heart rate.',
    },
    {
        id: "mw-exp-4",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Puerperal fever check): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Check temperature, uterine tenderness, lochia, and wounds, and report infection signs promptly' }, { key: "B", text: 'Assume day-3 fever is always harmless' }, { key: "C", text: 'Stop breastfeeding without clinical review' }, { key: "D", text: 'Cover fever with heavy blankets' }],
        correctKey: "A",
        rationale: 'In Midwifery & Obstetric Safety, puerperal fever check requires prioritizing safe, timely nursing care: Check temperature, uterine tenderness, lochia, and wounds, and report infection signs promptly.',
    },
    {
        id: "mw-exp-5",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Eclampsia seizure safety): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Restrain limbs forcefully during convulsion' }, { key: "B", text: 'Place objects between teeth during seizure' }, { key: "C", text: 'Leave client unattended on narrow bed' }, { key: "D", text: 'Keep airway clear on side, prevent injury, and maintain magnesium safety' }],
        correctKey: "D",
        rationale: 'In Midwifery & Obstetric Safety, eclampsia seizure safety requires prioritizing safe, timely nursing care: Keep airway clear on side, prevent injury, and maintain magnesium safety.',
    },
    {
        id: "mw-exp-6",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Postpartum family planning): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Withhold family planning advice for 6 months' }, { key: "B", text: 'Ignore client health history when counseling' }, { key: "C", text: 'Offer voluntary options suited to lactation and medical eligibility' }, { key: "D", text: 'Force one method without explaining choices' }],
        correctKey: "C",
        rationale: 'In Midwifery & Obstetric Safety, postpartum family planning requires prioritizing safe, timely nursing care: Offer voluntary options suited to lactation and medical eligibility.',
    },
    {
        id: "mw-exp-7",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Fetal heart rate response): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Push continuously without reassessment' }, { key: "B", text: 'Turn to lateral position, check BP and contractions, give oxygen if ordered, and notify provider' }, { key: "C", text: 'Ignore persistent late decelerations in labor' }, { key: "D", text: 'Increase oxytocin immediately during late decelerations' }],
        correctKey: "B",
        rationale: 'In Midwifery & Obstetric Safety, fetal heart rate response requires prioritizing safe, timely nursing care: Turn to lateral position, check BP and contractions, give oxygen if ordered, and notify provider.',
    },
    {
        id: "mw-exp-8",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Cord prolapse priority): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Relieve cord pressure gently, shift position such as knee-chest/lateral, and prepare urgent delivery' }, { key: "B", text: 'Pull cord to speed delivery' }, { key: "C", text: 'Push prolapsed cord back with bare fingers' }, { key: "D", text: 'Ambulate client around the ward' }],
        correctKey: "A",
        rationale: 'In Midwifery & Obstetric Safety, cord prolapse priority requires prioritizing safe, timely nursing care: Relieve cord pressure gently, shift position such as knee-chest/lateral, and prepare urgent delivery.',
    },
    {
        id: "mw-exp-9",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Postpartum iron & nutrition): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Drink strong tea right with iron tablets' }, { key: "B", text: 'Stop iron as soon as bleeding slows' }, { key: "C", text: 'Skip meals to lose weight fast' }, { key: "D", text: 'Encourage iron-rich foods with vitamin C, adherence to iron/folate, and monitor pallor/fatigue' }],
        correctKey: "D",
        rationale: 'In Midwifery & Obstetric Safety, postpartum iron & nutrition requires prioritizing safe, timely nursing care: Encourage iron-rich foods with vitamin C, adherence to iron/folate, and monitor pallor/fatigue.',
    },
    {
        id: "mw-exp-10",
        domain: 'Midwifery & Obstetric Safety',
        prompt: 'CBT Drill (Newborn blood glucose safety): In Midwifery & Obstetric Safety, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Delay first feed for 12 hours in small baby' }, { key: "B", text: 'Ignore tremors in a low-birth-weight baby' }, { key: "C", text: 'Support early frequent breastfeeding and watch for jitteriness, poor feeding, or lethargy' }, { key: "D", text: 'Give plain water bottles instead of milk' }],
        correctKey: "C",
        rationale: 'In Midwifery & Obstetric Safety, newborn blood glucose safety requires prioritizing safe, timely nursing care: Support early frequent breastfeeding and watch for jitteriness, poor feeding, or lethargy.',
    },
    {
        id: "ped-exp-1",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Child dehydration & ORS): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give undiluted sweet drinks instead of ORS' }, { key: "B", text: 'Withhold fluids in watery diarrhea' }, { key: "C", text: 'Ignore lethargy and sunken eyes' }, { key: "D", text: 'Assess hydration and give ORS or IV fluids per severity while watching for persistent vomiting' }],
        correctKey: "D",
        rationale: 'In Paediatrics & Child Health, child dehydration & ors requires prioritizing safe, timely nursing care: Assess hydration and give ORS or IV fluids per severity while watching for persistent vomiting.',
    },
    {
        id: "ped-exp-2",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Infant respiratory count): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Miss chest indrawing under clothing' }, { key: "B", text: 'Delay oxygen when SpO2 is low' }, { key: "C", text: 'Count respirations for a full 60 seconds when calm and check for chest indrawing' }, { key: "D", text: 'Count for 15 seconds while child is crying' }],
        correctKey: "C",
        rationale: 'In Paediatrics & Child Health, infant respiratory count requires prioritizing safe, timely nursing care: Count respirations for a full 60 seconds when calm and check for chest indrawing.',
    },
    {
        id: "ped-exp-3",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Febrile convulsion care): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give oral fluids during seizure' }, { key: "B", text: 'Protect airway on side, loosen tight clothing, time seizure, and avoid oral objects' }, { key: "C", text: 'Hold child down rigidly while seizing' }, { key: "D", text: 'Insert spoon or fingers into mouth' }],
        correctKey: "B",
        rationale: 'In Paediatrics & Child Health, febrile convulsion care requires prioritizing safe, timely nursing care: Protect airway on side, loosen tight clothing, time seizure, and avoid oral objects.',
    },
    {
        id: "ped-exp-4",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Immunization safety & teaching): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Check schedule, VVM, and allergies, give proper site/dose, and counsel parent on reactions and next visit' }, { key: "B", text: 'Use expired or heat-damaged vaccine' }, { key: "C", text: 'Skip telling parent when next dose is due' }, { key: "D", text: 'Give injection without checking allergies' }],
        correctKey: "A",
        rationale: 'In Paediatrics & Child Health, immunization safety & teaching requires prioritizing safe, timely nursing care: Check schedule, VVM, and allergies, give proper site/dose, and counsel parent on reactions and next visit.',
    },
    {
        id: "ped-exp-5",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Malnutrition danger signs): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give heavy solid food immediately in shock' }, { key: "B", text: 'Ignore hypothermia or lethargy in child' }, { key: "C", text: 'Skip daily weight checks' }, { key: "D", text: 'Check hypoglycemia, hypothermia, shock, and infection first and follow stabilization steps' }],
        correctKey: "D",
        rationale: 'In Paediatrics & Child Health, malnutrition danger signs requires prioritizing safe, timely nursing care: Check hypoglycemia, hypothermia, shock, and infection first and follow stabilization steps.',
    },
    {
        id: "ped-exp-6",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Pediatric fall & burn safety): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Leave pediatric bed rails down' }, { key: "B", text: 'Dismiss caregiver safety questions' }, { key: "C", text: 'Keep crib rails raised, guard hot liquids and medicines, and educate caregivers' }, { key: "D", text: 'Leave toddler near hot kettle unattended' }],
        correctKey: "C",
        rationale: 'In Paediatrics & Child Health, pediatric fall & burn safety requires prioritizing safe, timely nursing care: Keep crib rails raised, guard hot liquids and medicines, and educate caregivers.',
    },
    {
        id: "ped-exp-7",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Child pain assessment): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give adult doses without weight check' }, { key: "B", text: 'Use age-appropriate pain cues/scales, comfort care, and ordered analgesia, then reassess' }, { key: "C", text: 'Assume infants do not feel pain' }, { key: "D", text: 'Ignore restlessness after painful procedure' }],
        correctKey: "B",
        rationale: 'In Paediatrics & Child Health, child pain assessment requires prioritizing safe, timely nursing care: Use age-appropriate pain cues/scales, comfort care, and ordered analgesia, then reassess.',
    },
    {
        id: "ped-exp-8",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Measles isolation & care): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Isolate appropriately, support fluids/nutrition and ordered vitamin A, and monitor complications' }, { key: "B", text: 'Place with immunocompromised child on open ward' }, { key: "C", text: 'Ignore high fever and cough with rash' }, { key: "D", text: 'Skip teaching danger signs to caregiver' }],
        correctKey: "A",
        rationale: 'In Paediatrics & Child Health, measles isolation & care requires prioritizing safe, timely nursing care: Isolate appropriately, support fluids/nutrition and ordered vitamin A, and monitor complications.',
    },
    {
        id: "ped-exp-9",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Sickle cell vaso-occlusive care): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Allow dehydration or cold exposure' }, { key: "B", text: 'Ignore sudden chest pain or dyspnea' }, { key: "C", text: 'Delay pain relief during crisis' }, { key: "D", text: 'Support hydration, oxygenation, and pain relief while watching for acute chest or splenic signs' }],
        correctKey: "D",
        rationale: 'In Paediatrics & Child Health, sickle cell vaso-occlusive care requires prioritizing safe, timely nursing care: Support hydration, oxygenation, and pain relief while watching for acute chest or splenic signs.',
    },
    {
        id: "ped-exp-10",
        domain: 'Paediatrics & Child Health',
        prompt: 'CBT Drill (Growth & milestone check): In Paediatrics & Child Health, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Compare all children rigidly without context' }, { key: "B", text: 'Exclude parents from milestone guidance' }, { key: "C", text: 'Track age-appropriate motor, speech, and social milestones and refer early if delayed' }, { key: "D", text: 'Dismiss persistent delays without screening' }],
        correctKey: "C",
        rationale: 'In Paediatrics & Child Health, growth & milestone check requires prioritizing safe, timely nursing care: Track age-appropriate motor, speech, and social milestones and refer early if delayed.',
    },
    {
        id: "pharm-exp-1",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (High-alert dose verification): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give drug when dose calculation looks unsure' }, { key: "B", text: 'Leave pills at bedside for unverified use' }, { key: "C", text: 'Chart dose before giving medication' }, { key: "D", text: 'Verify right patient, drug, dose, route, time, allergies, and independent calculation check' }],
        correctKey: "D",
        rationale: 'In Pharmacology & IV Therapy, high-alert dose verification requires prioritizing safe, timely nursing care: Verify right patient, drug, dose, route, time, allergies, and independent calculation check.',
    },
    {
        id: "pharm-exp-2",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (IV infusion site check): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Flush hard against strong resistance' }, { key: "B", text: 'Leave IV dressing wet and loose' }, { key: "C", text: 'Inspect site for redness, swelling, warmth, pain, or coolness and act early on infiltration/phlebitis' }, { key: "D", text: 'Ignore swollen painful IV site for hours' }],
        correctKey: "C",
        rationale: 'In Pharmacology & IV Therapy, iv infusion site check requires prioritizing safe, timely nursing care: Inspect site for redness, swelling, warmth, pain, or coolness and act early on infiltration/phlebitis.',
    },
    {
        id: "pharm-exp-3",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (Magnesium sulfate safety): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Skip hourly urine output tracking' }, { key: "B", text: 'Monitor respiratory rate, deep tendon reflexes, BP, and urine output and keep calcium gluconate ready' }, { key: "C", text: 'Ignore slow breathing or absent reflexes' }, { key: "D", text: 'Speed up infusion if drowsiness appears' }],
        correctKey: "B",
        rationale: 'In Pharmacology & IV Therapy, magnesium sulfate safety requires prioritizing safe, timely nursing care: Monitor respiratory rate, deep tendon reflexes, BP, and urine output and keep calcium gluconate ready.',
    },
    {
        id: "pharm-exp-4",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (Anticoagulant bleeding check): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Monitor for unusual bruising, bleeding gums, hematuria, or melena and reinforce safety precautions' }, { key: "B", text: 'Use stiff razor or hard toothbrush' }, { key: "C", text: 'Give IM injections without checking orders' }, { key: "D", text: 'Ignore sudden severe headache or bleeding' }],
        correctKey: "A",
        rationale: 'In Pharmacology & IV Therapy, anticoagulant bleeding check requires prioritizing safe, timely nursing care: Monitor for unusual bruising, bleeding gums, hematuria, or melena and reinforce safety precautions.',
    },
    {
        id: "pharm-exp-5",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (Insulin timing & meal check): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give rapid insulin when client is NPO with no glucose plan' }, { key: "B", text: 'Mix insulin types incorrectly or rush check' }, { key: "C", text: 'Ignore sweating and shakiness' }, { key: "D", text: 'Match insulin onset/peak to food intake and check blood glucose safety before administration' }],
        correctKey: "D",
        rationale: 'In Pharmacology & IV Therapy, insulin timing & meal check requires prioritizing safe, timely nursing care: Match insulin onset/peak to food intake and check blood glucose safety before administration.',
    },
    {
        id: "pharm-exp-6",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (Antibiotic allergy & infusion check): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Ignore early hives or throat tightness' }, { key: "B", text: 'Skip flushing line compatibility' }, { key: "C", text: 'Check drug allergies before first dose and observe for rash, wheezing, or hypotension' }, { key: "D", text: 'Give first antibiotic dose without allergy check' }],
        correctKey: "C",
        rationale: 'In Pharmacology & IV Therapy, antibiotic allergy & infusion check requires prioritizing safe, timely nursing care: Check drug allergies before first dose and observe for rash, wheezing, or hypotension.',
    },
    {
        id: "pharm-exp-7",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (IV flow rate accuracy): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Change IV rate without checking order' }, { key: "B", text: 'Check pump/drip rate, tubing patency, and bag volume against order regularly' }, { key: "C", text: 'Guess drip rate without counting drops' }, { key: "D", text: 'Leave tubing kinked under arm or blanket' }],
        correctKey: "B",
        rationale: 'In Pharmacology & IV Therapy, iv flow rate accuracy requires prioritizing safe, timely nursing care: Check pump/drip rate, tubing patency, and bag volume against order regularly.',
    },
    {
        id: "pharm-exp-8",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (Opioid respiratory vigilance): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Monitor sedation level, respiratory rate, and oxygen saturation after opioid doses' }, { key: "B", text: 'Give repeat opioid to deeply sedated client' }, { key: "C", text: 'Ignore pinpoint pupils and slow breathing' }, { key: "D", text: 'Skip bowel regimen education when prolonged' }],
        correctKey: "A",
        rationale: 'In Pharmacology & IV Therapy, opioid respiratory vigilance requires prioritizing safe, timely nursing care: Monitor sedation level, respiratory rate, and oxygen saturation after opioid doses.',
    },
    {
        id: "pharm-exp-9",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (Oral vs IV medication safety): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give pills to drowsy or vomiting client' }, { key: "B", text: 'Crush enteric-coated or extended tablets blindly' }, { key: "C", text: 'Skip water check with oral meds' }, { key: "D", text: 'Confirm client can swallow safely and is upright before giving oral tablets or liquids' }],
        correctKey: "D",
        rationale: 'In Pharmacology & IV Therapy, oral vs iv medication safety requires prioritizing safe, timely nursing care: Confirm client can swallow safely and is upright before giving oral tablets or liquids.',
    },
    {
        id: "pharm-exp-10",
        domain: 'Pharmacology & IV Therapy',
        prompt: 'CBT Drill (Medication error reporting): In Pharmacology & IV Therapy, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Wait until next day to report adverse reaction' }, { key: "B", text: 'Guess what happened instead of checking' }, { key: "C", text: 'Assess client safety first, report promptly per policy, and document objectively without blame' }, { key: "D", text: 'Hide a wrong dose to avoid trouble' }],
        correctKey: "C",
        rationale: 'In Pharmacology & IV Therapy, medication error reporting requires prioritizing safe, timely nursing care: Assess client safety first, report promptly per policy, and document objectively without blame.',
    },
    {
        id: "eth-exp-1",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Informed consent validity): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Coerce client into signing consent' }, { key: "B", text: 'Perform non-urgent procedure without consent' }, { key: "C", text: 'Have minor sign complex consent alone' }, { key: "D", text: 'Confirm voluntary consent after clear explanation of risks, benefits, and options in plain terms' }],
        correctKey: "D",
        rationale: 'In Nursing Ethics & Consent, informed consent validity requires prioritizing safe, timely nursing care: Confirm voluntary consent after clear explanation of risks, benefits, and options in plain terms.',
    },
    {
        id: "eth-exp-2",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Patient confidentiality): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give patient info to unverified caller' }, { key: "B", text: 'Leave open charts unattended in public area' }, { key: "C", text: 'Share clinical information only with authorized care team and protect charts and screens' }, { key: "D", text: 'Discuss client details in hallway or on social media' }],
        correctKey: "C",
        rationale: 'In Nursing Ethics & Consent, patient confidentiality requires prioritizing safe, timely nursing care: Share clinical information only with authorized care team and protect charts and screens.',
    },
    {
        id: "eth-exp-3",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Therapeutic boundaries): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Cross professional boundaries with client' }, { key: "B", text: 'Maintain professional nurse-client boundaries and avoid personal/financial exploitation' }, { key: "C", text: 'Accept expensive gifts or personal favors' }, { key: "D", text: 'Share personal contact details for non-work reasons' }],
        correctKey: "B",
        rationale: 'In Nursing Ethics & Consent, therapeutic boundaries requires prioritizing safe, timely nursing care: Maintain professional nurse-client boundaries and avoid personal/financial exploitation.',
    },
    {
        id: "eth-exp-4",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Honest documentation): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Record accurate, timely, objective nursing observations and never falsify charts' }, { key: "B", text: 'Backdate or alter entries to hide mistake' }, { key: "C", text: 'Chart care that was not performed' }, { key: "D", text: 'Write vague or judgmental labels' }],
        correctKey: "A",
        rationale: 'In Nursing Ethics & Consent, honest documentation requires prioritizing safe, timely nursing care: Record accurate, timely, objective nursing observations and never falsify charts.',
    },
    {
        id: "eth-exp-5",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Advocating for client autonomy): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Ignore client questions about care plan' }, { key: "B", text: 'Shame client for asking about alternatives' }, { key: "C", text: 'Override competent refusal without due process' }, { key: "D", text: 'Respect client values and right to ask questions or refuse treatment after full information' }],
        correctKey: "D",
        rationale: 'In Nursing Ethics & Consent, advocating for client autonomy requires prioritizing safe, timely nursing care: Respect client values and right to ask questions or refuse treatment after full information.',
    },
    {
        id: "eth-exp-6",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Safeguarding vulnerable adults): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Confront suspected abuser in front of client' }, { key: "B", text: 'Keep safeguarding concerns secret' }, { key: "C", text: 'Assess suspected abuse or neglect privately and follow institutional safeguarding reporting' }, { key: "D", text: 'Ignore repeated unexplained injuries' }],
        correctKey: "C",
        rationale: 'In Nursing Ethics & Consent, safeguarding vulnerable adults requires prioritizing safe, timely nursing care: Assess suspected abuse or neglect privately and follow institutional safeguarding reporting.',
    },
    {
        id: "eth-exp-7",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Fair & non-discriminatory care): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Let personal prejudices guide triage' }, { key: "B", text: 'Deliver equitable, respectful care regardless of background, diagnosis, or social status' }, { key: "C", text: 'Give lesser attention based on bias or status' }, { key: "D", text: "Show annoyance at client's questions" }],
        correctKey: "B",
        rationale: 'In Nursing Ethics & Consent, fair & non-discriminatory care requires prioritizing safe, timely nursing care: Deliver equitable, respectful care regardless of background, diagnosis, or social status.',
    },
    {
        id: "eth-exp-8",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Scope of practice & delegation): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Delegate tasks only within training, competence, and legal scope while retaining accountability' }, { key: "B", text: 'Ask unqualified person to do high-risk task' }, { key: "C", text: 'Accept tasks beyond safe competence without help' }, { key: "D", text: 'Abandon assigned duty without handover' }],
        correctKey: "A",
        rationale: 'In Nursing Ethics & Consent, scope of practice & delegation requires prioritizing safe, timely nursing care: Delegate tasks only within training, competence, and legal scope while retaining accountability.',
    },
    {
        id: "eth-exp-9",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (End-of-life dignity & wishes): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Ignore severe pain near end of life' }, { key: "B", text: 'Dismiss family grief or cultural customs' }, { key: "C", text: 'Argue with family during crisis' }, { key: "D", text: 'Honor advance wishes, comfort needs, and cultural/family support with compassion' }],
        correctKey: "D",
        rationale: 'In Nursing Ethics & Consent, end-of-life dignity & wishes requires prioritizing safe, timely nursing care: Honor advance wishes, comfort needs, and cultural/family support with compassion.',
    },
    {
        id: "eth-exp-10",
        domain: 'Nursing Ethics & Consent',
        prompt: 'CBT Drill (Reporting unsafe practice): In Nursing Ethics & Consent, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Retaliate against coworker raising safety issue' }, { key: "B", text: 'Post workplace complaints with patient clues' }, { key: "C", text: 'Raise safety or ethical concerns through proper channels to protect patients' }, { key: "D", text: 'Stay silent when patient safety is threatened' }],
        correctKey: "C",
        rationale: 'In Nursing Ethics & Consent, reporting unsafe practice requires prioritizing safe, timely nursing care: Raise safety or ethical concerns through proper channels to protect patients.',
    },
    {
        id: "medsurg-exp-1",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Hand hygiene & PPE sequence): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Skip hand hygiene after removing gloves' }, { key: "B", text: 'Wear torn gloves instead of replacing them' }, { key: "C", text: 'Reuse single-use disposable gloves' }, { key: "D", text: 'Perform hand hygiene and wear appropriate PPE before contact with blood, body fluids, or non-intact skin' }],
        correctKey: "D",
        rationale: 'In Medical-Surgical & Infection Prevention, hand hygiene & ppe sequence requires prioritizing safe, timely nursing care: Perform hand hygiene and wear appropriate PPE before contact with blood, body fluids, or non-intact skin.',
    },
    {
        id: "medsurg-exp-2",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Post-op hemorrhage recognition): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Ignore soaked surgical dressing' }, { key: "B", text: 'Delay vital signs check' }, { key: "C", text: 'Check dressing/drains, BP, and pulse, keep IV patent, and alert surgeon immediately' }, { key: "D", text: 'Give rapid oral fluids during shock' }],
        correctKey: "C",
        rationale: 'In Medical-Surgical & Infection Prevention, post-op hemorrhage recognition requires prioritizing safe, timely nursing care: Check dressing/drains, BP, and pulse, keep IV patent, and alert surgeon immediately.',
    },
    {
        id: "medsurg-exp-3",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Asthma flare priority): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Leave dyspneic client unmonitored' }, { key: "B", text: 'Assess airway, breathing effort, and SpO2, give ordered bronchodilator/oxygen, and monitor closely' }, { key: "C", text: 'Delay bronchodilator until later tests' }, { key: "D", text: 'Place client flat on back during wheezing' }],
        correctKey: "B",
        rationale: 'In Medical-Surgical & Infection Prevention, asthma flare priority requires prioritizing safe, timely nursing care: Assess airway, breathing effort, and SpO2, give ordered bronchodilator/oxygen, and monitor closely.',
    },
    {
        id: "medsurg-exp-4",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Sepsis early escalation): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Monitor fever/hypothermia, pulse, breathing, mental state, and perfusion and escalate early' }, { key: "B", text: 'Wait until BP drops sharply to report' }, { key: "C", text: 'Ignore sudden confusion in infection' }, { key: "D", text: 'Treat rigors as routine without review' }],
        correctKey: "A",
        rationale: 'In Medical-Surgical & Infection Prevention, sepsis early escalation requires prioritizing safe, timely nursing care: Monitor fever/hypothermia, pulse, breathing, mental state, and perfusion and escalate early.',
    },
    {
        id: "medsurg-exp-5",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Sharps & waste segregation): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Recap needles with two hands' }, { key: "B", text: 'Discard used needles in general waste' }, { key: "C", text: 'Overfill safety boxes past limit' }, { key: "D", text: 'Place sharps straight into puncture-proof safety boxes without recapping and segregate waste' }],
        correctKey: "D",
        rationale: 'In Medical-Surgical & Infection Prevention, sharps & waste segregation requires prioritizing safe, timely nursing care: Place sharps straight into puncture-proof safety boxes without recapping and segregate waste.',
    },
    {
        id: "medsurg-exp-6",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (DVT prophylaxis & calf check): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Ignore sudden chest pain or shortness of breath' }, { key: "B", text: 'Keep legs crossed tightly in bed' }, { key: "C", text: 'Encourage safe mobility/exercises, check calf for swelling/warmth/pain, and report promptly' }, { key: "D", text: 'Massage a painful swollen calf firmly' }],
        correctKey: "C",
        rationale: 'In Medical-Surgical & Infection Prevention, dvt prophylaxis & calf check requires prioritizing safe, timely nursing care: Encourage safe mobility/exercises, check calf for swelling/warmth/pain, and report promptly.',
    },
    {
        id: "medsurg-exp-7",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Stroke onset & swallowing safety): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Delay urgent evaluation of weakness' }, { key: "B", text: 'Note exact symptom onset, keep nil-by-mouth until swallowing is safe, and expedite urgent care' }, { key: "C", text: 'Give water or food before swallow check' }, { key: "D", text: 'Guess symptom onset without checking' }],
        correctKey: "B",
        rationale: 'In Medical-Surgical & Infection Prevention, stroke onset & swallowing safety requires prioritizing safe, timely nursing care: Note exact symptom onset, keep nil-by-mouth until swallowing is safe, and expedite urgent care.',
    },
    {
        id: "medsurg-exp-8",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Wound infection monitoring): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Inspect incision for redness, warmth, swelling, or pus using asepsis and report early signs' }, { key: "B", text: 'Touch open wound with unwashed hands' }, { key: "C", text: 'Ignore foul drainage or rising fever' }, { key: "D", text: 'Cover infected wound tightly without review' }],
        correctKey: "A",
        rationale: 'In Medical-Surgical & Infection Prevention, wound infection monitoring requires prioritizing safe, timely nursing care: Inspect incision for redness, warmth, swelling, or pus using asepsis and report early signs.',
    },
    {
        id: "medsurg-exp-9",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Heart failure congestion check): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Ignore rapid weight gain over two days' }, { key: "B", text: 'Encourage unrestricted fluids in acute overload' }, { key: "C", text: 'Keep client flat when short of breath' }, { key: "D", text: 'Assess breath sounds, dyspnea, edema, and daily weight and report worsening fluid retention' }],
        correctKey: "D",
        rationale: 'In Medical-Surgical & Infection Prevention, heart failure congestion check requires prioritizing safe, timely nursing care: Assess breath sounds, dyspnea, edema, and daily weight and report worsening fluid retention.',
    },
    {
        id: "medsurg-exp-10",
        domain: 'Medical-Surgical & Infection Prevention',
        prompt: 'CBT Drill (Isolation precautions adherence): In Medical-Surgical & Infection Prevention, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Carry contaminated linen against uniform' }, { key: "B", text: 'Forget hand hygiene on room exit' }, { key: "C", text: 'Follow transmission-based precautions consistently and educate visitors on safe entry/exit' }, { key: "D", text: 'Enter isolation room without required PPE' }],
        correctKey: "C",
        rationale: 'In Medical-Surgical & Infection Prevention, isolation precautions adherence requires prioritizing safe, timely nursing care: Follow transmission-based precautions consistently and educate visitors on safe entry/exit.',
    },
    {
        id: "fund-exp-1",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Accurate vital signs check): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Use too-small cuff on adult arm' }, { key: "B", text: 'Count breathing for 10 seconds only' }, { key: "C", text: 'Record numbers without context' }, { key: "D", text: 'Use properly sized cuff/probe, calm resting posture, and full 60-second respiratory/pulse count when needed' }],
        correctKey: "D",
        rationale: 'In Fundamentals & Vital Signs, accurate vital signs check requires prioritizing safe, timely nursing care: Use properly sized cuff/probe, calm resting posture, and full 60-second respiratory/pulse count when needed.',
    },
    {
        id: "fund-exp-2",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Fall risk prevention): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Leave bed rails unsafe or call bell out of reach' }, { key: "B", text: 'Rush unsteady client without support' }, { key: "C", text: 'Assess gait, balance, vision, dizziness, and room hazards and keep call bell and bed safe' }, { key: "D", text: 'Leave wet floor or clutter in walkway' }],
        correctKey: "C",
        rationale: 'In Fundamentals & Vital Signs, fall risk prevention requires prioritizing safe, timely nursing care: Assess gait, balance, vision, dizziness, and room hazards and keep call bell and bed safe.',
    },
    {
        id: "fund-exp-3",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Pressure injury prevention): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Leave client in damp linen' }, { key: "B", text: 'Reposition regularly, protect bony prominences, keep skin clean/dry, and support nutrition' }, { key: "C", text: 'Leave immobile client in one position all day' }, { key: "D", text: 'Rub reddened bony area vigorously' }],
        correctKey: "B",
        rationale: 'In Fundamentals & Vital Signs, pressure injury prevention requires prioritizing safe, timely nursing care: Reposition regularly, protect bony prominences, keep skin clean/dry, and support nutrition.',
    },
    {
        id: "fund-exp-4",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Therapeutic listening): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Listen attentively with calm posture and open questions to understand client concerns' }, { key: "B", text: 'Interrupt client before finishing thought' }, { key: "C", text: 'Argue with or dismiss client feelings' }, { key: "D", text: 'Use heavy medical jargon without clarity' }],
        correctKey: "A",
        rationale: 'In Fundamentals & Vital Signs, therapeutic listening requires prioritizing safe, timely nursing care: Listen attentively with calm posture and open questions to understand client concerns.',
    },
    {
        id: "fund-exp-5",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Safe patient lifting & transfer): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Twist spine while lifting heavy load' }, { key: "B", text: 'Move bed or stretcher with unlocked wheels' }, { key: "C", text: 'Pull on IV tubing during transfer' }, { key: "D", text: 'Lock wheels, get help when needed, bend knees/keep load close, and protect lines/drains' }],
        correctKey: "D",
        rationale: 'In Fundamentals & Vital Signs, safe patient lifting & transfer requires prioritizing safe, timely nursing care: Lock wheels, get help when needed, bend knees/keep load close, and protect lines/drains.',
    },
    {
        id: "fund-exp-6",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Intake & output accuracy): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Forget to empty or record drainage' }, { key: "B", text: 'Mix up shift totals' }, { key: "C", text: 'Measure and record all fluid intake and urine/drain output accurately over the shift' }, { key: "D", text: 'Estimate fluid balance without measuring' }],
        correctKey: "C",
        rationale: 'In Fundamentals & Vital Signs, intake & output accuracy requires prioritizing safe, timely nursing care: Measure and record all fluid intake and urine/drain output accurately over the shift.',
    },
    {
        id: "fund-exp-7",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Oral hygiene & aspiration care): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Force mouth open against resistance' }, { key: "B", text: 'Provide gentle oral care and position upright/side-lying safely, especially with reduced alertness' }, { key: "C", text: 'Give liquid rinse to drowsy client lying flat' }, { key: "D", text: 'Skip oral care for mouth-breathing client' }],
        correctKey: "B",
        rationale: 'In Fundamentals & Vital Signs, oral hygiene & aspiration care requires prioritizing safe, timely nursing care: Provide gentle oral care and position upright/side-lying safely, especially with reduced alertness.',
    },
    {
        id: "fund-exp-8",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Pain rating & reassessment): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Assess pain location, severity, and character before and after intervention to judge relief' }, { key: "B", text: 'Give analgesia and never check if it worked' }, { key: "C", text: 'Ignore client report of severe pain' }, { key: "D", text: 'Assume quiet client has no pain' }],
        correctKey: "A",
        rationale: 'In Fundamentals & Vital Signs, pain rating & reassessment requires prioritizing safe, timely nursing care: Assess pain location, severity, and character before and after intervention to judge relief.',
    },
    {
        id: "fund-exp-9",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Shift handover communication): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Give rushed or incomplete handover' }, { key: "B", text: 'Hide abnormal vitals or missed tasks' }, { key: "C", text: 'Skip checking urgent orders at start of shift' }, { key: "D", text: 'Share clear, structured status, active risks, pending tasks, and changes at shift change' }],
        correctKey: "D",
        rationale: 'In Fundamentals & Vital Signs, shift handover communication requires prioritizing safe, timely nursing care: Share clear, structured status, active risks, pending tasks, and changes at shift change.',
    },
    {
        id: "fund-exp-10",
        domain: 'Fundamentals & Vital Signs',
        prompt: 'CBT Drill (Sleep & rest promotion): In Fundamentals & Vital Signs, what is the safest nursing priority?',
        options: [{ key: "A", text: 'Wake sleeping client for non-urgent routine' }, { key: "B", text: 'Ignore persistent sleep disruption' }, { key: "C", text: 'Reduce unnecessary noise and bright light at night and cluster non-urgent tasks when safe' }, { key: "D", text: 'Turn on bright overhead lights at 2 AM' }],
        correctKey: "C",
        rationale: 'In Fundamentals & Vital Signs, sleep & rest promotion requires prioritizing safe, timely nursing care: Reduce unnecessary noise and bright light at night and cluster non-urgent tasks when safe.',
    },
];

const DOMAINS = [
    "All Domains",
    "Midwifery & Obstetric Safety",
    "Paediatrics & Child Health",
    "Pharmacology & IV Therapy",
    "Nursing Ethics & Consent",
    "Medical-Surgical & Infection Prevention",
    "Fundamentals & Vital Signs",
]

function shuffleQuestions(list: CbtQuestion[]): CbtQuestion[] {
    const copy = [...list]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

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
        const pool = customPool && customPool.length > 0 ? customPool : shuffleQuestions(domainPool).slice(0, Math.min(questionLimit, domainPool.length))
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
                                {[10, 25, 50, domainPool.length].filter((v, idx, arr) => arr.indexOf(v) === idx).map((count) => (
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
                                        {count === domainPool.length ? `All (${domainPool.length})` : `Up to ${count}`}
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
