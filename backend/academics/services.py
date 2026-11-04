"""
Domain services for the academics app.

Grading logic lives here (not in the view) so it's testable, reusable from
management commands, and — when we later introduce Celery — swappable to an
async task without touching HTTP plumbing.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable

from django.db import transaction
from django.utils import timezone

from accounts.models import User
from .models import Choice, Course, Question, QuizAnswer, QuizAttempt


class QuizGradingError(Exception):
    """Raised when a submission cannot be graded safely."""


@transaction.atomic
def grade_and_persist_attempt(
    *,
    student: User,
    course: Course,
    submitted_answers: Iterable[dict],
) -> QuizAttempt:
    """
    Grade a quiz submission and persist the attempt + answers atomically.

    `submitted_answers` is an iterable of dicts with shape:
        {"question_id": UUID, "choice_id": UUID | None}

    The serializer has already validated that:
      - course matches the student's level,
      - question ids belong to the course,
      - no duplicate questions exist.
    """
    answers_list = list(submitted_answers)
    question_ids = [a["question_id"] for a in answers_list]

    questions = {
        q.id: q
        for q in Question.objects.filter(
            id__in=question_ids, course=course, is_published=True
        ).prefetch_related("choices")
    }
    if len(questions) != len(question_ids):
        raise QuizGradingError(
            "One or more questions do not belong to this course or are unpublished."
        )

    choice_ids = [a["choice_id"] for a in answers_list if a.get("choice_id")]
    choices = {c.id: c for c in Choice.objects.filter(id__in=choice_ids)}

    attempt = QuizAttempt.objects.create(
        student=student,
        course=course,
        total_questions=len(answers_list),
        started_at=timezone.now(),
    )

    correct_count = 0
    answer_rows: list[QuizAnswer] = []

    for submitted in answers_list:
        question = questions[submitted["question_id"]]
        choice_id = submitted.get("choice_id")
        selected: Choice | None = None

        if choice_id is not None:
            selected = choices.get(choice_id)
            if selected is None or selected.question_id != question.id:
                raise QuizGradingError(
                    f"Choice {choice_id} does not belong to question {question.id}."
                )

        is_correct = bool(selected and selected.is_correct)
        if is_correct:
            correct_count += 1

        answer_rows.append(
            QuizAnswer(
                attempt=attempt,
                question=question,
                selected_choice=selected,
                is_correct=is_correct,
            )
        )

    QuizAnswer.objects.bulk_create(answer_rows)

    total = attempt.total_questions or 1
    pct = (Decimal(correct_count) / Decimal(total) * Decimal(100)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    attempt.correct_answers = correct_count
    attempt.score_percentage = pct
    attempt.completed_at = timezone.now()
    attempt.save(update_fields=[
        "correct_answers", "score_percentage", "completed_at",
    ])

    return attempt