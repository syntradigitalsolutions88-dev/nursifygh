"""API views for authentication and profile management."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    PasswordChangeSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()


class RegistrationRateThrottle(AnonRateThrottle):
    """Slightly stricter than default to deter automated signups."""

    scope = "registration"


class RegisterView(generics.CreateAPIView):
    """POST /api/accounts/register/ — create a new student account."""

    serializer_class = UserRegistrationSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (RegistrationRateThrottle,)


class LoginView(TokenObtainPairView):
    """POST /api/accounts/login/ — returns access + refresh JWT pair."""

    permission_classes = (permissions.AllowAny,)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/accounts/me/ — retrieve or update your profile."""

    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        user = self.request.user
        user.deactivate_expired_subscription()
        return user


class PasswordChangeView(APIView):
    """POST /api/accounts/password/change/ — rotate password."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = PasswordChangeSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )