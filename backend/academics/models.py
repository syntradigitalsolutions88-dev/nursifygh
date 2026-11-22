"""
Academics application models.

Course -> Question -> Choice
                    -> QuizAttempt -> QuizAnswer
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from accounts.models import StudentLevel


class CourseCategory(models.TextChoices):
    FUNDAMENTALS = "FUNDAMENTALS", _("Fundamentals of Nursing")
    ANATOMY = "ANATOMY", _("Anatomy & Physiology")
    PHARMACOLOGY = "PHARMACOLOGY", _("Pharmacology")
    MEDICAL_SURGICAL = "MED_SURG", _("Medical-Surgical Nursing")
    MATERNAL_CHILD = "MATERNAL", _("Maternal & Child Health")
    COMMUNITY = "COMMUNITY", _("Community Health Nursing")
    MENTAL_HEALTH = "MENTAL", _("Mental Health Nursing")
    MIDWIFERY = "MIDWIFERY", _("Midwifery")
    RESEARCH = "RESEARCH", _("Nursing Research & Statistics")
    ETHICS = "ETHICS", _("Professional Ethics & Law")


class Semester(models.TextChoices):
    FIRST = "S1", _("First Semester")
    SECOND = "S2", _("Second Semester")


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(_("course code"), max_length=20)
    title = models.CharField(_("title"), max_length=200)
    description = models.TextField(_("description"), blank=True)

    category = models.CharField(_("category"), max_length=20, choices=CourseCategory.choices, db_index=True)
    level = models.PositiveSmallIntegerField(_("level"), choices=StudentLevel.choices, db_index=True)
    program = models.CharField(
        _("program"),
        max_length=20,
        choices=[
            ("GENERAL", "General (all students)"),
            ("MIDWIFERY", "Midwifery"),
            ("PSYCHIATRIC", "Psychiatric"),
            ("COMMUNITY", "Community Health"),
        ],
        default="GENERAL",
        db_index=True,
    )
    semester = models.CharField(_("semester"), max_length=2, choices=Semester.choices, db_index=True)

    is_published = models.BooleanField(_("published"), default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("course")
        verbose_name_plural = _("courses")
        ordering = ("level", "semester", "code")
        indexes = [
            models.Index(fields=["level", "is_published"], name="idx_course_level_pub"),
            models.Index(fields=["category", "level"], name="idx_course_cat_level"),
            models.Index(fields=["program", "level", "is_published"], name="idx_course_program_level"),
        ]
        constraints = [
            models.UniqueConstraint(fields=["code", "level"], name="uniq_course_code_level"),
        ]

    def __str__(self) -> str:
        return f"{self.code} — {self.title} (L{self.level})"

    @property
    def question_count(self) -> int:
        return self.questions.filter(review_status="APPROVED", is_published=True).count()


class Question(models.Model):
    """A single MCQ belonging to a course."""

    REVIEW_STATUS_CHOICES = [
        ("PENDING", "Pending review"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="questions", db_index=True)
    text = models.TextField(_("question text"))
    rationale = models.TextField(_("general rationale"), blank=True)
    is_published = models.BooleanField(default=True, db_index=True)

    # ── Review workflow ────────────────────────────────────────────
    review_status = models.CharField(
        max_length=20,
        choices=REVIEW_STATUS_CHOICES,
        default="APPROVED",
        db_index=True,
    )
    uploaded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_questions",
    )
    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_questions",
    )
    review_note = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("question")
        verbose_name_plural = _("questions")
        ordering = ("course", "created_at")
        indexes = [
            models.Index(fields=["course", "is_published"], name="idx_question_course_pub"),
            models.Index(fields=["review_status"], name="idx_question_review_status"),
        ]

    def __str__(self) -> str:
        preview = self.text[:60].replace("\n", " ")
        return f"[{self.course.code}] {preview}"

    @property
    def correct_choice(self) -> "Choice | None":
        return self.choices.filter(is_correct=True).first()


class Choice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices", db_index=True)
    text = models.CharField(_("choice text"), max_length=500)
    is_correct = models.BooleanField(_("is correct"), default=False, db_index=True)
    rationale = models.TextField(_("choice rationale"), blank=True)
    position = models.PositiveSmallIntegerField(_("display position"), default=0)

    class Meta:
        verbose_name = _("choice")
        verbose_name_plural = _("choices")
        ordering = ("question", "position")
        indexes = [models.Index(fields=["question", "is_correct"], name="idx_choice_q_correct")]
        constraints = [
            models.UniqueConstraint(fields=["question", "position"], name="uniq_choice_position_per_question"),
        ]

    def __str__(self) -> str:
        marker = "✓" if self.is_correct else "✗"
        return f"{marker} {self.text[:40]}"


class QuizAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="quiz_attempts", db_index=True)
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="quiz_attempts", db_index=True)

    total_questions = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    score_percentage = models.DecimalField(
        _("score %"), max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("quiz attempt")
        verbose_name_plural = _("quiz attempts")
        ordering = ("-started_at",)
        indexes = [
            models.Index(fields=["student", "-started_at"], name="idx_attempt_student_time"),
            models.Index(fields=["course", "-started_at"], name="idx_attempt_course_time"),
        ]

    def __str__(self) -> str:
        return f"{self.student.email} • {self.course.code} • {self.score_percentage}%"


class QuizAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="answers")
    selected_choice = models.ForeignKey(Choice, on_delete=models.PROTECT, related_name="answers", null=True, blank=True)
    is_correct = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("quiz answer")
        verbose_name_plural = _("quiz answers")
        ordering = ("attempt", "question")
        constraints = [
            models.UniqueConstraint(fields=["attempt", "question"], name="uniq_answer_per_attempt_question"),
        ]
        indexes = [models.Index(fields=["attempt", "is_correct"], name="idx_answer_attempt_correct")]

    def __str__(self) -> str:
        status_marker = "✓" if self.is_correct else "✗"
        return f"Attempt {self.attempt_id} • Q{self.question_id} • {status_marker}"


class Flashcard(models.Model):
    """Revision flashcard linked to a N&MC course (and optionally a source quiz question)."""

    DIFFICULTY_CHOICES = [
        ("BEGINNER", "Beginner"),
        ("INTERMEDIATE", "Intermediate"),
        ("ADVANCED", "Advanced"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="flashcards",
        db_index=True,
    )
    source_question = models.ForeignKey(
        Question,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="derived_flashcards",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_flashcards",
    )
    topic = models.CharField(_("topic"), max_length=120, blank=True, default="", db_index=True)
    front = models.TextField(_("front / prompt"))
    back = models.TextField(_("back / answer"))
    rationale = models.TextField(_("clinical rationale"), blank=True, default="")
    difficulty = models.CharField(
        max_length=16,
        choices=DIFFICULTY_CHOICES,
        default="INTERMEDIATE",
        db_index=True,
    )
    is_public = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("flashcard")
        verbose_name_plural = _("flashcards")
        ordering = ("course", "topic", "created_at")
        indexes = [
            models.Index(fields=["course", "is_public"], name="idx_card_course_pub"),
            models.Index(fields=["created_by", "course"], name="idx_card_creator_course"),
        ]

    def __str__(self) -> str:
        return f"[{self.course.code}] {self.front[:55]}"


class FlashcardReview(models.Model):
    """Per-student spaced repetition state (SM-2) and bookmark for a flashcard."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="flashcard_reviews",
        db_index=True,
    )
    flashcard = models.ForeignKey(
        Flashcard,
        on_delete=models.CASCADE,
        related_name="reviews",
        db_index=True,
    )
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.PositiveIntegerField(default=0)
    repetitions = models.PositiveIntegerField(default=0)
    lapses = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    review_count = models.PositiveIntegerField(default=0)
    is_bookmarked = models.BooleanField(default=False, db_index=True)
    next_review_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("flashcard review")
        verbose_name_plural = _("flashcard reviews")
        ordering = ("next_review_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["student", "flashcard"],
                name="uniq_flashcard_review_student_card",
            ),
        ]
        indexes = [
            models.Index(fields=["student", "next_review_at"], name="idx_rev_student_due"),
            models.Index(fields=["student", "is_bookmarked"], name="idx_rev_student_bmark"),
        ]

    def apply_rating(self, rating: str) -> None:
        """
        rating: 'again' | 'hard' | 'good' | 'easy'
        Uses SM-2 with a 1.30 ease-factor floor to avoid 'ease hell'.
        """
        now = timezone.now()
        self.review_count += 1
        self.last_reviewed_at = now

        if rating == "again":
            self.repetitions = 0
            self.lapses += 1
            self.interval_days = 0
            self.ease_factor = max(1.3, round(self.ease_factor - 0.2, 2))
            self.next_review_at = now + timezone.timedelta(hours=4)
        elif rating == "hard":
            self.correct_count += 1
            self.ease_factor = max(1.3, round(self.ease_factor - 0.15, 2))
            if self.repetitions == 0:
                self.interval_days = 1
            else:
                self.interval_days = max(1, round(self.interval_days * 1.2))
            self.repetitions += 1
            self.next_review_at = now + timezone.timedelta(days=self.interval_days)
        elif rating == "easy":
            self.correct_count += 1
            self.ease_factor = max(1.3, round(self.ease_factor + 0.15, 2))
            if self.repetitions == 0:
                self.interval_days = 4
            elif self.repetitions == 1:
                self.interval_days = 7
            else:
                self.interval_days = max(4, round(self.interval_days * self.ease_factor * 1.3))
            self.repetitions += 1
            self.next_review_at = now + timezone.timedelta(days=self.interval_days)
        else:  # 'good'
            self.correct_count += 1
            if self.repetitions == 0:
                self.interval_days = 1
            elif self.repetitions == 1:
                self.interval_days = 3
            else:
                self.interval_days = max(3, round(self.interval_days * self.ease_factor))
            self.repetitions += 1
            self.next_review_at = now + timezone.timedelta(days=self.interval_days)


