"""Authentication, profile, clinical tracking, and AI endpoints."""

from __future__ import annotations

import io
import json
import logging
import random
import string
from collections import defaultdict

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.http import FileResponse
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .email_service import send_welcome_email
from .models import AmbassadorCommission, ClinicalLog, ClinicalSkill
from .serializers import (
    AmbassadorCommissionSerializer,
    ClinicalLogSerializer,
    ClinicalSkillSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)

# ─── Clinical Tracker ──────────────────────────────────────────────────────────

UNIVERSAL_SKILLS = [
    ("Vital Signs", "Universal Core", 5),
    ("Infection Prevention & Control", "Universal Core", 5),
    ("Patient Assessment", "Universal Core", 5),
    ("Medication Administration (Oral/IM)", "Universal Core", 10),
    ("Documentation & Record Keeping", "Universal Core", 5),
]

PROGRAM_SKILLS = {
    "GENERAL": [
        ("NG Tube Insertion", "Medical-Surgical", 3),
        ("Urinary Catheterization", "Medical-Surgical", 3),
        ("Wound Dressing", "Medical-Surgical", 5),
        ("IV Cannulation & Fluids", "Medical-Surgical", 10),
        ("Blood Transfusion", "Medical-Surgical", 2),
        ("Oxygen Therapy", "Medical-Surgical", 5),
        ("Pre/Post-Operative Care", "Medical-Surgical", 5),
    ],
    "MIDWIFERY": [
        ("Antenatal Care", "Maternal Health", 10),
        ("Vaginal Examination", "Maternal Health", 5),
        ("Conduct of Normal Delivery", "Maternal Health", 10),
        ("Episiotomy & Perineal Repair", "Maternal Health", 3),
        ("Immediate Newborn Care", "Neonatal", 10),
        ("Neonatal Resuscitation", "Neonatal", 2),
        ("Postnatal Monitoring", "Maternal Health", 10),
    ],
    "PSYCHIATRIC": [
        ("Mental State Examination (MSE)", "Mental Health", 10),
        ("Risk Assessment (Suicide/Violence)", "Mental Health", 5),
        ("Therapeutic Communication", "Mental Health", 10),
        ("Management of Aggression", "Mental Health", 3),
        ("ECT Preparation & Recovery", "Mental Health", 2),
        ("Psychotropic Medication Monitoring", "Mental Health", 5),
    ],
    "COMMUNITY": [
        ("Immunization (EPI)", "Public Health", 10),
        ("Growth Monitoring", "Public Health", 10),
        ("Home Visits", "Public Health", 10),
        ("Health Education", "Public Health", 10),
        ("Contact Tracing", "Public Health", 5),
        ("Family Planning Counseling", "Public Health", 5),
    ]
}

