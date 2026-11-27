from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CaseAttempt, CaseStage, ClinicalCase

VALID_PROGRAMS = {"GENERAL", "MIDWIFERY", "PSYCHIATRIC", "COMMUNITY", "NAC", "NAP"}
VALID_DIFFICULTIES = {"BEGINNER", "INTERMEDIATE", "ADVANCED"}

PROGRAM_LABELS = {
    "GENERAL": "RGN • General Nursing",
    "MIDWIFERY": "RM • Midwifery",
    "PSYCHIATRIC": "RPN • Psychiatric Nursing",
    "COMMUNITY": "CHN • Community Health",
    "NAC": "NAC • Clinical Assistant",
    "NAP": "NAP • Preventive Assistant",
}


def _opt_key(opt: dict) -> str:
    return str(opt.get("key") or opt.get("id") or "").strip().upper()


def _opt_text(opt: dict) -> str:
    return str(opt.get("text") or opt.get("label") or "").strip()


def _normalize_answers_map(raw_map: dict | None) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for step_k, val in (raw_map or {}).items():
        if isinstance(val, dict):
            normalized[str(step_k)] = str(val.get("selected_key") or "").strip().upper()
        elif isinstance(val, str):
            normalized[str(step_k)] = val.strip().upper()
    return normalized


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
                "A 45-year-old man is 2 days post-open appendectomy and reports sharp "
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
                            "text": "Administer prescribed analgesia, splint the incision during deep breathing/coughing, and assist gradual mobilisation",
                            "is_correct": True,
                        },
                        {
                            "key": "B",
                            "text": "Keep patient strictly on bed rest for a full week without breathing exercises",
                            "is_correct": False,
                        },
                        {
                            "key": "C",
                            "text": "Ignore pain score since vital signs are near baseline",
                            "is_correct": False,
                        },
                        {
                            "key": "D",
                            "text": "Remove wound dressing to inspect without hand hygiene",
                            "is_correct": False,
                        },
                    ],
                    "rationale": "Effective analgesia and gentle incisional splinting reduce splinting-related atelectasis and enable safe early ambulation to prevent thromboembolism.",
                    "nursing_takeaway": "Splinting the surgical site eases pain during deep breathing and coughing.",
                },
            ],
        },
    ]

    for item in starter:
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
                "key": _opt_key(opt),
                "text": _opt_text(opt),
                "label": _opt_text(opt),
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
            }
        )

    program_code = case_obj.course.program if case_obj.course else ""

    return {
        "id": str(case_obj.id),
        "program": program_code,
        "program_label": PROGRAM_LABELS.get(program_code, program_code),
        "course_code": case_obj.course.code if case_obj.course else None,
        "title": case_obj.title,
        "condition_tag": case_obj.condition_tag,
        "setting": case_obj.setting,
        "difficulty": case_obj.difficulty,
        "difficulty_display": case_obj.get_difficulty_display(),
        "patient_summary": case_obj.patient_summary,
        "learning_objectives": case_obj.learning_objectives,
        "stage_count": len(stages_list),
        "stages": stages_list,
        "attempt": (
            {
                "current_step": attempt.current_step,
                "correct_steps": attempt.correct_steps,
                "total_steps": attempt.total_steps or len(stages_list),
                "answers_map": _normalize_answers_map(attempt.answers_map),
                "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
            }
            if attempt
            else None
        ),
    }


class ClinicalCaseListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _ensure_starter_cases()

        difficulty = (request.query_params.get("difficulty") or "").strip().upper()
        program = (request.query_params.get("program") or "").strip().upper()
        query = (request.query_params.get("q") or "").strip()

        qs = (
            ClinicalCase.objects.filter(is_published=True)
            .select_related("course")
            .prefetch_related("stages")
            .order_by("course__program", "difficulty", "title")
        )
        if difficulty in VALID_DIFFICULTIES:
            qs = qs.filter(difficulty=difficulty)
        if program in VALID_PROGRAMS:
            qs = qs.filter(course__program=program)
        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(condition_tag__icontains=query)
                | Q(setting__icontains=query)
                | Q(patient_summary__icontains=query)
            )

        attempts_by_case = {
            att.case_id: att
            for att in CaseAttempt.objects.filter(student=request.user, case__in=qs)
        }
        payload = [_serialize_case(c, attempts_by_case.get(c.id)) for c in qs]
        return Response({"results": payload}, status=status.HTTP_200_OK)


class ClinicalCaseDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, case_id):
        _ensure_starter_cases()
        case_obj = get_object_or_404(
            ClinicalCase.objects.select_related("course").prefetch_related("stages"),
            id=case_id,
            is_published=True,
        )
        attempt = CaseAttempt.objects.filter(student=request.user, case=case_obj).first()
        return Response(_serialize_case(case_obj, attempt), status=status.HTTP_200_OK)

    def delete(self, request, case_id):
        case_obj = get_object_or_404(ClinicalCase, id=case_id, is_published=True)
        CaseAttempt.objects.filter(student=request.user, case=case_obj).delete()
        return Response({"reset": True}, status=status.HTTP_200_OK)


class SubmitCaseStageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, case_id):
        _ensure_starter_cases()
        case_obj = get_object_or_404(
            ClinicalCase.objects.select_related("course").prefetch_related("stages"),
            id=case_id,
            is_published=True,
        )
        step_number = int(request.data.get("step_number") or 1)
        selected_key = str(request.data.get("selected_key") or "").strip().upper()

        stage = get_object_or_404(CaseStage, case=case_obj, step_number=step_number)
        options = stage.options or []
        chosen = next((o for o in options if _opt_key(o) == selected_key), None)
        correct_opt = next((o for o in options if bool(o.get("is_correct"))), None) or (
            options[0] if options else None
        )
        correct_key = _opt_key(correct_opt) if correct_opt else ""
        is_correct = bool(chosen and correct_opt and _opt_key(chosen) == correct_key)

        total_stages = case_obj.stages.count()
        attempt, _ = CaseAttempt.objects.get_or_create(
            student=request.user,
            case=case_obj,
            defaults={"total_steps": total_stages, "current_step": 1},
        )
        attempt.total_steps = total_stages

        answers_map = _normalize_answers_map(attempt.answers_map)
        answers_map[str(step_number)] = selected_key
        attempt.answers_map = answers_map

        # Recompute exact correct_steps cleanly across all stages
        correct_count = 0
        for st in case_obj.stages.all():
            ans_k = answers_map.get(str(st.step_number), "")
            st_correct = next((_opt_key(o) for o in (st.options or []) if bool(o.get("is_correct"))), "")
            if ans_k and st_correct and ans_k == st_correct:
                correct_count += 1
        attempt.correct_steps = correct_count

        if step_number < total_stages:
            attempt.current_step = max(attempt.current_step, step_number + 1)
        else:
            attempt.current_step = total_stages
            attempt.completed_at = timezone.now()

        attempt.save()

        return Response(
            {
                "is_correct": is_correct,
                "selected_key": selected_key,
                "correct_key": correct_key or None,
                "rationale": stage.rationale,
                "nursing_takeaway": stage.nursing_takeaway,
                "attempt": {
                    "current_step": attempt.current_step,
                    "correct_steps": attempt.correct_steps,
                    "total_steps": attempt.total_steps,
                    "answers_map": answers_map,
                    "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
                },
            },
            status=status.HTTP_200_OK,
        )