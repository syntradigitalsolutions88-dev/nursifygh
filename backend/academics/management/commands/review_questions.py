"""
Flag potentially problematic questions in the database for review.

Usage:
    python manage.py review_questions                    # review ALL pending
    python manage.py review_questions --course NPN-311   # review one course
    python manage.py review_questions --all-statuses     # include APPROVED questions
    python manage.py review_questions --fix              # auto-fix what's safe
"""
from django.core.management.base import BaseCommand
from django.db.models import Q

from academics.models import Question


SUSPICIOUS_ALWAYS_NEVER_WORDS = [
    "always", "never", "obviously", "only", "impossible",
    "all of the above", "none of the above",
]


class Command(BaseCommand):
    help = "Flag potentially problematic questions for manual review."

    def add_arguments(self, parser):
        parser.add_argument("--course", type=str, help="Filter by course code.")
        parser.add_argument("--all-statuses", action="store_true", help="Include approved questions.")
        parser.add_argument("--fix", action="store_true", help="Auto-fix safe issues (no clinical judgement).")

    def handle(self, *args, **options):
        qs = Question.objects.select_related("course").prefetch_related("choices")

        if options["course"]:
            qs = qs.filter(course__code=options["course"])

        if not options["all_statuses"]:
            qs = qs.filter(review_status="PENDING")

        total = qs.count()
        self.stdout.write(self.style.MIGRATE_HEADING(f"Scanning {total} questions...\n"))

        flagged = []

        for q in qs:
            issues = []
            choices = list(q.choices.all())
            correct = [c for c in choices if c.is_correct]

            # 1. Exactly 1 correct choice
            if len(correct) != 1:
                issues.append(f"has {len(correct)} correct choices (expected 1)")

            # 2. Exactly 4 choices
            if len(choices) != 4:
                issues.append(f"has {len(choices)} choices (expected 4)")

            # 3. Rationale length
            if len((q.rationale or "").strip()) < 100:
                issues.append(f"rationale is short ({len((q.rationale or '').strip())} chars)")

            # 4. Question text length
            if len((q.text or "").strip()) < 30:
                issues.append(f"question text is very short ({len((q.text or '').strip())} chars)")

            # 5. Suspicious words in correct answer
            if correct:
                ca = correct[0].text.lower()
                for w in SUSPICIOUS_ALWAYS_NEVER_WORDS:
                    if w in ca:
                        issues.append(f"correct answer contains suspicious word '{w}'")
                        break

            # 6. Duplicate question text in same course
            dupe = Question.objects.filter(
                course=q.course, text=q.text
            ).exclude(pk=q.pk).exists()
            if dupe:
                issues.append("duplicate question text in same course")

            if issues:
                flagged.append((q, issues))

        # ── Report
        self.stdout.write(self.style.SUCCESS(f"\nFlagged: {len(flagged)} / {total}\n"))
        for q, issues in flagged[:200]:  # cap display at 200
            self.stdout.write(f"  [{q.course.code}] {q.text[:70]}...")
            for issue in issues:
                self.stdout.write(self.style.WARNING(f"    ✗ {issue}"))
            self.stdout.write("")

        if len(flagged) > 200:
            self.stdout.write(self.style.WARNING(
                f"... and {len(flagged) - 200} more (truncated)\n"
            ))

        # ── Optional auto-fix
        if options["fix"]:
            fixed = 0
            for q, issues in flagged:
                # Only fix the safe stuff
                for issue in issues:
                    if "duplicate question text" in issue:
                        q.delete()
                        fixed += 1
                        break
                    if "question text is very short" in issue:
                        # Can't auto-fix content — skip
                        pass

            self.stdout.write(self.style.SUCCESS(f"\nAuto-fixed: {fixed} (deleted duplicates)"))