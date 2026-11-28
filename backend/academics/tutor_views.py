from django.db import models
import logging
import json
import os
import re
import urllib.error
import urllib.request
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are the NursifyGH AI Tutor—a polished, articulate, and authoritative educator for Ghanaian "
    "nursing/midwifery students (RGN, RM, RPN, Community Health) and visitors.\n\n"
    "FORMATTING & STYLE RULES (STRICT):\n"
    "- Never use horizontal divider lines (no '---', '___', or '***').\n"
    "- Never use markdown pipe tables ('| col |') or raw '#' / '**' / '*' symbols; write clean plain text "
    "with short headings on their own line and simple bullet points starting with '• '.\n"
    "- Match the question naturally and professionally: for general vocabulary, definitions, or everyday "
    "questions (such as word meanings), give a clear, natural, accurate explanation without forcing "
    "unnecessary clinical analogies. For anatomy, physiology, pharmacology, science, or nursing questions, "
    "give a clear definition, key mechanisms or bulleted points, and practical study/clinical takeaways.\n\n"
    "NURSIFYGH PLATFORM FEATURES:\n"
    "• AI Nursing & Science Tutor (/ai-tutor): Instant explanations across anatomy, physiology, chemistry, "
    "pharmacology, nursing priorities, and clinical case stages.\n"
    "• NMC Licensure Question Bank & CBT Simulator (/cbt-simulator): 3,000+ practice questions across courses "
    "and domains, timed mock exams, and detailed rationales.\n"
    "• Interactive Clinical Case Studies (/cases): Step-by-step patient scenarios with vitals, triage, and AI Tutor help.\n"
    "• Flashcards & Revision (/revision): Active-recall study decks for fast exam review.\n"
    "• NANDA Care Plans, Clinical Logbook & Semester Pass: Care planning tools, printable logbook transcripts, "
    "3-day free trial, and GHS 30 for 120 days via manual MoMo.\n\n"
    "CLINICAL ACCURACY & EXAM INTELLIGENCE RULES:\n"
    "- Lead with clear, direct reasoning: state the core definition or clinical priority upfront.\n"
    "- For multiple-choice or scenario questions, explain why the priority choice is safest AND why common "
    "distractors or delayed actions carry risk.\n"
    "- Never guess or invent unverified drug doses, infusion rates, or local protocols; state established "
    "principles clearly and advise verifying exact doses/orders against current clinical guidelines.\n"
    "- Keep paragraphs concise and easy to read on mobile phones during ward shifts or study blocks.\n"
    "- ANTI-REPETITION & ACCURACY: Never repeat any term, suffix, root, definition, or Example/Takeaway block. When asked for N items (e.g., 50 suffixes), give distinct, accurate items with clear meanings and examples. When corrected by a student, acknowledge it directly and adjust immediately.\n"
    "ACADEMIC MODES: NMC/MCQ questions -> lead with best answer/priority, why it wins, why distractors fail, and exam trap. Medical terminology -> prefix/root/suffix breakdown, literal/clinical meaning, one distinct example per item, zero repeats. Science/pharmacology -> crisp definition, step-by-step mechanism, nursing priorities, no guessed doses. Care plans -> Assessment, PES diagnosis, SMART goal, interventions with rationales, evaluation.\n"
)
def _normalize_typos(text: str) -> str:
    q = (text or "").lower()
    replacements = [
        (r"\bcadio[a-z]*\b", "cardiovascular"),
        (r"\bcardi[a-z]*\b", "cardiovascular"),
        (r"\bmitocondr[a-z]*\b", "mitochondria"),
        (r"\bosmos[a-z]*\b", "osmosis"),
        (r"\bdifus[a-z]*\b", "diffusion"),
        (r"\bchemistr[a-z]*\b", "chemistry"),
        (r"\bbiol[a-z]*\b", "biology"),
        (r"\banatom[a-z]*\b", "anatomy"),
        (r"\bphysiolog[a-z]*\b", "physiology"),
        (r"\bmegnesium\b", "magnesium"),
        (r"\bpre-?eclam[a-z]*\b", "pre-eclampsia"),
        (r"\bhaemorr[a-z]*|\bhemorr[a-z]*\b", "haemorrhage"),
    ]
    for pattern, target in replacements:
        q = re.sub(pattern, target, q)
    return q


