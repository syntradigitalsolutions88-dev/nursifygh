"""API views for the careplans app."""

from __future__ import annotations

from django.core.exceptions import PermissionDenied
from django.db.models import Count, F, Prefetch
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
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


class NandaDiagnosisListView(generics.ListAPIView):
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
    serializer_class = NandaDiagnosisSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    queryset = NandaDiagnosis.objects.filter(is_active=True)
    lookup_field = "id"


class TemplateListView(generics.ListAPIView):
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
    serializer_class = CarePlanTemplateDetailSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    queryset = CarePlanTemplate.objects.filter(
        is_published=True
    ).select_related("primary_diagnosis")
    lookup_field = "id"


class CarePlanListView(generics.ListAPIView):
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
    serializer_class = CarePlanCreateSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class CarePlanDetailView(generics.RetrieveUpdateAPIView):
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
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, *args, **kwargs):
        serializer = ForkFromTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            template = CarePlanTemplate.objects.get(
                pk=serializer.validated_data["template_id"], is_published=True,
            )
        except CarePlanTemplate.DoesNotExist:
            return Response({"detail": "Template not found or unpublished."}, status=404)
        try:
            plan = fork_from_template(
                student=request.user, template=template,
                title=serializer.validated_data.get("title") or None,
            )
        except CarePlanForkError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(CarePlanDetailSerializer(plan).data, status=201)


class CarePlanForkFromPlanView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, *args, **kwargs):
        serializer = ForkFromPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            source = CarePlan.objects.get(
                pk=serializer.validated_data["source_plan_id"], is_public=True,
            )
        except CarePlan.DoesNotExist:
            return Response({"detail": "Source plan not found or not public."}, status=404)
        try:
            plan = fork_from_plan(
                student=request.user, source=source,
                title=serializer.validated_data.get("title") or None,
            )
        except CarePlanForkError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(CarePlanDetailSerializer(plan).data, status=201)


class CarePlanSubmitView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, pk, *args, **kwargs):
        try:
            plan = CarePlan.objects.get(pk=pk, student=request.user)
        except CarePlan.DoesNotExist:
            return Response({"detail": "Plan not found."}, status=404)
        if plan.is_submitted:
            return Response({"detail": "This plan has already been submitted."}, status=400)
        plan.mark_submitted()
        return Response(CarePlanDetailSerializer(plan).data, status=200)


class _PlanOwnedObjectMixin:
    def get_plan(self, request, plan_id) -> CarePlan:
        try:
            return CarePlan.objects.get(pk=plan_id, student=request.user)
        except CarePlan.DoesNotExist:
            raise PermissionDenied("Plan not found.")


class SmartGoalListCreateView(_PlanOwnedObjectMixin, APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        goals = plan.goals.order_by("position")
        return Response(SmartGoalSerializer(goals, many=True).data)

    def post(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        if plan.is_submitted:
            return Response({"detail": "Cannot add goals to a submitted plan."}, status=400)
        next_pos = plan.goals.count()
        data = request.data.copy()
        data["position"] = next_pos
        serializer = SmartGoalSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        goal = serializer.save(care_plan=plan)
        return Response(SmartGoalSerializer(goal).data, status=201)


class InterventionListCreateView(_PlanOwnedObjectMixin, APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        interventions = plan.interventions.order_by("position")
        return Response(InterventionSerializer(interventions, many=True).data)

    def post(self, request, plan_id, *args, **kwargs):
        plan = self.get_plan(request, plan_id)
        if plan.is_submitted:
            return Response({"detail": "Cannot add interventions to a submitted plan."}, status=400)
        next_pos = plan.interventions.count()
        data = request.data.copy()
        data["position"] = next_pos
        serializer = InterventionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        intervention = serializer.save(care_plan=plan)
        return Response(InterventionSerializer(intervention).data, status=201)


class CarePlanShareLinkCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, plan_id, *args, **kwargs):
        serializer = CreateShareLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            plan = CarePlan.objects.get(pk=plan_id, student=request.user)
        except CarePlan.DoesNotExist:
            return Response({"detail": "Plan not found."}, status=404)
        try:
            link = create_share_link(
                plan=plan, requesting_user=request.user,
                days_valid=serializer.validated_data["days_valid"],
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=403)
        return Response(CarePlanShareLinkSerializer(link).data, status=201)


class SharedCarePlanView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request, token, *args, **kwargs):
        try:
            link = CarePlanShareLink.objects.select_related(
                "care_plan__primary_diagnosis", "care_plan__student"
            ).get(token=token)
        except CarePlanShareLink.DoesNotExist:
            return Response({"detail": "Invalid share link."}, status=404)
        if not link.is_valid():
            return Response({"detail": "This share link has expired or been revoked."}, status=410)
        return Response(CarePlanPublicSerializer(link.care_plan).data)


class PublicCarePlanListView(generics.ListAPIView):
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


class PublicCarePlanDetailView(APIView):
    """
    GET /api/careplans/public/<uuid>/
    PUBLIC — no auth required. Returns a single public care plan
    and increments the view count.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request, plan_id, *args, **kwargs):
        plan = (
            CarePlan.objects.filter(id=plan_id, is_public=True)
            .select_related("primary_diagnosis", "student")
            .prefetch_related(
                Prefetch("goals", queryset=SmartGoal.objects.order_by("position")),
                Prefetch("interventions", queryset=Intervention.objects.order_by("position")),
                "ratings",
            )
            .first()
        )
        if not plan:
            return Response({"detail": "Not found."}, status=404)

        # Increment view count (fire-and-forget)
        CarePlan.objects.filter(id=plan.id).update(view_count=F("view_count") + 1)
        plan.refresh_from_db(fields=["view_count"])

        return Response(CarePlanPublicSerializer(plan).data)


class CarePlanRateView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, plan_id, *args, **kwargs):
        try:
            plan = CarePlan.objects.get(pk=plan_id, is_public=True)
        except CarePlan.DoesNotExist:
            return Response({"detail": "Public plan not found."}, status=404)
        if plan.student_id == request.user.id:
            return Response({"detail": "You cannot rate your own plan."}, status=400)
        serializer = CarePlanRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rating, created = CarePlanRating.objects.update_or_create(
            care_plan=plan, rater=request.user,
            defaults={
                "score": serializer.validated_data["score"],
                "comment": serializer.validated_data.get("comment", ""),
            },
        )
        return Response(
            CarePlanRatingSerializer(rating).data,
            status=201 if created else 200,
        )