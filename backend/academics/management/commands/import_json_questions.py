import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction, close_old_connections
from academics.models import Course, Question, Choice


class Command(BaseCommand):
    help = "Bulk-import questions from a JSON file into a target course code (or all programs sharing that base code)."

    def add_arguments(self, parser):
        parser.add_argument("json_file", type=str, help="Path to JSON file containing a list of questions or {'questions': [...]}")
        parser.add_argument("--code", type=str, required=True, help="Course code (e.g. MMN-311, NPN-311, OBN-311)")
        parser.add_argument("--all-programs", action="store_true", help="Import into all program variants (e.g. OBN-311, -C, -M, -P)")

    def handle(self, *args, **opts):
        raw = json.loads(Path(opts["json_file"]).read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else raw.get("questions", [])
        code = opts["code"].strip().upper()

        courses = Course.objects.filter(code__startswith=code) if opts["all_programs"] else Course.objects.filter(code__iexact=code)
        if not courses.exists():
            self.stdout.write(self.style.ERROR(f"No course found matching {code}"))
            return

        q_fields = {f.name for f in Question._meta.fields}
        c_fields = {f.name for f in Choice._meta.fields}

        for course in courses:
            close_old_connections()
            existing = {t.strip().lower() for t in Question.objects.filter(course=course).values_list("text", flat=True)}
            saved = 0
            for item in items:
                q_text = (item.get("text") or item.get("question") or "").strip()
                choices = item.get("choices") or item.get("options") or []
                if not q_text or len(choices) < 4 or q_text.lower() in existing:
                    continue

                valid = []
                correct_count = 0
                for idx, ch in enumerate(choices[:4], start=1):
                    c_text = (ch.get("text") or "").strip()
                    is_corr = bool(ch.get("is_correct"))
                    if not c_text:
                        break
                    if is_corr:
                        correct_count += 1
                    valid.append((idx, c_text, is_corr, (ch.get("rationale") or "").strip()))

                if len(valid) != 4 or correct_count != 1:
                    continue

                with transaction.atomic():
                    qk = {"course": course, "text": q_text, "rationale": (item.get("rationale") or "").strip()}
                    if "is_published" in q_fields:
                        qk["is_published"] = True
                    if "review_status" in q_fields:
                        qk["review_status"] = "APPROVED"
                    q_obj = Question.objects.create(**qk)

                    c_objs = []
                    for pos, c_text, is_corr, c_rat in valid:
                        ck = {"question": q_obj, "text": c_text, "is_correct": is_corr}
                        if "rationale" in c_fields:
                            ck["rationale"] = c_rat
                        if "position" in c_fields:
                            ck["position"] = pos
                        c_objs.append(Choice(**ck))
                    Choice.objects.bulk_create(c_objs)

                existing.add(q_text.lower())
                saved += 1

            self.stdout.write(self.style.SUCCESS(f"{course.code}: imported {saved} new Qs (total now {Question.objects.filter(course=course).count()})"))
