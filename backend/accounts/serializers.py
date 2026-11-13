"""Serializers for the accounts app."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import ClinicalLog, ClinicalSkill, AmbassadorCommission

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    # Allow referred_by to be passed during signup
    referred_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone_number",
            "level", "program", "institution",
            "password", "password_confirm", "referred_by",
        )
        read_only_fields = ("id",)

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data: dict) -> User:
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    level_display = serializers.CharField(source="get_level_display", read_only=True)
    program_display = serializers.CharField(source="get_program_display", read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone_number",
            "level", "level_display",
            "program", "program_display",
            "institution", "exam_date", "has_seen_tour",
            "is_subscribed", "subscription_expires_at",
            "has_active_subscription", "date_joined",
            "is_ambassador", "referral_code", "referred_by",
        )
        read_only_fields = (
            "id", "email", "is_subscribed", "subscription_expires_at",
            "has_active_subscription", "date_joined",
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