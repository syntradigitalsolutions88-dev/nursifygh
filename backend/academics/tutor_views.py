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
