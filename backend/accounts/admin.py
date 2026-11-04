"""Admin configuration for the accounts app."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin surfaced around email login and subscription state."""

    ordering = ("-date_joined",)
    list_display = (
        "email",
        "full_name",
        "level",
        "is_subscribed",
        "subscription_expires_at",
        "is_active",
        "is_staff",
    )
    list_filter = ("level", "is_subscribed", "is_active", "is_staff")
    search_fields = ("email", "full_name", "phone_number", "institution")
    readonly_fields = ("id", "date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        (_("Personal info"), {"fields": ("full_name", "phone_number", "institution")}),
        (_("Academic"), {"fields": ("level",)}),
        (_("Subscription"), {
            "fields": (
                "is_subscribed",
                "subscription_expires_at",
                "last_payment_reference",
            )
        }),
        (_("Permissions"), {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "full_name",
                "level",
                "password1",
                "password2",
            ),
        }),
    )