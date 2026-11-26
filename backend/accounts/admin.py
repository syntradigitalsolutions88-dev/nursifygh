"""Admin configuration for the accounts app."""

import csv
from urllib.parse import quote
from datetime import timedelta
from django import forms
from django.contrib import admin, messages
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import path, reverse
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import (
    AmbassadorCommission,
    ClinicalLog,
    ClinicalSkill,
    User,
    UserNotification,
    BroadcastNotification,
    Feedback,
)


class EmailAuthenticationForm(AdminAuthenticationForm):
    username = forms.EmailField(
        label="Email address",
        widget=forms.EmailInput(attrs={"autofocus": True}),
    )


class ExpiryWindowFilter(admin.SimpleListFilter):
    title = "Expiry Window"
    parameter_name = "expiry_window"

    def lookups(self, request, model_admin):
        return [
            ("expiring_24h", "Expiring <= 24 Hours"),
            ("expiring_3d", "Expiring <= 3 Days"),
            ("expired", "Expired"),
            ("active_paid", "Active Paid"),
            ("active_trial", "Active Trial"),
        ]

    def queryset(self, request, queryset):
        now = timezone.now()
        val = self.value()
        if val == "expiring_24h":
            return queryset.filter(is_subscribed=True, subscription_expires_at__gte=now, subscription_expires_at__lte=now + timedelta(hours=24))
        if val == "expiring_3d":
            return queryset.filter(is_subscribed=True, subscription_expires_at__gte=now, subscription_expires_at__lte=now + timedelta(days=3))
        if val == "expired":
            return queryset.filter(is_subscribed=True, subscription_expires_at__lt=now)
        if val == "active_paid":
            return queryset.filter(is_subscribed=True, has_paid=True, subscription_expires_at__gte=now)
        if val == "active_trial":
            return queryset.filter(is_subscribed=True, has_paid=False, subscription_expires_at__gte=now)
        return queryset


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    login_form = EmailAuthenticationForm
    ordering = ("-date_joined",)

    list_display = (
        "email", "full_name", "phone_number", "level",
        "access_status", "expiry_date_display", "quick_controls",
        "has_paid", "is_ambassador", "referral_code", "referred_by",
        "unpaid_commission_display", "is_active",
    )
    list_filter = (
        ExpiryWindowFilter, "has_paid", "is_subscribed", "is_ambassador",
        "level", "program", "is_active", "is_staff",
    )
    search_fields = ("email", "full_name", "phone_number", "institution", "referral_code", "referred_by")
    readonly_fields = ("id", "date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        (_("Personal info"), {"fields": ("full_name", "phone_number", "institution")}),
        (_("Academic"), {"fields": ("level", "program", "exam_date")}),
        (_("Subscription"), {
            "fields": ("is_subscribed", "has_paid", "subscription_expires_at", "last_payment_reference"),
            "description": "Students auto-start with a 3-day trial. Approve payments via Payment Transactions.",
        }),
        (_("Ambassador Program"), {"fields": ("is_ambassador", "referral_code", "referred_by")}),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "level", "password1", "password2")}),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            unpaid_total=Sum("commissions__amount_ghs", filter=Q(commissions__is_paid_out=False)),
            total_commissions_count=Count("commissions"),
        )

    @admin.display(description="Unpaid Due (GHS)", ordering="unpaid_total")
    def unpaid_commission_display(self, obj):
        if not obj.is_ambassador and not getattr(obj, "total_commissions_count", 0):
            return "—"
        amount = obj.unpaid_total or 0
        if amount > 0:
            return format_html('<span style="color: #b45309; font-weight: bold;">GHS {}</span>', f"{amount:.2f}")
        return "GHS 0.00"

    @admin.display(description="Expires On", ordering="subscription_expires_at")
    def expiry_date_display(self, obj):
        if not obj.subscription_expires_at:
            return "—"
        return timezone.localtime(obj.subscription_expires_at).strftime("%d %b %Y, %H:%M")

    @staticmethod
    def _wa_phone(raw_phone):
        digits = "".join(ch for ch in (raw_phone or "") if ch.isdigit())
        if not digits:
            return ""
        if digits.startswith("0") and len(digits) == 10:
            return "233" + digits[1:]
        return digits

    @admin.display(description="Quick Controls")
    def quick_controls(self, obj):
        act_url = reverse("admin:user-quick-activate", args=[obj.pk])
        trl_url = reverse("admin:user-quick-trial", args=[obj.pk])
        rev_url = reverse("admin:user-quick-revoke", args=[obj.pk])
        wa_num = self._wa_phone(obj.phone_number)
        wa_btn = ""
        if wa_num:
            name = (obj.full_name or "Student").split()[0]
            msg = quote(f"Hi {name}, your NursifyGH 3-day free trial is ending soon. Upgrade to the 120-day Semester Pass (GHS 30) via MoMo to keep full access.")
            wa_btn = f'<a href="https://wa.me/{wa_num}?text={msg}" target="_blank" style="background:#0d9488;color:#fff;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;margin-right:3px;">WA</a>'
        return format_html(
            '<a href="{}" style="background:#059669;color:#fff;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;margin-right:3px;">+120d</a>'
            '<a href="{}" style="background:#2563eb;color:#fff;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;margin-right:3px;">+3d</a>'
            '{}'
            '<a href="{}" style="background:#dc2626;color:#fff;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;">Revoke</a>',
            act_url, trl_url, format_html(wa_btn), rev_url,
        )

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path("command-center/", self.admin_site.admin_view(self.command_center_view), name="nursify-command-center"),
            path("<uuid:user_id>/quick-activate/", self.admin_site.admin_view(self.quick_activate_view), name="user-quick-activate"),
            path("<uuid:user_id>/quick-trial/", self.admin_site.admin_view(self.quick_trial_view), name="user-quick-trial"),
            path("<uuid:user_id>/quick-revoke/", self.admin_site.admin_view(self.quick_revoke_view), name="user-quick-revoke"),
        ]
        return custom + urls

    def _kpi_context(self):
        now = timezone.now()
        unpaid = AmbassadorCommission.objects.filter(is_paid_out=False).aggregate(s=Sum("amount_ghs"))["s"] or 0
        return {
            "kpi_total": User.objects.count(),
            "kpi_exp_24h": User.objects.filter(is_subscribed=True, subscription_expires_at__gte=now, subscription_expires_at__lte=now + timedelta(hours=24)).count(),
            "kpi_exp_3d": User.objects.filter(is_subscribed=True, subscription_expires_at__gte=now, subscription_expires_at__lte=now + timedelta(days=3)).count(),
            "kpi_expired": User.objects.filter(is_subscribed=True, subscription_expires_at__lt=now).count(),
            "kpi_paid": User.objects.filter(is_subscribed=True, has_paid=True, subscription_expires_at__gte=now).count(),
            "kpi_trial": User.objects.filter(is_subscribed=True, has_paid=False, subscription_expires_at__gte=now).count(),
            "kpi_ambassadors": User.objects.filter(is_ambassador=True).count(),
            "kpi_unpaid_ghs": f"{unpaid:.2f}",
        }

    def changelist_view(self, request, extra_context=None):
        extra_context = {**(extra_context or {}), **self._kpi_context()}
        return super().changelist_view(request, extra_context=extra_context)

    def command_center_view(self, request):
        now = timezone.now()
        kpis = self._kpi_context()
        watchlist = User.objects.filter(
            is_subscribed=True, subscription_expires_at__gte=now, subscription_expires_at__lte=now + timedelta(days=3),
        ).order_by("subscription_expires_at")[:50]
        watchlist_rows = []
        for u in watchlist:
            delta = u.subscription_expires_at - now
            days = delta.days
            hours = int(delta.total_seconds() / 3600) % 24
            wa_num = self._wa_phone(u.phone_number)
            first = (u.full_name or "Student").split()[0]
            exp_str = timezone.localtime(u.subscription_expires_at).strftime("%d %b %Y, %H:%M")
            rem_msg = quote(f"Hi {first}, your NursifyGH trial expires on {exp_str}. Upgrade to GHS 30 Semester Pass.")
            watchlist_rows.append({
                "user": u,
                "time_left": f"{days}d {hours}h left",
                "wa_reminder_url": f"https://wa.me/{wa_num}?text={rem_msg}" if wa_num else "",
            })
        total_comm = AmbassadorCommission.objects.aggregate(s=Sum("amount_ghs"))["s"] or 0
        paid_count = kpis["kpi_paid"]
        total_u = kpis["kpi_total"]
        gross_rev = paid_count * 30
        net_rev = max(0, gross_rev - float(total_comm))
        conv = round((paid_count / total_u) * 100, 1) if total_u else 0.0
        ctx = {
            **self.admin_site.each_context(request),
            "title": "NursifyGH Command Center",
            "total_users": total_u,
            "active_paid": paid_count,
            "active_trials": kpis["kpi_trial"],
            "expiring_3d_count": kpis["kpi_exp_3d"],
            "expired_count": kpis["kpi_expired"],
            "unpaid_commissions": kpis["kpi_unpaid_ghs"],
            "gross_revenue_ghs": f"{gross_rev:.0f}",
            "net_revenue_ghs": f"{net_rev:.0f}",
            "conversion_rate": conv,
            "watchlist_rows": watchlist_rows,
        }
        return render(request, "admin/command_center.html", ctx)

    def quick_revoke_view(self, request, user_id):
        student = get_object_or_404(User, pk=user_id)
        student.is_subscribed = False
        student.has_paid = False
        student.subscription_expires_at = timezone.now()
        student.save(update_fields=["is_subscribed", "has_paid", "subscription_expires_at"])
        self.message_user(request, f"Access revoked for {student.email}.", messages.WARNING)
        return HttpResponseRedirect(request.META.get("HTTP_REFERER") or reverse("admin:accounts_user_changelist"))

    @admin.action(description="Revoke subscription / trial access")
    def revoke_access(self, request, queryset):
        updated = queryset.update(is_subscribed=False, has_paid=False, subscription_expires_at=timezone.now())
        self.message_user(request, f"Revoked access for {updated} student(s).", messages.WARNING)

    def quick_activate_view(self, request, user_id):
        student = get_object_or_404(User, pk=user_id)
        student.activate_subscription(days=120)
        self.message_user(request, f"{student.email} activated for 120 days.", messages.SUCCESS)
        return HttpResponseRedirect(request.META.get("HTTP_REFERER") or reverse("admin:accounts_user_changelist"))

    def quick_trial_view(self, request, user_id):
        student = get_object_or_404(User, pk=user_id)
        student.start_trial(days=3)
        self.message_user(request, f"{student.email} extended 3-day trial.", messages.INFO)
        return HttpResponseRedirect(request.META.get("HTTP_REFERER") or reverse("admin:accounts_user_changelist"))

    @admin.action(description="Export selected users to CSV")
    def export_users_csv(self, request, queryset):
        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="nursifygh_users.csv"'
        writer = csv.writer(resp)
        writer.writerow(["Email", "Full Name", "Phone", "Level", "Program", "Paid", "Subscribed", "Expires At", "Ambassador", "Referral Code"])
        for u in queryset:
            exp = timezone.localtime(u.subscription_expires_at).strftime("%Y-%m-%d %H:%M") if u.subscription_expires_at else ""
            writer.writerow([u.email, u.full_name, u.phone_number, u.level, u.program, u.has_paid, u.is_subscribed, exp, u.is_ambassador, u.referral_code])
        return resp

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
            return format_html('<span style="background: #10b981; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">PAID · {}d left</span>', days)
        return format_html('<span style="background: #f59e0b; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">TRIAL · {}d {}h</span>', days, hours)

    actions = ["mark_as_paid_extend_120", "reset_to_trial", "revoke_access", "promote_to_ambassador", "export_users_csv"]

    @admin.action(description="Mark as PAID and extend by 120 days")
    def mark_as_paid_extend_120(self, request, queryset):
        count = 0
        for student in queryset:
            student.activate_subscription(days=120)
            count += 1
        self.message_user(request, f"{count} student(s) marked PAID + 120 days.", messages.SUCCESS)

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
    list_display = ("ambassador_email", "ambassador_phone", "referred_student_email", "amount_ghs", "is_paid_out", "created_at", "payout_due_date")
    list_filter = ("is_paid_out", "created_at")
    search_fields = ("ambassador__email", "ambassador__full_name", "ambassador__phone_number", "ambassador__referral_code", "referred_student__email")
    list_editable = ("is_paid_out",)
    readonly_fields = ("ambassador", "referred_student", "amount_ghs", "created_at", "payout_due_date")
    date_hierarchy = "created_at"
    actions = ["mark_commissions_paid_out", "mark_commissions_unpaid"]

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