NCP_SYSTEM_PROMPT = (
    "You are a Registered Nurse (RGN) and clinical instructor in Ghana, writing a formal "
    "Nursing Care Plan (NCP) for a nursing student's NMC/N&MC logbook.\n\n"
    "CRITICAL: The 'diagnosis_code' MUST be a valid NANDA-I code (a 5-digit number like 00132, 00004, 00030, 00046, 00011). "
    "DO NOT use ICD-10 codes (e.g., T81.4XXA, A09, J18.9). The code must match the NANDA-I 2021-2023 handbook.\n\n"
    "Use one of these valid NANDA-I codes when applicable:\n"
    "   - 00132 Acute Pain\n"
    "   - 00004 Risk for Infection\n"
    "   - 00030 Impaired Gas Exchange\n"
    "   - 00011 Constipation\n"
    "   - 00046 Impaired Skin Integrity\n"
    "   - 00085 Impaired Physical Mobility\n"
    "   - 00155 Risk for Falls\n"
    "   - 00002 Imbalanced Nutrition: Less Than Body Requirements\n"
    "   - 00126 Deficient Knowledge\n"
    "   - 00016 Impaired Urinary Elimination\n"
    "   - 00032 Ineffective Breathing Pattern\n"
    "   - 00013 Diarrhea\n"
    "   - 00026 Excess Fluid Volume\n"
    "   - 00027 Deficient Fluid Volume\n"
    "   - 00134 Nausea\n\n"
    "ABSOLUTE RULES:\n"
    "1. Generate EXACTLY 3 GOALS and EXACTLY 3 NURSING ORDERS (interventions).\n"
    "   Each goal MUST correspond to exactly one intervention, so the student's form "
    "   shows three objectives matched to three interventions (1:1).\n"
    "2. Each GOAL must be ONE complete sentence containing all five SMART elements.\n"
    "   Example: 'By the end of 48 hours, the patient will demonstrate three non-pharmacologic pain-relief techniques with a reported pain score ≤ 3/10 on the numeric rating scale.'\n"
    "3. Each NURSING ORDER must start with a clinical verb (Assess, Administer, Monitor, Educate, Auscultate, Palpate, Elevate, Reposition, Encourage).\n"
    "4. Each RATIONALE must cite a physiological or pathophysiological reason.\n"
    "5. Never use filler words: 'various', 'helpful', 'good', 'some', 'just', 'try to'.\n"
    "6. Be clinically accurate for the Ghanaian context.\n\n"
    "Return ONLY valid JSON, no markdown, in this exact shape:\n"
    "{\n"
    '  "diagnosis_code": "00004",\n'
    '  "diagnosis_label": "Risk for Infection",\n'
    '  "goals": [\n'
    '    "By the end of ...",\n'
    '    "By the end of ...",\n'
    '    "By the end of ..."\n'
    "  ],\n"
    '  "interventions": [\n'
    '    {"action": "Assess ...", "rationale": "..."},\n'
    '    {"action": "Administer ...", "rationale": "..."},\n'
    '    {"action": "Monitor ...", "rationale": "..."}\n'
    "  ]\n"
    "}\n"
    "The order of the goals MUST match the order of the interventions "
    "(Goal 1 ↔ Intervention 1, Goal 2 ↔ Intervention 2, Goal 3 ↔ Intervention 3)."
)


# ─── Auth & Profile ────────────────────────────────────────────────────────────


class RegistrationRateThrottle(AnonRateThrottle):
    scope = "registration"


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (RegistrationRateThrottle,)

    def perform_create(self, serializer):
        user = serializer.save()
        try:
            send_welcome_email(to=user.email, full_name=user.full_name)
        except Exception:
            logger.exception("Welcome email failed for %s", user.email)


class LoginView(TokenObtainPairView):
    permission_classes = (permissions.AllowAny,)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        user = self.request.user
        user.deactivate_expired_subscription()
        return user


class PasswordChangeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."})


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower().strip()

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            try:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                reset_url = f"{settings.FRONTEND_ORIGIN}/reset-password?uid={uid}&token={token}"
                send_mail(
                    subject="Reset your NursifyGH password",
                    message=(
                        f"Hi {user.full_name},\n\n"
                        "We received a request to reset your NursifyGH password.\n\n"
                        f"Click here: {reset_url}\n\n"
                        "This link expires in 60 minutes.\n\n— The NursifyGH team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as exc:
                logger.exception("Password reset email failed for %s: %s", email, exc)

        return Response({"detail": "If an account exists for that email, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user_id = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password has been reset. You can now log in."})


# ─── Clinical Tracker ──────────────────────────────────────────────────────────


class ClinicalSkillsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user_program = request.user.program
        skills_to_seed = UNIVERSAL_SKILLS + PROGRAM_SKILLS.get(user_program, [])

        for name, category, required in skills_to_seed:
            ClinicalSkill.objects.get_or_create(
                student=request.user,
                procedure_name=name,
                defaults={"category": category, "required_count": required},
            )

        skills = ClinicalSkill.objects.filter(student=request.user).order_by("category", "procedure_name")
        return Response(ClinicalSkillSerializer(skills, many=True).data)

    def post(self, request):
        skill_id = request.data.get("skill_id")
        action = request.data.get("action")

        try:
            skill = ClinicalSkill.objects.get(id=skill_id, student=request.user)
        except ClinicalSkill.DoesNotExist:
            return Response({"error": "Skill not found"}, status=404)

        if action == "increment":
            ClinicalLog.objects.create(
                student=request.user,
                skill=skill,
                date_performed=request.data.get("date_performed", timezone.localdate()),
                hospital=request.data.get("hospital", ""),
                ward=request.data.get("ward", ""),
                supervisor_name=request.data.get("supervisor_name", ""),
                notes=request.data.get("notes", ""),
            )
            skill.completed_count += 1
        elif action == "decrement" and skill.completed_count > 0:
            last_log = skill.logs.first()
            if last_log:
                last_log.delete()
            skill.completed_count -= 1

        skill.save()
        return Response({"status": "success", "completed_count": skill.completed_count})


class ClinicalLogsDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, skill_id):
        try:
            skill = ClinicalSkill.objects.get(id=skill_id, student=request.user)
        except ClinicalSkill.DoesNotExist:
            return Response({"error": "Skill not found"}, status=404)

        return Response(ClinicalLogSerializer(skill.logs.all(), many=True).data)


class ClinicalLogDetailView(APIView):
    """GET, PATCH, DELETE a single clinical log entry."""

    permission_classes = (permissions.IsAuthenticated,)

    def _get_object(self, request, log_id):
        try:
            return ClinicalLog.objects.get(id=log_id, student=request.user)
        except ClinicalLog.DoesNotExist:
            return None

    def patch(self, request, log_id):
        log = self._get_object(request, log_id)
        if not log:
            return Response({"error": "Log not found"}, status=404)

        for field in ("date_performed", "hospital", "ward", "supervisor_name", "notes"):
            if field in request.data:
                setattr(log, field, request.data[field])
        log.save()
        return Response(ClinicalLogSerializer(log).data)

    def delete(self, request, log_id):
        log = self._get_object(request, log_id)
        if not log:
            return Response({"error": "Log not found"}, status=404)

        skill = log.skill
        log.delete()
        skill.completed_count = max(0, skill.completed_count - 1)
        skill.save()
        return Response({"status": "deleted", "completed_count": skill.completed_count})


class ClinicalLogbookExportView(APIView):
    """Generate an official N&MC PDF of the student's clinical logbook."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        skills = ClinicalSkill.objects.filter(
            student=request.user,
            completed_count__gt=0,
        ).prefetch_related("logs").order_by("category", "procedure_name")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "CustomTitle", parent=styles["Heading1"], fontSize=22,
            textColor=colors.HexColor("#047857"), spaceAfter=6, alignment=1,
        )
        subtitle_style = ParagraphStyle(
            "CustomSubtitle", parent=styles["Normal"], fontSize=10,
            textColor=colors.gray, spaceAfter=4, alignment=1,
        )
        category_style = ParagraphStyle(
            "CategoryStyle", parent=styles["Heading2"], fontSize=14,
            textColor=colors.HexColor("#065f46"), spaceBefore=20, spaceAfter=10,
        )

        elements = []

        elements.append(Paragraph("N&amp;MC Clinical Logbook Transcript", title_style))
        elements.append(Paragraph(
            f"Student: <b>{request.user.full_name}</b> &nbsp;|&nbsp; Program: {request.user.get_program_display()} &nbsp;|&nbsp; Level: {request.user.get_level_display()}",
            subtitle_style,
        ))
        if request.user.institution:
            elements.append(Paragraph(f"Institution: {request.user.institution}", subtitle_style))

        now_str = timezone.now().strftime("%d %B %Y, %I:%M %p")
        elements.append(Paragraph(f"Generated on: {now_str}", subtitle_style))
        elements.append(Spacer(1, 15))

        total_required = sum(s.required_count for s in ClinicalSkill.objects.filter(student=request.user))
        total_completed = sum(s.completed_count for s in ClinicalSkill.objects.filter(student=request.user))
        percent = round((total_completed / total_required) * 100) if total_required > 0 else 0

        summary_data = [
            ["Total Required Procedures", "Completed Procedures", "Overall Progress"],
            [str(total_required), str(total_completed), f"{percent}%"]
        ]
        summary_table = Table(summary_data, colWidths=[160, 160, 160])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#047857")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f3f4f6")),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor("#111827")),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        if not skills:
            elements.append(Paragraph("No clinical logs recorded yet.", styles["Normal"]))
        else:
            grouped_skills = defaultdict(list)
            for skill in skills:
                grouped_skills[skill.category].append(skill)

            for category, cat_skills in grouped_skills.items():
                elements.append(Paragraph(category, category_style))

                data = [["Procedure", "Date", "Hospital / Ward", "Supervisor", "Notes"]]

                for skill in cat_skills:
                    for log in skill.logs.all().order_by("-date_performed"):
                        hospital_ward = log.hospital
                        if log.ward:
                            hospital_ward = f"{hospital_ward}\n{log.ward}" if hospital_ward else log.ward

                        data.append([
                            Paragraph(skill.procedure_name, styles["Normal"]),
                            Paragraph(log.date_performed.strftime("%d %b %Y"), styles["Normal"]),
                            Paragraph(hospital_ward or "-", styles["Normal"]),
                            Paragraph(log.supervisor_name or "-", styles["Normal"]),
                            Paragraph(log.notes or "-", styles["Normal"]),
                        ])

                table = Table(data, colWidths=[110, 70, 120, 90, 130], repeatRows=1)
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#374151")),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#111827")),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 10))

        doc.build(elements)
        buffer.seek(0)

        safe_name = request.user.full_name.replace(" ", "_")
        return FileResponse(
            buffer,
            as_attachment=True,
            filename=f"NMC_Logbook_{safe_name}.pdf",
            content_type="application/pdf",
        )


# ─── Ambassador Dashboard ──────────────────────────────────────────────────────


class AmbassadorStatsView(APIView):
    """Return the ambassador's earnings, referred students, and payout status."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        if not user.is_ambassador:
            return Response({"error": "Not an ambassador"}, status=403)

        commissions = AmbassadorCommission.objects.filter(
            ambassador=user
        ).select_related("referred_student").order_by("-created_at")

        total_earned = sum(c.amount_ghs for c in commissions)
        pending_payout = sum(c.amount_ghs for c in commissions if not c.is_paid_out)
        paid_out = total_earned - pending_payout
        referral_count = commissions.count()

        return Response({
            "referral_code": user.referral_code,
            "total_earned": str(total_earned),
            "pending_payout": str(pending_payout),
            "paid_out": str(paid_out),
            "referral_count": referral_count,
            "recent": [
                {
                    "amount": str(c.amount_ghs),
                    "referred_email": c.referred_student.email if c.referred_student else "(deleted)",
                    "is_paid_out": c.is_paid_out,
                    "date": c.created_at.isoformat(),
                }
                for c in commissions[:20]
            ],
        })


class BecomeAmbassadorView(APIView):
    """Allow a user to self-enroll as an ambassador and get a referral code."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if user.is_ambassador:
            return Response({"detail": "You are already an ambassador.", "code": user.referral_code})

        first = (user.full_name.split(" ")[0] or "AMB").upper()[:5]
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        code = f"{first}-{suffix}"

        while User.objects.filter(referral_code=code).exists():
            suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
            code = f"{first}-{suffix}"

        user.is_ambassador = True
        user.referral_code = code
        user.save(update_fields=["is_ambassador", "referral_code"])

        return Response({
            "detail": "You are now an ambassador!",
            "code": code,
        })


# ─── AI ────────────────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def ai_chat_proxy(request):
    message = request.data.get("message")
    mode = request.data.get("mode", "public")

    if not message:
        return Response({"error": "Message is required"}, status=400)

    api_key = getattr(settings, "GROQ_API_KEY", None)
    if not api_key:
        return Response({"error": "Server configuration error."}, status=500)

    if mode == "student":
        system_prompt = (
            "You are the NursifyGH Academic Tutor — an expert Ghanaian nursing educator and clinical instructor.\n\n"
            "ABOUT NURSIFYGH (platform features you must know):\n"
            "1. Students get a 3-day FREE TRIAL to explore all features.\n"
            "2. A Semester Pass costs GHS 30 and gives 120 days of full access.\n"
            "3. Features include: NMC-style question banks with rationales, 60-minute mock exams, a program-aware Clinical Tracker (Universal, Medical-Surgical, Maternal, Mental Health, or Public Health skills based on the student's RGN/RM/RPN/CHN program), and a printable N&MC Logbook PDF export for clinical submissions.\n"
            "4. Students can build NANDA care plans, share them with the community library, and export N&MC-format documents.\n"
            "5. There is an Ambassador Program: students can earn GHS 4.50 (15%) commission for every referred student who pays for a Semester Pass. Commissions are paid via Mobile Money after 14 days.\n\n"
            "COMMUNICATION STYLE:\n"
            "1. Speak formally, professionally, and supportively — like a senior nursing lecturer.\n"
            "2. Do NOT use raw Markdown tables (| column | column |). Instead, use clean bullet points or short paragraphs.\n"
            "3. Be concise. Students are on mobile. Do not output huge walls of text.\n"
            "4. Use numbered lists for step-by-step clinical procedures, and bold for emphasis on key medical terms.\n"
            "5. If a student asks about a clinical condition, use the format: Definition, Key Signs/Symptoms, Priority Nursing Interventions, and Rationale."
        )
    else:
        system_prompt = (
            "You are the NursifyGH Support Assistant — a professional, warm, and helpful onboarding guide.\n\n"
            "ABOUT NURSIFYGH (platform facts you must know):\n"
            "1. NursifyGH is an independent study platform for Ghanaian nursing and midwifery students. It is NOT affiliated with the NMC.\n"
            "2. Students get a 3-day FREE TRIAL.\n"
            "3. The Semester Pass costs GHS 30 and gives 120 days of full access.\n"
            "4. Features: NMC-style practice questions, mock exams, clinical logbooks with PDF export, NANDA care plans, and an Ambassador program (earn GHS 4.50 per referral).\n"
            "5. Students can register at nursifygh.vercel.app/register.\n\n"
            "COMMUNICATION STYLE:\n"
            "1. Be polite, clear, and welcoming.\n"
            "2. Do NOT use raw Markdown tables or code blocks. Use short paragraphs and bullet points.\n"
            "3. Do NOT answer clinical or nursing questions. Politely redirect them to register and use the Academic Tutor.\n"
            "4. Keep responses under 120 words unless explaining a complex feature."
        )

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": "openai/gpt-oss-120b",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                "temperature": 0.4,
                "max_tokens": 800,
            },
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=45,
        )
        if response.status_code != 200:
            return Response({"error": "AI service rejected the request."}, status=500)

        return Response({"reply": response.json()["choices"][0]["message"]["content"]})
    except Exception:
        return Response({"error": "AI is currently unavailable."}, status=500)


@api_view(["POST"])
@permission_classes([AllowAny])
def ai_ncp_autofill(request):
    scenario = request.data.get("scenario", "").strip()
    if not scenario:
        return Response({"error": "Please describe the patient scenario."}, status=400)

    api_key = getattr(settings, "GROQ_API_KEY", None)
    if not api_key:
        return Response({"error": "AI is not configured."}, status=500)

    try:
        r = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": "openai/gpt-oss-120b",
                "messages": [
                    {"role": "system", "content": NCP_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Patient scenario: {scenario}"},
                ],
                "temperature": 0.2,
                "max_tokens": 2000,
            },
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=60,
        )
        if r.status_code != 200:
            return Response({"error": "AI service error."}, status=500)

        content = r.json()["choices"][0]["message"]["content"]
        content = content.strip().strip("`").replace("json\n", "", 1).strip()
        return Response(json.loads(content))
    except json.JSONDecodeError:
        return Response({"error": "AI returned invalid data. Please try again."}, status=500)
    except Exception:
        return Response({"error": "AI is currently unavailable."}, status=500)
