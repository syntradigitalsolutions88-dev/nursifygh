from django.apps import apps
from django.contrib import admin
from django.db.models import Count, Q
from django.shortcuts import render
from django.urls import path
from django.utils import timezone


def get_model_safe(app_label, model_name):
    try:
        return apps.get_model(app_label, model_name)
    except LookupError:
        return None


def register_student_activity_tracker():
    if getattr(admin.site, "_nursify_tracker_installed", False):
        return
    admin.site._nursify_tracker_installed = True

    # Enhance registered admin list_filters with program/level/semester/status
    target_models = [
        ("accounts", "AmbassadorCommission"),
        ("accounts", "UserNotification"),
        ("accounts", "BroadcastNotification"),
        ("accounts", "Feedback"),
        ("accounts", "User"),
        ("academics", "Course"),
        ("academics", "Question"),
        ("academics", "QuizAttempt"),
    ]
    for app_label, model_name in target_models:
        Model = get_model_safe(app_label, model_name)
        if not Model or Model not in admin.site._registry:
            continue
        model_admin = admin.site._registry[Model]
        model_fields = {f.name for f in Model._meta.get_fields()}
        filters = list(getattr(model_admin, "list_filter", ()) or ())
        for candidate in (
            "program",
            "target_program",
            "user__program",
            "referred_student__program",
            "course__program",
            "level",
            "semester",
            "status",
            "is_read",
            "is_paid_out",
            "created_at",
        ):
            base_field = candidate.split("__")[0]
            if base_field in model_fields and candidate not in filters:
                filters.append(candidate)
        model_admin.list_filter = tuple(filters)

    original_get_urls = admin.site.get_urls
    original_index = admin.site.index

    def student_activity_tracker_view(request):
        User = get_model_safe("accounts", "User")
        Course = get_model_safe("academics", "Course")
        QuizAttempt = get_model_safe("academics", "QuizAttempt")
        Commission = get_model_safe("accounts", "AmbassadorCommission")
        Feedback = get_model_safe("accounts", "Feedback")

        program_filter = request.GET.get("program", "").strip()
        search_q = request.GET.get("q", "").strip()

        students_qs = User.objects.filter(is_staff=False) if User else []
        if User:
            if program_filter:
                students_qs = students_qs.filter(program=program_filter)
            if search_q:
                students_qs = students_qs.filter(
                    Q(email__icontains=search_q)
                    | Q(full_name__icontains=search_q)
                    | Q(phone_number__icontains=search_q)
                    | Q(institution__icontains=search_q)
                )

        nac_nap_courses = (
            list(
                Course.objects.filter(program__in=["NAC", "NAP"])
                .annotate(q_count=Count("questions"))
                .order_by("program", "level", "semester", "code")
            )
            if Course
            else []
        )

        recent_attempts = []
        if QuizAttempt:
            attempts_qs = QuizAttempt.objects.select_related("user", "course").order_by("-id")
            if program_filter:
                attempts_qs = attempts_qs.filter(
                    Q(user__program=program_filter) | Q(course__program=program_filter)
                )
            for item in attempts_qs[:50]:
                recent_attempts.append({
                    "id": item.pk,
                    "student": getattr(item.user, "full_name", "") or str(item.user),
                    "program": getattr(item.user, "program", "-"),
                    "course": f"{item.course.code} — {item.course.title}" if getattr(item, "course", None) else "-",
                    "score": getattr(item, "score", getattr(item, "percentage", "-")),
                    "created_at": getattr(item, "submitted_at", None) or getattr(item, "created_at", timezone.now()),
                })

        recent_commissions = (
            list(Commission.objects.select_related("ambassador", "referred_student").order_by("-id")[:20])
            if Commission
            else []
        )
        recent_feedback = (
            list(Feedback.objects.select_related("user").order_by("-id")[:20])
            if Feedback
            else []
        )

        context = {
            **admin.site.each_context(request),
            "title": "Student Activity Tracker (All Programs)",
            "program_filter": program_filter,
            "search_q": search_q,
            "student_count": students_qs.count() if User else 0,
            "nac_nap_course_count": len(nac_nap_courses),
            "nac_nap_question_count": sum(c.q_count for c in nac_nap_courses),
            "recent_attempts": recent_attempts,
            "recent_commissions": recent_commissions,
            "recent_feedback": recent_feedback,
        }
        return render(request, "admin/student_activity_tracker.html", context)

    def patched_get_urls():
        custom_urls = [
            path(
                "student-activity/",
                admin.site.admin_view(student_activity_tracker_view),
                name="student_activity_tracker",
            ),
        ]
        return custom_urls + original_get_urls()

    def patched_index(request, extra_context=None):
        extra_context = dict(extra_context or {})
        extra_context["student_activity_url"] = "/admin/student-activity/"
        return original_index(request, extra_context=extra_context)

    admin.site.get_urls = patched_get_urls
    admin.site.index = patched_index