def _is_greeting(text: str) -> bool:
    cleaned = re.sub(r"[^a-z\s]", "", (text or "").strip().lower())
    return bool(
        re.match(
            r"^(hi|hello|hey|good morning|good afternoon|good evening|medaase|akwaba)(\s+(tutor|there|coach))?$",
            cleaned,
        )
    )


def _clean_ai_output(text: str) -> str:
    cleaned_lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        # Remove horizontal rule lines or table separator lines
        if re.fullmatch(r"[-_*=]{3,}", line):
            continue
        if re.fullmatch(r"[\s|:-]+", line) and "|" in line:
            continue
        # Convert markdown table rows into clean bullet lines
        if line.startswith("|") and line.endswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|") if c.strip()]
            if cells:
                line = "• " + " — ".join(cells)
        # Strip leading markdown heading hashes and bold/italic markers
        line = re.sub(r"^#{1,6}\s*", "", line)
        line = re.sub(r"^\*+\s*", "• ", line)
        line = line.replace("**", "").replace("__", "").replace("`", "")
        line = re.sub(r"(?<!\w)\*(?!\s)|(?<!\s)\*(?!\w)", "", line)
        cleaned_lines.append(line)
    deduped, seen = [], set()
    for line in cleaned_lines:
        norm = re.sub(r"^(?:\d+[.)]|[-•])\s*", "", line.strip()).lower()
        norm = re.sub(r"\s+", " ", norm)
        if len(norm) >= 14 and norm in seen:
            continue
        if len(norm) >= 14:
            seen.add(norm)
        deduped.append(line)
    result = "\n".join(deduped)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def _call_live_llm(prompt: str, history: list | None = None) -> tuple[str | None, str | None]:
    api_key = (os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or "").strip()
    api_url = os.getenv("LLM_API_URL", "https://api.groq.com/openai/v1/chat/completions").strip()
    model = os.getenv("LLM_MODEL", "openai/gpt-oss-120b").strip()

    if not api_key or not api_url:
        logger.warning("Live LLM skipped: LLM_API_KEY/GROQ_API_KEY or LLM_API_URL is not configured.")
        return None, None

    payload = {
        "model": model,
        "temperature": 0.3,
        "max_tokens": 2048,
        "frequency_penalty": 0.45,
        "presence_penalty": 0.25,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            *[{"role": ("assistant" if m.get("role") == "assistant" else "user"), "content": str(m.get("content") or "")[:1200]} for m in (history or [])[-6:] if str(m.get("content") or "").strip()],
            {"role": "user", "content": prompt},
        ],
    }

    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "NursifyGH-Tutor/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choices = data.get("choices") or []
            if choices:
                content = ((choices[0].get("message") or {}).get("content") or "").strip()
                if content:
                    return _clean_ai_output(content), f"NursifyGH Live AI Tutor • {model}"
            logger.warning("Live LLM returned empty choices from %s (model=%s)", api_url, model)
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="ignore")[:300]
        except Exception:
            pass
        logger.warning("Live LLM HTTPError %s from %s: %s", exc.code, api_url, body)
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, OSError) as exc:
        logger.warning("Live LLM request failed (%s): %s", type(exc).__name__, exc)

    return None, None

