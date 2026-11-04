"""
Accounts application models.

Defines the custom user model for NursifyGH, tailored for Ghanaian nursing
and midwifery students (Levels 100–300). Subscription state is denormalized
onto the user row so permission checks are a single indexed read.
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
    """The three academic levels recognized by Ghanaian nursing colleges."""

    LEVEL_100 = 100, _("Level 100")
    LEVEL_200 = 200, _("Level 200")
    LEVEL_300 = 300, _("Level 300")


GHANA_PHONE_REGEX = RegexValidator(
    regex=r"^(?:\+233|233|0)\d{9}$",
    message=_("Enter a valid Ghanaian phone number (e.g. 0244123456)."),
)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for NursifyGH.

    Uses email as the unique login identifier. Subscription fields are
    denormalized onto this model so permission checks are a single row read.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(
        _("email address"),
        unique=True,
        db_index=True,
        error_messages={"unique": _("A user with this email already exists.")},
    )
    full_name = models.CharField(_("full name"), max_length=150)
    phone_number = models.CharField(
        _("phone number"),
        max_length=15,
        validators=[GHANA_PHONE_REGEX],
        blank=True,
        db_index=True,
        help_text=_("Used for Mobile Money payments and account recovery."),
    )

    level = models.PositiveSmallIntegerField(
        _("academic level"),
        choices=StudentLevel.choices,
        default=StudentLevel.LEVEL_100,
        db_index=True,
    )
    institution = models.CharField(
        _("institution"),
        max_length=200,
        blank=True,
        help_text=_("Name of the nursing/midwifery training college."),
    )

    is_subscribed = models.BooleanField(_("is subscribed"), default=False, db_index=True)
    subscription_expires_at = models.DateTimeField(
        _("subscription expires at"), null=True, blank=True
    )
    last_payment_reference = models.CharField(
        _("last payment reference"), max_length=100, blank=True
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
            models.Index(
                fields=["is_subscribed", "subscription_expires_at"],
                name="idx_user_sub_expiry",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}> (L{self.level})"

    def activate_subscription(self, *, days: int = 120, reference: str = "") -> None:
        """Grant or extend access by `days` from the current expiry."""
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
            "is_subscribed",
            "subscription_expires_at",
            "last_payment_reference",
        ])

    def deactivate_expired_subscription(self) -> bool:
        """Lazily downgrade a user whose subscription has lapsed."""
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
        """Boolean check used by permission classes and serializers."""
        if not self.is_subscribed:
            return False
        if self.subscription_expires_at is None:
            return True
        return self.subscription_expires_at > timezone.now()