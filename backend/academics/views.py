"""API views for the academics app."""

from __future__ import annotations

import base64
import json
import logging
import random

import requests
from django.conf import settings
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSubscribed
from .models import Choice, Course, Question, QuizAnswer, QuizAttempt
from .serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    QuestionPublicSerializer,
    QuizAttemptResultSerializer,
    QuizSubmissionSerializer,
)
from .services import QuizGradingError, grade_and_persist_attempt

logger = logging.getLogger(__name__)


# ─── Course listing / detail ──────────────────────────────────────────────────


class CourseListView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        qs = (
            Course.objects.filter(is_published=True, level=user.level, program=user.program)
            .annotate(
                _question_count=Count(
                    "questions",
                    filter=Q(questions__review_status="APPROVED", questions__is_published=True),
                    distinct=True,
                )
            )
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
    serializer_class = CourseDetailSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        return (
            Course.objects.filter(is_published=True, level=user.level, program=user.program)
            .prefetch_related(
                Prefetch(
                    "questions",
                    queryset=Question.objects.filter(
                        is_published=True, review_status="APPROVED"
                    ).prefetch_related("choices"),
                )
            )
        )


# ─── Quiz submit / history ────────────────────────────────────────────────────


class QuizSubmitView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request, *args, **kwargs):
        serializer = QuizSubmissionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course_id"]
        answers = serializer.validated_data["answers"]

        try:
            attempt = grade_and_persist_attempt(
                student=request.user, course=course, submitted_answers=answers
            )
        except QuizGradingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        attempt = (
            QuizAttempt.objects.select_related("course")
            .prefetch_related("answers__question__choices", "answers__selected_choice")
            .get(pk=attempt.pk)
        )
        return Response(QuizAttemptResultSerializer(attempt).data, status=status.HTTP_201_CREATED)


class QuizHistoryView(generics.ListAPIView):
    serializer_class = QuizAttemptResultSerializer
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get_queryset(self):
        return (
            QuizAttempt.objects.filter(student=self.request.user)
            .select_related("course")
            .prefetch_related("answers__question__choices", "answers__selected_choice")
            .order_by("-started_at")
        )


# ─── Mock exam ────────────────────────────────────────────────────────────────


class MockExamView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get(self, request):
        user = request.user
        courses = Course.objects.filter(is_published=True, level=user.level, program=user.program)
        all_questions = list(
            Question.objects.filter(
                course__in=courses, is_published=True, review_status="APPROVED"
            )
        )
        random.shuffle(all_questions)
        selected_questions = all_questions[:50]

        serializer = QuestionPublicSerializer(selected_questions, many=True)
        return Response({
            "title": f"Level {user.level} Mock Exam",
            "total_questions": len(selected_questions),
            "duration_minutes": 60,
            "questions": serializer.data,
        })


class MockExamSubmitView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request):
        answers = request.data.get("answers", {})
        if not answers:
            return Response({"detail": "No answers provided"}, status=400)

        question_ids = list(answers.keys())

        # SECURITY: only score questions from this user's program + level,
        # approved and published — prevents cross-program answer-padding.
        questions = Question.objects.filter(
            id__in=question_ids,
            course__level=request.user.level,
            course__program=request.user.program,
            course__is_published=True,
            is_published=True,
            review_status="APPROVED",
        )
        if not questions.exists():
            return Response({"detail": "No valid questions submitted"}, status=400)

        first_course = questions.first().course
        correct_count = 0
        total = questions.count()

        for q in questions:
            chosen_choice_id = answers.get(str(q.id))
            if not chosen_choice_id:
                continue
            if Choice.objects.filter(id=chosen_choice_id, question=q, is_correct=True).exists():
                correct_count += 1

        score = round((correct_count / total) * 100, 2) if total > 0 else 0

        attempt = QuizAttempt.objects.create(
            student=request.user,
            course=first_course,
            total_questions=total,
            correct_answers=correct_count,
            score_percentage=score,
            completed_at=timezone.now(),
        )

        return Response({
            "attempt_id": attempt.id,
            "score_percentage": score,
            "correct_answers": correct_count,
            "total_questions": total,
        })


# ─── Past Paper OCR ───────────────────────────────────────────────────────────

