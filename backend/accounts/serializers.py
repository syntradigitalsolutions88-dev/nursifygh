"""Serializers for the accounts app."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    AmbassadorCommission,
    ClinicalLog,
    ClinicalSkill,
    UserNotification,
    BroadcastNotification,
    Feedback,
)

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    referred_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone_number",
            "level", "program", "institution",
            "password", "password_confirm", "referred_by",
        )
        read_only_fields = ("id",)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists. Please log in instead.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        if attrs.get("program") in {"NAC", "NAP"} and attrs.get("level") not in {100, 200}:
            raise serializers.ValidationError({
                "level": "NAC and NAP are two-year certificate programs (Level 100 or Level 200)."
            })
        return attrs

    def validate_referred_by(self, value):
        if not value or not str(value).strip():
            return ""
        value = str(value).strip().upper()
        if not User.objects.filter(referral_code=value, is_ambassador=True).exists():
            raise serializers.ValidationError(
                "Invalid referral code. Please confirm the code with the person who referred you."
            )
        return value

    def create(self, validated_data: dict) -> User:
        password = validated_data.pop("password")
        if not validated_data.get("referred_by"):
            validated_data["referred_by"] = ""

        user = User.objects.create_user(password=password, **validated_data)
        user.start_trial(days=3)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    level_display = serializers.CharField(source="get_level_display", read_only=True)
    program_display = serializers.CharField(source="get_program_display", read_only=True)
    is_on_trial = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone_number",
            "level", "level_display",
            "program", "program_display",
            "institution", "exam_date", "has_seen_tour",
            "is_subscribed", "has_paid", "is_on_trial", "subscription_expires_at",
            "has_active_subscription", "date_joined",
            "is_staff", "is_superuser",
            "is_ambassador", "referral_code", "referred_by",
        )
        read_only_fields = (
            "id", "email", "is_subscribed", "has_paid", "is_on_trial",
            "subscription_expires_at", "has_active_subscription", "date_joined",
            "is_staff", "is_superuser",
            "is_ambassador", "referral_code",
        )


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])

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
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])


class ClinicalSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalSkill
        fields = ("id", "procedure_name", "category", "completed_count", "required_count")


class ClinicalLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalLog
        fields = ("id", "date_performed", "hospital", "ward", "supervisor_name", "notes", "created_at")


class AmbassadorCommissionSerializer(serializers.ModelSerializer):
    referred_student_email = serializers.CharField(source="referred_student.email", read_only=True)

    class Meta:
        model = AmbassadorCommission
        fields = ("id", "amount_ghs", "is_paid_out", "created_at", "referred_student_email")


# ─── Notifications & Feedback ────────────────────────────────────


class UserNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotification
        fields = (
            "id", "title", "message", "notification_type",
            "action_url", "action_label", "is_read", "created_at",
        )
        read_only_fields = ("id", "created_at")


class BroadcastNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BroadcastNotification
        fields = (
            "id", "title", "message", "notification_type",
            "action_url", "action_label", "created_at",
        )


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = (
            "id", "feedback_type", "subject", "message", "page_url",
            "status", "admin_response", "responded_at", "created_at",
        )
        read_only_fields = ("id", "status", "admin_response", "responded_at", "created_at")


class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ("feedback_type", "subject", "message", "page_url")

    def validate_subject(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Subject must be at least 5 characters.")
        return value.strip()

    def validate_message(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Message must be at least 10 characters.")
        return value.strip()