"""
Accounts application models.
"""

from __future__ import annotations

import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class StudentLevel(models.IntegerChoices):
    LEVEL_100 = 100, _("Level 100")
    LEVEL_200 = 200, _("Level 200")
    LEVEL_300 = 300, _("Level 300")


class NursingProgram(models.TextChoices):
    GENERAL = "GENERAL", _("General Nursing (RGN)")
    MIDWIFERY = "MIDWIFERY", _("Midwifery (RM)")
    PSYCHIATRIC = "PSYCHIATRIC", _("Psychiatric Nursing (RPN)")
    COMMUNITY = "COMMUNITY", _("Community Health Nursing (CHN)")


GHANA_PHONE_REGEX = RegexValidator(
    regex=r"^(?:\+233|233|0)\d{9}$",
    message=_("Enter a valid Ghanaian phone number (e.g. 0244123456)."),
)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(
        _("email address"), unique=True, db_index=True,
        error_messages={"unique": _("A user with this email already exists.")},
    )
    full_name = models.CharField(_("full name"), max_length=150)
    phone_number = models.CharField(
        _("phone number"), max_length=15,
        validators=[GHANA_PHONE_REGEX], blank=True, db_index=True,
    )
    level = models.PositiveSmallIntegerField(
        _("academic level"), choices=StudentLevel.choices,
        default=StudentLevel.LEVEL_100, db_index=True,
    )
    program = models.CharField(
        _("nursing program"), max_length=20,
        choices=NursingProgram.choices, default=NursingProgram.GENERAL, db_index=True,
    )
    institution = models.CharField(_("institution"), max_length=200, blank=True)

    has_seen_tour = models.BooleanField(_("has seen onboarding tour"), default=False)

    is_subscribed = models.BooleanField(_("is subscribed"), default=False, db_index=True)
    subscription_expires_at = models.DateTimeField(_("subscription expires at"), null=True, blank=True)
    last_payment_reference = models.CharField(_("last payment reference"), max_length=100, blank=True)

    is_active = models.BooleanField(_("active"), default=True)
    is_staff = models.BooleanField(_("staff status"), default=False)
    date_joined = models.DateTimeField(_("date joined"), default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ("-date_joined",)
        indexes = [
            models.Index(fields=["level", "is_active"], name="idx_user_level_active"),
            models.Index(fields=["is_subscribed", "subscription_expires_at"], name="idx_user_sub_expiry"),
            models.Index(fields=["program", "level"], name="idx_user_program_level"),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}> (L{self.level})"

    def activate_subscription(self, *, days: int = 120, reference: str = "") -> None:
        now = timezone.now()
        base = (
            self.subscription_expires_at
            if self.subscription_expires_at and self.subscription_expires_at > now
            else now
        )
        self.subscription_expires_at = base + timedelta(days=days)
        self.is_subscribed = True
        if reference:
            self.last_payment_reference = reference
        self.save(update_fields=[
            "is_subscribed", "subscription_expires_at", "last_payment_reference",
        ])

    def deactivate_expired_subscription(self) -> bool:
        if (
            self.is_subscribed
            and self.subscription_expires_at
            and self.subscription_expires_at <= timezone.now()
        ):
            self.is_subscribed = False
            self.save(update_fields=["is_subscribed"])
            return True
        return False

    @property
    def has_active_subscription(self) -> bool:
        if not self.is_subscribed:
            return False
        if self.subscription_expires_at is None:
            return True
        return self.subscription_expires_at > timezone.now()


class ClinicalSkill(models.Model):
    """Tracks a student's completed clinical procedures."""
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="clinical_skills")
    procedure_name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, default="Core Procedures")
    completed_count = models.PositiveIntegerField(default=0)
    required_count = models.PositiveIntegerField(default=5)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "procedure_name")
        ordering = ("category", "procedure_name")

    def __str__(self):
        return f"{self.student.full_name} - {self.procedure_name} ({self.completed_count}/{self.required_count})"


class ClinicalLog(models.Model):
    """A detailed log entry for a completed clinical procedure."""
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="clinical_logs")
    skill = models.ForeignKey(ClinicalSkill, on_delete=models.CASCADE, related_name="logs")
    date_performed = models.DateField(default=timezone.localdate)
    hospital = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    supervisor_name = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date_performed", "-created_at")

    def __str__(self):
        return f"{self.student.full_name} - {self.skill.procedure_name} on {self.date_performed}"