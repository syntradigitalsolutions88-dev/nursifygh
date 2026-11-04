"""
Care Plans (NCP) application models.

Domain map:

    NandaDiagnosis  ← curated catalog of NANDA-I nursing diagnoses
        ↓
    CarePlanTemplate  ← reusable plan skeletons (diagnosis + default goals + interventions)
        ↓ (fork)
    CarePlan  ← a specific student's plan for a specific patient scenario
        ├── SmartGoal  ← structured S-M-A-R-T goals
        ├── Intervention  ← nurse actions with mandatory rationale
        ├── CarePlanShareLink  ← tokenized read-only links for instructors
        └── CarePlanRating  ← peer/supervisor quality signals

Design notes:
- `NandaDiagnosis` is a *catalog* — students pick from it; they do not
  invent diagnoses. This preserves the professional authority of NANDA-I
  and makes the platform defensible to instructors.
- `SmartGoal` enforces structure via five separate fields. A blank field
  fails validation, which prevents the "vague goal" failure mode.
- `Intervention` has `rationale` as a required TextField (not blank=True).
  This is deliberate: every intervention must justify itself.
- `CarePlanShareLink` allows instructors to view a plan via token URL with
  no account. `expires_at` and `revoked` give the student control.
- All UUID primary keys, matching the rest of the codebase.
"""

from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from academics.models import Course


class NandaDomain(models.TextChoices):
    """NANDA-I taxonomy domains (broad clinical areas)."""

    HEALTH_PROMOTION = "HEALTH_PROMOTION", _("Health Promotion")
    NUTRITION = "NUTRITION", _("Nutrition")
    ELIMINATION = "ELIMINATION", _("Elimination and Exchange")
    ACTIVITY_REST = "ACTIVITY_REST", _("Activity and Rest")
    PERCEPTION_COGNITION = "PERCEPTION_COGNITION", _("Perception and Cognition")
    SELF_PERCEPTION = "SELF_PERCEPTION", _("Self-Perception")
    ROLE_RELATIONSHIP = "ROLE_RELATIONSHIP", _("Role Relationship")
    SEXUALITY = "SEXUALITY", _("Sexuality")
    COPING_STRESS = "COPING_STRESS", _("Coping and Stress Tolerance")
    LIFE_PRINCIPLES = "LIFE_PRINCIPLES", _("Life Principles")
    SAFETY_PROTECTION = "SAFETY_PROTECTION", _("Safety and Protection")
    COMFORT = "COMFORT", _("Comfort")
    GROWTH_DEVELOPMENT = "GROWTH_DEVELOPMENT", _("Growth and Development")


class NandaDiagnosis(models.Model):
    """
    A canonical NANDA-I nursing diagnosis.

    `code` is a short identifier (e.g. '00004') matching the NANDA-I book.
    Two diagnoses can share a code across different edition years, so the
    unique constraint is (code, edition_year).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(_("NANDA code"), max_length=10, db_index=True)
    label = models.CharField(
        _("label"),
        max_length=200,
        help_text=_("e.g. 'Risk for Infection'"),
    )
    domain = models.CharField(
        _("domain"),
        max_length=30,
        choices=NandaDomain.choices,
        db_index=True,
    )
    definition = models.TextField(
        _("definition"),
        help_text=_("Official NANDA-I definition of the diagnosis."),
    )
    defining_characteristics = models.TextField(
        _("defining characteristics"),
        blank=True,
        help_text=_("Signs and symptoms — one per line."),
    )
    related_factors = models.TextField(
        _("related factors"),
        blank=True,
        help_text=_("Etiologies — one per line."),
    )
    edition_year = models.PositiveSmallIntegerField(
        _("NANDA edition year"),
        default=2024,
        help_text=_("e.g. 2024 for NANDA-I 2024-2026"),
    )
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("NANDA diagnosis")
        verbose_name_plural = _("NANDA diagnoses")
        ordering = ("domain", "code")
        constraints = [
            models.UniqueConstraint(
                fields=["code", "edition_year"],
                name="uniq_nanda_code_edition",
            ),
        ]
        indexes = [
            models.Index(fields=["domain", "is_active"], name="idx_nanda_domain_active"),
        ]

    def __str__(self) -> str:
        return f"{self.code} — {self.label}"


class CarePlanTemplate(models.Model):
    """
    A reusable care-plan skeleton. Students fork these into personal plans.

    Templates are seeded by the platform team. `course` optionally scopes a
    template to a specific course (e.g. NUR-201 Fundamentals of Nursing II).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(_("title"), max_length=200)
    description = models.TextField(_("description"), blank=True)
    primary_diagnosis = models.ForeignKey(
        NandaDiagnosis,
        on_delete=models.PROTECT,
        related_name="templates",
        db_index=True,
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        related_name="careplan_templates",
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Optional: scope this template to a specific course."),
    )
    default_goals = models.JSONField(
        _("default goals"),
        default=list,
        blank=True,
        help_text=_("List of {specific, measurable, achievable, relevant, time_bound} dicts."),
    )
    default_interventions = models.JSONField(
        _("default interventions"),
        default=list,
        blank=True,
        help_text=_("List of {action, rationale} dicts."),
    )
    is_published = models.BooleanField(_("published"), default=False, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("care plan template")
        verbose_name_plural = _("care plan templates")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["is_published", "-created_at"], name="idx_template_pub_created"),
        ]

    def __str__(self) -> str:
        return self.title