def _generate_tutor_response(prompt_text: str) -> dict:
    trimmed = (prompt_text or "").strip()
    q = _normalize_typos(trimmed)

    if _is_greeting(trimmed):
        return {
            "framework": "Academic Study Coach • Ready",
            "reply": (
                "Welcome. I am here to help you master coursework, science fundamentals, clinical reasoning, and exam rationales.\n"
                "How would you like to study right now?\n"
                "• Chemistry & Biology: Ask about chemical bonding, pH/buffers, stoichiometry, cell organelles, ATP/respiration, or osmosis.\n"
                "• Clinical Priorities & Safety: Ask about emergencies, vitals red flags, or medication monitoring (such as MgSO4 or PPH).\n"
                "• Care Plans & Exam Prep: Ask how to frame a NANDA-I diagnosis, SMART goal, or break down a multiple-choice question."
            ),
        }

    if any(k in q for k in ("medical term", "terminology", "prefix", "suffix", "root word")):
        return {
            "framework": "Medical Terminology • Structural & Clinical Guide",
            "reply": (
                "Core Definition: Medical terminology is the standardized clinical language used to describe anatomy, pathology, diagnostic procedures, and interventions precisely across health teams and health records.\n"
                "1. Word Components:\n"
                "• Root Word: The core meaning of the term, usually referring to a body part, organ, or system (e.g., cardi/o = heart, hepat/o = liver, nephr/o = kidney).\n"
                "• Prefix: Placed at the beginning to modify meaning—such as location, number, time, or status (e.g., tachy- = fast, brady- = slow, dys- = difficult/painful/abnormal).\n"
                "• Suffix: Placed at the end to indicate a condition, process, procedure, or disorder (e.g., -itis = inflammation, -ectomy = surgical removal, -megaly = enlargement).\n"
                "• Combining Vowel: Usually 'o' (sometimes 'i' or 'a'), used to link a root to a suffix starting with a consonant (e.g., hepat/o + -itis -> hepatitis; cardi/o + -megaly -> cardiomegaly).\n"
                "2. Academic & Clinical Precision Tip: Decode the suffix first, then the prefix, then the root—and avoid unapproved abbreviations in formal clinical documentation."
            ),
        }

    if any(k in q for k in ("magnesium", "mgso4", "pre-eclampsia", "eclampsia")):
        return {
            "framework": "Obstetric Safety & High-Alert Medication Protocol",
            "reply": (
                "1. Clinical Priority: Severe pre-eclampsia—especially with persistent headache, visual disturbances, or epigastric pain—carries seizure/eclampsia risk.\n"
                "2. Essential Safety Monitoring: Prior to and during magnesium sulfate (MgSO4) therapy, verify respiratory rate (typically >= 12–16 breaths/min), deep tendon (patellar) reflexes, and hourly urine output (typically >= 30 mL/hr).\n"
                "3. Toxicity Recognition & Response: Respiratory depression, absent patellar reflexes, or oliguria signals magnesium toxicity. Hold/stop the infusion immediately, support airway/oxygenation, escalate urgently, and keep 10% calcium gluconate ready as antidote.\n"
                "4. Exam Reasoning Rule: Link physiological signs directly to toxicity and safety before selecting supportive interventions."
            ),
        }

    if any(k in q for k in ("pph", "postpartum", "haemorrhage", "bleeding")):
        return {
            "framework": "ABCDE + Uterine Tone Clinical Priority",
            "reply": (
                "1. Immediate Escalation: Call for help promptly—primary postpartum haemorrhage can progress rapidly.\n"
                "2. Focused Assessment: Assess ABCDE alongside uterine tone (firm vs. soft/boggy), bladder distension, and estimated blood loss.\n"
                "3. Priority Interventions: Perform gentle fundal massage to stimulate contraction, support prescribed uterotonic therapy and IV fluid/blood resuscitation, and monitor BP, pulse, and SpO2 closely.\n"
                "4. Exam Reasoning Rule: Prioritise uterine tone, team escalation, and haemodynamic monitoring."
            ),
        }

    if any(k in q for k in ("incidence", "prevalence", "epidemiology", "biostatistics", "rate")):
        return {
            "framework": "Epidemiology & Biostatistics • Core Distinctions",
            "reply": (
                "1. Incidence vs. Prevalence:\n"
                "• Incidence measures NEW cases of a disease developing in a population at risk over a specified time period.\n"
                "• Prevalence measures ALL existing cases (new and pre-existing) in a defined population at a point or period in time.\n"
                "2. Key Relationship: Prevalence rises when incidence increases or when illness duration lengthens.\n"
                "3. Exam Tip: Identify 'new cases' for incidence versus 'all existing cases / burden' for prevalence."
            ),
        }

    if any(k in q for k in ("care plan", "nanda", "smart")):
        return {
            "framework": "NANDA-I / NIC / NOC Structured Care Planning",
            "reply": (
                "1. Assessment: Combine subjective symptoms with objective signs, vitals, and diagnostic findings.\n"
                "2. Nursing Diagnosis (PES Format): Problem + related-to (etiology) + as-evidenced-by (defining characteristics).\n"
                "3. SMART Outcome / Goal: Write a Specific, Measurable, Achievable, Relevant, and Time-bound patient outcome.\n"
                "4. Interventions & Evaluation: State clear nursing actions with rationales, then evaluate against the goal."
            ),
        }

    if any(k in q for k in ("chemistry", "ph", "acid", "base", "buffer", "bond", "covalent", "ionic", "mole", "molarity")):
        return {
            "framework": "Chemistry & Biochemistry • Core Principles",
            "reply": (
                f'Topic Under Review: "{trimmed}"\n'
                "1. Core Chemical Concept: Structure, bonding (ionic vs. covalent/hydrogen bonds), concentration/moles, and acid-base/buffer equilibrium govern how substances react and behave in solutions and living systems.\n"
                "2. Step-by-Step Breakdown: Identify reactants/ions/species, convert units consistently (e.g., mL to L, g to mol), and track proton/electron transfer or equilibrium shifts.\n"
                "3. Biological & Clinical Relevance: Connect chemical behavior (such as pH buffering, osmolarity, or drug ionization/solubility) to physiological stability and safe lab/clinical interpretation."
            ),
        }

    if any(k in q for k in ("biology", "cell", "organelle", "mitochondria", "atp", "osmosis", "diffusion", "cardiovascular", "anatomy", "physiology")):
        return {
            "framework": "Biology, Anatomy & Physiology • Core Mechanisms",
            "reply": (
                f'Topic Under Review: "{trimmed}"\n'
                "1. Structure & Function: Identify the cellular, tissue, organ, or system structures involved and their homeostatic role.\n"
                "2. Physiological / Biochemical Mechanism: Trace energy flow (e.g., ATP/cellular respiration), concentration/pressure gradients (e.g., diffusion, osmosis, blood flow/resistance), or feedback control.\n"
                "3. Clinical & Exam Application: Link normal physiology to what happens during dysfunction, hypoxia, fluid/electrolyte shifts, or targeted therapy."
            ),
        }

    if any(k in q for k in ["gland", "glands", "endocrine", "exocrine"]):
        return {
            "framework": "Anatomy & Physiology • Glandular System Guide",
            "reply": (
                "Core Definition: A gland is a specialized cell, group of cells, or organ that synthesizes and secretes "
                "substances (such as hormones, enzymes, sweat, saliva, or mucus) needed by the body.\n"
                "1. Two Main Classifications:\n"
                "• Endocrine Glands (Ductless): Release hormones directly into the bloodstream to act on distant target organs "
                "(e.g., pituitary, thyroid, parathyroid, adrenal glands, pancreas islets, ovaries/testes).\n"
                "• Exocrine Glands (With Ducts): Secrete products through ducts onto an epithelial surface or body cavity "
                "(e.g., salivary glands, sweat glands, sebaceous glands, mammary glands, exocrine pancreas).\n"
                "2. Clinical & Nursing Takeaways: Endocrine disorders typically present with systemic hormonal imbalances "
                "(such as hypothyroidism/hyperthyroidism or diabetes mellitus), whereas exocrine dysfunction affects local secretion "
                "or duct patency (such as cystic fibrosis or sialadenitis)."
            ),
        }

    if any(k in q for k in ["nursify", "feature", "features", "what can you do", "how does this app", "platform"]):
        return {
            "framework": "NursifyGH Platform & Study Ecosystem Guide",
            "reply": (
                "NursifyGH is an all-in-one nursing and health sciences learning platform built for Ghanaian students:\n"
                "• AI Nursing & Science Tutor (/ai-tutor): Instant explanations across anatomy, physiology, chemistry, pharmacology, "
                "and clinical priorities—including one-click case stage tutoring.\n"
                "• CBT Licensure Simulator & Question Bank (/cbt-simulator): Timed NMC-style practice exams with instant rationales.\n"
                "• Interactive Clinical Case Studies (/cases): Step-by-step Ghanaian patient scenarios with vitals and triage decisions.\n"
                "• Flashcards & Revision Decks (/revision): Active-recall study cards for rapid exam preparation.\n"
                "• Care Plans, Calculators & Progress Tracking: Tools to sharpen clinical judgment and track readiness."
            ),
        }

    return {
        "framework": "Structured Academic & Clinical Reasoning Framework",
        "reply": (
            f'Topic Under Review: "{trimmed}"\n'
            "1. Formal Concept & Context: Define the core concept clearly and identify the scientific, clinical, or academic setting.\n"
            "2. Key Mechanisms / Principles: Break down the underlying physiology, chemistry, protocol, or analytical rule step by step.\n"
            "3. Nursing / Professional Application: Specify priority assessments, safe interventions, and red flags to avoid.\n"
            "4. Exam & Practice Check: Reinforce recall with flashcards (/revision), clinical cases (/cases), or CBT questions (/cbt-simulator)."
        ),
    }


