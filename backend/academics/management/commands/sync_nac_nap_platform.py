from pathlib import Path
from django.apps import apps
from django.contrib import admin
from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.shortcuts import render
from django.urls import path
from django.utils import timezone


def get_model_safe(app_label, model_name):
    try:
        return apps.get_model(app_label, model_name)
    except LookupError:
        return None


class Command(BaseCommand):
    help = "Sync NAC/NAP awareness into AI prompts/configs, Django Admin (commissions, payouts, notifications, feedback), and add a Student Activity Tracker in Admin."

    def handle(self, *args, **options):
        Course = get_model_safe("academics", "Course")
        Question = get_model_safe("academics", "Question")

        nac_nap_courses = []
        if Course:
            nac_nap_courses = list(
                Course.objects.filter(program__in=["NAC", "NAP"])
                .annotate(q_count=Count("questions"))
                .order_by("program", "level", "semester", "code")
            )

        summary_lines = [
            f"{c.program} L{c.level} {c.semester} {c.code} ({c.title}): {c.q_count} questions"
            for c in nac_nap_courses
        ]
        ai_context_block = (
            "Supported Ghanaian N&MC programs include RGN, RPN, RM, NAC (Nurse Assistant Clinical), "
            "and NAP (Nurse Assistant Preventive) across Level 100 and Level 200 (Semesters 1 & 2). "
            "Provide scenario-based explanations tailored to the student's exact program, level, semester, and course:\n"
            + "\n".join(summary_lines[:60])
        )

        # 1. Update any AI / prompt / tutor configuration models if present
        ai_updated = 0
        for app_label, model_name in [
            ("ai", "AISystemPrompt"),
            ("ai", "AITutorConfig"),
            ("ai", "PromptTemplate"),
            ("academics", "AISettings"),
            ("core", "SystemSetting"),
        ]:
            Model = get_model_safe(app_label, model_name)
            if not Model:
                continue
            fields = {f.name for f in Model._meta.get_fields()}
            for obj in Model.objects.all():
                changed = False
                for fname in ("system_prompt", "prompt_text", "instructions", "description", "value"):
                    if fname in fields:
                        current = getattr(obj, fname) or ""
                        if "NAC-111" not in current and "NAP-111" not in current:
                            setattr(obj, fname, (current + "\n\n" + ai_context_block).strip())
                            changed = True
                if changed:
                    obj.save()
                    ai_updated += 1

        # 2. Ensure admin list_filter / search_fields include program/course/status on key models
        target_admin_models = [
            ("commissions", "Commission"),
            ("commissions", "Payout"),
            ("payouts", "Payout"),
            ("notifications", "Notification"),
            ("feedback", "Feedback"),
            ("academics", "Course"),
            ("academics", "Question"),
        ]
        admin_enhanced = 0
        for app_label, model_name in target_admin_models:
            Model = get_model_safe(app_label, model_name)
            if not Model or Model not in admin.site._registry:
                continue
            model_admin = admin.site._registry[Model]
            model_fields = {f.name for f in Model._meta.get_fields()}

            filters = list(getattr(model_admin, "list_filter", ()) or ())
            for candidate in ("program", "course__program", "level", "semester", "status", "is_read", "created_at"):
                if candidate in model_fields or (
                    "__" in candidate and candidate.split("__")[0] in model_fields
                ):
                    if candidate not in filters:
                        filters.append(candidate)
            model_admin.list_filter = tuple(filters)
            admin_enhanced += 1

        # 3. Install Student Activity Tracker view on default AdminSite
        User = get_model_safe("auth", "User") or get_model_safe("users", "User") or get_model_safe("accounts", "User")
        Attempt = (
            get_model_safe("academics", "QuizAttempt")
            or get_model_safe("quizzes", "QuizAttempt")
            or get_model_safe("academics", "QuestionAttempt")
            or get_model_safe("practice", "Attempt")
        )
        Subscription = (
            get_model_safe("subscriptions", "Subscription")
            or get_model_safe("billing", "Subscription")
            or get_model_safe("users", "Subscription")
        )
        Commission = get_model_safe("commissions", "Commission")
        Feedback = get_model_safe("feedback", "Feedback")

        original_get_urls = admin.site.get_urls
        original_index = admin.site.index

        def student_activity_tracker_view(request):
            program_filter = request.GET.get("program", "").strip()
            search_q = request.GET.get("q", "").strip()

            students_qs = User.objects.filter(is_staff=False) if User else []
            if User and search_q:
                q_obj = Q()
                for field_name in ("username", "email", "first_name", "last_name", "phone", "phone_number"):
                    if field_name in {f.name for f in User._meta.get_fields()}:
                        q_obj |= Q(**{f"{field_name}__icontains": search_q})
                if q_obj:
                    students_qs = students_qs.filter(q_obj)

            recent_attempts = []
            if Attempt:
                qs = Attempt.objects.order_by("-id")[:50]
                if program_filter:
                    try:
                        qs = Attempt.objects.filter(
                            Q(course__program=program_filter) | Q(question__course__program=program_filter)
                        ).order_by("-id")[:50]
                    except Exception:
                        pass
                for item in qs:
                    recent_attempts.append({
                        "id": item.pk,
                        "student": str(getattr(item, "user", None) or getattr(item, "student", None) or "Student"),
                        "course": str(getattr(item, "course", None) or getattr(getattr(item, "question", None), "course", "") or "-"),
                        "score": getattr(item, "score", None) or getattr(item, "is_correct", ""),
                        "created_at": getattr(item, "created_at", None) or getattr(item, "submitted_at", None) or timezone.now(),
                    })

            recent_feedback = list(Feedback.objects.order_by("-id")[:20]) if Feedback else []
            recent_commissions = list(Commission.objects.order_by("-id")[:20]) if Commission else []

            context = {
                **admin.site.each_context(request),
                "title": "Student Activity Tracker (NAC / NAP & All Programs)",
                "program_filter": program_filter,
                "search_q": search_q,
                "student_count": students_qs.count() if User else 0,
                "nac_nap_course_count": len(nac_nap_courses),
                "nac_nap_question_count": sum(c.q_count for c in nac_nap_courses),
                "recent_attempts": recent_attempts,
                "recent_feedback": recent_feedback,
                "recent_commissions": recent_commissions,
                "has_subscriptions": bool(Subscription),
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
            extra_context["nac_nap_course_count"] = len(nac_nap_courses)
            extra_context["nac_nap_question_count"] = sum(c.q_count for c in nac_nap_courses)
            return original_index(request, extra_context=extra_context)

        admin.site.get_urls = patched_get_urls
        admin.site.index = patched_index

        template_dir = Path("backend/templates/admin")
        template_dir.mkdir(parents=True, exist_ok=True)
        (template_dir / "student_activity_tracker.html").write_text(
            """{% extends "admin/base_site.html" %}
{% block content %}
<div style="padding: 12px 0;">
  <h1>Student Activity Tracker</h1>
  <p>
    <strong>NAC &amp; NAP Courses:</strong> {{ nac_nap_course_count }} |
    <strong>NAC &amp; NAP Questions:</strong> {{ nac_nap_question_count }} |
    <strong>Tracked Students:</strong> {{ student_count }}
  </p>

  <form method="get" style="margin-bottom: 18px; display: flex; gap: 8px; flex-wrap: wrap;">
    <input type="text" name="q" value="{{ search_q }}" placeholder="Search student name, email, phone..." />
    <select name="program">
      <option value="">All Programs</option>
      <option value="NAC" {% if program_filter == "NAC" %}selected{% endif %}>NAC</option>
      <option value="NAP" {% if program_filter == "NAP" %}selected{% endif %}>NAP</option>
      <option value="RGN" {% if program_filter == "RGN" %}selected{% endif %}>RGN</option>
      <option value="RPN" {% if program_filter == "RPN" %}selected{% endif %}>RPN</option>
    </select>
    <button type="submit" class="button">Filter Activity</button>
    <a href="/admin/" class="button">Back to Admin</a>
  </form>

  <h2>Recent Quiz &amp; Practice Activity</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr>
        <th style="text-align:left; border-bottom:1px solid #ccc; padding:6px;">Student</th>
        <th style="text-align:left; border-bottom:1px solid #ccc; padding:6px;">Course</th>
        <th style="text-align:left; border-bottom:1px solid #ccc; padding:6px;">Score / Result</th>
        <th style="text-align:left; border-bottom:1px solid #ccc; padding:6px;">Timestamp</th>
      </tr>
    </thead>
    <tbody>
      {% for row in recent_attempts %}
      <tr>
        <td style="padding:6px; border-bottom:1px solid #eee;">{{ row.student }}</td>
        <td style="padding:6px; border-bottom:1px solid #eee;">{{ row.course }}</td>
        <td style="padding:6px; border-bottom:1px solid #eee;">{{ row.score }}</td>
        <td style="padding:6px; border-bottom:1px solid #eee;">{{ row.created_at }}</td>
      </tr>
      {% empty %}
      <tr><td colspan="4" style="padding:8px;">No recent quiz/practice attempts recorded yet.</td></tr>
      {% endfor %}
    </tbody>
  </table>

  <h2>Recent Commissions &amp; Feedback</h2>
  <p>
    <strong>Recent Commissions:</strong> {{ recent_commissions|length }} shown |
    <strong>Recent Feedback Items:</strong> {{ recent_feedback|length }} shown
  </p>
</div>
{% endblock %}
""",
            encoding="utf-8",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Synced NAC/NAP context ({len(nac_nap_courses)} courses, "
                f"{sum(c.q_count for c in nac_nap_courses)} questions), "
                f"updated {ai_updated} AI prompt/config records, enhanced {admin_enhanced} admin sections, "
                f"and registered /admin/student-activity/."
            )
        )
