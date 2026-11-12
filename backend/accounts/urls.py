"""URL configuration for the accounts app."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ClinicalLogDetailView,
    ClinicalLogsDetailView,
    ClinicalLogbookExportView,
    ClinicalSkillsView,
    LoginView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    ai_chat_proxy,
    ai_ncp_autofill,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", ProfileView.as_view(), name="profile"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("password/reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("ai-chat/", ai_chat_proxy, name="ai-chat"),
    path("ai-ncp-autofill/", ai_ncp_autofill, name="ai-ncp-autofill"),
    path("clinical-skills/", ClinicalSkillsView.as_view(), name="clinical-skills"),
    path("clinical-skills/export/", ClinicalLogbookExportView.as_view(), name="clinical-skills-export"),
    path("clinical-skills/<int:skill_id>/logs/", ClinicalLogsDetailView.as_view(), name="clinical-logs"),
    path("clinical-logs/<int:log_id>/", ClinicalLogDetailView.as_view(), name="clinical-log-detail"),
]