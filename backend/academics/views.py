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
    Lists published courses for the authenticated student's level and program.
    Optional query params: ?category=FUNDAMENTALS&semester=S1
    """

    serializer_class = CourseListSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        qs = (
            Course.objects.filter(
                is_published=True,
                level=user.level,
                program=user.program,
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
        user = self.request.user
        return (
            Course.objects.filter(
                is_published=True,
                level=user.level,
                program=user.program,
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
import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from accounts.permissions import IsSubscribed
from .models import Course, Question
from .serializers import QuestionPublicSerializer

class MockExamView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get(self, request):
        user = request.user
        # 1. Get all courses for this student's level and program
        courses = Course.objects.filter(is_published=True, level=user.level, program=user.program)
        
        # 2. Get all questions from those courses
        all_questions = list(Question.objects.filter(course__in=courses, is_published=True))
        
        # 3. Shuffle and pick 50 (or fewer if they don't have that many yet)
        random.shuffle(all_questions)
        selected_questions = all_questions[:50]
        
        # 4. Serialize and return
        serializer = QuestionPublicSerializer(selected_questions, many=True)
        return Response({
            "title": f"Level {user.level} Mock Exam",
            "total_questions": len(selected_questions),
            "duration_minutes": 60,
            "questions": serializer.data
        })

from .models import Choice
from django.utils import timezone
from .serializers import QuizAttemptResultSerializer

class MockExamSubmitView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request):
        answers = request.data.get("answers", {})
        # answers looks like: {"question_uuid": "choice_uuid", ...}
        
        if not answers:
            return Response({"detail": "No answers provided"}, status=400)
            
        question_ids = list(answers.keys())
        questions = Question.objects.filter(id__in=question_ids)
        
        if not questions:
            return Response({"detail": "Questions not found"}, status=400)
            
        # Get the courses from the first question (assuming single-level exam)
        first_course = questions.first().course
        
        correct_count = 0
        total = len(questions)
        
        for q in questions:
            chosen_choice_id = answers.get(str(q.id))
            if not chosen_choice_id:
                continue
            is_correct = Choice.objects.filter(id=chosen_choice_id, question=q, is_correct=True).exists()
            if is_correct:
                correct_count += 1

        score = round((correct_count / total) * 100, 2) if total > 0 else 0
        
        attempt = QuizAttempt.objects.create(
            student=request.user,
            course=first_course,
            total_questions=total,
            correct_answers=correct_count,
            score_percentage=score,
            completed_at=timezone.now()
        )
        
        return Response({
            "attempt_id": attempt.id,
            "score_percentage": score,
            "correct_answers": correct_count,
            "total_questions": total
        })
