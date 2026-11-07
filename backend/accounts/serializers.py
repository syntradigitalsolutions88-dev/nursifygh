"""Serializers for the accounts app."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Handles signup; validates and hashes the password."""

    password = serializers.CharField(
        write_only=True, min_length=8, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone_number",
            "level", "program", "institution",
            "password", "password_confirm",
        )
        read_only_fields = ("id",)

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data: dict) -> User:
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    """Read/update serializer for the authenticated user's profile."""

    level_display = serializers.CharField(source="get_level_display", read_only=True)
    program_display = serializers.CharField(
        source="get_program_display", read_only=True
    )

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone_number",
            "level", "level_display",
            "program", "program_display",
            "institution",
            "is_subscribed", "subscription_expires_at",
            "has_active_subscription", "date_joined",
        )
        read_only_fields = (
            "id", "email", "is_subscribed",
            "subscription_expires_at", "has_active_subscription", "date_joined",
        )


class PasswordChangeSerializer(serializers.Serializer):
    """Allows an authenticated user to rotate their password."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True, min_length=8, validators=[validate_password]
    )

    def validate_current_password(self, value: str) -> str:
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def save(self, **kwargs) -> None:
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    POST body: {"email": "..."}
    Always responds 200 even if the email doesn't exist — prevents account
    enumeration attacks. The frontend shows a generic confirmation message.
    """

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    POST body: {"uid": "...", "token": "...", "new_password": "..."}
    Validates the reset token and sets a new password.
    """

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, min_length=8, validators=[validate_password]
    )