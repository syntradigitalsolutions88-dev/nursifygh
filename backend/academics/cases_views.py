from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CaseAttempt, CaseStage, ClinicalCase


def _ensure_starter_cases() -> None:
    if ClinicalCase.objects.exists():
        return

    starter = [
        {
            "title": "Post-Operative Pain & Early Mobilisation",
            "condition_tag": "Medical-Surgical Nursing",
            "setting": "General Surgical Ward, Ghana",
            "difficulty": "BEGINNER",
            "patient_summary": (
                "A 45-year-old man is 2 days post-laparoscopic/open appendectomy and reports sharp "
                "incisional pain rated 7/10 when coughing or moving."
            ),
            "learning_objectives": (
                "Assess post-operative pain safely, combine analgesia with gentle splinting and deep breathing, "
                "and support early mobilisation while preventing complications."
            ),
            "stages": [
                {
                    "step_number": 1,
                    "title": "Respiratory & Mobility Care",
                    "vitals_summary": "BP 126/78 mmHg • HR 84 bpm • RR 18/min • SpO2 97% (room air) • T 36.9°C",
                    "clinical_update": "Dressing is clean and dry; patient avoids deep breaths due to incisional discomfort.",
                    "question_prompt": "Which combined nursing action best supports recovery right now?",
                    "options": [
                        {
                            "key": "A",
                            "label": "Administer prescribed analgesia, splint the incision during deep breathing/coughing, and assist gradual mobilisation",
                            "is_correct": True,
                        },
                        {
                            "key": "B",
                            "label": "Keep patient strictly on bed rest for a full week without breathing exercises",
                            "is_correct": False,
                        },
                        {
                            "key": "C",
                            "label": "Ignore pain score since vital signs are near baseline",
                            "is_correct": False,
                        },
                        {
                            "key": "D",
                            "label": "Remove wound dressing to inspect without hand hygiene",
                            "is_correct": False,
                        },
                    ],
                    "rationale": "Effective analgesia and gentle incisional splinting reduce splinting-related atelectasis and enable safe early ambulation to prevent thromboembolism.",
                    "nursing_takeaway": "Splinting the surgical site eases pain during deep breathing and coughing.",
                },
            ],
        },
        {
            "title": "Severe Malaria with High Fever in a Child",
            "condition_tag": "Paediatric / Medical Nursing",
            "setting": "Paediatric Emergency / Ward, Ghana",
            "difficulty": "BEGINNER",
            "patient_summary": (
                "A 3-year-old boy (weight 14 kg) presents with a 2-day history of high-grade fever, vomiting, "
                "and lethargy. Mother reports reduced urine output today."
            ),
            "learning_objectives": (
                "Recognise danger signs of severe malaria in children, prioritise parenteral treatment and supportive "
                "monitoring, and educate caregivers."
            ),
            "stages": [
                {
                    "step_number": 1,
                    "title": "Initial Stabilisation & Triage",
                    "vitals_summary": "T 39.4°C • HR 142 bpm • RR 34/min • SpO2 96% • Weight 14 kg",
                    "clinical_update": "Child is lethargic with persistent vomiting and unable to keep oral fluids down.",
                    "question_prompt": "What is the priority nursing approach on admission?",
                    "options": [
                        {
                            "key": "A",
                            "label": "Prioritise airway/breathing/circulation assessment, initiate prescribed parenteral antimalarial therapy, check blood glucose/hydration, and monitor vitals",
                            "is_correct": True,
                        },
                        {
                            "key": "B",
                            "label": "Force oral tablets immediately despite ongoing vomiting and lethargy",
                            "is_correct": False,
                        },
                        {
                            "key": "C",
                            "label": "Delay treatment until tomorrow morning pending routine ward rounds",
                            "is_correct": False,
                        },
                        {
                            "key": "D",
                            "label": "Discontinue fever monitoring once antipyretics are given",
                            "is_correct": False,
                        },
                    ],
                    "rationale": "Lethargy and persistent vomiting in a child with suspected malaria require urgent stabilisation, parenteral treatment per protocol, and close monitoring of temperature, glucose, and urine output.",
                    "nursing_takeaway": "Assess danger signs promptly and monitor hypoglycaemia, fever, and fluid balance in severe paediatric malaria.",
                },
            ],
        },
        {
            "title": "Postpartum Haemorrhage After Vaginal Delivery",
            "condition_tag": "Midwifery & Obstetric Care",
            "setting": "Labour & Delivery / Recovery Ward, Ghana",
            "difficulty": "INTERMEDIATE",
            "patient_summary": (
                "A 26-year-old para 2+0 delivered a 3.4 kg baby 45 minutes ago. She now has heavy vaginal "
                "bleeding and feels dizzy."
            ),
            "learning_objectives": (
                "Assess uterine tone and bleeding promptly, apply emergency postpartum haemorrhage nursing actions, "
                "and escalate effectively."
            ),
            "stages": [
                {
                    "step_number": 1,
                    "title": "Immediate Assessment & Uterine Tone",
                    "vitals_summary": "BP 88/54 mmHg • HR 122 bpm • RR 24/min • SpO2 97% • Fundus boggy above umbilicus",
                    "clinical_update": "Active vaginal bleeding is present and the uterus feels soft/boggy on palpation.",
                    "question_prompt": "Which immediate action should you take first?",
                    "options": [
                        {
                            "key": "A",
                            "label": "Call for help, perform gentle fundal massage to promote contraction, check bladder distension, and support prescribed uterotonic and IV resuscitation",
                            "is_correct": True,
                        },
                        {
                            "key": "B",
                            "label": "Wait 30 minutes to see if bleeding slows on its own before calling for assistance",
                            "is_correct": False,
                        },
                        {
                            "key": "C",
                            "label": "Encourage the patient to walk to the bathroom alone to check blood loss",
                            "is_correct": False,
                        },
                        {
                            "key": "D",
                            "label": "Avoid monitoring vital signs until bleeding stops completely",
                            "is_correct": False,
                        },
                    ],
                    "rationale": "Uterine atony is a leading cause of primary PPH. Prompt team escalation, fundal massage, bladder emptying, uterotonics, and fluid/blood resuscitation are critical.",
                    "nursing_takeaway": "Always check uterine tone, call for help early, and monitor BP, pulse, and bleeding closely in suspected PPH.",
                },
            ],
        },
    ]

    for item in starter:
        stages_data = item.pop("stages")
        case_obj = ClinicalCase.objects.create(**item)
        for st in stages_data:
            CaseStage.objects.create(case=case_obj, **st)


