"""Admin configuration for the accounts app."""

from django import forms
from django.contrib import admin
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import AmbassadorCommission, User


# Force Django Admin to use Email instead of Username for the login page
class EmailAuthenticationForm(AdminAuthenticationForm):
    username = forms.EmailField(
        label="Email address",
        widget=forms.EmailInput(attrs={"autofocus": True}),
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin surfaced around email login and subscription state."""

    login_form = EmailAuthenticationForm

    ordering = ("-date_joined",)
    list_display = (
        "email",
        "full_name",
        "level",
        "is_ambassador",
        "referral_code",
        "is_subscribed",
        "is_active",
        "is_staff",
    )
    list_filter = (
        "level",
        "is_subscribed",
        "is_ambassador",
        "is_active",
        "is_staff",
    )
    search_fields = ("email", "full_name", "phone_number", "institution", "referral_code")
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
        (_("Ambassador Program"), {
            "fields": ("is_ambassador", "referral_code", "referred_by"),
            "description": "Mark a user as an ambassador to enable the referral program. Referral codes are auto-generated on the frontend.",
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


@admin.register(AmbassadorCommission)
class AmbassadorCommissionAdmin(admin.ModelAdmin):
    """Admin view for tracking and paying out ambassador commissions."""

    list_display = (
        "ambassador_email",
        "referred_student_email",
        "amount_ghs",
        "is_paid_out",
        "created_at",
        "payout_due_date",
    )
    list_filter = ("is_paid_out", "created_at")
    search_fields = ("ambassador__email", "referred_student__email", "ambassador__referral_code")
    list_editable = ("is_paid_out",)
    readonly_fields = ("ambassador", "referred_student", "amount_ghs", "created_at", "payout_due_date")
    date_hierarchy = "created_at"

    fieldsets = (
        (_("Commission Details"), {
            "fields": ("ambassador", "referred_student", "amount_ghs", "created_at", "payout_due_date")
        }),
        (_("Payout"), {
            "fields": ("is_paid_out",),
            "description": "Tick 'is paid out' after you have sent the MoMo payment. This updates the ambassador's dashboard immediately.",
        }),
    )

    def ambassador_email(self, obj):
        return obj.ambassador.email
    ambassador_email.short_description = "Ambassador"
    ambassador_email.admin_order_field = "ambassador__email"

    def referred_student_email(self, obj):
        return obj.referred_student.email if obj.referred_student else "—"
    referred_student_email.short_description = "Referred Student"
    referred_student_email.admin_order_field = "referred_student__email"

    def payout_due_date(self, obj):
        return obj.payout_due_date.strftime("%d %b %Y")
    payout_due_date.short_description = "Payout Due"
    payout_due_date.admin_order_field = "created_at"