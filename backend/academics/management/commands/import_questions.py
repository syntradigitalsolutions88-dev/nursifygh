"""
Import NMC-style MCQ questions from JSON files.

Supports TWO file shapes:

SHAPE A — Single course:
{
  "program": "GENERAL", "level": 300, "semester": "S1",
  "course_code": "MMN-311", "course_title": "...", "category": "MED_SURG",
  "topics": [...], "questions": [...]
}

SHAPE B — Multiple courses:
{
  "program": "GENERAL", "level": 300, "semester": "S1",
  "courses": [
    {"course_code": "NPN-311", "course_title": "...", "category": "...", "semester": "S1", "topics": [...], "questions": [...]},
    {"course_code": "OBN-311", ...}
  ]
}

Usage:
    python manage.py import_questions path/to/file.json
    python manage.py import_questions path/to/folder/ --all
    python manage.py import_questions path/to/file.json --dry-run
    python manage.py import_questions path/to/file.json --approve
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from academics.models import Choice, Course, Question


class Command(BaseCommand):
    help = "Import NMC-style MCQ questions from JSON files (single-course or multi-course)."

    def add_arguments(self, parser):
        parser.add_argument("path", type=str, help="JSON file or folder of JSON files.")
        parser.add_argument("--all", action="store_true", help="If path is a folder, import all .json inside.")
        parser.add_argument("--approve", action="store_true", help="Import as APPROVED instead of PENDING.")
        parser.add_argument("--dry-run", action="store_true", help="Validate only, no DB writes.")

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"Path not found: {path}")

        if path.is_dir():
            if not options["all"]:
                raise CommandError("Path is a folder — pass --all to import every .json inside.")
            json_files = sorted(path.glob("*.json"))
            if not json_files:
                raise CommandError(f"No .json files found in {path}")
        else:
            json_files = [path]

        review_status = "APPROVED" if options["approve"] else "PENDING"
        dry_run = options["dry_run"]
        mode_label = review_status + (" (DRY RUN)" if dry_run else "")
        self.stdout.write(self.style.MIGRATE_HEADING(f"Import mode: {mode_label}"))
        self.stdout.write("")

        grand_created = 0
        grand_skipped = 0
        grand_errors = 0

        for jf in json_files:
            self.stdout.write(self.style.MIGRATE_HEADING(f"── {jf.name}"))
            with jf.open("r", encoding="utf-8") as f:
                try:
                    payload = json.load(f)
                except json.JSONDecodeError as e:
                    self.stdout.write(self.style.ERROR(f"  ✗ JSON parse error: {e}"))
                    grand_errors += 1
                    continue

            # Support both single-course and multi-course shapes
            if "courses" in payload:
                courses_payload = payload["courses"]
            else:
                courses_payload = [payload]

            if not isinstance(courses_payload, list) or not courses_payload:
                self.stdout.write(self.style.ERROR("  ✗ No courses found in file"))
                grand_errors += 1
                continue

            for course_data in courses_payload:
                created, skipped, errors = self._import_one_course(
                    course_data, review_status, dry_run
                )
                grand_created += created
                grand_skipped += skipped
                grand_errors += len(errors)

                self.stdout.write(
                    f"  {course_data.get('course_code', '?')}: "
                    f"created={created}, skipped={skipped}, errors={len(errors)}"
                )
                for e in errors:
                    self.stdout.write(self.style.WARNING(f"    ✗ {e}"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"TOTAL: created={grand_created}, skipped={grand_skipped}, errors={grand_errors}"
        ))

        if review_status == "PENDING" and not dry_run and grand_created > 0:
            self.stdout.write(self.style.NOTICE(
                "New questions imported as PENDING. Approve them in admin or run "
                "python manage.py approve_questions <course_code>"
            ))

    def _import_one_course(self, data, review_status, dry_run):
        created = 0
        skipped = 0
        errors = []

        code = data.get("course_code")
        if not code:
            return 0, 0, ["Missing course_code"]

        try:
            course = Course.objects.get(code=code)
        except Course.DoesNotExist:
            return 0, 0, [f"Course not found: {code}"]

        questions = data.get("questions") or []
        if not questions:
            return 0, 0, [f"{code}: no questions"]

        with transaction.atomic():
            for i, q in enumerate(questions, start=1):
                try:
                    qtext = (q.get("question_text") or "").strip()
                    choices = q.get("choices") or []
                    rationale = (q.get("rationale") or "").strip()

                    if not qtext:
                        raise ValueError(f"Q{i}: empty question_text")
                    if len(choices) < 2:
                        raise ValueError(f"Q{i}: fewer than 2 choices")
                    correct = sum(1 for c in choices if c.get("is_correct"))
                    if correct != 1:
                        raise ValueError(f"Q{i}: expected 1 correct, got {correct}")
                    if not rationale:
                        raise ValueError(f"Q{i}: empty rationale")

                    if Question.objects.filter(course=course, text=qtext).exists():
                        skipped += 1
                        continue

                    if dry_run:
                        created += 1
                        continue

                    question = Question.objects.create(
                        course=course,
                        text=qtext,
                        rationale=rationale,
                        is_published=(review_status == "APPROVED"),
                        review_status=review_status,
                    )
                    for pos, c in enumerate(choices):
                        Choice.objects.create(
                            question=question,
                            text=(c.get("text") or "").strip(),
                            is_correct=bool(c.get("is_correct")),
                            position=pos,
                        )
                    created += 1

                except Exception as e:
                    errors.append(str(e))

        return created, skipped, errors