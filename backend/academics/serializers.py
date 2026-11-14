"""Serializers for the academics app."""

from __future__ import annotations

from rest_framework import serializers

from .models import Choice, Course, Question, QuizAnswer, QuizAttempt


class CourseListSerializer(serializers.ModelSerializer):
    """Compact payload optimized for mobile — no nested content."""

    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    level_display = serializers.CharField(source="get_level_display", read_only=True)
    program_display = serializers.CharField(
        source="get_program_display", read_only=True
    )
    semester_display = serializers.CharField(
        source="get_semester_display", read_only=True
    )
    question_count = serializers.IntegerField(source="_question_count", read_only=True)

    class Meta:
        model = Course
        fields = (
            "id", "code", "title", "category", "category_display",
            "level", "level_display",
            "program", "program_display",
            "semester", "semester_display",
            "question_count",
        )


class ChoicePublicSerializer(serializers.ModelSerializer):
    """Choice shape exposed during a quiz (hides `is_correct`)."""

    class Meta:
        model = Choice
        fields = ("id", "text", "position")


class QuestionPublicSerializer(serializers.ModelSerializer):
    """Question shape shown during a live quiz — hides the answer key."""

    choices = ChoicePublicSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ("id", "text", "choices")


class QuestionResultSerializer(serializers.ModelSerializer):
    """Full question shape shown *after* grading, with rationales."""

    choices = ChoicePublicSerializer(many=True, read_only=True)
    correct_choice_id = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ("id", "text", "rationale", "choices", "correct_choice_id")

    def get_correct_choice_id(self, obj: Question):
        choice = obj.correct_choice
        return choice.id if choice else None


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full course payload including the quiz-ready question set."""

    questions = QuestionPublicSerializer(many=True, read_only=True)
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    level_display = serializers.CharField(source="get_level_display", read_only=True)
    program_display = serializers.CharField(
        source="get_program_display", read_only=True
    )
    semester_display = serializers.CharField(
        source="get_semester_display", read_only=True
    )

    class Meta:
        model = Course
        fields = (
            "id", "code", "title", "description",
            "category", "category_display",
            "level", "level_display",
            "program", "program_display",
            "semester", "semester_display",
            "questions",
        )


class QuizAnswerInputSerializer(serializers.Serializer):
    """One (question, selected_choice) pair in a submission."""

    question_id = serializers.UUIDField()
    choice_id = serializers.UUIDField(required=False, allow_null=True)


class QuizSubmissionSerializer(serializers.Serializer):
    """Validates a student's quiz submission."""

    course_id = serializers.UUIDField()
    answers = QuizAnswerInputSerializer(many=True, allow_empty=False)

    def validate_course_id(self, value):
        request = self.context["request"]
        try:
            course = Course.objects.get(pk=value, is_published=True)
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found or unpublished.")
            
        # Admin bypass: Admins can submit quizzes for any course
        if not request.user.is_superuser:
            if course.level != request.user.level or course.program != request.user.program:
                raise serializers.ValidationError(
                    "This course is not available for your level and program."
                )
        return course

    def validate_answers(self, value):
        question_ids = [a["question_id"] for a in value]
        if len(question_ids) != len(set(question_ids)):
            raise serializers.ValidationError(
                "Each question may only appear once per attempt."
            )
        return value


class QuizAnswerResultSerializer(serializers.ModelSerializer):
    """Per-question outcome shown in the post-quiz review."""

    question = QuestionResultSerializer(read_only=True)
    selected_choice_id = serializers.UUIDField(
        source="selected_choice.id", read_only=True, allow_null=True
    )

    class Meta:
        model = QuizAnswer
        fields = ("question", "selected_choice_id", "is_correct")


class QuizAttemptResultSerializer(serializers.ModelSerializer):
    """The complete graded attempt returned to the frontend."""

    course_id = serializers.UUIDField(source="course.id", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    answers = QuizAnswerResultSerializer(many=True, read_only=True)

    class Meta:
        model = QuizAttempt
        fields = (
            "id", "course_id", "course_code", "course_title",
            "total_questions", "correct_answers",
            "score_percentage", "started_at", "completed_at",
            "answers",
        )