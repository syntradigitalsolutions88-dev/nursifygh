"""Admin configuration for the academics app."""

from django.contrib import admin

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

    @admin.display(description="Questions")
    def question_count_display(self, obj: Course) -> int:
        return obj.questions.count()


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("__str__", "course", "is_published", "created_at")
    list_filter = ("course", "is_published")
    search_fields = ("text", "rationale")
    inlines = [ChoiceInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "student", "course", "correct_answers",
        "total_questions", "score_percentage", "completed_at",
    )
    list_filter = ("course", "completed_at")
    search_fields = ("student__email", "course__code")
    readonly_fields = ("id", "started_at", "completed_at")


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    list_display = ("attempt", "question", "selected_choice", "is_correct")
    list_filter = ("is_correct",)