class CarePlan(models.Model):
    """
    A student's personalized care plan for a specific patient scenario.

    `source_template` is provenance — set if the student forked a template,
    left null if built from scratch. Forking does NOT copy goals/interventions
    automatically; the student is expected to edit them. This is deliberate:
    the pedagogical value is in the *editing*, not the fork itself.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_plans",
        db_index=True,
    )
    title = models.CharField(_("title"), max_length=200)
    patient_scenario = models.TextField(
        _("patient scenario"),
        help_text=_("The hypothetical or real patient this plan addresses."),
    )
    primary_diagnosis = models.ForeignKey(
        NandaDiagnosis,
        on_delete=models.PROTECT,
        related_name="care_plans",
        db_index=True,
    )
    source_template = models.ForeignKey(
        CarePlanTemplate,
        on_delete=models.SET_NULL,
        related_name="forked_plans",
        null=True,
        blank=True,
    )

    is_public = models.BooleanField(
        _("public"),
        default=False,
        db_index=True,
        help_text=_("Public plans are visible in the community library."),
    )
    is_submitted = models.BooleanField(
        _("submitted"),
        default=False,
        db_index=True,
        help_text=_("Submitted plans are locked and submitted for grading."),
    )
    submitted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("care plan")
        verbose_name_plural = _("care plans")
        ordering = ("-updated_at",)
        indexes = [
            models.Index(fields=["student", "-updated_at"], name="idx_plan_student_updated"),
            models.Index(fields=["is_public", "-updated_at"], name="idx_plan_public_updated"),
        ]

    def __str__(self) -> str:
        return f"{self.student.email} — {self.title}"

    def mark_submitted(self) -> None:
        """Lock the plan and stamp the submission time."""
        self.is_submitted = True
        self.submitted_at = timezone.now()
        self.save(update_fields=["is_submitted", "submitted_at"])


class SmartGoal(models.Model):
    """
    A structured S-M-A-R-T goal.

    Every field is required — no free-text shortcuts. The frontend should
    present five separate inputs so students internalize the structure.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan,
        on_delete=models.CASCADE,
        related_name="goals",
    )
    specific = models.CharField(
        _("S — specific"),
        max_length=500,
        help_text=_("What exactly will be achieved?"),
    )
    measurable = models.CharField(
        _("M — measurable"),
        max_length=500,
        help_text=_("How will progress be measured?"),
    )
    achievable = models.CharField(
        _("A — achievable"),
        max_length=500,
        help_text=_("Is this achievable given the patient's condition?"),
    )
    relevant = models.CharField(
        _("R — relevant"),
        max_length=500,
        help_text=_("Why does this goal matter for this patient?"),
    )
    time_bound = models.CharField(
        _("T — time-bound"),
        max_length=200,
        help_text=_("By when? e.g. 'Within 24 hours of admission'."),
    )
    position = models.PositiveSmallIntegerField(_("display order"), default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("SMART goal")
        verbose_name_plural = _("SMART goals")
        ordering = ("care_plan", "position")
        constraints = [
            models.UniqueConstraint(
                fields=["care_plan", "position"],
                name="uniq_goal_position_per_plan",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.specific[:60]}…"


class Intervention(models.Model):
    """
    A nursing action with an enforced rationale.

    `rationale` is a required TextField (no blank=True). Every intervention
    must justify itself. This is the single most important pedagogical
    constraint in the NCP domain.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan,
        on_delete=models.CASCADE,
        related_name="interventions",
    )
    action = models.TextField(_("nursing action"))
    rationale = models.TextField(_("scientific rationale"))
    position = models.PositiveSmallIntegerField(_("display order"), default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("intervention")
        verbose_name_plural = _("interventions")
        ordering = ("care_plan", "position")
        constraints = [
            models.UniqueConstraint(
                fields=["care_plan", "position"],
                name="uniq_intervention_position_per_plan",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action[:60]}…"


class CarePlanShareLink(models.Model):
    """
    A tokenized, expirable, read-only link to a care plan.

    Intended for sharing with clinical instructors who do not have a
    NursifyGH account. The token is generated at creation and URL-safe.
    Revocation is soft (revoked=True) so audit trails are preserved.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan,
        on_delete=models.CASCADE,
        related_name="share_links",
    )
    token = models.CharField(
        _("token"),
        max_length=64,
        unique=True,
        db_index=True,
        editable=False,
    )
    expires_at = models.DateTimeField(_("expires at"))
    revoked = models.BooleanField(_("revoked"), default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("care plan share link")
        verbose_name_plural = _("care plan share links")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["token", "revoked"], name="idx_share_token_revoked"),
        ]

    def __str__(self) -> str:
        return f"Share → {self.care_plan.title}"

    def save(self, *args, **kwargs) -> None:
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def is_valid(self) -> bool:
        """True if the link is neither revoked nor expired."""
        return not self.revoked and self.expires_at > timezone.now()


class CarePlanRating(models.Model):
    """
    A quality rating from a peer or a clinical instructor.

    Ratings are unique per (care_plan, rater) — a rater can only rate once.
    Re-rating updates the row (see `updated_at`).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_plan_ratings",
    )
    score = models.PositiveSmallIntegerField(
        _("score"),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text=_("1 = poor, 5 = excellent"),
    )
    comment = models.TextField(_("comment"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("care plan rating")
        verbose_name_plural = _("care plan ratings")
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["care_plan", "rater"],
                name="uniq_rating_per_plan_rater",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.score}/5 — {self.care_plan.title}"