class TutorCoachView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = str(request.data.get("prompt") or "").strip()
        if not prompt:
            return Response({"detail": "Please provide a clinical or study question."}, status=status.HTTP_400_BAD_REQUEST)

        prog = getattr(request.user, "program", "") or ""
        lvl = getattr(request.user, "level", "") or ""
        ctx = " ".join(x for x in [f"Level {lvl}" if lvl else "", prog] if x)
        raw_h = request.data.get("history")
        hist = raw_h if isinstance(raw_h, list) else []
        enriched = f"[Student Profile: {ctx}]\n{prompt}" if ctx else prompt
        live_reply, live_framework = _call_live_llm(enriched, history=hist)
        if live_reply and live_framework:
            return Response(
                {
                    "reply": live_reply,
                    "framework": live_framework,
                    "live_llm_used": True,
                },
                status=status.HTTP_200_OK,
            )

        payload = _generate_tutor_response(prompt)
        payload["live_llm_used"] = False
        return Response(payload, status=status.HTTP_200_OK)


EXAMINER_SYSTEM_PROMPT = (
    "You are a senior Nursing and Midwifery Council (N&MC) of Ghana examiner grading student written scripts. "
    "Evaluate answers fairly based on clinical meaning, safety, and Ghanaian MoH/GHS/N&MC standards—not rigid exact keywords. "
    "Accept valid medical synonyms, paraphrased explanations, and equivalent clinical phrasing. "
    "Award partial credit in 0.5-mark increments (e.g., 0.5, 1.0, 1.5) when an answer is partially correct or omits a requested rationale. "
    "Award 0 marks for blank, irrelevant, or clinically unsafe statements. "
    "Respond ONLY with valid JSON matching the requested schema—no markdown fences or extra commentary."
)


