from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Choice, Course, Flashcard, FlashcardReview, QuizAnswer


def _serialize_card(card: Flashcard, review: FlashcardReview | None, now) -> dict:
    is_due = True if review is None else review.next_review_at <= now
    is_weak = False if review is None else (review.lapses >= 2 or (review.review_count > 0 and review.correct_count / review.review_count < 0.6))
    return {
        "id": str(card.id),
        "course_id": str(card.course_id),
        "course_code": card.course.code,
        "course_title": card.course.title,
        "topic": card.topic or card.course.get_category_display(),
        "front": card.front,
        "back": card.back,
        "rationale": card.rationale,
        "difficulty": card.difficulty,
        "is_from_quiz": card.source_question_id is not None,
        "review": {
            "ease_factor": review.ease_factor if review else 2.5,
            "interval_days": review.interval_days if review else 0,
            "repetitions": review.repetitions if review else 0,
            "lapses": review.lapses if review else 0,
            "review_count": review.review_count if review else 0,
            "correct_count": review.correct_count if review else 0,
            "is_bookmarked": review.is_bookmarked if review else False,
            "is_due": is_due,
            "is_weak": is_weak,
            "next_review_at": review.next_review_at.isoformat() if review else now.isoformat(),
        },
    }


class FlashcardListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        course_id = request.query_params.get("course")
        mode = request.query_params.get("mode", "all")  # all | due | bookmarked | weak

        qs = Flashcard.objects.select_related("course", "source_question").filter(
            Q(is_public=True) | Q(created_by=request.user)
        )
        if course_id:
            qs = qs.filter(course_id=course_id)

        cards = list(qs[:100])
        card_ids = [c.id for c in cards]
        reviews_map = {
            r.flashcard_id: r
            for r in FlashcardReview.objects.filter(student=request.user, flashcard_id__in=card_ids)
        }

        payload = []
        for card in cards:
            item = _serialize_card(card, reviews_map.get(card.id), now)
            if mode == "due" and not item["review"]["is_due"]:
                continue
            if mode == "bookmarked" and not item["review"]["is_bookmarked"]:
                continue
            if mode == "weak" and not item["review"]["is_weak"]:
                continue
            payload.append(item)

        return Response({"results": payload, "count": len(payload)})

    def post(self, request):
        course_id = request.data.get("course_id")
        front = (request.data.get("front") or "").strip()
        back = (request.data.get("back") or "").strip()
        rationale = (request.data.get("rationale") or "").strip()
        topic = (request.data.get("topic") or "").strip()
        difficulty = request.data.get("difficulty", "INTERMEDIATE")

        if not course_id or not front or not back:
            return Response(
                {"detail": "course_id, front, and back are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course = Course.objects.filter(id=course_id).first()
        if not course:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        card = Flashcard.objects.create(
            course=course,
            created_by=request.user,
            topic=topic,
            front=front,
            back=back,
            rationale=rationale,
            difficulty=difficulty if difficulty in {"BEGINNER", "INTERMEDIATE", "ADVANCED"} else "INTERMEDIATE",
            is_public=False,
        )
        review = FlashcardReview.objects.create(student=request.user, flashcard=card)
        return Response(_serialize_card(card, review, timezone.now()), status=status.HTTP_201_CREATED)


class FlashcardReviewUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        card_id = request.data.get("flashcard_id")
        rating = (request.data.get("rating") or "").strip().lower()
        toggle_bookmark = bool(request.data.get("toggle_bookmark", False))

        card = Flashcard.objects.select_related("course").filter(id=card_id).first()
        if not card:
            return Response({"detail": "Flashcard not found."}, status=status.HTTP_404_NOT_FOUND)

        review, _ = FlashcardReview.objects.get_or_create(student=request.user, flashcard=card)

        if toggle_bookmark:
            review.is_bookmarked = not review.is_bookmarked
            review.save()

        if rating in {"again", "hard", "good", "easy"}:
            review.apply_rating(rating)
            review.save()
        elif not toggle_bookmark:
            return Response(
                {"detail": "Provide a valid rating (again, hard, good, easy) or toggle_bookmark=true."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(_serialize_card(card, review, timezone.now()))


class SyncWeakQuizCardsView(APIView):
    """Creates revision flashcards from a student's missed quiz questions."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        missed_answers = (
            QuizAnswer.objects.select_related("question__course", "attempt")
            .filter(attempt__student=request.user, is_correct=False)
            .order_by("-attempt__started_at")[:25]
        )

        created_count = 0
        for ans in missed_answers:
            q = ans.question
            correct_choice = Choice.objects.filter(question=q, is_correct=True).first()
            if not correct_choice:
                continue

            existing = Flashcard.objects.filter(
                source_question=q,
                created_by=request.user,
            ).first()
            if existing:
                continue

            card = Flashcard.objects.create(
                course=q.course,
                source_question=q,
                created_by=request.user,
                topic="Missed Quiz Concept",
                front=q.text,
                back=correct_choice.text,
                rationale=correct_choice.rationale or q.rationale or "",
                difficulty="INTERMEDIATE",
                is_public=False,
            )
            FlashcardReview.objects.get_or_create(student=request.user, flashcard=card)
            created_count += 1

        return Response({"created_count": created_count})


class FlashcardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        reviews = list(
            FlashcardReview.objects.select_related("flashcard__course").filter(student=request.user)
        )
        total_cards = Flashcard.objects.filter(Q(is_public=True) | Q(created_by=request.user)).count()
        reviewed_ids = {r.flashcard_id for r in reviews if r.review_count > 0}
        due_reviews = sum(1 for r in reviews if r.review_count > 0 and r.next_review_at <= now)
        unseen_cards = max(0, total_cards - len(reviewed_ids))
        due_count = due_reviews + unseen_cards
        bookmarked_count = sum(1 for r in reviews if r.is_bookmarked)

        total_attempts = sum(r.review_count for r in reviews)
        total_correct = sum(r.correct_count for r in reviews)
        accuracy = round((total_correct / total_attempts) * 100, 1) if total_attempts > 0 else 0.0

        # Calculate consecutive daily streak from last_reviewed_at dates
        review_days = sorted(
            {r.last_reviewed_at.date() for r in reviews if r.last_reviewed_at is not None},
            reverse=True,
        )
        streak_days = 0
        cursor = now.date()
        if review_days and review_days[0] < cursor - timezone.timedelta(days=1):
            streak_days = 0
        else:
            if review_days and review_days[0] == cursor - timezone.timedelta(days=1):
                cursor = cursor - timezone.timedelta(days=1)
            day_set = set(review_days)
            while cursor in day_set:
                streak_days += 1
                cursor -= timezone.timedelta(days=1)

        # Weak course breakdown
        weak_by_course: dict[str, dict] = {}
        for r in reviews:
            is_weak = r.lapses >= 2 or (r.review_count > 0 and r.correct_count / r.review_count < 0.6)
            if is_weak:
                code = r.flashcard.course.code
                entry = weak_by_course.setdefault(
                    code,
                    {"course_code": code, "course_title": r.flashcard.course.title, "weak_cards": 0},
                )
                entry["weak_cards"] += 1

        weak_topics = sorted(weak_by_course.values(), key=lambda x: x["weak_cards"], reverse=True)[:5]

        return Response(
            {
                "due_count": due_count,
                "bookmarked_count": bookmarked_count,
                "total_cards": total_cards,
                "accuracy_percent": accuracy,
                "streak_days": streak_days,
                "weak_topics": weak_topics,
            }
        )