import { Link } from "react-router-dom"
import { buildAiTutorUrl } from "../utils/tutorPrompt"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import {
    fetchClinicalCases,
    submitCaseStageAnswer,
    type ClinicalCaseItem,
    type StageAnswerFeedback,
} from "../api/cases"

interface LocalCaseStage {
    id?: string
    step_number: number
    title: string
    vitals_summary: string
    clinical_update: string
    question_prompt: string
    options: Array<{ key: string; text: string }>
    correct_key: string
    rationale: string
    nursing_takeaway: string
}

interface LocalClinicalCase extends ClinicalCaseItem {
    local_stages: LocalCaseStage[]
}

const FALLBACK_CASES: LocalClinicalCase[] = [
    {
        id: "case-malaria-paed",
        title: "Fever, Lethargy & Vomiting in a 3-Year-Old Child",
        condition_tag: "Paediatric Severe Malaria",
        difficulty: "INTERMEDIATE",
        difficulty_display: "Intermediate",
        course_code: "PAED 201",
        learning_objectives: "Recognise paediatric danger signs and prioritise safe supportive and antimalarial care.",
        stage_count: 2,
        setting: "Paediatric Ward / Out-Patient Clinic",
        patient_summary:
            "A 3-year-old child weighing 12 kg is brought in by a caregiver with 2 days of high fever, repeated vomiting, and marked drowsiness.",
        attempt: null,
        stages: [
            {
                step_number: 1,
                id: "stage-1-1",
                title: "Initial Triage & Danger Signs",
                vitals_summary: "T 39.4°C • P 136/min • RR 34/min • Weight 12 kg",
                clinical_update:
                    "The child is lethargic, cannot keep fluids down due to vomiting, and has a positive malaria rapid diagnostic test.",
                question_prompt: "What is your immediate nursing priority on arrival?",
                options: [
                    { key: "A", text: "Assess ABCs and danger signs, check blood glucose/temperature, and prepare urgent parenteral antimalarial & supportive care" },
                    { key: "B", text: "Send the caregiver home with oral tablets and return in 5 days" },
                    { key: "C", text: "Delay assessment until lab smear results return in 3 hours" },
                    { key: "D", text: "Give a cold ice bath to drop temperature abruptly" },
                ],
            },
            {
                step_number: 2,
                id: "stage-2-2",
                title: "Weight-Based Supportive & Safety Care",
                vitals_summary: "T 38.6°C • P 124/min • RR 28/min • Alert to voice",
                clinical_update:
                    "Parenteral artesunate therapy is initiated and IV access is patent. Caregiver asks how to prevent future episodes.",
                question_prompt: "Which nursing instruction best strengthens ongoing safety and prevention?",
                options: [
                    { key: "A", text: "Monitor vitals, hydration, and blood glucose closely, complete prescribed follow-up treatment once oral intake is safe, and use an insecticide-treated bed net nightly" },
                    { key: "B", text: "Stop all follow-up once the child's fever drops for 2 hours" },
                    { key: "C", text: "Avoid all fluids until discharge" },
                    { key: "D", text: "Rely only on herbal steam baths" },
                ],
            },
        ],
        local_stages: [
            {
                step_number: 1,
                id: "stage-3-1",
                title: "Initial Triage & Danger Signs",
                vitals_summary: "T 39.4°C • P 136/min • RR 34/min • Weight 12 kg",
                clinical_update:
                    "The child is lethargic, cannot keep fluids down due to vomiting, and has a positive malaria rapid diagnostic test.",
                question_prompt: "What is your immediate nursing priority on arrival?",
                options: [
                    { key: "A", text: "Assess ABCs and danger signs, check blood glucose/temperature, and prepare urgent parenteral antimalarial & supportive care" },
                    { key: "B", text: "Send the caregiver home with oral tablets and return in 5 days" },
                    { key: "C", text: "Delay assessment until lab smear results return in 3 hours" },
                    { key: "D", text: "Give a cold ice bath to drop temperature abruptly" },
                ],
                correct_key: "A",
                rationale:
                    "Lethargy and persistent vomiting in a young child with malaria are clinical danger signs requiring prompt stabilization, glucose/vital monitoring, and parenteral therapy.",
                nursing_takeaway:
                    "Always pair danger-sign recognition in children with airway/breathing/circulation checks and blood glucose awareness.",
            },
            {
                step_number: 2,
                id: "stage-4-2",
                title: "Weight-Based Supportive & Safety Care",
                vitals_summary: "T 38.6°C • P 124/min • RR 28/min • Alert to voice",
                clinical_update:
                    "Parenteral artesunate therapy is initiated and IV access is patent. Caregiver asks how to prevent future episodes.",
                question_prompt: "Which nursing instruction best strengthens ongoing safety and prevention?",
                options: [
                    { key: "A", text: "Monitor vitals, hydration, and blood glucose closely, complete prescribed follow-up treatment once oral intake is safe, and use an insecticide-treated bed net nightly" },
                    { key: "B", text: "Stop all follow-up once the child's fever drops for 2 hours" },
                    { key: "C", text: "Avoid all fluids until discharge" },
                    { key: "D", text: "Rely only on herbal steam baths" },
                ],
                correct_key: "A",
                rationale:
                    "Safe recovery depends on close monitoring, completing full prescribed antimalarial therapy, and consistent vector prevention such as treated bed nets.",
                nursing_takeaway:
                    "Clear caregiver discharge teaching bridges acute hospital care and long-term community prevention.",
            },
        ],
    },
    {
        id: "case-preeclampsia-obs",
        title: "Severe Pre-Eclampsia & Magnesium Sulfate Safety",
        condition_tag: "Obstetric Safety • Pre-Eclampsia",
        difficulty: "ADVANCED",
        difficulty_display: "Advanced",
        course_code: "OBN-311",
        learning_objectives: "Recognise severe pre-eclampsia warning signs and monitor magnesium sulfate safety parameters accurately.",
        stage_count: 2,
        setting: "Antenatal / Obstetric High-Dependency Unit",
        patient_summary:
            "A 31-year-old gravida 2 para 1 at 35 weeks gestation presents with severe frontal headache, blurred vision, and elevated blood pressure.",
        attempt: null,
        stages: [
            {
                step_number: 1,
                id: "stage-pe-1",
                title: "Immediate Maternal & Fetal Stabilization",
                vitals_summary: "BP 168/112 mmHg • P 96/min • RR 20/min • SpO2 98%",
                clinical_update:
                    "Urine dipstick shows significant proteinuria and the client reports epigastric discomfort.",
                question_prompt: "What is the priority nursing action on admission?",
                options: [
                    { key: "A", text: "Ensure a calm safe environment, monitor BP, fetal heart rate, and neurological signs closely, and prepare ordered antihypertensive and magnesium sulfate therapy" },
                    { key: "B", text: "Leave the client unmonitored in a bright noisy room" },
                    { key: "C", text: "Delay blood pressure checks until discharge paperwork is completed" },
                    { key: "D", text: "Encourage strenuous unsupervised walking" },
                ],
            },
            {
                step_number: 2,
                id: "stage-pe-2",
                title: "Magnesium Sulfate Toxicity Vigilance",
                vitals_summary: "BP 154/100 mmHg • RR 10/min • Patellar reflexes absent",
                clinical_update:
                    "One hour into magnesium sulfate infusion, respiratory rate drops to 10 breaths/min and patellar reflexes are absent.",
                question_prompt: "What must you do immediately?",
                options: [
                    { key: "A", text: "Stop the magnesium sulfate infusion immediately, support airway/oxygenation, notify the clinician urgently, and have 10% calcium gluconate ready" },
                    { key: "B", text: "Increase the magnesium infusion rate to finish faster" },
                    { key: "C", text: "Ignore the slow respiratory rate since blood pressure improved" },
                    { key: "D", text: "Give oral paracetamol and wait 2 hours" },
                ],
            },
        ],
        local_stages: [
            {
                step_number: 1,
                id: "stage-pe-l1",
                title: "Immediate Maternal & Fetal Stabilization",
                vitals_summary: "BP 168/112 mmHg • P 96/min • RR 20/min • SpO2 98%",
                clinical_update:
                    "Urine dipstick shows significant proteinuria and the client reports epigastric discomfort.",
                question_prompt: "What is the priority nursing action on admission?",
                options: [
                    { key: "A", text: "Ensure a calm safe environment, monitor BP, fetal heart rate, and neurological signs closely, and prepare ordered antihypertensive and magnesium sulfate therapy" },
                    { key: "B", text: "Leave the client unmonitored in a bright noisy room" },
                    { key: "C", text: "Delay blood pressure checks until discharge paperwork is completed" },
                    { key: "D", text: "Encourage strenuous unsupervised walking" },
                ],
                correct_key: "A",
                rationale:
                    "Severe hypertension with headache, visual changes, or epigastric pain signals high seizure risk; rapid stabilization, monitoring, and seizure prophylaxis are critical.",
                nursing_takeaway:
                    "Headache, visual disturbance, and epigastric pain in pre-eclampsia are urgent warning signs.",
            },
            {
                step_number: 2,
                id: "stage-pe-l2",
                title: "Magnesium Sulfate Toxicity Vigilance",
                vitals_summary: "BP 154/100 mmHg • RR 10/min • Patellar reflexes absent",
                clinical_update:
                    "One hour into magnesium sulfate infusion, respiratory rate drops to 10 breaths/min and patellar reflexes are absent.",
                question_prompt: "What must you do immediately?",
                options: [
                    { key: "A", text: "Stop the magnesium sulfate infusion immediately, support airway/oxygenation, notify the clinician urgently, and have 10% calcium gluconate ready" },
                    { key: "B", text: "Increase the magnesium infusion rate to finish faster" },
                    { key: "C", text: "Ignore the slow respiratory rate since blood pressure improved" },
                    { key: "D", text: "Give oral paracetamol and wait 2 hours" },
                ],
                correct_key: "A",
                rationale:
                    "Respiratory depression and loss of deep tendon reflexes indicate magnesium toxicity; stopping the infusion and preparing calcium gluconate protects breathing.",
                nursing_takeaway:
                    "Always check respiratory rate, reflexes, and urine output on clients receiving magnesium sulfate.",
            },
        ],
    },
    {
        id: "case-pph-maternity",
        title: "Heavy Post-Delivery Bleeding & Boggy Uterus",
        condition_tag: "Obstetric Emergency • PPH",
        difficulty: "INTERMEDIATE",
        difficulty_display: "Intermediate",
        course_code: "OBN-311",
        learning_objectives: "Assess uterine tone and haemodynamic status in PPH and execute rapid escalation and resuscitation priorities.",
        stage_count: 2,
        setting: "Maternity / Labour & Delivery Unit",
        patient_summary:
            "A 28-year-old para 2 mother is 35 minutes post-vaginal delivery and reports soaking through pads rapidly with dizziness.",
        attempt: null,
        stages: [
            {
                step_number: 1,
                id: "stage-5-1",
                title: "Immediate Uterine & Haemodynamic Check",
                vitals_summary: "BP 88/54 mmHg • P 118/min • RR 22/min • SpO2 97%",
                clinical_update:
                    "On abdominal palpation, the uterus feels soft and boggy above the level of the umbilicus with brisk vaginal bleeding.",
                question_prompt: "What is the most critical immediate nursing sequence?",
                options: [
                    { key: "A", text: "Call for emergency help immediately, perform gentle fundal massage until firm, assess bladder distension, and support uterotonic & IV resuscitation" },
                    { key: "B", text: "Reassure the mother that post-birth bleeding is always normal and recheck in 1 hour" },
                    { key: "C", text: "Sit her upright immediately without checking blood pressure" },
                    { key: "D", text: "Withhold IV access until bleeding stops on its own" },
                ],
            },
            {
                step_number: 2,
                id: "stage-5-2",
                title: "Ongoing Perfusion & Bladder Check",
                vitals_summary: "BP 98/62 mmHg • P 104/min • Fundus firm at umbilicus",
                clinical_update:
                    "Uterotonic infusion and IV fluids are running; a full palpable bladder is noted on abdominal exam.",
                question_prompt: "Which nursing action further supports uterine contraction and safety?",
                options: [
                    { key: "A", text: "Assist or ensure bladder emptying per protocol, continue monitoring vital signs and bleeding, and maintain clear team handover" },
                    { key: "B", text: "Ignore bladder distension because the uterus was massaged once" },
                    { key: "C", text: "Stop checking vital signs for 3 hours" },
                    { key: "D", text: "Leave the mother alone while she feels dizzy" },
                ],
            },
        ],
        local_stages: [
            {
                step_number: 1,
                id: "stage-6-1",
                title: "Immediate Uterine & Haemodynamic Check",
                vitals_summary: "BP 88/54 mmHg • P 118/min • RR 22/min • SpO2 97%",
                clinical_update:
                    "On abdominal palpation, the uterus feels soft and boggy above the level of the umbilicus with brisk vaginal bleeding.",
                question_prompt: "What is the most critical immediate nursing sequence?",
                options: [
                    { key: "A", text: "Call for emergency help immediately, perform gentle fundal massage until firm, assess bladder distension, and support uterotonic & IV resuscitation" },
                    { key: "B", text: "Reassure the mother that post-birth bleeding is always normal and recheck in 1 hour" },
                    { key: "C", text: "Sit her upright immediately without checking blood pressure" },
                    { key: "D", text: "Withhold IV access until bleeding stops on its own" },
                ],
                correct_key: "A",
                rationale:
                    "Uterine atony is the leading cause of primary postpartum haemorrhage; rapid escalation, fundal massage, bladder check, and uterotonic/IV support are vital.",
                nursing_takeaway:
                    "In suspected PPH, assess uterine tone and vital signs together and escalate early.",
            },
            {
                step_number: 2,
                id: "stage-6-2",
                title: "Ongoing Perfusion & Bladder Check",
                vitals_summary: "BP 98/62 mmHg • P 104/min • Fundus firm at umbilicus",
                clinical_update:
                    "Uterotonic infusion and IV fluids are running; a full palpable bladder is noted on abdominal exam.",
                question_prompt: "Which nursing action further supports uterine contraction and safety?",
                options: [
                    { key: "A", text: "Assist or ensure bladder emptying per protocol, continue monitoring vital signs and bleeding, and maintain clear team handover" },
                    { key: "B", text: "Ignore bladder distension because the uterus was massaged once" },
                    { key: "C", text: "Stop checking vital signs for 3 hours" },
                    { key: "D", text: "Leave the mother alone while she feels dizzy" },
                ],
                correct_key: "A",
                rationale:
                    "A distended bladder can prevent effective uterine contraction; emptying the bladder and tracking vitals/bleeding helps sustain safety.",
                nursing_takeaway:
                    "A full bladder is a classic hidden contributor to persistent uterine relaxation.",
            },
        ],
    },
    {
        id: "case-postop-recovery",
        title: "Day-2 Post-Laparotomy Pain & Shallow Breathing",
        condition_tag: "Medical-Surgical Nursing",
        difficulty: "BEGINNER",
        difficulty_display: "Beginner",
        course_code: "SSN-311",
        learning_objectives: "Balance post-operative pain relief with deep breathing and prevent respiratory and mobility complications.",
        stage_count: 2,
        setting: "Surgical Ward",
        patient_summary:
            "A 41-year-old patient on day 2 after abdominal surgery avoids deep breaths and coughing because of abdominal incision pain.",
        attempt: null,
        stages: [
            {
                step_number: 1,
                id: "stage-7-1",
                title: "Respiratory & Pain Prioritisation",
                vitals_summary: "BP 126/78 mmHg • P 92/min • RR 20/min • SpO2 95%",
                clinical_update:
                    "Breath sounds are slightly diminished at the lung bases; the patient rates incisional pain 7/10 on movement.",
                question_prompt: "Which action best supports safe deep breathing and early recovery?",
                options: [
                    { key: "A", text: "Ensure prescribed analgesia is given, splint the incision gently during deep breathing/coughing, and assist gradual mobilisation" },
                    { key: "B", text: "Keep the patient flat and motionless in bed for 48 more hours" },
                    { key: "C", text: "Tell the patient to hold their breath whenever moving" },
                    { key: "D", text: "Skip hand hygiene before wound inspection" },
                ],
            },
            {
                step_number: 2,
                id: "stage-7-2",
                title: "Wound & Mobility Safety Check",
                vitals_summary: "BP 122/76 mmHg • P 84/min • RR 18/min • SpO2 98%",
                clinical_update:
                    "After analgesia and incision splinting, the patient takes deeper breaths comfortably and prepares to sit on the edge of the bed.",
                question_prompt: "What should you check before assisting the patient to stand?",
                options: [
                    { key: "A", text: "Check for dizziness/orthostatic symptoms, secure lines and drains, lock bed wheels, and provide steady physical support" },
                    { key: "B", text: "Pull on surgical drains or IV tubing to steady the patient" },
                    { key: "C", text: "Leave bed wheels unlocked on a smooth floor" },
                    { key: "D", text: "Rush the patient upright without checking balance" },
                ],
            },
        ],
        local_stages: [
            {
                step_number: 1,
                id: "stage-8-1",
                title: "Respiratory & Pain Prioritisation",
                vitals_summary: "BP 126/78 mmHg • P 92/min • RR 20/min • SpO2 95%",
                clinical_update:
                    "Breath sounds are slightly diminished at the lung bases; the patient rates incisional pain 7/10 on movement.",
                question_prompt: "Which action best supports safe deep breathing and early recovery?",
                options: [
                    { key: "A", text: "Ensure prescribed analgesia is given, splint the incision gently during deep breathing/coughing, and assist gradual mobilisation" },
                    { key: "B", text: "Keep the patient flat and motionless in bed for 48 more hours" },
                    { key: "C", text: "Tell the patient to hold their breath whenever moving" },
                    { key: "D", text: "Skip hand hygiene before wound inspection" },
                ],
                correct_key: "A",
                rationale:
                    "Effective analgesia and incision splinting allow deeper lung expansion, reducing atelectasis and supporting safe early ambulation.",
                nursing_takeaway:
                    "Pain control and respiratory exercises go hand in hand after abdominal surgery.",
            },
            {
                step_number: 2,
                id: "stage-8-2",
                title: "Wound & Mobility Safety Check",
                vitals_summary: "BP 122/76 mmHg • P 84/min • RR 18/min • SpO2 98%",
                clinical_update:
                    "After analgesia and incision splinting, the patient takes deeper breaths comfortably and prepares to sit on the edge of the bed.",
                question_prompt: "What should you check before assisting the patient to stand?",
                options: [
                    { key: "A", text: "Check for dizziness/orthostatic symptoms, secure lines and drains, lock bed wheels, and provide steady physical support" },
                    { key: "B", text: "Pull on surgical drains or IV tubing to steady the patient" },
                    { key: "C", text: "Leave bed wheels unlocked on a smooth floor" },
                    { key: "D", text: "Rush the patient upright without checking balance" },
                ],
                correct_key: "A",
                rationale:
                    "Checking dizziness, locking equipment, and protecting lines/drains prevents falls and line dislodgement during early post-op mobilisation.",
                nursing_takeaway:
                    "Safe mobilisation protects both respiratory recovery and line/wound integrity.",
            },
        ],
    },
    {
        id: "case-delirium-older-adult",
        title: "Sudden Confusion & Fall Risk in an Older Adult",
        condition_tag: "Gerontological Care & Safety",
        difficulty: "INTERMEDIATE",
        difficulty_display: "Intermediate",
        course_code: "PAD-322",
        learning_objectives: "Distinguish acute delirium triggers and implement safe, non-punitive fall and orientation support.",
        stage_count: 2,
        setting: "Medical / Geriatric Ward",
        patient_summary:
            "A 74-year-old patient admitted for a urinary infection becomes acutely restless and disoriented at night and tries to climb out of bed.",
        attempt: null,
        stages: [
            {
                step_number: 1,
                id: "stage-del-1",
                title: "Acute Delirium & Safety Assessment",
                vitals_summary: "BP 138/82 mmHg • P 102/min • RR 22/min • T 38.2°C",
                clinical_update:
                    "Family reports the patient was oriented earlier in the day before becoming confused and agitated.",
                question_prompt: "What is the priority nursing interpretation and action?",
                options: [
                    { key: "A", text: "Recognise possible acute delirium (infection, dehydration, hypoxia, pain, or medication effect), ensure a safe low-hazard environment, and notify the clinician" },
                    { key: "B", text: "Dismiss the confusion as permanent dementia and tie down limbs immediately" },
                    { key: "C", text: "Turn off all room lights and argue with the patient's statements" },
                    { key: "D", text: "Ignore the fever and restlessness until morning" },
                ],
            },
            {
                step_number: 2,
                id: "stage-del-2",
                title: "Reorientation & Fall Prevention",
                vitals_summary: "BP 132/78 mmHg • P 88/min • RR 18/min • T 37.6°C",
                clinical_update:
                    "Room lighting is adjusted safely, call bell is within reach, and hydration/infection care is underway.",
                question_prompt: "Which approach best supports calm orientation and fall prevention?",
                options: [
                    { key: "A", text: "Use calm clear reorientation, keep essentials and pathways clear, encourage safe hydration if ordered, and monitor closely" },
                    { key: "B", text: "Leave clutter and wet spots on the floor near the bed" },
                    { key: "C", text: "Shout instructions rapidly when the patient looks confused" },
                    { key: "D", text: "Place the call bell out of reach so the patient stays still" },
                ],
            },
        ],
        local_stages: [
            {
                step_number: 1,
                id: "stage-del-l1",
                title: "Acute Delirium & Safety Assessment",
                vitals_summary: "BP 138/82 mmHg • P 102/min • RR 22/min • T 38.2°C",
                clinical_update:
                    "Family reports the patient was oriented earlier in the day before becoming confused and agitated.",
                question_prompt: "What is the priority nursing interpretation and action?",
                options: [
                    { key: "A", text: "Recognise possible acute delirium (infection, dehydration, hypoxia, pain, or medication effect), ensure a safe low-hazard environment, and notify the clinician" },
                    { key: "B", text: "Dismiss the confusion as permanent dementia and tie down limbs immediately" },
                    { key: "C", text: "Turn off all room lights and argue with the patient's statements" },
                    { key: "D", text: "Ignore the fever and restlessness until morning" },
                ],
                correct_key: "A",
                rationale:
                    "Sudden-onset confusion in an older adult points toward acute delirium—often driven by infection, dehydration, hypoxia, or medications—requiring prompt evaluation and safe care.",
                nursing_takeaway:
                    "Acute confusion in older adults is a medical/nursing warning sign, not routine aging.",
            },
            {
                step_number: 2,
                id: "stage-del-l2",
                title: "Reorientation & Fall Prevention",
                vitals_summary: "BP 132/78 mmHg • P 88/min • RR 18/min • T 37.6°C",
                clinical_update:
                    "Room lighting is adjusted safely, call bell is within reach, and hydration/infection care is underway.",
                question_prompt: "Which approach best supports calm orientation and fall prevention?",
                options: [
                    { key: "A", text: "Use calm clear reorientation, keep essentials and pathways clear, encourage safe hydration if ordered, and monitor closely" },
                    { key: "B", text: "Leave clutter and wet spots on the floor near the bed" },
                    { key: "C", text: "Shout instructions rapidly when the patient looks confused" },
                    { key: "D", text: "Place the call bell out of reach so the patient stays still" },
                ],
                correct_key: "A",
                rationale:
                    "Calm communication, clear walkways, accessible call bell, and hydration support reduce agitation and prevent falls.",
                nursing_takeaway:
                    "Environmental safety and calm reorientation protect older adults without increasing distress.",
            },
        ],
    },
    {
        id: "case-dehydration-toddler",
        title: "Acute Diarrhoea & Dehydration in a Toddler",
        condition_tag: "Child Health • Fluid & Hydration",
        difficulty: "BEGINNER",
        difficulty_display: "Beginner",
        course_code: "NPN-311",
        learning_objectives: "Assess dehydration severity in a young child and support safe oral/IV rehydration and caregiver teaching.",
        stage_count: 1,
        setting: "Out-Patient / Paediatric Observation",
        patient_summary:
            "A 2-year-old child has had watery stools for 24 hours, drinks eagerly when offered fluids, and has dry lips.",
        attempt: null,
        stages: [
            {
                step_number: 1,
                id: "stage-dehyd-1",
                title: "Hydration Assessment & Rehydration Priority",
                vitals_summary: "T 37.5°C • P 118/min • RR 26/min • Weight 11 kg",
                clinical_update:
                    "Child is alert and thirsty; skin pinch goes back slowly and caregiver asks what fluids to give.",
                question_prompt: "What is the safest nursing priority?",
                options: [
                    { key: "A", text: "Assess hydration status and danger signs, administer oral rehydration solution (ORS) per protocol alongside continued feeding, and teach caregiver danger signs" },
                    { key: "B", text: "Give undiluted sugary soft drinks and withhold all food" },
                    { key: "C", text: "Give anti-diarrhoeal medication to a toddler without clinical orders/safety check" },
                    { key: "D", text: "Send home with no fluid instructions" },
                ],
            },
        ],
        local_stages: [
            {
                step_number: 1,
                id: "stage-dehyd-l1",
                title: "Hydration Assessment & Rehydration Priority",
                vitals_summary: "T 37.5°C • P 118/min • RR 26/min • Weight 11 kg",
                clinical_update:
                    "Child is alert and thirsty; skin pinch goes back slowly and caregiver asks what fluids to give.",
                question_prompt: "What is the safest nursing priority?",
                options: [
                    { key: "A", text: "Assess hydration status and danger signs, administer oral rehydration solution (ORS) per protocol alongside continued feeding, and teach caregiver danger signs" },
                    { key: "B", text: "Give undiluted sugary soft drinks and withhold all food" },
                    { key: "C", text: "Give anti-diarrhoeal medication to a toddler without clinical orders/safety check" },
                    { key: "D", text: "Send home with no fluid instructions" },
                ],
                correct_key: "A",
                rationale:
                    "ORS replaces water and electrolytes safely in diarrhoeal dehydration while continued feeding supports nutritional recovery.",
                nursing_takeaway:
                    "ORS plus ongoing feeding and caregiver danger-sign teaching are foundational in child diarrhoeal care.",
            },
        ],
    },
]