def _ensure_expanded_cases() -> None:
    if ClinicalCase.objects.filter(title__icontains="Pre-Eclampsia").exists():
        return

    extra = [
        {
            "title": "Severe Pre-Eclampsia in Third Trimester",
            "condition_tag": "Midwifery & Obstetric Emergency",
            "setting": "Maternity & Antenatal Ward, Ghana",
            "difficulty": "INTERMEDIATE",
            "patient_summary": (
                "A 29-year-old primigravida at 35 weeks gestation presents with BP 168/112 mmHg, "
                "severe frontal headache, blurred vision, epigastric pain, and 3+ proteinuria."
            ),
            "learning_objectives": (
                "Recognise impending eclampsia signs, prioritise seizure prophylaxis and BP safety, "
                "and monitor magnesium sulfate toxicity parameters."
            ),
            "stages": [
                {
                    "step_number": 1,
                    "title": "Immediate Triage & Seizure Prevention",
                    "vitals_summary": "BP 168/112 mmHg • HR 96 bpm • RR 20/min • SpO2 98% • Reflexes 3+",
                    "clinical_update": "Patient is alert but anxious with persistent visual blurring and mild epigastric tenderness.",
                    "question_prompt": "What is your immediate nursing priority?",
                    "options": [
                        {
                            "key": "A",
                            "label": "Initiate seizure precautions, nurse in a calm/safe environment, and prepare prescribed MgSO4 and antihypertensive therapy while monitoring closely",
                            "is_correct": True,
                        },
                        {
                            "key": "B",
                            "label": "Leave her alone in a bright room and recheck blood pressure after 4 hours",
                            "is_correct": False,
                        },
                        {
                            "key": "C",
                            "label": "Encourage rapid oral ingestion of high-sodium fluids",
                            "is_correct": False,
                        },
                        {
                            "key": "D",
                            "label": "Administer a sedative without checking blood pressure or foetal status",
                            "is_correct": False,
                        },
                    ],
                    "rationale": "Severe headache, visual disturbance, and epigastric pain signal impending eclampsia. Seizure precautions, controlled antihypertensive care, and MgSO4 protocols protect both mother and foetus.",
                    "nursing_takeaway": "Neurological warning signs in severe pre-eclampsia demand prompt escalation and close maternal-foetal monitoring.",
                },
                {
                    "step_number": 2,
                    "title": "Monitoring Magnesium Sulfate Safety",
                    "vitals_summary": "BP 154/100 mmHg • RR 10/min • Urine output 18 mL/hr • Patellar reflex absent",
                    "clinical_update": "One hour into MgSO4 infusion, respiratory rate drops to 10 breaths/min, urine output is low, and patellar reflexes are absent.",
                    "question_prompt": "What action should you take first?",
                    "options": [
                        {
                            "key": "A",
                            "label": "Stop/hold the MgSO4 infusion immediately, assess airway/breathing/oxygenation, notify the clinician, and have 10% calcium gluconate ready",
                            "is_correct": True,
                        },
                        {
                            "key": "B",
                            "label": "Double the MgSO4 infusion rate to clear symptoms faster",
                            "is_correct": False,
                        },
                        {
                            "key": "C",
                            "label": "Ignore the respiratory rate since blood pressure improved slightly",
                            "is_correct": False,
                        },
                        {
                            "key": "D",
                            "label": "Place the patient flat supine with feet elevated and walk away",
                            "is_correct": False,
                        },
                    ],
                    "rationale": "Respiratory depression (<12-16/min), absent patellar reflexes, and oliguria (<30 mL/hr) are classic signs of magnesium toxicity; 10% calcium gluconate is the antidote.",
                    "nursing_takeaway": "Always verify RR >= 12-16/min, patellar reflex, and urine output >= 30 mL/hr before continuing MgSO4.",
                },
            ],
        },
        {
            "title": "Acute Gastroenteritis & Dehydration in a Toddler",
            "condition_tag": "Child Health / CHPS & Paediatrics",
            "setting": "Paediatric OPD / CHPS Facility, Ghana",
            "difficulty": "BEGINNER",
            "patient_summary": (
                "An 18-month-old child (weight 10 kg) presents with 6 watery stools and 3 episodes of vomiting over 24 hours. "
                "The child is irritable/restless, thirsty, with sunken eyes and skin pinch returning slowly."
            ),
            "learning_objectives": (
                "Classify dehydration status accurately, apply rehydration principles, and educate caregivers "
                "on home ORS, zinc, and danger signs."
            ),
            "stages": [
                {
                    "step_number": 1,
                    "title": "Dehydration Assessment & Rehydration Plan",
                    "vitals_summary": "T 37.4°C • HR 138 bpm • RR 32/min • Skin pinch slow • Eyes sunken",
                    "clinical_update": "Child eagerly takes fluid when offered a cup and has no signs of severe shock.",
                    "question_prompt": "Which nursing plan fits this presentation best?",
                    "options": [
                        {
                            "key": "A",
                            "label": "Recognise some dehydration, start supervised oral rehydration solution (ORS) with zinc supplementation, and reassess hydration status frequently",
                            "is_correct": True,
                        },
                        {
                            "key": "B",
                            "label": "Withhold all fluids for 12 hours until vomiting stops completely",
                            "is_correct": False,
                        },
                        {
                            "key": "C",
                            "label": "Give plain water only and avoid ORS or zinc",
                            "is_correct": False,
                        },
                        {
                            "key": "D",
                            "label": "Discharge without follow-up instructions",
                            "is_correct": False,
                        },
                    ],
                    "rationale": "Restlessness/irritability, sunken eyes, eagerness to drink, and slow skin pinch indicate some dehydration. Supervised ORS restores fluid/electrolytes, and zinc reduces episode duration and severity.",
                    "nursing_takeaway": "Give small, frequent sips/spoonfuls of ORS even if vomiting occurs, and teach caregivers danger signs for urgent return.",
                },
            ],
        },
    ]

    for item in extra:
        stages_data = item.pop("stages")
        case_obj = ClinicalCase.objects.create(**item)
        for st in stages_data:
            CaseStage.objects.create(case=case_obj, **st)


