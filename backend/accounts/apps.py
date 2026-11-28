"""App configuration for the accounts app."""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    verbose_name = "Accounts & Subscriptions"

def _on_user_logged_in(sender, request, user, **kwargs):
    try:
        from .models import UserActivityLog, UserLoginLog
        ip = ""
        ua = ""
        if request is not None:
            xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
            ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "")
            ua = str(request.META.get("HTTP_USER_AGENT", ""))[:240]
        UserLoginLog.objects.create(user=user, ip_address=ip[:64], user_agent=ua)
        UserActivityLog.objects.create(
            user=user,
            action_type="LOGIN",
            summary="Signed in to NursifyGH",
            program=str(getattr(user, "program", "") or "")[:24],
        )
    except Exception:
        pass

    def ready(self):
        from django.contrib.auth.signals import user_logged_in
        user_logged_in.connect(_on_user_logged_in, dispatch_uid='nursify_user_logged_in')
