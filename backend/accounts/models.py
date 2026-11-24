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

# FIX: Commission amount in one place. If the Semester Pass price changes,
# adjust this constant (or pull from settings.SEMESTER_PASS_COMMISSION_AMOUNT).
COMMISSION_AMOUNT_GHS = "4.50"


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

    exam_date = models.DateField(
        _("target exam date"),
        null=True,
        blank=True,
        help_text=_("Student's target NMC licensing exam date."),
    )

    has_seen_tour = models.BooleanField(_("has seen onboarding tour"), default=False)

    is_subscribed = models.BooleanField(_("is subscribed"), default=False, db_index=True)
    has_paid = models.BooleanField(
        _("has paid"),
        default=False,
        db_index=True,
        help_text=_("True if the student has paid for a Semester Pass (admin approved)."),
    )
    subscription_expires_at = models.DateTimeField(_("subscription expires at"), null=True, blank=True)
    last_payment_reference = models.CharField(_("last payment reference"), max_length=100, blank=True)

    # ── Referral & Ambassador System ──────────────────────────────
    is_ambassador = models.BooleanField(_("is ambassador"), default=False, db_index=True)
    referral_code = models.CharField(
        _("referral code"), max_length=20, blank=True, null=True, unique=True, db_index=True
    )
    referred_by = models.CharField(
        _("referred by code"), max_length=20, blank=True, null=True, db_index=True,
        help_text=_("The referral code used by this student during signup."),
    )

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
            models.Index(fields=["has_paid"], name="idx_user_has_paid"),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}> (L{self.level})"

    def activate_subscription(self, *, days: int = 120, reference: str = "") -> None:
        """Extend or start the subscription. Used for admin approval of payments.

        FIX: When a referred student makes their FIRST successful payment
        (trial → paid transition), an AmbassadorCommission is created for
        the referring ambassador IF the referral code is valid. This is
        idempotent — a second payment does NOT create a second commission.

        This single method covers every activation path in the codebase:
          • accounts/admin.py  (manual admin approval)
          • payments/admin.py  (payment txn approval)
          • payments/services.py  (Paystack webhook + Hubtel webhook)
          • payments/views.py  (verify/manual views)
        """
        from decimal import Decimal  # local import — avoids any circular-import risk

        # FIX: capture the PREVIOUS state BEFORE we flip it, so we know
        # whether this is a first-time payment or an extension.
        was_already_paid = self.has_paid

        now = timezone.now()
        base = (
            self.subscription_expires_at
            if self.subscription_expires_at and self.subscription_expires_at > now
            else now
        )
        self.subscription_expires_at = base + timedelta(days=days)
        self.is_subscribed = True
        self.has_paid = True
        if reference:
            self.last_payment_reference = reference
        self.save(update_fields=[
            "is_subscribed", "has_paid", "subscription_expires_at", "last_payment_reference",
        ])
        try:
            from .email_service import send_subscription_activated
            if self.email:
                send_subscription_activated(
                    to=self.email,
                    full_name=self.full_name or "",
                    expires_at=self.subscription_expires_at,
                )
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Activation email failed for %s", self.email)
        if False:
            self.save(update_fields=[
        ])

        # ── FIX: create the ambassador commission on the first paid activation ──
        if was_already_paid:
            return  # already paid before → no new commission

        if not self.referred_by:
            return  # not a referred user → nothing to do

        try:
            ambassador = User.objects.get(
                referral_code=self.referred_by,
                is_ambassador=True,
            )
        except User.DoesNotExist:
            # Invalid / typo'd / expired code → silently skip.
            # We do NOT want a bad referral code to break the payment activation.
            return

        # FIX: use get_or_create for idempotency — if the commission row already
        # exists (e.g. manually backfilled), don't create a duplicate.
        AmbassadorCommission.objects.get_or_create(
            ambassador=ambassador,
            referred_student=self,
            defaults={"amount_ghs": Decimal(COMMISSION_AMOUNT_GHS)},
        )

    def start_trial(self, *, days: int = 3) -> None:
        """Grant a free trial. Used only at registration."""
        self.subscription_expires_at = timezone.now() + timedelta(days=days)
        self.is_subscribed = True
        self.has_paid = False
        self.save(update_fields=["is_subscribed", "has_paid", "subscription_expires_at"])

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

    @property
    def is_on_trial(self) -> bool:
        """True if the user is active but has not paid yet."""
        return self.has_active_subscription and not self.has_paid


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


class AmbassadorCommission(models.Model):
    """Tracks money earned by ambassadors from referred students."""
    ambassador = models.ForeignKey(User, on_delete=models.CASCADE, related_name="commissions")
    referred_student = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="generated_commissions",
    )
    amount_ghs = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid_out = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        # FIX: prevent duplicate commissions for the same (ambassador, student) pair.
        # This is a belt-and-braces guard on top of get_or_create().
        constraints = [
            models.UniqueConstraint(
                fields=["ambassador", "referred_student"],
                condition=models.Q(referred_student__isnull=False),
                name="uniq_ambassador_referred_student",
            ),
        ]

    def __str__(self):
        student_email = self.referred_student.email if self.referred_student else "(deleted)"
        return f"{self.ambassador.email} earned GHS {self.amount_ghs} from {student_email}"

    @property
    def payout_due_date(self):
        """Commission is paid out 3 days after it is earned."""
        return self.created_at + timedelta(days=3)