PAST_PAPER_PROMPT = (
    "You are an OCR and nursing exam extraction assistant for Ghanaian N&MC past papers. "
    "The image is a photo of a nursing exam question page. Extract EVERY question you can see.\n\n"
    "Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):\n"
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "question_text": "Full question text",\n'
    '      "options": ["A. option text", "B. option text", "C. option text", "D. option text"],\n'
    '      "correct_answer": "A",\n'
    '      "rationale": ""\n'
    "    }\n"
    "  ]\n"
    "}\n\n"
    "RULES:\n"
    "1. Extract the question text EXACTLY as written — do not paraphrase.\n"
    "2. If the correct answer is marked, set 'correct_answer' to the letter (A, B, C, or D).\n"
    "3. If the correct answer is NOT visible, set 'correct_answer' to null.\n"
    "4. Keep 'rationale' as an empty string.\n"
    "5. If a question has fewer than 4 options, include only visible options.\n"
    "6. If no questions are visible, return {\"questions\": []}."
)


class PastPaperExtractView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsSubscribed)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"error": "No image uploaded."}, status=400)

        if image_file.size > 20 * 1024 * 1024:
            return Response({"error": "Image is too large. Max 20MB."}, status=400)

        api_key = getattr(settings, "GROQ_API_KEY", None)
        if not api_key:
            return Response({"error": "AI is not configured."}, status=500)

        image_bytes = image_file.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        mime = image_file.content_type or "image/jpeg"

        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json={
                    "model": "qwen/qwen3.8-27b",
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": PAST_PAPER_PROMPT},
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                        ],
                    }],
                    "temperature": 0.1,
                    "max_tokens": 4000,
                    "response_format": {"type": "json_object"},
                },
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                timeout=90,
            )

            if r.status_code != 200:
                logger.error("Groq vision error: %s - %s", r.status_code, r.text[:500])
                return Response({"error": "AI could not read this image."}, status=500)

            content = r.json()["choices"][0]["message"]["content"]
            data = json.loads(content)
            return Response(data)
        except json.JSONDecodeError:
            return Response({"error": "AI returned invalid data. Please try again."}, status=500)
        except Exception:
            logger.exception("Past paper extraction failed")
            return Response({"error": "AI is currently unavailable."}, status=500)


class PastPaperSaveView(APIView):
    """Save extracted questions to a specific course, pending review."""

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def post(self, request):
        course_id = request.data.get("course_id")
        questions = request.data.get("questions", [])

        if not course_id or not questions:
            return Response({"error": "course_id and questions are required."}, status=400)

        try:
            course = Course.objects.get(id=course_id, level=request.user.level, program=request.user.program)
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=404)

        import re

        created = 0
        for q in questions:
            text = q.get("question_text", "").strip()
            text = re.sub(r"^\d+[\.\)]\s*", "", text)
            choices = q.get("choices", [])
            if not text or len(choices) < 2:
                continue

            question = Question.objects.create(
                course=course,
                text=text,
                rationale=q.get("rationale", ""),
                is_published=False,
                review_status="PENDING",
                uploaded_by=request.user,
            )
            for pos, choice in enumerate(choices):
                Choice.objects.create(
                    question=question,
                    text=choice.get("text", "").strip(),
                    is_correct=bool(choice.get("is_correct")),
                    position=pos,
                )
            created += 1

        return Response({
            "created": created,
            "message": f"{created} question(s) submitted for review. They'll appear in the quiz once approved.",
        })


class MySubmissionsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        questions = (
            Question.objects.filter(uploaded_by=request.user)
            .select_related("course")
            .order_by("-created_at")
        )
        return Response([
            {
                "id": str(q.id),
                "text": q.text,
                "course_code": q.course.code,
                "course_title": q.course.title,
                "review_status": q.review_status,
                "review_note": q.review_note,
                "created_at": q.created_at.isoformat(),
            }
            for q in questions
        ])


# ─── Weak Areas ──────────────────────────────────────────────────────────────


class WeakAreasView(APIView):
    """Return the student's weakest courses based on quiz accuracy."""

    permission_classes = (permissions.IsAuthenticated, IsSubscribed)

    def get(self, request):
        from collections import defaultdict

        answers = (
            QuizAnswer.objects.filter(
                attempt__student=request.user,
                attempt__completed_at__isnull=False,
            )
            .select_related("question__course")
        )

        stats = defaultdict(lambda: {"total": 0, "correct": 0, "course": None})

        for ans in answers:
            course = ans.question.course
            key = course.id
            stats[key]["course"] = course
            stats[key]["total"] += 1
            if ans.is_correct:
                stats[key]["correct"] += 1

        result = []
        for data in stats.values():
            if data["total"] < 3:
                continue
            accuracy = round((data["correct"] / data["total"]) * 100)
            if accuracy < 60:
                course = data["course"]
                result.append({
                    "course_id": str(course.id),
                    "course_code": course.code,
                    "course_title": course.title,
                    "accuracy": accuracy,
                    "correct": data["correct"],
                    "total": data["total"],
                })

        result.sort(key=lambda x: x["accuracy"])
        return Response(result[:5])