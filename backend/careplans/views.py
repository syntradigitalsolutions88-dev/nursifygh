"""API views for the careplans app."""

from __future__ import annotations

from django.core.exceptions import PermissionDenied
from django.db.models import Count, Prefetch
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSubscribed
from .models import (
    CarePlan,
    CarePlanRating,
    CarePlanShareLink,
    CarePlanTemplate,
    Intervention,
    NandaDiagnosis,
    SmartGoal,
)
from .serializers import (
    CarePlanCreateSerializer,
    CarePlanDetailSerializer,
    CarePlanListSerializer,
    CarePlanPublicSerializer,
    CarePlanRatingSerializer,
    CarePlanShareLinkSerializer,
    CarePlanTemplateDetailSerializer,
    CarePlanTemplateListSerializer,
    CarePlanUpdateSerializer,
    CreateShareLinkSerializer,
    ForkFromPlanSerializer,
    ForkFromTemplateSerializer,
    InterventionSerializer,
    NandaDiagnosisSerializer,
    SmartGoalSerializer,
)
from .services import (
    CarePlanForkError,
    create_share_link,
    fork_from_plan,
    fork_from_template,
)


# ---------------------------------------------------------------------------
# NANDA catalog (read-only, for all subscribed students)
# ---------------------------------------------------------------------------
class NandaDiagnosisListView(generics.ListAPIView):
    """
    GET /api/careplans/nanda/
    Lists all active NANDA diagnoses. Query params: ?domain=SAFETY_PROTECTION
    """

    serializer_class = NandaDiagnosisSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    pagination_class = None

    def get_queryset(self):
        qs = NandaDiagnosis.objects.filter(is_active=True).order_by("domain", "code")
        domain = self.request.query_params.get("domain")
        if domain:
            qs = qs.filter(domain=domain)
        return qs


class NandaDiagnosisDetailView(generics.RetrieveAPIView):
    """GET /api/careplans/nanda/<uuid>/"""

    serializer_class = NandaDiagnosisSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    queryset = NandaDiagnosis.objects.filter(is_active=True)
    lookup_field = "id"


# ---------------------------------------------------------------------------
# Care plan templates
# ---------------------------------------------------------------------------
class TemplateListView(generics.ListAPIView):
    """
    GET /api/careplans/templates/
    Lists published templates. Query params: ?course=<uuid>&diagnosis=<uuid>
    """

    serializer_class = CarePlanTemplateListSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get_queryset(self):
        qs = CarePlanTemplate.objects.filter(
            is_published=True
        ).select_related("primary_diagnosis", "course").order_by("-created_at")

        course = self.request.query_params.get("course")
        diagnosis = self.request.query_params.get("diagnosis")
        if course:
            qs = qs.filter(course_id=course)
        if diagnosis:
            qs = qs.filter(primary_diagnosis_id=diagnosis)
        return qs


class TemplateDetailView(generics.RetrieveAPIView):
    """GET /api/careplans/templates/<uuid>/"""

    serializer_class = CarePlanTemplateDetailSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    queryset = CarePlanTemplate.objects.filter(
        is_published=True
    ).select_related("primary_diagnosis")
    lookup_field = "id"


# ---------------------------------------------------------------------------
# Care plan CRUD (owner-scoped)
# ---------------------------------------------------------------------------
class CarePlanListView(generics.ListAPIView):
    """
    GET /api/careplans/plans/
    Lists the authenticated student's plans.
    """

    serializer_class = CarePlanListSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get_queryset(self):
        return (
            CarePlan.objects.filter(student=self.request.user)
            .select_related("primary_diagnosis")
            .annotate(
                goal_count=Count("goals", distinct=True),
                intervention_count=Count("interventions", distinct=True),
            )
            .order_by("-updated_at")
        )


