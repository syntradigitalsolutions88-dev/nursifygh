"""Serializers for the careplans app."""

from __future__ import annotations

from rest_framework import serializers

from .models import (
    CarePlan,
    CarePlanRating,
    CarePlanShareLink,
    CarePlanTemplate,
    Intervention,
    NandaDiagnosis,
    SmartGoal,
)


class NandaDiagnosisSerializer(serializers.ModelSerializer):
    domain_display = serializers.CharField(source="get_domain_display", read_only=True)

    class Meta:
        model = NandaDiagnosis
        fields = (
            "id", "code", "label", "domain", "domain_display",
            "definition", "defining_characteristics", "related_factors",
            "edition_year",
        )


class CarePlanTemplateListSerializer(serializers.ModelSerializer):
    primary_diagnosis_label = serializers.CharField(
        source="primary_diagnosis.label", read_only=True
    )
    primary_diagnosis_domain = serializers.CharField(
        source="primary_diagnosis.get_domain_display", read_only=True
    )

    class Meta:
        model = CarePlanTemplate
        fields = (
            "id", "title", "description",
            "primary_diagnosis", "primary_diagnosis_label", "primary_diagnosis_domain",
            "course", "is_published",
        )


class CarePlanTemplateDetailSerializer(serializers.ModelSerializer):
    primary_diagnosis = NandaDiagnosisSerializer(read_only=True)

    class Meta:
        model = CarePlanTemplate
        fields = (
            "id", "title", "description",
            "primary_diagnosis",
            "course", "is_published",
            "default_goals", "default_interventions",
            "created_at", "updated_at",
        )


class SmartGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmartGoal
        fields = (
            "id", "specific", "measurable", "achievable",
            "relevant", "time_bound", "position",
        )
        read_only_fields = ("id",)


class InterventionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Intervention
        fields = ("id", "action", "rationale", "position")
        read_only_fields = ("id",)


class CarePlanShareLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlanShareLink
        fields = ("id", "token", "expires_at", "revoked", "created_at")
        read_only_fields = ("id", "token", "created_at")


class CarePlanRatingSerializer(serializers.ModelSerializer):
    rater_email = serializers.CharField(source="rater.email", read_only=True)

    class Meta:
        model = CarePlanRating
        fields = ("id", "rater_email", "score", "comment", "created_at", "updated_at")
        read_only_fields = ("id", "rater_email", "created_at", "updated_at")


class CarePlanListSerializer(serializers.ModelSerializer):
    primary_diagnosis_label = serializers.CharField(
        source="primary_diagnosis.label", read_only=True
    )
    goal_count = serializers.IntegerField(read_only=True)
    intervention_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CarePlan
        fields = (
            "id", "title", "primary_diagnosis", "primary_diagnosis_label",
            "is_public", "is_submitted", "submitted_at",
            "goal_count", "intervention_count",
            "created_at", "updated_at",
        )


class CarePlanDetailSerializer(serializers.ModelSerializer):
    primary_diagnosis = NandaDiagnosisSerializer(read_only=True)
    goals = SmartGoalSerializer(many=True, read_only=True)
    interventions = InterventionSerializer(many=True, read_only=True)

    class Meta:
        model = CarePlan
        fields = (
            "id", "title", "patient_scenario",
            "primary_diagnosis",
            "source_template",
            "is_public", "is_submitted", "submitted_at",
            "goals", "interventions",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "source_template", "is_submitted", "submitted_at",
            "created_at", "updated_at",
        )


class CarePlanPublicSerializer(serializers.ModelSerializer):
    """Read-only view served via share link or from the public library."""

    primary_diagnosis = NandaDiagnosisSerializer(read_only=True)
    goals = SmartGoalSerializer(many=True, read_only=True)
    interventions = InterventionSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_level_display = serializers.CharField(source="student.level_display", read_only=True)
    student_program_display = serializers.CharField(source="student.program_display", read_only=True)
    student_institution = serializers.CharField(source="student.institution", read_only=True)
    average_rating = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()
    view_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CarePlan
        fields = (
            "id", "title", "patient_scenario",
            "student_name",
            "student_level_display",
            "student_program_display",
            "student_institution",
            "primary_diagnosis",
            "goals", "interventions",
            "view_count",
            "average_rating", "rating_count",
            "created_at", "updated_at",
        )

    def get_average_rating(self, obj: CarePlan) -> float | None:
        ratings = obj.ratings.all()
        if not ratings:
            return None
        return round(sum(r.score for r in ratings) / len(ratings), 2)

    def get_rating_count(self, obj: CarePlan) -> int:
        return obj.ratings.count()


class CarePlanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlan
        fields = ("id", "title", "patient_scenario", "primary_diagnosis", "is_public")
        read_only_fields = ("id",)

    def validate_primary_diagnosis(self, value: NandaDiagnosis) -> NandaDiagnosis:
        if not value.is_active:
            raise serializers.ValidationError("This diagnosis is no longer active.")
        return value


class CarePlanUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlan
        fields = ("title", "patient_scenario", "is_public")

    def validate(self, attrs: dict) -> dict:
        instance: CarePlan = self.instance
        if instance and instance.is_submitted:
            raise serializers.ValidationError(
                "This plan has been submitted and can no longer be edited."
            )
        return attrs


class ForkFromTemplateSerializer(serializers.Serializer):
    template_id = serializers.UUIDField()
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)


class ForkFromPlanSerializer(serializers.Serializer):
    source_plan_id = serializers.UUIDField()
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)


class CreateShareLinkSerializer(serializers.Serializer):
    days_valid = serializers.IntegerField(min_value=1, max_value=365, default=30)