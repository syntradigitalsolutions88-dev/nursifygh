from django.apps import apps
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def _model(app_label, name):
    try:
        return apps.get_model(app_label, name)
    except LookupError:
        return None


def _has_field(Model, field_name):
    if not Model:
        return False
    return any(getattr(f, "name", None) == field_name for f in Model._meta.get_fields())


class AdminStudentActivityOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Staff or administrator access required."}, status=403)

        User = get_user_model()
        program = request.query_params.get("program", "").strip()
        search = request.query_params.get("q", "").strip()

        students_qs = User.objects.filter(is_staff=False).order_by("-date_joined")
        if program and _has_field(User, "program"):
            students_qs = students_qs.filter(program=program)
        if search:
            q_filter = Q(email__icontains=search)
            for fname in ("full_name", "phone_number", "institution", "first_name", "last_name"):
                if _has_field(User, fname):
                    q_filter |= Q(**{f"{fname}__icontains": search})
            students_qs = students_qs.filter(q_filter)

        program_breakdown = []
        if _has_field(User, "program"):
            program_breakdown = list(
                User.objects.filter(is_staff=False)
                .values("program")
                .annotate(count=Count("id"))
                .order_by("program")
            )

        Course = _model("academics", "Course")
        nac_nap_courses = []
        if Course and _has_field(Course, "program"):
            try:
                qs = Course.objects.filter(program__in=["NAC", "NAP"])
                if any(getattr(f, "name", None) == "questions" for f in Course._meta.get_fields()):
                    qs = qs.annotate(question_count=Count("questions"))
                    nac_nap_courses = list(
                        qs.values("code", "title", "program", "level", "semester", "question_count")
                        .order_by("program", "level", "semester", "code")
                    )
                else:
                    for c in qs.order_by("code"):
                        nac_nap_courses.append({
                            "code": getattr(c, "code", ""),
                            "title": getattr(c, "title", ""),
                            "program": getattr(c, "program", ""),
                            "level": getattr(c, "level", ""),
                            "semester": getattr(c, "semester", ""),
                            "question_count": 0,
                        })
            except Exception:
                nac_nap_courses = []

        QuizAttempt = _model("academics", "QuizAttempt")
        recent_attempts = []
        if QuizAttempt:
            try:
                att_qs = QuizAttempt.objects.select_related("user").order_by("-id")
                if _has_field(QuizAttempt, "course"):
                    att_qs = att_qs.select_related("course")
                if program:
                    cond = Q(user__program=program)
                    if _has_field(QuizAttempt, "course"):
                        cond |= Q(course__program=program)
                    att_qs = att_qs.filter(cond)
                for a in att_qs[:40]:
                    u = getattr(a, "user", None)
                    c = getattr(a, "course", None) if _has_field(QuizAttempt, "course") else None
                    dt_val = None
                    for dt_field in ("submitted_at", "completed_at", "created_at"):
                        if _has_field(QuizAttempt, dt_field):
                            dt_val = getattr(a, dt_field, None)
                            if dt_val:
                                break
                    recent_attempts.append({
                        "id": a.pk,
                        "student_name": (getattr(u, "full_name", "") or getattr(u, "email", "")) if u else "-",
                        "student_email": getattr(u, "email", "") if u else "",
                        "program": getattr(u, "program", "") if u else "",
                        "level": getattr(u, "level", "") if u else "",
                        "course_code": getattr(c, "code", "") if c else "",
                        "course_title": getattr(c, "title", "") if c else "",
                        "score": getattr(a, "score_percentage", None)
                        if getattr(a, "score_percentage", None) is not None
                        else getattr(a, "score", getattr(a, "percentage", None)),
                        "created_at": dt_val,
                    })
            except Exception:
                recent_attempts = []

        Commission = _model("accounts", "AmbassadorCommission")
        recent_commissions = []
        if Commission:
            try:
                c_qs = Commission.objects.order_by("-id")[:25]
                for c in c_qs:
                    amb = getattr(c, "ambassador", None)
                    ref = getattr(c, "referred_student", None)
                    recent_commissions.append({
                        "id": c.pk,
                        "ambassador": (getattr(amb, "full_name", "") or getattr(amb, "email", "")) if amb else "-",
                        "referred_student": (getattr(ref, "full_name", "") or getattr(ref, "email", "")) if ref else "-",
                        "program": getattr(ref, "program", "") if ref else "",
                        "amount": str(getattr(c, "amount", "")),
                        "status": getattr(c, "status", ""),
                        "created_at": getattr(c, "created_at", None),
                    })
            except Exception:
                recent_commissions = []

        Feedback = _model("accounts", "Feedback")
        recent_feedback = []
        if Feedback:
            try:
                f_qs = Feedback.objects.order_by("-id")[:25]
                for f in f_qs:
                    fu = getattr(f, "user", None)
                    recent_feedback.append({
                        "id": f.pk,
                        "student": (getattr(fu, "full_name", "") or getattr(fu, "email", "")) if fu else "-",
                        "program": getattr(fu, "program", "") if fu else "",
                        "subject": getattr(f, "subject", "") or getattr(f, "category", ""),
                        "message": str(getattr(f, "message", "") or "")[:160],
                        "status": getattr(f, "status", ""),
                        "created_at": getattr(f, "created_at", None),
                    })
            except Exception:
                recent_feedback = []

        LoginLog = _model("accounts", "UserLoginLog")
        login_history = []
        if LoginLog:
            try:
                l_qs = LoginLog.objects.select_related("user").order_by("-logged_in_at")[:40]
                for row in l_qs:
                    u = getattr(row, "user", None)
                    login_history.append({
                        "id": row.pk,
                        "user_name": (getattr(u, "full_name", "") or getattr(u, "email", "")) if u else "-",
                        "user_email": getattr(u, "email", "") if u else "",
                        "program": getattr(u, "program", "") if u else "",
                        "ip_address": row.ip_address,
                        "logged_in_at": row.logged_in_at,
                    })
            except Exception:
                login_history = []

        ActivityLog = _model("accounts", "UserActivityLog")
        user_actions = []
        if ActivityLog:
            try:
                act_qs = ActivityLog.objects.select_related("user").order_by("-created_at")[:50]
                for act in act_qs:
                    u = getattr(act, "user", None)
                    user_actions.append({
                        "id": act.pk,
                        "user_name": (getattr(u, "full_name", "") or getattr(u, "email", "")) if u else "-",
                        "user_email": getattr(u, "email", "") if u else "",
                        "program": act.program or (getattr(u, "program", "") if u else ""),
                        "action_type": act.action_type,
                        "summary": act.summary,
                        "created_at": act.created_at,
                    })
            except Exception:
                user_actions = []

        students_list = [
            {
                "id": u.pk,
                "full_name": getattr(u, "full_name", "") or u.email,
                "email": u.email,
                "phone_number": getattr(u, "phone_number", "") if _has_field(User, "phone_number") else "",
                "program": getattr(u, "program", "") if _has_field(User, "program") else "",
                "level": getattr(u, "level", "") if _has_field(User, "level") else "",
                "institution": getattr(u, "institution", "") if _has_field(User, "institution") else "",
                "is_active": u.is_active,
                "last_login": u.last_login,
                "date_joined": u.date_joined,
            }
            for u in students_qs[:60]
        ]

        return Response({
            "total_students": User.objects.filter(is_staff=False).count(),
            "filtered_students_count": students_qs.count(),
            "program_breakdown": program_breakdown,
            "nac_nap_courses": nac_nap_courses,
            "nac_nap_total_questions": sum(c["question_count"] for c in nac_nap_courses),
            "students": students_list,
            "recent_attempts": recent_attempts,
            "recent_commissions": recent_commissions,
            "recent_feedback": recent_feedback,
            "login_history": login_history,
            "user_actions": user_actions,
        })
