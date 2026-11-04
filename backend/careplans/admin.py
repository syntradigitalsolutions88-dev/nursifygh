"""Admin configuration for the careplans app."""

from django.contrib import admin

from .models import (
    CarePlan,
    CarePlanRating,
    CarePlanShareLink,
    CarePlanTemplate,
    Intervention,
    NandaDiagnosis,
    SmartGoal,
)


@admin.register(NandaDiagnosis)
class NandaDiagnosisAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "domain", "edition_year", "is_active")
    list_filter = ("domain", "edition_year", "is_active")
    search_fields = ("code", "label", "definition")
    ordering = ("domain", "code")


@admin.register(CarePlanTemplate)
class CarePlanTemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "primary_diagnosis", "course", "is_published", "created_at")
    list_filter = ("is_published", "course")
    search_fields = ("title", "description")
    autocomplete_fields = ("primary_diagnosis", "course")


class SmartGoalInline(admin.TabularInline):
    model = SmartGoal
    extra = 1
    fields = ("position", "specific", "measurable", "achievable", "relevant", "time_bound")
    ordering = ("position",)


class InterventionInline(admin.TabularInline):
    model = Intervention
    extra = 1
    fields = ("position", "action", "rationale")
    ordering = ("position",)


@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ("title", "student", "primary_diagnosis", "is_public", "is_submitted", "updated_at")
    list_filter = ("is_public", "is_submitted", "primary_diagnosis__domain")
    search_fields = ("title", "student__email", "patient_scenario")
    autocomplete_fields = ("student", "primary_diagnosis", "source_template")
    readonly_fields = ("id", "created_at", "updated_at", "submitted_at")
    inlines = [SmartGoalInline, InterventionInline]
    date_hierarchy = "created_at"


@admin.register(CarePlanShareLink)
class CarePlanShareLinkAdmin(admin.ModelAdmin):
    list_display = ("token", "care_plan", "expires_at", "revoked", "created_at")
    list_filter = ("revoked",)
    search_fields = ("token", "care_plan__title")
    readonly_fields = ("id", "token", "created_at")


@admin.register(CarePlanRating)
class CarePlanRatingAdmin(admin.ModelAdmin):
    list_display = ("care_plan", "rater", "score", "created_at")
    list_filter = ("score",)
    search_fields = ("care_plan__title", "rater__email")
    readonly_fields = ("id", "created_at", "updated_at")