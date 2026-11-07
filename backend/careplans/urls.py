"""URL configuration for the careplans app."""

from django.urls import path

from .views import (
    CarePlanCreateView,
    CarePlanDetailView,
    CarePlanForkFromPlanView,
    CarePlanForkFromTemplateView,
    CarePlanListView,
    CarePlanRateView,
    CarePlanShareLinkCreateView,
    CarePlanSubmitView,
    InterventionListCreateView,
    NandaDiagnosisDetailView,
    NandaDiagnosisListView,
    PublicCarePlanDetailView,
    PublicCarePlanListView,
    SharedCarePlanView,
    SmartGoalListCreateView,
    TemplateDetailView,
    TemplateListView,
)

app_name = "careplans"

urlpatterns = [
    # NANDA catalog
    path("nanda/", NandaDiagnosisListView.as_view(), name="nanda-list"),
    path("nanda/<uuid:id>/", NandaDiagnosisDetailView.as_view(), name="nanda-detail"),

    # Templates
    path("templates/", TemplateListView.as_view(), name="template-list"),
    path("templates/<uuid:id>/", TemplateDetailView.as_view(), name="template-detail"),

    # Plans (owner-scoped CRUD)
    path("plans/", CarePlanListView.as_view(), name="plan-list"),
    path("plans/create/", CarePlanCreateView.as_view(), name="plan-create"),
    path("plans/<uuid:id>/", CarePlanDetailView.as_view(), name="plan-detail"),
    path("plans/<uuid:pk>/submit/", CarePlanSubmitView.as_view(), name="plan-submit"),

    # Forking
    path("plans/fork-from-template/", CarePlanForkFromTemplateView.as_view(), name="plan-fork-template"),
    path("plans/fork-from-plan/", CarePlanForkFromPlanView.as_view(), name="plan-fork-plan"),

    # Goals + interventions
    path("plans/<uuid:plan_id>/goals/", SmartGoalListCreateView.as_view(), name="plan-goals"),
    path("plans/<uuid:plan_id>/interventions/", InterventionListCreateView.as_view(), name="plan-interventions"),

    # Share links
    path("plans/<uuid:plan_id>/share/", CarePlanShareLinkCreateView.as_view(), name="plan-share-create"),
    path("shared/<str:token>/", SharedCarePlanView.as_view(), name="shared-plan"),

    # Public library + ratings
    path("public/", PublicCarePlanListView.as_view(), name="public-plans"),
    path("public/<uuid:plan_id>/", PublicCarePlanDetailView.as_view(), name="public-plan-detail"),
    path("plans/<uuid:plan_id>/ratings/", CarePlanRateView.as_view(), name="plan-rate"),
]