def _round_half(val, max_val):
    try:
        num = float(val)
    except (TypeError, ValueError):
        num = 0.0
    num = max(0.0, min(float(max_val), num))
    return round(num * 2.0) / 2.0


def _call_examiner_llm(user_prompt: str) -> dict | None:
    api_key = (os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or "").strip()
    api_url = os.getenv("LLM_API_URL", "https://api.groq.com/openai/v1/chat/completions").strip()
    model = os.getenv("LLM_MODEL", "openai/gpt-oss-120b").strip()

    if not api_key or not api_url:
        return None

    payload = {
        "model": model,
        "temperature": 0.15,
        "max_tokens": 1800,
        "messages": [
            {"role": "system", "content": EXAMINER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "NursifyGH-Examiner/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=22) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choices = data.get("choices") or []
            if not choices:
                return None
            raw = ((choices[0].get("message") or {}).get("content") or "").strip()
            match = re.search(r"\{[\s\S]*\}", raw)
            if not match:
                return None
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                parsed["_model"] = model
                return parsed
    except Exception as exc:
        logger.warning("Examiner LLM grading fallback triggered (%s): %s", type(exc).__name__, exc)
    return None


class GradeScriptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        exam_type = str(request.data.get("exam_type") or "").upper().strip()
        program = str(request.data.get("program") or "RGN").upper().strip()
        title = str(request.data.get("title") or "").strip()
        scenario = str(request.data.get("scenario") or "").strip()
        total_marks = float(request.data.get("total_marks") or 20)

        if exam_type == "THEORY":
            sections = request.data.get("sections") or []
            if not isinstance(sections, list) or not sections:
                return Response({"ai_graded": False, "reason": "No sections supplied."}, status=status.HTTP_200_OK)

            prompt_lines = [
                f"Programme: {program} | Topic: {title} | Total Marks: {total_marks}",
                f"Clinical Scenario: {scenario}",
                "",
                "Grade each sub-question below against its Official Marking Scheme. Accept paraphrased/synonymous clinical answers and give 0.5-mark partial credit where warranted.",
                "",
            ]
            for sec in sections:
                sec_id = str(sec.get("id") or "")
                label = str(sec.get("label") or "")
                q_prompt = str(sec.get("prompt") or "")
                max_m = float(sec.get("max_marks") or 0)
                model_pts = sec.get("model_points") or []
                ans_lines = [str(a).strip() for a in (sec.get("student_answers") or []) if str(a).strip()]
                prompt_lines.append(f"--- Sub-question id='{sec_id}' | {label} | Max Marks: {max_m} ---")
                prompt_lines.append(f"Question Demand: {q_prompt}")
                prompt_lines.append("Official Marking Scheme Points:")
                for idx, pt in enumerate(model_pts):
                    prompt_lines.append(f"  [{idx}] {pt}")
                prompt_lines.append("Student Written Answer:")
                prompt_lines.append("  " + (" | ".join(ans_lines) if ans_lines else "[LEFT BLANK]"))
                prompt_lines.append("")

            prompt_lines.append(
                'Return JSON strictly in this format: '
                '{"overall_feedback": "2 concise sentences summarizing strengths and what to improve", '
                '"sections": [{"id": "a", "earned": 3.5, "feedback": "1 concise sentence explaining mark awarded", '
                '"covered_indices": [0, 1]}]}'
            )

            ai_data = _call_examiner_llm("\n".join(prompt_lines))
            if not ai_data or not isinstance(ai_data.get("sections"), list):
                return Response({"ai_graded": False}, status=status.HTTP_200_OK)

            ai_sec_map = {str(s.get("id")): s for s in ai_data["sections"] if isinstance(s, dict)}
            normalized_sections = []
            total_earned = 0.0

            for sec in sections:
                sec_id = str(sec.get("id") or "")
                max_m = float(sec.get("max_marks") or 0)
                model_pts = sec.get("model_points") or []
                ans_lines = [str(a).strip() for a in (sec.get("student_answers") or []) if str(a).strip()]
                ai_sec = ai_sec_map.get(sec_id, {})

                earned = 0.0 if not ans_lines else _round_half(ai_sec.get("earned", 0), max_m)
                total_earned += earned
                covered_set = set(ai_sec.get("covered_indices") or []) if ans_lines else set()
                point_results = [
                    {"point": pt, "matched": (idx in covered_set)}
                    for idx, pt in enumerate(model_pts)
                ]
                normalized_sections.append({
                    "id": sec_id,
                    "label": str(sec.get("label") or ""),
                    "maxMarks": max_m,
                    "earned": earned,
                    "feedback": str(ai_sec.get("feedback") or "").strip(),
                    "hits": len(covered_set),
                    "totalClusters": len(model_pts),
                    "pointResults": point_results,
                })

            total_earned = _round_half(total_earned, total_marks)
            pct = round((total_earned / total_marks) * 100) if total_marks > 0 else 0
            _record_tp_attempt(request.user, request.data, "THEORY", total_earned, total_marks, pct, True)
            return Response(
                {
                    "ai_graded": True,
                    "model": ai_data.get("_model", ""),
                    "earnedTotal": total_earned,
                    "totalMarks": total_marks,
                    "pct": pct,
                    "overallFeedback": str(ai_data.get("overall_feedback") or "").strip(),
                    "breakdown": normalized_sections,
                },
                status=status.HTTP_200_OK,
            )

        if exam_type == "PRACTICAL":
            checklist = request.data.get("checklist") or []
            student_sections = request.data.get("student_sections") or {}
            prep = str(student_sections.get("prep") or "").strip()
            exec_txt = str(student_sections.get("exec") or "").strip()
            post = str(student_sections.get("post") or "").strip()

            if not (prep or exec_txt or post) or not isinstance(checklist, list):
                return Response({"ai_graded": False}, status=status.HTTP_200_OK)

            prompt_lines = [
                f"Programme: {program} | OSCE Station: {title} | Total Marks: {total_marks}",
                f"Station Prompt: {scenario}",
                "",
                "Official OSCE Checklist Items:",
            ]
            for item in checklist:
                prompt_lines.append(
                    f"- id='{item.get('id')}' [{item.get('stage')}] ({item.get('marks')} marks): {item.get('text')}"
                )
            prompt_lines.extend([
                "",
                "Student Written Procedure:",
                f"1. Preparation: {prep or '[Blank]'}",
                f"2. Procedure Execution: {exec_txt or '[Blank]'}",
                f"3. Post-Procedure Care: {post or '[Blank]'}",
                "",
                'Grade each checklist item semantically (accepting valid clinical phrasing and awarding 0.5-mark partial credit where partly demonstrated). '
                'Return JSON strictly in this format: '
                '{"overall_feedback": "2 concise sentences on clinical safety, sequence, and omissions", '
                '"items": [{"id": "s1", "awarded": 2.0, "covered": true}]}',
            ])

            ai_data = _call_examiner_llm("\n".join(prompt_lines))
            if not ai_data or not isinstance(ai_data.get("items"), list):
                return Response({"ai_graded": False}, status=status.HTTP_200_OK)

            ai_item_map = {str(it.get("id")): it for it in ai_data["items"] if isinstance(it, dict)}
            normalized_items = []
            final_score = 0.0

            for item in checklist:
                iid = str(item.get("id") or "")
                max_m = float(item.get("marks") or 0)
                ai_it = ai_item_map.get(iid, {})
                awarded = _round_half(ai_it.get("awarded", 0), max_m)
                final_score += awarded
                normalized_items.append({
                    "step": item,
                    "covered": awarded >= (max_m * 0.5) and awarded > 0,
                    "awarded": awarded,
                })

            final_score = _round_half(final_score, total_marks)
            pct = round((final_score / total_marks) * 100) if total_marks > 0 else 0
            _record_tp_attempt(request.user, request.data, "PRACTICAL_WRITE", final_score, total_marks, pct, True)
            return Response(
                {
                    "ai_graded": True,
                    "model": ai_data.get("_model", ""),
                    "finalScore": final_score,
                    "totalMarks": total_marks,
                    "pct": pct,
                    "overallFeedback": str(ai_data.get("overall_feedback") or "").strip(),
                    "checklist": normalized_items,
                },
                status=status.HTTP_200_OK,
            )

        return Response({"ai_graded": False}, status=status.HTTP_200_OK)


def _record_tp_attempt(user, data: dict, default_mode: str, score: float, total_marks: float, pct: int, ai_graded: bool):
    if not user or not getattr(user, "is_authenticated", False):
        return
    try:
        from .models import TheoryPracticalAttemptLog
        pass_pct = 50
        try:
            from .models import TheoryPracticalControlConfig
            pass_pct = TheoryPracticalControlConfig.get_solo().pass_mark_percent
        except Exception:
            pass
        TheoryPracticalAttemptLog.objects.create(
            user=user,
            scenario_id=str(data.get("scenario_id") or "")[:64],
            scenario_title=str(data.get("title") or "Untitled Station")[:200],
            program=str(data.get("program") or "RGN")[:16].upper(),
            mode=str(data.get("mode") or default_mode)[:32],
            score=float(score),
            total_marks=float(total_marks),
            percentage=int(pct),
            passed=bool(int(pct) >= int(pass_pct)),
            ai_graded=bool(ai_graded),
        )
    except Exception as exc:
        logger.warning("Failed to record T&P attempt log: %s", exc)


class TheoryPracticalControlView(APIView):
    """GET returns active T&P feature flags; POST updates settings (staff/admin only)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import TheoryPracticalControlConfig
        cfg = TheoryPracticalControlConfig.get_solo()
        return Response(cfg.to_dict(), status=status.HTTP_200_OK)

    def post(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Staff or administrator access required."}, status=status.HTTP_403_FORBIDDEN)

        from .models import TheoryPracticalControlConfig
        cfg = TheoryPracticalControlConfig.get_solo()
        d = request.data or {}

        for bool_field in (
            "simulator_enabled",
            "ai_examiner_enabled",
            "theory_mode_enabled",
            "practical_mode_enabled",
            "sequence_drill_enabled",
        ):
            if bool_field in d:
                setattr(cfg, bool_field, bool(d[bool_field]))

        if "enabled_programs" in d:
            raw_progs = d["enabled_programs"]
            if isinstance(raw_progs, list):
                cfg.enabled_programs = ",".join(str(x).strip().upper() for x in raw_progs if str(x).strip())
            else:
                cfg.enabled_programs = str(raw_progs).strip()

        for int_field, min_v, max_v in (
            ("default_theory_minutes", 5, 180),
            ("default_practical_minutes", 3, 120),
            ("pass_mark_percent", 1, 100),
        ):
            if int_field in d:
                try:
                    val = int(d[int_field])
                    setattr(cfg, int_field, max(min_v, min(max_v, val)))
                except (TypeError, ValueError):
                    pass

        if "announcement_banner" in d:
            cfg.announcement_banner = str(d["announcement_banner"] or "").strip()[:240]

        cfg.save()
        return Response(cfg.to_dict(), status=status.HTTP_200_OK)


class TheoryPracticalActivityAdminView(APIView):
    """Staff/admin control center view of recent Theory & Practical student activity."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Staff or administrator access required."}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        from django.db.models import Avg, Count
        from .models import TheoryPracticalAttemptLog, TheoryPracticalControlConfig

        User = get_user_model()
        cfg = TheoryPracticalControlConfig.get_solo()
        logs_qs = TheoryPracticalAttemptLog.objects.select_related("user")[:60]
        agg = TheoryPracticalAttemptLog.objects.aggregate(
            total_attempts=Count("id"),
            avg_pct=Avg("percentage"),
            ai_graded_count=Count("id", filter=models.Q(ai_graded=True)),
        )
        passed_count = TheoryPracticalAttemptLog.objects.filter(passed=True).count()
        total_att = agg.get("total_attempts") or 0

        recent_logs = [
            {
                "id": log.id,
                "student_name": getattr(log.user, "full_name", "") or log.user.email,
                "student_email": log.user.email,
                "program": log.program,
                "scenario_id": log.scenario_id,
                "scenario_title": log.scenario_title,
                "mode": log.mode,
                "score": log.score,
                "total_marks": log.total_marks,
                "percentage": log.percentage,
                "passed": log.passed,
                "ai_graded": log.ai_graded,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs_qs
        ]

        return Response(
            {
                "config": cfg.to_dict(),
                "stats": {
                    "total_users": User.objects.count(),
                    "total_attempts": total_att,
                    "passed_attempts": passed_count,
                    "pass_rate": round((passed_count / total_att) * 100) if total_att else 0,
                    "avg_percentage": round(agg.get("avg_pct") or 0),
                    "ai_graded_attempts": agg.get("ai_graded_count") or 0,
                },
                "recent_logs": recent_logs,
            },
            status=status.HTTP_200_OK,
        )
