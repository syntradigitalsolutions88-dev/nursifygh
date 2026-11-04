"""API views for the academics app."""

from __future__ import annotations

from django.db.models import Count, Prefetch
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSubscribed
from .models import Course, Question, QuizAttempt
from .serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    QuizAttemptResultSerializer,
    QuizSubmissionSerializer,
)
from .services import QuizGradingError, grade_and_persist_attempt


class CourseListView(generics.ListAPIView):
    """
    GET /api/academics/courses/
    Lists published courses for the authenticated student's level.
    Optional query params: ?category=FUNDAMENTALS&semester=S1
    """

    serializer_class = CourseListSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    pagination_class = None

    def get_queryset(self):
        qs = (
            Course.objects.filter(
                is_published=True, level=self.request.user.level
            )
            .annotate(_question_count=Count("questions", distinct=True))
            .order_by("semester", "code")
        )
        category = self.request.query_params.get("category")
        semester = self.request.query_params.get("semester")
        if category:
            qs = qs.filter(category=category)
        if semester:
            qs = qs.filter(semester=semester)
        return qs


class CourseDetailView(generics.RetrieveAPIView):
    """
    GET /api/academics/courses/<uuid>/
    Returns the course plus its full question set (no answer keys).
    """

    serializer_class = CourseDetailSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    lookup_field = "id"

    def get_queryset(self):
        return (
            Course.objects.filter(
                is_published=True, level=self.request.user.level
            )
            .prefetch_related(
                Prefetch(
                    "questions",
                    queryset=Question.objects.filter(
                        is_published=True
                    ).prefetch_related("choices"),
                )
            )
        )


class QuizSubmitView(APIView):
    """
    POST /api/academics/quizzes/submit/
    Body: {"course_id": "<uuid>", "answers": [{"question_id": "...", "choice_id": "..."}]}
    Returns the graded attempt with per-question rationale for review.
    """

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, *args, **kwargs):
        serializer = QuizSubmissionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course_id"]
        answers = serializer.validated_data["answers"]

        try:
            attempt = grade_and_persist_attempt(
                student=request.user, course=course, submitted_answers=answers
            )
        except QuizGradingError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        attempt = (
            QuizAttempt.objects.select_related("course")
            .prefetch_related(
                "answers__question__choices",
                "answers__selected_choice",
            )
            .get(pk=attempt.pk)
        )
        return Response(
            QuizAttemptResultSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )


class QuizHistoryView(generics.ListAPIView):
    """
    GET /api/academics/quizzes/history/
    Returns the authenticated student's attempt history (most recent first).
    """

    serializer_class = QuizAttemptResultSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get_queryset(self):
        return (
            QuizAttempt.objects.filter(student=self.request.user)
            .select_related("course")
            .prefetch_related(
                "answers__question__choices",
                "answers__selected_choice",
            )
            .order_by("-started_at")
        )