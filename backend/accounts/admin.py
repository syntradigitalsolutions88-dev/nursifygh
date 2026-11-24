"""Admin configuration for the accounts app."""

from django import forms
from django.contrib import admin, messages
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import AmbassadorCommission, ClinicalLog, ClinicalSkill, User


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
        "phone_number",
        "level",
        "access_status",
        "expiry_date_display",
        "has_paid",
        "is_ambassador",
        "referral_code",
        "referred_by",
        "unpaid_commission_display",
        "is_active",
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
    search_fields = (
        "email",
        "full_name",
        "phone_number",
        "institution",
        "referral_code",
        "referred_by",
    )
    readonly_fields = ("id", "date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        (_("Personal info"), {"fields": ("full_name", "phone_number", "institution")}),
        (_("Academic"), {"fields": ("level", "program", "exam_date")}),
        (_("Subscription"), {
            "fields": (
                "is_subscribed",
                "has_paid",
                "subscription_expires_at",
                "last_payment_reference",
            ),
            "description": (
                "Students auto-start with a 3-day trial (has_paid=False). "
                "When they pay via MoMo, approve via Payment Transactions or mark has_paid=True and extend by 120 days."
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

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            unpaid_total=Sum(
                "commissions__amount_ghs",
                filter=Q(commissions__is_paid_out=False),
            ),
            total_commissions_count=Count("commissions"),
        )

    @admin.display(description="Unpaid Due (GHS)", ordering="unpaid_total")
    def unpaid_commission_display(self, obj):
        if not obj.is_ambassador and not getattr(obj, "total_commissions_count", 0):
            return "—"
        amount = obj.unpaid_total or 0
        if amount > 0:
            return format_html(
                '<span style="color: #b45309; font-weight: bold;">GHS {}</span>',
                f"{amount:.2f}",
            )
        return "GHS 0.00"


    @admin.display(description="Expires On", ordering="subscription_expires_at")
    def expiry_date_display(self, obj):
        if not obj.subscription_expires_at:
            return "—"
        return timezone.localtime(obj.subscription_expires_at).strftime("%d %b %Y, %H:%M")

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

    actions = ["mark_as_paid_extend_120", "reset_to_trial", "promote_to_ambassador"]

    @admin.action(description="Mark as PAID and extend by 120 days")
    def mark_as_paid_extend_120(self, request, queryset):
        count = 0
        for student in queryset:
            student.activate_subscription(days=120)
            count += 1
        self.message_user(request, f"{count} student(s) marked as PAID and extended by 120 days.", messages.SUCCESS)

    @admin.action(description="Reset to 3-day trial")
    def reset_to_trial(self, request, queryset):
        count = 0
        for student in queryset:
            student.start_trial(days=3)
            count += 1
        self.message_user(request, f"{count} student(s) reset to 3-day trial.", messages.WARNING)

    @admin.action(description="Enable Ambassador status & generate referral code if blank")
    def promote_to_ambassador(self, request, queryset):
        import secrets
        updated = 0
        for student in queryset:
            changed = False
            if not student.is_ambassador:
                student.is_ambassador = True
                changed = True
            if not student.referral_code:
                base = "".join(ch for ch in student.full_name.upper() if ch.isalpha())[:5] or "AMB"
                for _ in range(10):
                    candidate = f"{base}{secrets.token_hex(2).upper()}"
                    if not User.objects.filter(referral_code=candidate).exists():
                        student.referral_code = candidate
                        changed = True
                        break
            if changed:
                student.save(update_fields=["is_ambassador", "referral_code"])
                updated += 1
        self.message_user(request, f"Updated {updated} ambassador account(s).", messages.SUCCESS)


@admin.register(AmbassadorCommission)
class AmbassadorCommissionAdmin(admin.ModelAdmin):
    list_display = (
        "ambassador_email",
        "ambassador_phone",
        "referred_student_email",
        "amount_ghs",
        "is_paid_out",
        "created_at",
        "payout_due_date",
    )
    list_filter = ("is_paid_out", "created_at")
    search_fields = (
        "ambassador__email",
        "ambassador__full_name",
        "ambassador__phone_number",
        "ambassador__referral_code",
        "referred_student__email",
    )
    list_editable = ("is_paid_out",)
    readonly_fields = ("ambassador", "referred_student", "amount_ghs", "created_at", "payout_due_date")
    date_hierarchy = "created_at"
    actions = ["mark_commissions_paid_out", "mark_commissions_unpaid"]

    fieldsets = (
        (_("Commission Details"), {
            "fields": ("ambassador", "referred_student", "amount_ghs", "created_at", "payout_due_date")
        }),
        (_("Payout"), {
            "fields": ("is_paid_out",),
            "description": "Tick 'is paid out' after you have sent the MoMo payment.",
        }),
    )

    @admin.display(description="Ambassador", ordering="ambassador__email")
    def ambassador_email(self, obj):
        return obj.ambassador.email

    @admin.display(description="MoMo / Phone", ordering="ambassador__phone_number")
    def ambassador_phone(self, obj):
        return obj.ambassador.phone_number or "—"

    @admin.display(description="Referred Student", ordering="referred_student__email")
    def referred_student_email(self, obj):
        return obj.referred_student.email if obj.referred_student else "—"

    @admin.display(description="Payout Due")
    def payout_due_date_display(self, obj):
        return obj.payout_due_date.strftime("%d %b %Y")

    @admin.action(description="Mark selected commissions as PAID OUT")
    def mark_commissions_paid_out(self, request, queryset):
        updated = queryset.update(is_paid_out=True)
        self.message_user(request, f"Marked {updated} commission(s) as paid out.", messages.SUCCESS)

    @admin.action(description="Mark selected commissions as UNPAID")
    def mark_commissions_unpaid(self, request, queryset):
        updated = queryset.update(is_paid_out=False)
        self.message_user(request, f"Marked {updated} commission(s) as unpaid.", messages.WARNING)


@admin.register(ClinicalSkill)
class ClinicalSkillAdmin(admin.ModelAdmin):
    list_display = ("student", "procedure_name", "category", "completed_count", "required_count", "last_updated")
    list_filter = ("category", "last_updated")
    search_fields = ("student__email", "student__full_name", "procedure_name")


@admin.register(ClinicalLog)
class ClinicalLogAdmin(admin.ModelAdmin):
    list_display = ("student", "skill", "date_performed", "hospital", "ward", "supervisor_name", "created_at")
    list_filter = ("date_performed", "hospital")
    search_fields = ("student__email", "skill__procedure_name", "hospital", "supervisor_name")
    date_hierarchy = "date_performed"
