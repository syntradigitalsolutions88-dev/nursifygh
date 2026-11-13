"""Admin configuration for the accounts app."""

from django import forms
from django.contrib import admin
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import AmbassadorCommission, User


class EmailAuthenticationForm(AdminAuthenticationForm):
    username = forms.EmailField(
        label="Email address",
        widget=forms.EmailInput(attrs={"autofocus": True}),
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    login_form = EmailAuthenticationForm
    ordering = ("-date_joined",)

    list_display = (
        "email",
        "full_name",
        "level",
        "access_status",
        "has_paid",
        "subscription_expires_at",
        "is_ambassador",
        "is_active",
        "is_staff",
    )
    list_filter = (
        "has_paid",
        "is_subscribed",
        "is_ambassador",
        "level",
        "program",
        "is_active",
        "is_staff",
    )
    search_fields = ("email", "full_name", "phone_number", "institution", "referral_code")
    readonly_fields = ("id", "date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        (_("Personal info"), {"fields": ("full_name", "phone_number", "institution")}),
        (_("Academic"), {"fields": ("level", "program")}),
        (_("Subscription"), {
            "fields": (
                "is_subscribed",
                "has_paid",
                "subscription_expires_at",
                "last_payment_reference",
            ),
            "description": (
                "Students auto-start with a 3-day trial (has_paid=False). "
                "When they pay via MoMo, tick has_paid=True and click 'Extend by 120 days' below."
            ),
        }),
        (_("Ambassador Program"), {
            "fields": ("is_ambassador", "referral_code", "referred_by"),
        }),
        (_("Permissions"), {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "level", "password1", "password2"),
        }),
    )

    # ─── Colored "Access Status" badge ───────────────────────────────
    @admin.display(description="Access Status")
    def access_status(self, obj):
        if not obj.is_subscribed or not obj.subscription_expires_at:
            return format_html('<span style="color: #6b7280; font-weight: bold;">None</span>')

        now = timezone.now()
        if obj.subscription_expires_at < now:
            return format_html('<span style="background: #dc2626; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">EXPIRED</span>')

        delta = obj.subscription_expires_at - now
        days = delta.days
        hours = int(delta.total_seconds() / 3600) % 24

        if obj.has_paid:
            return format_html(
                '<span style="background: #10b981; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">PAID · {}d left</span>',
                days,
            )
        return format_html(
            '<span style="background: #f59e0b; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">TRIAL · {}d {}h</span>',
            days, hours,
        )

    # ─── Bulk actions ────────────────────────────────────────────────
    actions = ["mark_as_paid_extend_120", "reset_to_trial"]

    @admin.action(description="✅ Mark as PAID and extend by 120 days")
    def mark_as_paid_extend_120(self, request, queryset):
        count = 0
        for user in queryset:
            user.activate_subscription(days=120)
            count += 1
        self.message_user(request, f"{count} student(s) marked as PAID and extended by 120 days.")

    @admin.action(description="⏳ Reset to 3-day trial")
    def reset_to_trial(self, request, queryset):
        count = 0
        for user in queryset:
            user.start_trial(days=3)
            count += 1
        self.message_user(request, f"{count} student(s) reset to 3-day trial.")


@admin.register(AmbassadorCommission)
class AmbassadorCommissionAdmin(admin.ModelAdmin):
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
            "description": "Tick 'is paid out' after you have sent the MoMo payment.",
        }),
    )

    def ambassador_email(self, obj):
        return obj.ambassador.email
    ambassador_email.short_description = "Ambassador"

    def referred_student_email(self, obj):
        return obj.referred_student.email if obj.referred_student else "—"
    referred_student_email.short_description = "Referred Student"

    def payout_due_date(self, obj):
        return obj.payout_due_date.strftime("%d %b %Y")
    payout_due_date.short_description = "Payout Due"