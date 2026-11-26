import json
import os
import re
import time
from urllib import request as urlrequest, error as urlerror
from django.core.management.base import BaseCommand
from django.db import transaction, close_old_connections
from academics.models import Course, Question, Choice


PRIORITY_KEYWORDS = [
    "Advanced Nursing III",
    "Medicine and Medical Nursing III",
    "Nursing Process",
    "Obstetric Nursing",
]


class Command(BaseCommand):
    help = "Add +N unique NMC-aligned MCQs to each priority Level 300 course (Advanced Nursing III, Medical Nursing III, Nursing Process, Obstetric Nursing)."

    def add_arguments(self, parser):
        parser.add_argument("--add", type=int, default=200, help="Number of NEW questions to add to each matching course (default: 200)")
        parser.add_argument("--batch", type=int, default=12, help="Questions per LLM API call (default: 12)")
        parser.add_argument("--program", type=str, default="", help="Optional filter: GENERAL, COMMUNITY, MIDWIFERY, PSYCHIATRIC")

    def _get_llm_config(self):
        api_key = (
            os.getenv("OPENAI_API_KEY")
            or os.getenv("LLM_API_KEY")
            or os.getenv("GROQ_API_KEY")
            or os.getenv("OPENROUTER_API_KEY")
            or os.getenv("TOGETHER_API_KEY")
        )
        base_url = (
            os.getenv("OPENAI_BASE_URL")
            or os.getenv("LLM_BASE_URL")
            or ("https://api.groq.com/openai/v1" if os.getenv("GROQ_API_KEY") else "https://openrouter.ai/api/v1")
        ).rstrip("/")
        model = os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL") or "openai/gpt-oss-120b"
        if not api_key:
            raise RuntimeError("No LLM API key found in .env (checked OPENAI_API_KEY, LLM_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY).")
        return api_key, base_url, model

    def _call_llm(self, api_key, base_url, model, course, count, existing_samples):
        avoid_block = ""
        if existing_samples:
            avoid_block = "Avoid duplicating or rephrasing these existing stems:\n- " + "\n- ".join(existing_samples[:25])

        prompt = (
            f"Generate {count} unique, exam-standard Nursing & Midwifery Council (N&MC Ghana) multiple-choice questions "
            f"for Ghanaian NMTC students.\n"
            f"Program: {course.program} | Level: {course.level} | Course Code: {course.code} | Course Title: {course.title}\n"
            f"Requirements:\n"
            f"1. Match Ghanaian NMTC Level 300 curriculum and clinical practice guidelines (include scenario-based prioritization, dosage calculations, pharmacology, nursing process steps, and ward/obstetric emergencies where applicable).\n"
            f"2. Each question must have exactly 4 distinct options (positions 1..4) with exactly 1 correct option.\n"
            f"3. Provide a clear clinical 'rationale' (1-2 sentences) for the question AND a brief 'rationale' (1 short sentence) for each of the 4 choices.\n"
            f"{avoid_block}\n\n"
            f"Return ONLY valid JSON with key 'questions', a list of objects:\n"
            f'{{"questions": [{{"text": "...", "rationale": "...", "choices": ['
            f'{{"text": "...", "is_correct": true, "rationale": "..."}}, '
            f'{{"text": "...", "is_correct": false, "rationale": "..."}}, '
            f'{{"text": "...", "is_correct": false, "rationale": "..."}}, '
            f'{{"text": "...", "is_correct": false, "rationale": "..."}}]}}]}}'
        )

        payload = json.dumps({
            "model": model,
            "temperature": 0.75,
            "max_tokens": 4096,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a senior Ghanaian Nursing & Midwifery Council (N&MC) exam item writer. Output strictly valid JSON only."},
                {"role": "user", "content": prompt},
            ],
        }).encode("utf-8")

        req = urlrequest.Request(
            f"{base_url}/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NursifyGH-PrioritySeeder/1.0",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        raw = data["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        try:
            parsed = json.loads(raw)
            return parsed.get("questions", [])
        except json.JSONDecodeError:
            decoder = json.JSONDecoder()
            items = []
            idx = raw.find("[")
            if idx != -1:
                idx += 1
                while idx < len(raw):
                    while idx < len(raw) and raw[idx] in " \r\n\t,":
                        idx += 1
                    if idx >= len(raw) or raw[idx] == "]":
                        break
                    try:
                        obj, end_idx = decoder.raw_decode(raw, idx)
                        if isinstance(obj, dict) and "text" in obj and "choices" in obj:
                            items.append(obj)
                        idx = end_idx
                    except json.JSONDecodeError:
                        break
            if items:
                return items
            raise

    def handle(self, *args, **opts):
        add_count = opts["add"]
        batch_size = opts["batch"]
        prog_filter = opts["program"].strip().upper()

        api_key, base_url, model = self._get_llm_config()
        self.stdout.write(self.style.SUCCESS(f"Connected to {base_url} ({model}) | Adding +{add_count} Qs per priority course"))

        program_order = ["GENERAL", "MIDWIFERY", "COMMUNITY", "PSYCHIATRIC"]
        if prog_filter:
            program_order = [prog_filter]

        courses = []
        for prog in program_order:
            for kw in PRIORITY_KEYWORDS:
                matches = Course.objects.filter(level=300, program=prog, title__iexact=kw).order_by("code")
                if not matches.exists():
                    matches = Course.objects.filter(level=300, program=prog, title__icontains=kw).order_by("code")
                for c in matches:
                    if c.id not in {x.id for x in courses}:
                        courses.append(c)

        if not courses:
            self.stdout.write(self.style.WARNING("No matching Level 300 priority courses found."))
            return

        q_field_names = {f.name for f in Question._meta.fields}
        c_field_names = {f.name for f in Choice._meta.fields}

        for course in courses:
            close_old_connections()
            start_total = Question.objects.filter(course=course).count()
            goal_total = start_total + add_count
            added_for_course = 0

            self.stdout.write(self.style.HTTP_INFO(
                f"\n=== {course.code} | {course.title} ({course.program} L{course.level}) | Start: {start_total} -> Goal: {goal_total} (+{add_count}) ==="
            ))

            while added_for_course < add_count:
                close_old_connections()
                remaining = add_count - added_for_course
                needed = min(batch_size, remaining)

                existing_qs = list(
                    Question.objects.filter(course=course).order_by("-id").values_list("text", flat=True)
                )
                normalized_existing = {s.strip().lower() for s in existing_qs}
                recent_samples = existing_qs[:30]

                self.stdout.write(f"  [{course.code}: +{added_for_course}/{add_count}] Generating {needed} Qs...")
                try:
                    items = self._call_llm(api_key, base_url, model, course, needed, recent_samples)
                except urlerror.HTTPError as exc:
                    body = exc.read().decode("utf-8", errors="ignore")
                    wait_sec = 15.0
                    m = re.search(r"try again in ([0-9.]+)s", body)
                    if m:
                        wait_sec = float(m.group(1)) + 2.0
                    self.stdout.write(self.style.WARNING(f"  HTTP {exc.code}: waiting {wait_sec:.1f}s before retry..."))
                    time.sleep(wait_sec)
                    continue
                except Exception as exc:
                    self.stdout.write(self.style.WARNING(f"  API retry after error: {exc}"))
                    time.sleep(5)
                    continue

                saved = 0
                for item in items:
                    if added_for_course >= add_count:
                        break
                    q_text = (item.get("text") or "").strip()
                    choices = item.get("choices") or []
                    if not q_text or len(choices) < 4:
                        continue
                    if q_text.lower() in normalized_existing:
                        continue

                    valid_choices = []
                    correct_count = 0
                    for idx, ch in enumerate(choices[:4], start=1):
                        c_text = (ch.get("text") or "").strip()
                        if not c_text:
                            break
                        is_corr = bool(ch.get("is_correct"))
                        if is_corr:
                            correct_count += 1
                        valid_choices.append((idx, c_text, is_corr, (ch.get("rationale") or "").strip()))

                    if len(valid_choices) != 4 or correct_count != 1:
                        continue

                    close_old_connections()
                    with transaction.atomic():
                        q_kwargs = {
                            "course": course,
                            "text": q_text,
                            "rationale": (item.get("rationale") or "").strip(),
                        }
                        if "is_published" in q_field_names:
                            q_kwargs["is_published"] = True
                        if "review_status" in q_field_names:
                            q_kwargs["review_status"] = "APPROVED"

                        q_obj = Question.objects.create(**q_kwargs)
                        choice_objs = []
                        for pos, c_text, is_corr, c_rat in valid_choices:
                            c_kwargs = {
                                "question": q_obj,
                                "text": c_text,
                                "is_correct": is_corr,
                            }
                            if "rationale" in c_field_names:
                                c_kwargs["rationale"] = c_rat
                            if "position" in c_field_names:
                                c_kwargs["position"] = pos
                            choice_objs.append(Choice(**c_kwargs))
                        Choice.objects.bulk_create(choice_objs)

                    normalized_existing.add(q_text.lower())
                    saved += 1
                    added_for_course += 1

                current_total = Question.objects.filter(course=course).count()
                self.stdout.write(self.style.SUCCESS(
                    f"  -> Saved {saved} new Qs ({course.code} now at {current_total} total | +{added_for_course}/{add_count})"
                ))
                time.sleep(3.5)

        self.stdout.write(self.style.SUCCESS("\nAll priority courses boosted by +200 questions!"))
