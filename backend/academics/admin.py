"""Admin configuration for the academics app."""

from django.contrib import admin, messages
from django.utils import timezone

from .models import Choice, Course, Question, QuizAnswer, QuizAttempt


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4
    fields = ("text", "is_correct", "position", "rationale")
    ordering = ("position",)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "code", "title", "category", "level", "semester",
        "is_published", "question_count_display",
    )
    list_filter = ("level", "semester", "category", "is_published")
    search_fields = ("code", "title", "description")
    ordering = ("level", "semester", "code")

    @admin.display(description="Approved questions")
    def question_count_display(self, obj: Course) -> int:
        return obj.questions.filter(review_status="APPROVED", is_published=True).count()


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "id", "short_text", "course", "review_status",
        "uploaded_by", "reviewed_by", "created_at",
    )
    list_filter = ("review_status", "course__level", "course__program")
    search_fields = ("text", "rationale", "course__code", "course__title")
    readonly_fields = ("id", "created_at", "updated_at", "reviewed_by", "reviewed_at")
    inlines = [ChoiceInline]
    actions = ["approve_questions", "reject_questions"]

    @admin.display(description="Question")
    def short_text(self, obj):
        return obj.text[:80]

    @admin.action(description="✅ Approve selected questions")
    def approve_questions(self, request, queryset):
        count = queryset.update(
            review_status="APPROVED",
            is_published=True,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            review_note="",
        )
        self.message_user(request, f"✅ Approved {count} question(s).", messages.SUCCESS)

    @admin.action(description="❌ Reject selected questions")
    def reject_questions(self, request, queryset):
        count = queryset.update(
            review_status="REJECTED",
            is_published=False,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"❌ Rejected {count} question(s).", messages.WARNING)


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "correct_answers", "total_questions", "score_percentage", "completed_at")
    list_filter = ("course", "completed_at")
    search_fields = ("student__email", "course__code")
    readonly_fields = ("id", "started_at", "completed_at")


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    list_display = ("attempt", "question", "selected_choice", "is_correct")
    list_filter = ("is_correct",)