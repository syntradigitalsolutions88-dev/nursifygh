"""
Domain services for the careplans app.

All multi-step operations (fork, share-link generation) live here so they
can be reused from views, management commands, and future Celery tasks.
"""

from __future__ import annotations

from datetime import timedelta

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from .models import (
    CarePlan,
    CarePlanShareLink,
    CarePlanTemplate,
    Intervention,
    NandaDiagnosis,
    SmartGoal,
)


class CarePlanForkError(Exception):
    """Raised when a fork operation cannot be completed safely."""


@transaction.atomic
def fork_from_template(
    *,
    student: User,
    template: CarePlanTemplate,
    title: str | None = None,
) -> CarePlan:
    """
    Create a new CarePlan owned by `student`, seeded from `template`.

    The template's default goals and interventions are copied into real
    SmartGoal / Intervention rows so the student can freely edit them.
    The template itself remains untouched.
    """
    if not template.is_published:
        raise CarePlanForkError("Cannot fork an unpublished template.")

    plan = CarePlan.objects.create(
        student=student,
        title=title or f"{template.title} (my copy)",
        patient_scenario="(Describe the patient this plan addresses.)",
        primary_diagnosis=template.primary_diagnosis,
        source_template=template,
    )

    # Seed goals from template.default_goals (each is a dict of the 5 SMART fields)
    for pos, goal_data in enumerate(template.default_goals or []):
        SmartGoal.objects.create(
            care_plan=plan,
            specific=goal_data.get("specific", ""),
            measurable=goal_data.get("measurable", ""),
            achievable=goal_data.get("achievable", ""),
            relevant=goal_data.get("relevant", ""),
            time_bound=goal_data.get("time_bound", ""),
            position=pos,
        )

    # Seed interventions from template.default_interventions
    for pos, intervention_data in enumerate(template.default_interventions or []):
        Intervention.objects.create(
            care_plan=plan,
            action=intervention_data.get("action", ""),
            rationale=intervention_data.get("rationale", ""),
            position=pos,
        )

    return plan


@transaction.atomic
def fork_from_plan(
    *,
    student: User,
    source: CarePlan,
    title: str | None = None,
) -> CarePlan:
    """
    Create a new CarePlan owned by `student`, seeded from another plan.

    The source plan must be public. Goals and interventions are deep-copied
    so the student can edit them without touching the original.
    """
    if not source.is_public:
        raise CarePlanForkError(
            "Cannot fork a plan that is not public. Only public plans can be copied."
        )
    if source.student_id == student.id:
        raise CarePlanForkError("You cannot fork your own plan — edit it directly.")

    plan = CarePlan.objects.create(
        student=student,
        title=title or f"{source.title} (my copy)",
        patient_scenario=source.patient_scenario,
        primary_diagnosis=source.primary_diagnosis,
    )

    for pos, goal in enumerate(source.goals.all()):
        SmartGoal.objects.create(
            care_plan=plan,
            specific=goal.specific,
            measurable=goal.measurable,
            achievable=goal.achievable,
            relevant=goal.relevant,
            time_bound=goal.time_bound,
            position=pos,
        )

    for pos, intervention in enumerate(source.interventions.all()):
        Intervention.objects.create(
            care_plan=plan,
            action=intervention.action,
            rationale=intervention.rationale,
            position=pos,
        )

    return plan


@transaction.atomic
def create_share_link(
    *,
    plan: CarePlan,
    requesting_user: User,
    days_valid: int = 30,
) -> CarePlanShareLink:
    """
    Generate a share link for `plan`. Only the plan's owner may create links.

    The returned link is valid for `days_valid` days from now.
    """
    if plan.student_id != requesting_user.id:
        raise PermissionDenied("Only the plan owner can create share links.")

    expires_at = timezone.now() + timedelta(days=days_valid)
    return CarePlanShareLink.objects.create(
        care_plan=plan,
        expires_at=expires_at,
    )