class CarePlanCreateView(generics.CreateAPIView):
    """POST /api/careplans/plans/ — create a plan from scratch."""

    serializer_class = CarePlanCreateSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class CarePlanDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/careplans/plans/<uuid>/
    Owner-only. PATCH rejected after the plan is submitted.
    """

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    lookup_field = "id"

    def get_queryset(self):
        return (
            CarePlan.objects.filter(student=self.request.user)
            .select_related("primary_diagnosis", "source_template")
            .prefetch_related(
                Prefetch("goals", queryset=SmartGoal.objects.order_by("position")),
                Prefetch("interventions", queryset=Intervention.objects.order_by("position")),
            )
        )

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return CarePlanUpdateSerializer
        return CarePlanDetailSerializer


class CarePlanForkFromTemplateView(APIView):
    """POST /api/careplans/plans/fork-from-template/"""

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, *args, **kwargs):
        serializer = ForkFromTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            template = CarePlanTemplate.objects.get(
                pk=serializer.validated_data["template_id"],
                is_published=True,
            )
        except CarePlanTemplate.DoesNotExist:
            return Response(
                {"detail": "Template not found or unpublished."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            plan = fork_from_template(
                student=request.user,
                template=template,
                title=serializer.validated_data.get("title") or None,
            )
        except CarePlanForkError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            CarePlanDetailSerializer(plan).data,
            status=status.HTTP_201_CREATED,
        )


class CarePlanForkFromPlanView(APIView):
    """POST /api/careplans/plans/fork-from-plan/"""

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, *args, **kwargs):
        serializer = ForkFromPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            source = CarePlan.objects.get(
                pk=serializer.validated_data["source_plan_id"],
                is_public=True,
            )
        except CarePlan.DoesNotExist:
            return Response(
                {"detail": "Source plan not found or not public."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            plan = fork_from_plan(
                student=request.user,
                source=source,
                title=serializer.validated_data.get("title") or None,
            )
        except CarePlanForkError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            CarePlanDetailSerializer(plan).data,
            status=status.HTTP_201_CREATED,
        )


class CarePlanSubmitView(APIView):
    """POST /api/careplans/plans/<uuid>/submit/ — lock the plan for grading."""

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, pk, *args, **kwargs):
        try:
            plan = CarePlan.objects.get(pk=pk, student=request.user)
        except CarePlan.DoesNotExist:
            return Response(
                {"detail": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if plan.is_submitted:
            return Response(
                {"detail": "This plan has already been submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan.mark_submitted()
        return Response(
            CarePlanDetailSerializer(plan).data,
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Goals and interventions (nested CRUD on an owned plan)
# ---------------------------------------------------------------------------
class _PlanOwnedObjectMixin:
    """Mixin: fetch the plan by UUID, scoped to the current user."""

    def get_plan(self, request, plan_id) -> CarePlan:
        try:
            return CarePlan.objects.get(pk=plan_id, student=request.user)
        except CarePlan.DoesNotExist:
            raise PermissionDenied("Plan not found.")


class SmartGoalListCreateView(_PlanOwnedObjectMixin, APIView):
    """
    GET/POST /api/careplans/plans/<plan_id>/goals/
    """

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        goals = plan.goals.order_by("position")
        return Response(SmartGoalSerializer(goals, many=True).data)

    def post(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        if plan.is_submitted:
            return Response(
                {"detail": "Cannot add goals to a submitted plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        next_pos = plan.goals.count()
        data = request.data.copy()
        data["position"] = next_pos

        serializer = SmartGoalSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        goal = serializer.save(care_plan=plan)
        return Response(SmartGoalSerializer(goal).data, status=status.HTTP_201_CREATED)


class InterventionListCreateView(_PlanOwnedObjectMixin, APIView):
    """
    GET/POST /api/careplans/plans/<plan_id>/interventions/
    """

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        interventions = plan.interventions.order_by("position")
        return Response(InterventionSerializer(interventions, many=True).data)

    def post(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        if plan.is_submitted:
            return Response(
                {"detail": "Cannot add interventions to a submitted plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        next_pos = plan.interventions.count()
        data = request.data.copy()
        data["position"] = next_pos

        serializer = InterventionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        intervention = serializer.save(care_plan=plan)
        return Response(
            InterventionSerializer(intervention).data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Share links
# ---------------------------------------------------------------------------
class CarePlanShareLinkCreateView(APIView):
    """POST /api/careplans/plans/<plan_id>/share/"""

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, plan_id, *args, **kwargs):
        serializer = CreateShareLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            plan = CarePlan.objects.get(pk=plan_id, student=request.user)
        except CarePlan.DoesNotExist:
            return Response(
                {"detail": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            link = create_share_link(
                plan=plan,
                requesting_user=request.user,
                days_valid=serializer.validated_data["days_valid"],
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            CarePlanShareLinkSerializer(link).data,
            status=status.HTTP_201_CREATED,
        )


class SharedCarePlanView(APIView):
    """
    GET /api/careplans/shared/<token>/
    PUBLIC — no authentication required. Returns the plan if the token
    is valid (not revoked, not expired).
    """

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def get(self, request, token, *args, **kwargs):
        try:
            link = CarePlanShareLink.objects.select_related(
                "care_plan__primary_diagnosis", "care_plan__student"
            ).get(token=token)
        except CarePlanShareLink.DoesNotExist:
            return Response(
                {"detail": "Invalid share link."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not link.is_valid():
            return Response(
                {"detail": "This share link has expired or been revoked."},
                status=status.HTTP_410_GONE,
            )

        plan = link.care_plan
        return Response(CarePlanPublicSerializer(plan).data)


# ---------------------------------------------------------------------------
# Public library + ratings
# ---------------------------------------------------------------------------
class PublicCarePlanListView(generics.ListAPIView):
    """
    GET /api/careplans/public/
    Lists public care plans (community library).
    """

    serializer_class = CarePlanPublicSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get_queryset(self):
        return (
            CarePlan.objects.filter(is_public=True)
            .select_related("primary_diagnosis", "student")
            .prefetch_related(
                Prefetch("goals", queryset=SmartGoal.objects.order_by("position")),
                Prefetch("interventions", queryset=Intervention.objects.order_by("position")),
                "ratings",
            )
            .order_by("-updated_at")
        )


class CarePlanRateView(APIView):
    """
    POST /api/careplans/plans/<plan_id>/ratings/
    Create or update the current user's rating of a public plan.
    """

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, plan_id, *args, **kwargs):
        try:
            plan = CarePlan.objects.get(pk=plan_id, is_public=True)
        except CarePlan.DoesNotExist:
            return Response(
                {"detail": "Public plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if plan.student_id == request.user.id:
            return Response(
                {"detail": "You cannot rate your own plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CarePlanRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rating, created = CarePlanRating.objects.update_or_create(
            care_plan=plan,
            rater=request.user,
            defaults={
                "score": serializer.validated_data["score"],
                "comment": serializer.validated_data.get("comment", ""),
            },
        )

        return Response(
            CarePlanRatingSerializer(rating).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )