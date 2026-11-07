"""URL configuration for the accounts app."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    ai_chat_proxy,
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
]