# ─── Notifications & Feedback Admin ──────────────────────────────────


@admin.register(BroadcastNotification)
class BroadcastNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "notification_type", "target_program", "target_level", "is_active", "created_at")
    list_filter = ("is_active", "notification_type", "target_program", "target_level", "target_paid_only")
    search_fields = ("title", "message")
    fieldsets = (
        ("Message", {"fields": ("title", "message", "notification_type")}),
        ("Action", {"fields": ("action_url", "action_label")}),
        ("Targeting", {
            "fields": ("target_program", "target_level", "target_paid_only"),
            "description": "Leave blank to send to everyone. Set specific fields to narrow the audience.",
        }),
        ("Status", {"fields": ("is_active", "expires_at")}),
    )


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "notification_type", "is_read", "created_at")
    list_filter = ("is_read", "notification_type")
    search_fields = ("user__email", "title", "message")


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("subject", "feedback_type", "user", "status", "created_at")
    list_filter = ("status", "feedback_type")
    search_fields = ("subject", "message", "user__email")
    readonly_fields = ("user", "feedback_type", "subject", "message", "page_url", "created_at")
    fieldsets = (
        ("Submission", {"fields": ("user", "feedback_type", "subject", "message", "page_url", "created_at")}),
        ("Response", {"fields": ("status", "admin_response", "responded_at")}),
    )