export default function CasesPage() {
    const queryClient = useQueryClient()
    const [difficulty, setDifficulty] = useState<string>("")
    const [activeCaseId, setActiveCaseId] = useState<string | null>(null)
    const [stepIndex, setStepIndex] = useState<number>(0)
    const [selectedKey, setSelectedKey] = useState<string>("")
    const [feedback, setFeedback] = useState<StageAnswerFeedback | null>(null)
    const [localAnswers, setLocalAnswers] = useState<Record<string, Record<string, string>>>({})

    const { data: apiCases = [], isLoading, error } = useQuery({
        queryKey: ["clinical-cases", difficulty],
        queryFn: () => fetchClinicalCases(difficulty || undefined),
        retry: 1,
    })

    const usingFallback = Boolean(error) || (!isLoading && apiCases.length === 0)

    const cases: ClinicalCaseItem[] = useMemo(() => {
        const baseList: ClinicalCaseItem[] = usingFallback ? FALLBACK_CASES : apiCases
        if (!difficulty) return baseList
        return baseList.filter((c) => c.difficulty === difficulty)
    }, [usingFallback, apiCases, difficulty])

    const activeCase: ClinicalCaseItem | undefined = cases.find((c) => c.id === activeCaseId)
    const activeStage = activeCase?.stages[stepIndex]

    const answerMutation = useMutation({
        mutationFn: async ({ caseId, step, key }: { caseId: string; step: number; key: string }) => {
            if (usingFallback) {
                const localCase = FALLBACK_CASES.find((c) => c.id === caseId)
                const localStage = localCase?.local_stages.find((s) => s.step_number === step)
                const isCorrect = localStage ? localStage.correct_key === key : false
                const prevMap = localAnswers[caseId] || {}
                const nextMap = { ...prevMap, [String(step)]: key }
                setLocalAnswers((prev) => ({ ...prev, [caseId]: nextMap }))
                const totalSteps = localCase?.local_stages.length || 1
                const correctSteps = (localCase?.local_stages || []).filter(
                    (st) => nextMap[String(st.step_number)] === st.correct_key
                ).length

                const result: StageAnswerFeedback = {
                    selected_key: key,
                    is_correct: isCorrect,
                    correct_key: localStage?.correct_key || "A",
                    rationale: localStage?.rationale || "Review clinical priorities and safety cues for this stage.",
                    nursing_takeaway: localStage?.nursing_takeaway || "",
                    attempt: {
                        current_step: Math.min(step + 1, totalSteps),
                        total_steps: totalSteps,
                        correct_steps: correctSteps,
                        completed_at: step >= totalSteps ? new Date().toISOString() : null,
                        answers_map: nextMap,
                    },
                }
                return result
            }
            return submitCaseStageAnswer(caseId, step, key)
        },
        onSuccess: (data) => {
            setFeedback(data)
            if (!usingFallback) {
                queryClient.invalidateQueries({ queryKey: ["clinical-cases"] })
            }
        },
    })

    function openCase(c: ClinicalCaseItem) {
        setActiveCaseId(c.id)
        const startIdx = c.attempt?.current_step
            ? Math.min(Math.max(c.attempt.current_step - 1, 0), Math.max(c.stages.length - 1, 0))
            : 0
        setStepIndex(startIdx)
        const existingKey =
            localAnswers[c.id]?.[String(c.stages[startIdx]?.step_number ?? 1)] ||
            c.attempt?.answers_map?.[String(c.stages[startIdx]?.step_number ?? 1)] ||
            ""
        setSelectedKey(existingKey)
        setFeedback(null)
    }

    return (
        <AppShell>
            <div className="max-w-3xl space-y-5 pb-24 sm:pb-8">
                <div>
                    <h1 className="text-h1">Clinical Case Studies</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Step-by-step Ghanaian patient scenarios with vitals, priorities, and rationales.
                    </p>
                </div>

                {activeCase && activeStage ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveCaseId(null)
                                    setFeedback(null)
                                }}
                                className="text-sm font-medium text-brand-700 hover:underline"
                            >
                                ← All Clinical Cases
                            </button>
                            <span className="text-xs font-semibold text-on-surface-muted">
                                Stage {stepIndex + 1} of {activeCase.stages.length}
                            </span>
                        </div>

                        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="neutral">{activeCase.condition_tag}</Badge>
                                <Badge variant="success">{activeCase.difficulty_display}</Badge>
                                <span className="text-xs text-on-surface-muted">{activeCase.setting}</span>
                            </div>

                            <h2 className="text-h2">{activeCase.title}</h2>

                            <div className="rounded-xl bg-gray-50 border border-border p-3.5 text-xs sm:text-sm text-on-surface leading-relaxed">
                                <span className="font-bold text-on-surface">Presenting Scenario: </span>
                                {activeCase.patient_summary}
                            </div>

                            <div className="border-t border-border pt-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                    <h3 className="text-base font-bold text-on-surface">
                                        {activeStage.step_number}. {activeStage.title} <Link to={buildAiTutorUrl(`Case: ${activeCase.title} | Stage ${activeStage.step_number}: ${activeStage.title} | Vitals: ${activeStage.vitals_summary} | Update: ${activeStage.clinical_update} | Question: ${activeStage.question_prompt}`)} className="ml-2 inline-flex shrink-0 items-center whitespace-nowrap text-xs font-semibold text-brand-700 underline">Ask AI Tutor about this case stage →</Link>
                                    </h3>
                                    {activeStage.vitals_summary && (
                                        <span className="font-mono text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-md">
                                            {activeStage.vitals_summary}
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-on-surface-muted leading-relaxed">
                                    {activeStage.clinical_update}
                                </p>

                                <p className="pt-1 text-sm font-semibold text-on-surface">
                                    {activeStage.question_prompt}
                                </p>

                                <div className="space-y-2">
                                    {activeStage.options.map((opt) => {
                                        const isSelected = selectedKey === opt.key
                                        return (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedKey(opt.key)
                                                    setFeedback(null)
                                                }}
                                                className={`w-full text-left rounded-xl border p-3.5 text-xs sm:text-sm transition ${isSelected
                                                        ? "border-brand-700 bg-brand-50/50 font-medium text-on-surface"
                                                        : "border-border bg-white text-on-surface hover:bg-gray-50"
                                                    }`}
                                            >
                                                <span className="font-bold mr-2">{opt.key}.</span>
                                                {opt.text}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                                    <Button
                                        disabled={!selectedKey}
                                        loading={answerMutation.isPending}
                                        onClick={() =>
                                            answerMutation.mutate({
                                                caseId: activeCase.id,
                                                step: activeStage.step_number,
                                                key: selectedKey,
                                            })
                                        }
                                    >
                                        Check Decision
                                    </Button>

                                    {feedback && stepIndex + 1 < activeCase.stages.length && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                const nextIdx = stepIndex + 1
                                                setStepIndex(nextIdx)
                                                setSelectedKey(
                                                    feedback.attempt.answers_map?.[
                                                    String(activeCase.stages[nextIdx].step_number)
                                                    ] || ""
                                                )
                                                setFeedback(null)
                                            }}
                                        >
                                            Next Stage →
                                        </Button>
                                    )}
                                </div>

                                {feedback && (
                                    <div className="mt-4 space-y-2">
                                        <Alert variant={feedback.is_correct ? "success" : "warning"}>
                                            {feedback.is_correct
                                                ? "Strong clinical reasoning! "
                                                : `Review this point (Recommended option: ${feedback.correct_key || "—"}). `}
                                            {feedback.rationale}
                                        </Alert>
                                        {feedback.nursing_takeaway && (
                                            <p className="text-xs text-on-surface-muted px-1">
                                                <span className="font-semibold text-on-surface">Key Takeaway: </span>
                                                {feedback.nursing_takeaway}
                                            </p>
                                        )}
                                        {stepIndex + 1 >= activeCase.stages.length && (
                                            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-on-surface">
                                                        Case Completed — Score: {feedback.attempt.correct_steps}/{feedback.attempt.total_steps}
                                                    </p>
                                                    <p className="text-xs text-on-surface-muted">
                                                        Review rationales above or return to explore more clinical scenarios.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => openCase(activeCase)}
                                                    >
                                                        Replay Case
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setActiveCaseId(null)
                                                            setFeedback(null)
                                                        }}
                                                    >
                                                        All Cases
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Difficulty Filter */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                ["", "All Levels"],
                                ["BEGINNER", "Beginner"],
                                ["INTERMEDIATE", "Intermediate"],
                                ["ADVANCED", "Advanced"],
                            ].map(([val, label]) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setDifficulty(val)}
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${difficulty === val
                                            ? "bg-brand-700 text-white"
                                            : "border border-border bg-white text-on-surface-muted hover:text-on-surface"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {isLoading ? (
                            <div className="rounded-xl border border-border bg-white p-10 text-center text-sm text-on-surface-muted">
                                Loading clinical cases…
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {cases.map((c) => {
                                    const localMap = localAnswers[c.id]
                                    return (
                                        <div
                                            key={c.id}
                                            className="rounded-xl border border-border bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                                        >
                                            <div className="space-y-1.5 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="neutral">{c.condition_tag}</Badge>
                                                    <Badge variant="success">{c.difficulty_display}</Badge>
                                                    {c.attempt?.completed_at && (
                                                        <Badge variant="warning">
                                                            Score: {c.attempt.correct_steps}/{c.attempt.total_steps}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h2 className="text-h4 text-on-surface">{c.title}</h2>
                                                <p className="text-xs sm:text-sm text-on-surface-muted line-clamp-2">
                                                    {c.patient_summary}
                                                </p>
                                            </div>
                                            <Button onClick={() => openCase(c)} className="shrink-0">
                                                {c.attempt || localMap ? "Continue Case" : "Start Case"}
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppShell>
    )
}