def _serialize_case(case_obj: ClinicalCase, attempt: CaseAttempt | None = None) -> dict:
    stages_qs = case_obj.stages.order_by("step_number")
    stages_list = []
    for st in stages_qs:
        safe_options = [
            {
                "key": str(opt.get("key", "")).strip().upper(),
                "label": str(opt.get("label", "")),
            }
            for opt in (st.options or [])
        ]
        stages_list.append(
            {
                "id": str(st.id),
                "step_number": st.step_number,
                "title": st.title,
                "vitals_summary": st.vitals_summary,
                "clinical_update": st.clinical_update,
                "question_prompt": st.question_prompt,
                "options": safe_options,
                "rationale": st.rationale,
                "nursing_takeaway": st.nursing_takeaway,
            }
        )

    return {
        "id": str(case_obj.id),
        "title": case_obj.title,
        "condition_tag": case_obj.condition_tag,
        "setting": case_obj.setting,
        "difficulty": case_obj.difficulty,
        "patient_summary": case_obj.patient_summary,
        "learning_objectives": case_obj.learning_objectives,
        "stages": stages_list,
        "attempt": (
            {
                "current_step": attempt.current_step,
                "correct_steps": attempt.correct_steps,
                "total_steps": attempt.total_steps or len(stages_list),
                "answers_map": attempt.answers_map or {},
                "completed": bool(attempt.completed_at),
            }
            if attempt
            else None
        ),
    }


class ClinicalCaseListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _ensure_starter_cases()
        _ensure_expanded_cases()

        difficulty = (request.query_params.get("difficulty") or "").strip().upper()
        qs = ClinicalCase.objects.filter(is_published=True).prefetch_related("stages")
        if difficulty in {"BEGINNER", "INTERMEDIATE", "ADVANCED"}:
            qs = qs.filter(difficulty=difficulty)

        attempts_by_case = {
            att.case_id: att
            for att in CaseAttempt.objects.filter(student=request.user, case__in=qs)
        }
        payload = [_serialize_case(c, attempts_by_case.get(c.id)) for c in qs]
        return Response(payload, status=status.HTTP_200_OK)


class ClinicalCaseDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, case_id):
        _ensure_starter_cases()
        _ensure_expanded_cases()
        case_obj = get_object_or_404(ClinicalCase.objects.prefetch_related("stages"), id=case_id, is_published=True)
        attempt = CaseAttempt.objects.filter(student=request.user, case=case_obj).first()
        return Response(_serialize_case(case_obj, attempt), status=status.HTTP_200_OK)


class SubmitCaseStageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, case_id):
        _ensure_starter_cases()
        _ensure_expanded_cases()
        case_obj = get_object_or_404(ClinicalCase.objects.prefetch_related("stages"), id=case_id, is_published=True)
        step_number = int(request.data.get("step_number") or 1)
        selected_key = str(request.data.get("selected_key") or "").strip().upper()

        stage = get_object_or_404(CaseStage, case=case_obj, step_number=step_number)
        options = stage.options or []
        chosen = next((o for o in options if str(o.get("key", "")).strip().upper() == selected_key), None)
        correct_opt = next((o for o in options if bool(o.get("is_correct"))), None) or (options[0] if options else None)
        is_correct = bool(
            chosen
            and correct_opt
            and str(chosen.get("key", "")).strip().upper() == str(correct_opt.get("key", "")).strip().upper()
        )
        correct_key = str(correct_opt.get("key", "")).strip().upper() if correct_opt else ""

        total_stages = case_obj.stages.count()
        attempt, _ = CaseAttempt.objects.get_or_create(
            student=request.user,
            case=case_obj,
            defaults={"total_steps": total_stages, "current_step": 1},
        )
        attempt.total_steps = total_stages
        answers_map = dict(attempt.answers_map or {})
        prev_entry = answers_map.get(str(step_number))
        was_previously_correct = bool(isinstance(prev_entry, dict) and prev_entry.get("is_correct"))

        answers_map[str(step_number)] = {
            "selected_key": selected_key,
            "is_correct": is_correct,
        }
        attempt.answers_map = answers_map

        if is_correct and not was_previously_correct:
            attempt.correct_steps = min(total_stages, (attempt.correct_steps or 0) + 1)
        elif not is_correct and was_previously_correct:
            attempt.correct_steps = max(0, (attempt.correct_steps or 0) - 1)

        if step_number < total_stages:
            attempt.current_step = max(attempt.current_step, step_number + 1)
        else:
            attempt.current_step = total_stages
            attempt.completed_at = timezone.now()

        attempt.save()

        return Response(
            {
                "is_correct": is_correct,
                "correct_key": correct_key,
                "rationale": stage.rationale,
                "nursing_takeaway": stage.nursing_takeaway,
                "next_step": step_number + 1 if step_number < total_stages else None,
                "attempt": {
                    "current_step": attempt.current_step,
                    "correct_steps": attempt.correct_steps,
                    "total_steps": attempt.total_steps,
                    "answers_map": attempt.answers_map,
                    "completed": bool(attempt.completed_at),
                },
            },
            status=status.HTTP_200_OK,
        )
