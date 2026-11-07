"""
Bulk import questions from a CSV file.

Usage:
    python manage.py import_questions path/to/questions.csv

CSV format (header row required):
    course_code,question_text,choice_a,choice_b,choice_c,choice_d,
    correct_choice,rationale,choice_a_rationale,choice_b_rationale,
    choice_c_rationale,choice_d_rationale

- course_code:         e.g. NUR-201
- question_text:       the question itself
- choice_a..choice_d:  four answer options
- correct_choice:      A, B, C, or D
- rationale:           general explanation shown after grading
- choice_X_rationale:  optional per-choice explanation (can be empty)

Validation:
- Rejects rows where correct_choice is not A/B/C/D
- Rejects rows where course_code doesn't exist
- Detects duplicates by (course, question_text) and skips them
- Reports success/failure counts at the end
"""

from __future__ import annotations

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from academics.models import Choice, Course, Question


REQUIRED_COLUMNS = {
    "course_code",
    "question_text",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "correct_choice",
    "rationale",
}

OPTIONAL_COLUMNS = {
    "choice_a_rationale",
    "choice_b_rationale",
    "choice_c_rationale",
    "choice_d_rationale",
}


class Command(BaseCommand):
    help = "Import questions from a CSV file"

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            type=str,
            help="Path to the CSV file",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate without saving",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"])
        dry_run = options["dry_run"]

        if not csv_path.exists():
            raise CommandError(f"File not found: {csv_path}")

        self.stdout.write(f"Reading {csv_path}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no data will be saved"))

        with csv_path.open(encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                raise CommandError("CSV has no header row")

            header = set(reader.fieldnames)
            missing = REQUIRED_COLUMNS - header
            if missing:
                raise CommandError(
                    f"Missing required columns: {', '.join(sorted(missing))}"
                )

            rows = list(reader)

        self.stdout.write(f"Found {len(rows)} row(s)\n")

        created = 0
        skipped = 0
        failed = 0
        errors: list[str] = []

        for idx, row in enumerate(rows, start=2):  # row 1 is header
            try:
                with transaction.atomic():
                    if self._import_row(row, dry_run=dry_run):
                        created += 1
                    else:
                        skipped += 1
            except Exception as exc:
                failed += 1
                errors.append(f"Row {idx}: {exc}")

        # Summary
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Created: {created}"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"⏭  Skipped (duplicates): {skipped}"))
        if failed:
            self.stdout.write(self.style.ERROR(f"❌ Failed: {failed}"))
            for err in errors[:20]:
                self.stdout.write(self.style.ERROR(f"   {err}"))
            if len(errors) > 20:
                self.stdout.write(self.style.ERROR(f"   … and {len(errors) - 20} more"))

    def _import_row(self, row: dict, *, dry_run: bool) -> bool:
        """Return True if created, False if skipped (duplicate)."""
        course_code = row["course_code"].strip()
        question_text = row["question_text"].strip()
        correct = row["correct_choice"].strip().upper()

        if correct not in ("A", "B", "C", "D"):
            raise ValueError(f"correct_choice must be A/B/C/D, got '{correct}'")

        if not question_text:
            raise ValueError("question_text is empty")

        try:
            course = Course.objects.get(code=course_code)
        except Course.DoesNotExist:
            raise ValueError(f"Course not found: {course_code}")

        # Duplicate check
        if Question.objects.filter(course=course, text=question_text).exists():
            return False

        if dry_run:
            return True

        question = Question.objects.create(
            course=course,
            text=question_text,
            rationale=row.get("rationale", "").strip(),
        )

        choices = [
            ("A", row["choice_a"].strip(), row.get("choice_a_rationale", "").strip(), 0),
            ("B", row["choice_b"].strip(), row.get("choice_b_rationale", "").strip(), 1),
            ("C", row["choice_c"].strip(), row.get("choice_c_rationale", "").strip(), 2),
            ("D", row["choice_d"].strip(), row.get("choice_d_rationale", "").strip(), 3),
        ]

        for letter, text, rationale, position in choices:
            if not text:
                raise ValueError(f"choice_{letter.lower()} is empty")
            Choice.objects.create(
                question=question,
                text=text,
                is_correct=(letter == correct),
                rationale=rationale,
                position=position,
            )

        return True