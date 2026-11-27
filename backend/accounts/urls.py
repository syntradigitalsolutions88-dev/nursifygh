from .activity_tracker_view import AdminStudentActivityOverviewView
"""URL configuration for the accounts app."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AmbassadorStatsView,
    AdminCommissionsActionView,
    AdminCommissionsOverviewView,
    BecomeAmbassadorView,
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
    NotificationFeedView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    FeedbackListCreateView,
    AdminNotificationsOverviewView,
    AdminNotificationsActionView,
    AdminFeedbackOverviewView,
    AdminFeedbackActionView,
    admin_broadcast_templates,
    admin_generate_broadcast,
)

app_name = "accounts"

urlpatterns = [
    path("admin/student-activity/", AdminStudentActivityOverviewView.as_view(), name="admin-student-activity"),
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
    path("ambassador/stats/", AmbassadorStatsView.as_view(), name="ambassador-stats"),
    path("ambassador/become/", BecomeAmbassadorView.as_view(), name="ambassador-become"),

    # Admin — Commissions
    path("admin/commissions-overview/", AdminCommissionsOverviewView.as_view(), name="admin-commissions-overview"),
    path("admin/commissions-action/", AdminCommissionsActionView.as_view(), name="admin-commissions-action"),

    # Notifications (user-facing)
    path("notifications/", NotificationFeedView.as_view(), name="notification-feed"),
    path("notifications/<uuid:notification_id>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
    path("notifications/read-all/", MarkAllNotificationsReadView.as_view(), name="notification-read-all"),
    path("feedback/", FeedbackListCreateView.as_view(), name="feedback-list-create"),

    # Admin — Notifications & Feedback console
    path("admin/notifications-overview/", AdminNotificationsOverviewView.as_view(), name="admin-notifications-overview"),
    path("admin/notifications-action/", AdminNotificationsActionView.as_view(), name="admin-notifications-action"),
    path("admin/feedback-overview/", AdminFeedbackOverviewView.as_view(), name="admin-feedback-overview"),
    path("admin/feedback-action/", AdminFeedbackActionView.as_view(), name="admin-feedback-action"),

    # Admin — Broadcast templates + AI generator
    path("admin/broadcast-templates/", admin_broadcast_templates, name="admin-broadcast-templates"),
    path("admin/generate-broadcast/", admin_generate_broadcast, name="admin-generate-broadcast"),
]