class ClinicalCase(models.Model):
    """Progressive clinical case study rooted in Ghanaian nursing & midwifery scenarios."""

    DIFFICULTY_CHOICES = [
        ("BEGINNER", "Beginner"),
        ("INTERMEDIATE", "Intermediate"),
        ("ADVANCED", "Advanced"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinical_cases",
    )
    title = models.CharField(_("title"), max_length=200)
    condition_tag = models.CharField(_("condition / focus"), max_length=120, db_index=True)
    setting = models.CharField(
        _("clinical setting"),
        max_length=140,
        default="District Hospital Ward / OPD, Ghana",
    )
    difficulty = models.CharField(
        max_length=16,
        choices=DIFFICULTY_CHOICES,
        default="INTERMEDIATE",
        db_index=True,
    )
    patient_summary = models.TextField(_("presenting scenario"))
    learning_objectives = models.TextField(_("learning objectives"), blank=True, default="")
    is_published = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("clinical case")
        verbose_name_plural = _("clinical cases")
        ordering = ("difficulty", "title")

    def __str__(self) -> str:
        return f"{self.title} ({self.get_difficulty_display()})"


class CaseStage(models.Model):
    """A progressive stage inside a clinical case with vitals, question, and rationale."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        ClinicalCase,
        on_delete=models.CASCADE,
        related_name="stages",
        db_index=True,
    )
    step_number = models.PositiveSmallIntegerField(default=1)
    title = models.CharField(max_length=160)
    vitals_summary = models.CharField(max_length=240, blank=True, default="")
    clinical_update = models.TextField()
    question_prompt = models.TextField()
    options = models.JSONField(default=list)
    rationale = models.TextField()
    nursing_takeaway = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = _("case stage")
        verbose_name_plural = _("case stages")
        ordering = ("case", "step_number")
        constraints = [
            models.UniqueConstraint(
                fields=["case", "step_number"],
                name="uniq_case_stage_step_number",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.case.title} — Stage {self.step_number}: {self.title}"


class CaseAttempt(models.Model):
    """Student attempt and progress tracker for a clinical case."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="case_attempts",
        db_index=True,
    )
    case = models.ForeignKey(
        ClinicalCase,
        on_delete=models.CASCADE,
        related_name="attempts",
        db_index=True,
    )
    current_step = models.PositiveSmallIntegerField(default=1)
    correct_steps = models.PositiveSmallIntegerField(default=0)
    total_steps = models.PositiveSmallIntegerField(default=0)
    answers_map = models.JSONField(default=dict)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("case attempt")
        verbose_name_plural = _("case attempts")
        ordering = ("-updated_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["student", "case"],
                name="uniq_case_attempt_student_case",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student.email} • {self.case.title} • {self.correct_steps}/{self.total_steps}"
