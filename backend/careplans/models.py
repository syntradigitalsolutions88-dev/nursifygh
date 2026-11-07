"""
Care Plans (NCP) application models.

Domain map:

    NandaDiagnosis  ← curated catalog of NANDA-I nursing diagnoses
        ↓
    CarePlanTemplate  ← reusable plan skeletons
        ↓ (fork)
    CarePlan  ← a specific student's plan for a specific patient scenario
        ├── SmartGoal  ← structured S-M-A-R-T goals
        ├── Intervention  ← nurse actions with mandatory rationale
        ├── CarePlanShareLink  ← tokenized read-only links
        └── CarePlanRating  ← peer/supervisor quality signals
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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(_("NANDA code"), max_length=10, db_index=True)
    label = models.CharField(_("label"), max_length=200)
    domain = models.CharField(
        _("domain"), max_length=30, choices=NandaDomain.choices, db_index=True,
    )
    definition = models.TextField(_("definition"))
    defining_characteristics = models.TextField(_("defining characteristics"), blank=True)
    related_factors = models.TextField(_("related factors"), blank=True)
    edition_year = models.PositiveSmallIntegerField(_("NANDA edition year"), default=2024)
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("NANDA diagnosis")
        verbose_name_plural = _("NANDA diagnoses")
        ordering = ("domain", "code")
        constraints = [
            models.UniqueConstraint(
                fields=["code", "edition_year"], name="uniq_nanda_code_edition",
            ),
        ]
        indexes = [
            models.Index(fields=["domain", "is_active"], name="idx_nanda_domain_active"),
        ]

    def __str__(self) -> str:
        return f"{self.code} — {self.label}"


class CarePlanTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(_("title"), max_length=200)
    description = models.TextField(_("description"), blank=True)
    primary_diagnosis = models.ForeignKey(
        NandaDiagnosis, on_delete=models.PROTECT,
        related_name="templates", db_index=True,
    )
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL,
        related_name="careplan_templates",
        null=True, blank=True, db_index=True,
    )
    default_goals = models.JSONField(_("default goals"), default=list, blank=True)
    default_interventions = models.JSONField(_("default interventions"), default=list, blank=True)
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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="care_plans", db_index=True,
    )
    title = models.CharField(_("title"), max_length=200)
    patient_scenario = models.TextField(_("patient scenario"))
    primary_diagnosis = models.ForeignKey(
        NandaDiagnosis, on_delete=models.PROTECT,
        related_name="care_plans", db_index=True,
    )
    source_template = models.ForeignKey(
        CarePlanTemplate, on_delete=models.SET_NULL,
        related_name="forked_plans", null=True, blank=True,
    )

    is_public = models.BooleanField(_("public"), default=False, db_index=True)
    is_submitted = models.BooleanField(_("submitted"), default=False, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    # Popularity / usage tracking
    view_count = models.PositiveIntegerField(_("view count"), default=0)

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
        self.is_submitted = True
        self.submitted_at = timezone.now()
        self.save(update_fields=["is_submitted", "submitted_at"])


class SmartGoal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan, on_delete=models.CASCADE, related_name="goals",
    )
    specific = models.CharField(_("S — specific"), max_length=500)
    measurable = models.CharField(_("M — measurable"), max_length=500)
    achievable = models.CharField(_("A — achievable"), max_length=500)
    relevant = models.CharField(_("R — relevant"), max_length=500)
    time_bound = models.CharField(_("T — time-bound"), max_length=200)
    position = models.PositiveSmallIntegerField(_("display order"), default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("SMART goal")
        verbose_name_plural = _("SMART goals")
        ordering = ("care_plan", "position")
        constraints = [
            models.UniqueConstraint(
                fields=["care_plan", "position"], name="uniq_goal_position_per_plan",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.specific[:60]}…"


class Intervention(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan, on_delete=models.CASCADE, related_name="interventions",
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
                fields=["care_plan", "position"], name="uniq_intervention_position_per_plan",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action[:60]}…"


class CarePlanShareLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan, on_delete=models.CASCADE, related_name="share_links",
    )
    token = models.CharField(_("token"), max_length=64, unique=True, db_index=True, editable=False)
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
        return not self.revoked and self.expires_at > timezone.now()


class CarePlanRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan, on_delete=models.CASCADE, related_name="ratings",
    )
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="care_plan_ratings",
    )
    score = models.PositiveSmallIntegerField(
        _("score"), validators=[MinValueValidator(1), MaxValueValidator(5)],
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
                fields=["care_plan", "rater"], name="uniq_rating_per_plan_rater",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.score}/5 — {self.care_plan.title}"