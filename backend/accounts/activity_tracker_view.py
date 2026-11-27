from django.apps import apps
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


def _model(app_label, name):
    try:
        return apps.get_model(app_label, name)
    except LookupError:
        return None


class AdminStudentActivityOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        User = get_user_model()
        program = request.query_params.get("program", "").strip()
        search = request.query_params.get("q", "").strip()

        students_qs = User.objects.filter(is_staff=False).order_by("-date_joined")
        if program:
            students_qs = students_qs.filter(program=program)
        if search:
            students_qs = students_qs.filter(
                Q(email__icontains=search)
                | Q(full_name__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(institution__icontains=search)
            )

        program_breakdown = list(
            User.objects.filter(is_staff=False)
            .values("program")
            .annotate(count=Count("id"))
            .order_by("program")
        )

        Course = _model("academics", "Course")
        nac_nap_courses = []
        if Course:
            nac_nap_courses = list(
                Course.objects.filter(program__in=["NAC", "NAP"])
                .annotate(question_count=Count("questions"))
                .values("code", "title", "program", "level", "semester", "question_count")
                .order_by("program", "level", "semester", "code")
            )

        QuizAttempt = _model("academics", "QuizAttempt")
        recent_attempts = []
        if QuizAttempt:
            att_qs = QuizAttempt.objects.select_related("user", "course").order_by("-id")
            if program:
                att_qs = att_qs.filter(Q(user__program=program) | Q(course__program=program))
            for a in att_qs[:40]:
                recent_attempts.append({
                    "id": a.pk,
                    "student_name": getattr(a.user, "full_name", "") or a.user.email,
                    "student_email": a.user.email,
                    "program": getattr(a.user, "program", ""),
                    "level": getattr(a.user, "level", ""),
                    "course_code": a.course.code if getattr(a, "course", None) else "",
                    "course_title": a.course.title if getattr(a, "course", None) else "",
                    "score": getattr(a, "score", getattr(a, "percentage", None)),
                    "created_at": getattr(a, "submitted_at", None) or getattr(a, "created_at", None),
                })

        Commission = _model("accounts", "AmbassadorCommission")
        recent_commissions = []
        if Commission:
            c_qs = Commission.objects.select_related("ambassador", "referred_student").order_by("-id")[:25]
            for c in c_qs:
                recent_commissions.append({
                    "id": c.pk,
                    "ambassador": getattr(c.ambassador, "full_name", "") or c.ambassador.email,
                    "referred_student": getattr(c.referred_student, "full_name", "") or c.referred_student.email,
                    "program": getattr(c.referred_student, "program", ""),
                    "amount": str(getattr(c, "amount", "")),
                    "status": getattr(c, "status", ""),
                    "created_at": getattr(c, "created_at", None),
                })

        Feedback = _model("accounts", "Feedback")
        recent_feedback = []
        if Feedback:
            f_qs = Feedback.objects.select_related("user").order_by("-id")[:25]
            for f in f_qs:
                recent_feedback.append({
                    "id": f.pk,
                    "student": getattr(f.user, "full_name", "") or f.user.email,
                    "program": getattr(f.user, "program", ""),
                    "subject": getattr(f, "subject", "") or getattr(f, "category", ""),
                    "message": getattr(f, "message", "")[:160],
                    "status": getattr(f, "status", ""),
                    "created_at": getattr(f, "created_at", None),
                })

        students_list = [
            {
                "id": u.pk,
                "full_name": getattr(u, "full_name", "") or u.email,
                "email": u.email,
                "phone_number": getattr(u, "phone_number", ""),
                "program": getattr(u, "program", ""),
                "level": getattr(u, "level", ""),
                "institution": getattr(u, "institution", ""),
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
        })
