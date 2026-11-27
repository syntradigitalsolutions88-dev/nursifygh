import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from academics.models import Choice, Course, Question


class Command(BaseCommand):
    help = "Import one or more JSON question batch files into NursifyGH courses."

    def add_arguments(self, parser):
        parser.add_argument("files", nargs="+", type=str, help="Path(s) to JSON batch files")

    def handle(self, *args, **options):
        for file_arg in options["files"]:
            path = Path(file_arg)
            if not path.exists():
                raise CommandError(f"File not found: {path}")

            data = json.loads(path.read_text(encoding="utf-8"))
            code = data["course_code"]
            level = int(data["level"])

            course = Course.objects.filter(code=code, level=level).first()
            if not course:
                raise CommandError(f"Course {code} (Level {level}) not found. Run seed_all_nac_nap_catalog first.")

            added = 0
            for q_item in data["questions"]:
                q, created = Question.objects.get_or_create(
                    course=course,
                    text=q_item["text"].strip(),
                    defaults={
                        "rationale": q_item.get("rationale", "").strip(),
                        "is_published": True,
                        "review_status": "APPROVED",
                    },
                )
                if created:
                    added += 1
                    for idx, ch in enumerate(q_item["choices"]):
                        Choice.objects.create(
                            question=q,
                            text=ch["text"].strip(),
                            is_correct=bool(ch["is_correct"]),
                            position=ch.get("position", idx),
                        )

            total = Question.objects.filter(course=course).count()
            self.stdout.write(
                self.style.SUCCESS(f"{path.name} -> {code} (L{level}): +{added} added (Total: {total}/400)")
            )
