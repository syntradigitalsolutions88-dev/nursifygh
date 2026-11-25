"""Authentication, profile, clinical tracking, and AI endpoints."""

from __future__ import annotations
from django.core.cache import cache

from decimal import Decimal
import os
import re

import io
import json
import logging
import random
import string
from collections import defaultdict
from datetime import timedelta

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.http import FileResponse
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
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

NCP_SYSTEM_PROMPT = """
You are a strict, senior nursing lecturer at the Nurses and Midwives Council of Ghana (N&MC), expert in NANDA-I (2021–2023) classifications, NIC (Nursing Interventions Classification), and the Ghana Essential Medicines List (EML).

CLINICAL ACCURACY RULES (VIOLATION = FAILURE):

1. NURSING DIAGNOSIS (NANDA-I)
- Select ONE primary diagnosis with its code, label, domain, and definition.
- "related_to" MUST list ONLY factors ACTUALLY PRESENT in the scenario.
- "as_evidenced_by" MUST list ONLY signs/symptoms OBSERVED in the scenario.
- DO NOT include textbook symptoms if they are not in the scenario.

2. SMART OUTCOMES (Generate exactly 3)
- Must be specific, measurable (e.g., "pain ≤3/10", "Hb ≥10 g/dL"), achievable, relevant, and time-bound (e.g., "within 30 min").
- WRONG: "Bleeding is controlled"
- CORRECT: "Lochia reduces to <1 pad/hour and fundus remains firm at umbilicus within 30 minutes"

3. NURSING INTERVENTIONS (Generate exactly 5)
- You MUST include the following types: "INDEPENDENT", "DEPENDENT", or "COLLABORATIVE".
- EVERY intervention must have a physiological rationale (NOT "because it helps").
- FOR EVERY MEDICATION, you MUST provide an object called "medication_details" with:
  "drug", "dose", "route", "rate", "timing", "precautions".
  Example: Tranexamic acid -> drug: "Tranexamic acid", dose: "1 g", route: "IV", rate: "over 10 minutes", timing: "within 3 hours of birth", precautions: "Do not delay uterotonics; monitor for thrombosis."
- MANDATORY MIX: Include at least 1 ASSESSMENT/MONITORING intervention, at least 1 DOCUMENTATION intervention, and at least 1 PATIENT EDUCATION intervention.

4. EVALUATION (Generate exactly 2)
- "outcome": The goal being evaluated.
- "status": "MET", "PARTIALLY_MET", or "NOT_MET".
- "evidence": Specific clinical data (e.g., "BP 118/76, HR 88, lochia moderate at 0900h").

5. ANTI-HALLUCINATION
- If a detail is NOT in the scenario AND cannot be safely inferred, do not invent it. Write "Not documented in scenario".

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema (no markdown, no explanation):

{
  "primary_diagnosis": {
    "code": "00027",
    "label": "Deficient Fluid Volume",
    "domain": "5 Perfusion",
    "definition": "...",
    "related_to": "...",
    "as_evidenced_by": "..."
  },
  "goals": [
    { "specific": "...", "measurable": "...", "achievable": "...", "relevant": "...", "time_bound": "..." }
  ],
  "interventions": [
    {
      "action": "...",
      "rationale": "...",
      "type": "INDEPENDENT",
      "medication_details": { "drug": "...", "dose": "...", "route": "...", "rate": "...", "timing": "...", "precautions": "..." }
    }
  ],
  "evaluation": [
    { "outcome": "...", "status": "MET", "evidence": "..." }
  ]
}
"""

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

@method_decorator(csrf_exempt, name='dispatch')
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
                
                frontend_origin = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
                reset_url = f"{frontend_origin}/reset-password?uid={uid}&token={token}"

                resend_key = getattr(settings, "RESEND_API_KEY", "")
                if resend_key:
                    requests.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {resend_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "from": "NursifyGH <onboarding@resend.dev>",
                            "to": [user.email],
                            "subject": "Reset your NursifyGH password",
                            "text": f"Hi {user.full_name},\n\nWe received a request to reset your NursifyGH password.\n\nClick here to reset: {reset_url}\n\nThis link expires in 60 minutes.\n\n— The NursifyGH team",
                        },
                        timeout=10,
                    )
                else:
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
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        if not user.is_ambassador:
            return Response({"error": "Not an ambassador"}, status=403)

        commissions = (
            AmbassadorCommission.objects
            .filter(ambassador=user)
            .select_related("referred_student")
            .order_by("-created_at")
        )

        total_earned = sum(c.amount_ghs for c in commissions)
        pending_payout = sum(c.amount_ghs for c in commissions if not c.is_paid_out)
        paid_out = total_earned - pending_payout

        if user.referral_code:
            referred_users = (
                User.objects
                .filter(referred_by__iexact=user.referral_code)
                .exclude(id=user.id)
            )
        else:
            referred_users = User.objects.none()

        pending_referrals = referred_users.filter(has_paid=False).count()
        confirmed_referrals = referred_users.filter(has_paid=True).count()

        min_payout = 10.00
        three_days_ago = timezone.now() - timedelta(days=3)
        cleared_commissions = commissions.filter(
            is_paid_out=False,
            created_at__lte=three_days_ago,
        )
        cleared_amount = sum(c.amount_ghs for c in cleared_commissions)
        can_cash_out = cleared_amount >= min_payout

        payout_date = None
        if can_cash_out:
            payout_date = timezone.now().isoformat()
        elif pending_payout > 0:
            oldest_unpaid = commissions.filter(is_paid_out=False).order_by("created_at").first()
            if oldest_unpaid:
                next_unlock = oldest_unpaid.created_at + timedelta(days=3)
                payout_date = next_unlock.isoformat()

        commission_by_student = {
            c.referred_student_id: c
            for c in commissions
            if c.referred_student_id
        }

        recent = []
        for r in referred_users.order_by("-date_joined")[:20]:
            comm = commission_by_student.get(r.id)
            recent.append({
                "email": r.email,
                "referred_email": r.email,
                "full_name": r.full_name,
                "joined": r.date_joined.isoformat(),
                "date": (comm.created_at.isoformat() if comm else r.date_joined.isoformat()),
                "status": "CONFIRMED" if r.has_paid else "PENDING",
                "amount": str(comm.amount_ghs) if comm else "0.00",
                "is_paid_out": comm.is_paid_out if comm else False,
                "commission_created": comm.created_at.isoformat() if comm else None,
            })

        return Response({
            "referral_code": user.referral_code,
            "total_earned": str(total_earned),
            "pending_payout": str(pending_payout),
            "paid_out": str(paid_out),
            "pending_referrals": pending_referrals,
            "confirmed_referrals": confirmed_referrals,
            "total_referrals": pending_referrals + confirmed_referrals,
            "referral_count": confirmed_referrals,
            "can_cash_out": can_cash_out,
            "cleared_amount": str(cleared_amount),
            "next_payout_date": payout_date,
            "recent": recent,
        })

class BecomeAmbassadorView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if user.is_ambassador:
            return Response({"detail": "You are already an ambassador.", "code": user.referral_code})

        prefix = (user.full_name.split(" ")[0] or "AMB").upper()[:5] or "AMB"

        for _ in range(5):
            suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
            code = f"{prefix}-{suffix}"
            if not User.objects.filter(referral_code=code).exists():
                break
        else:
            return Response(
                {"error": "Could not generate a unique referral code. Please try again."},
                status=500,
            )

        user.is_ambassador = True
        user.referral_code = code
        user.save(update_fields=["is_ambassador", "referral_code"])

        return Response({
            "detail": "You are now an ambassador!",
            "code": code,
        })




def _get_trashed_user_ids():
    ids = cache.get("nursify_admin_trashed_user_ids")
    if isinstance(ids, list):
        return [int(x) for x in ids if str(x).isdigit()]
    return list(
        User.objects.filter(is_active=False, is_staff=False, is_superuser=False).values_list("id", flat=True)
    )

def _set_trashed_user_ids(ids):
    clean = []
    for x in ids:
        try:
            val = int(x)
            if val not in clean:
                clean.append(val)
        except (TypeError, ValueError):
            pass
    cache.set("nursify_admin_trashed_user_ids", clean, timeout=60 * 60 * 24 * 30)


class AdminCommissionsOverviewView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"error": "Admin access required."}, status=403)

        from payments.models import PaymentTransaction

        now = timezone.now()
        total_users = User.objects.count()
        paid_users = User.objects.filter(has_paid=True).count()
        referred_users_qs = (
            User.objects.exclude(referred_by__isnull=True)
            .exclude(referred_by="")
            .order_by("-date_joined")
        )

        ambassadors = User.objects.filter(is_ambassador=True).order_by("-date_joined")
        amb_by_code = {
            (a.referral_code or "").strip().upper(): a
            for a in ambassadors
            if a.referral_code
        }

        commissions = list(
            AmbassadorCommission.objects.select_related("ambassador", "referred_student").order_by("-created_at")
        )
        comm_by_student = {
            c.referred_student_id: c
            for c in commissions
            if c.referred_student_id
        }

        total_earned = sum((c.amount_ghs for c in commissions), Decimal("0.00"))
        unpaid_total = sum((c.amount_ghs for c in commissions if not c.is_paid_out), Decimal("0.00"))
        paid_out_total = total_earned - unpaid_total

        ambassador_rows = []
        for amb in ambassadors:
            code_key = (amb.referral_code or "").strip().upper()
            refs = User.objects.filter(referred_by__iexact=amb.referral_code).exclude(id=amb.id) if amb.referral_code else User.objects.none()
            amb_comms = [c for c in commissions if c.ambassador_id == amb.id]
            amb_earned = sum((c.amount_ghs for c in amb_comms), Decimal("0.00"))
            amb_unpaid = sum((c.amount_ghs for c in amb_comms if not c.is_paid_out), Decimal("0.00"))
            amb_paid = amb_earned - amb_unpaid
            ambassador_rows.append({
                "id": amb.id,
                "full_name": amb.full_name,
                "email": amb.email,
                "phone_number": amb.phone_number or "",
                "referral_code": amb.referral_code or "",
                "total_referrals": refs.count(),
                "paid_referrals": refs.filter(has_paid=True).count(),
                "total_earned": str(amb_earned),
                "unpaid_ghs": str(amb_unpaid),
                "paid_out_ghs": str(amb_paid),
            })

        referral_ledger = []
        for student in referred_users_qs[:100]:
            code_key = (student.referred_by or "").strip().upper()
            amb = amb_by_code.get(code_key)
            comm = comm_by_student.get(student.id)
            referral_ledger.append({
                "student_id": student.id,
                "student_name": student.full_name,
                "student_email": student.email,
                "student_phone": student.phone_number or "",
                "student_has_paid": student.has_paid,
                "joined_at": student.date_joined.isoformat(),
                "referral_code": student.referred_by,
                "ambassador_name": amb.full_name if amb else "Unassigned / Code",
                "ambassador_email": amb.email if amb else "",
                "ambassador_phone": amb.phone_number if amb else "",
                "commission_amount": str(comm.amount_ghs) if comm else "0.00",
                "is_paid_out": comm.is_paid_out if comm else False,
            })

        txns = (
            PaymentTransaction.objects.select_related("student")
            .order_by("-initiated_at")[:50]
        )
        payment_rows = [
            {
                "id": t.id,
                "reference": t.reference,
                "manual_reference": t.manual_reference or "",
                "student_name": t.student.full_name if t.student else "",
                "student_email": t.student.email if t.student else "",
                "student_phone": t.student.phone_number if t.student else "",
                "referred_by": t.student.referred_by if t.student else "",
                "amount_ghs": str(t.amount_ghs),
                "provider": t.provider,
                "status": t.status,
                "initiated_at": t.initiated_at.isoformat() if t.initiated_at else None,
            }
            for t in txns
        ]


        trashed_ids = _get_trashed_user_ids()
        users_qs = User.objects.exclude(id__in=trashed_ids).order_by("-date_joined")[:200]
        trashed_users_qs = User.objects.filter(id__in=trashed_ids).order_by("-date_joined")[:100]
        user_rows = [
            {
                "id": u.id,
                "full_name": u.full_name or "",
                "email": u.email,
                "phone_number": u.phone_number or "",
                "program": u.program or "",
                "institution": getattr(u, "institution", "") or "",
                "level": u.level,
                "has_paid": bool(u.has_paid),
                "is_subscribed": bool(u.is_subscribed),
                "subscription_expires_at": u.subscription_expires_at.isoformat() if u.subscription_expires_at else None,
                "is_ambassador": bool(u.is_ambassador),
                "referral_code": u.referral_code or "",
                "referred_by": u.referred_by or "",
                "is_staff": bool(u.is_staff or u.is_superuser),
                "date_joined": (getattr(u, "date_joined", None) or getattr(u, "created_at", None) or now).isoformat(),
            }
            for u in users_qs
        ]

        trashed_user_rows = [
            {
                "id": u.id,
                "full_name": u.full_name or "",
                "email": u.email,
                "phone_number": u.phone_number or "",
                "program": u.program or "",
                "institution": getattr(u, "institution", "") or getattr(u, "school", "") or "",
                "level": u.level,
                "has_paid": bool(u.has_paid),
                "is_subscribed": bool(u.is_subscribed),
                "is_ambassador": bool(u.is_ambassador),
                "referral_code": u.referral_code or "",
                "referred_by": u.referred_by or "",
                "is_staff": bool(u.is_staff or u.is_superuser),
                "date_joined": (getattr(u, "date_joined", None) or getattr(u, "created_at", None) or now).isoformat(),
            }
            for u in trashed_users_qs
        ]

        return Response({
            "generated_at": now.isoformat(),
            "users": user_rows,
            "trashed_users": trashed_user_rows,
            "summary": {
                "total_users": total_users,
                "paid_users": paid_users,
                "total_referrals": referred_users_qs.count(),
                "ambassador_count": ambassadors.count(),
                "total_earned": str(total_earned),
                "unpaid_ghs": str(unpaid_total),
                "paid_out_ghs": str(paid_out_total),
            },
            "ambassadors": ambassador_rows,
            "referrals": referral_ledger,
            "payments": payment_rows,
        })




class AdminCommissionsActionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"error": "Admin access required."}, status=403)

        from payments.models import PaymentStatus, PaymentTransaction

        action = (request.data.get("action") or "").strip()

        if action == "mark_commission_paid":
            commission_id = request.data.get("commission_id")
            ambassador_id = request.data.get("ambassador_id")
            qs = AmbassadorCommission.objects.filter(is_paid_out=False)
            if commission_id:
                qs = qs.filter(id=commission_id)
            elif ambassador_id:
                qs = qs.filter(ambassador_id=ambassador_id)
            else:
                return Response({"error": "commission_id or ambassador_id is required."}, status=400)

            now = timezone.now()
            updated = 0
            for c in qs:
                c.is_paid_out = True
                if hasattr(c, "paid_out_at"):
                    c.paid_out_at = now
                    c.save(update_fields=["is_paid_out", "paid_out_at"])
                else:
                    c.save(update_fields=["is_paid_out"])
                updated += 1
            return Response({"ok": True, "action": action, "updated": updated})

        if action == "approve_payment":
            payment_id = request.data.get("payment_id")
            if not payment_id:
                return Response({"error": "payment_id is required."}, status=400)
            try:
                txn = PaymentTransaction.objects.select_related("student").get(id=payment_id)
            except PaymentTransaction.DoesNotExist:
                return Response({"error": "Payment transaction not found."}, status=404)

            if txn.status != PaymentStatus.SUCCESS:
                txn.mark_success(provider_reference=txn.manual_reference or txn.reference or "")
                if hasattr(txn, "reviewed_by"):
                    txn.reviewed_by = request.user
                    txn.reviewed_at = timezone.now()
                    txn.save(update_fields=["reviewed_by", "reviewed_at"])

            if txn.student:
                txn.student.activate_subscription(
                    days=120,
                    reference=txn.manual_reference or txn.reference or "",
                )

            return Response({"ok": True, "action": action, "payment_id": txn.id})

        if action == "toggle_ambassador":
            user_id = request.data.get("user_id")
            if not user_id:
                return Response({"error": "user_id is required."}, status=400)
            try:
                target = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=404)
            if target.is_staff or target.is_superuser:
                return Response({"error": "Staff or superuser admin accounts cannot be moved to Trash."}, status=400)

            target.is_ambassador = not bool(target.is_ambassador)
            if target.is_ambassador and not target.referral_code:
                base = "".join(ch for ch in (target.full_name or "AMB").upper() if ch.isalnum())[:6] or "AMB"
                target.referral_code = f"{base}-{target.id}"
            target.save(update_fields=["is_ambassador", "referral_code"])
            return Response({
                "ok": True,
                "action": action,
                "user_id": target.id,
                "is_ambassador": target.is_ambassador,
                "referral_code": target.referral_code,
            })


        if action == "revert_commission_paid":
            ambassador_id = request.data.get("ambassador_id")
            if not ambassador_id:
                return Response({"error": "ambassador_id is required."}, status=400)
            qs = AmbassadorCommission.objects.filter(ambassador_id=ambassador_id, is_paid_out=True)
            now = timezone.now()
            updated = 0
            for c in qs:
                c.is_paid_out = False
                if hasattr(c, "paid_out_at"):
                    c.paid_out_at = None
                    c.save(update_fields=["is_paid_out", "paid_out_at"])
                else:
                    c.save(update_fields=["is_paid_out"])
                updated += 1
            return Response({"ok": True, "action": action, "updated": updated})

        if action == "reject_payment":
            payment_id = request.data.get("payment_id")
            if not payment_id:
                return Response({"error": "payment_id is required."}, status=400)
            try:
                txn = PaymentTransaction.objects.select_related("student").get(id=payment_id)
            except PaymentTransaction.DoesNotExist:
                return Response({"error": "Payment transaction not found."}, status=404)
            txn.mark_failed(provider_reference=txn.manual_reference or txn.reference or "")
            if hasattr(txn, "reviewed_by"):
                txn.reviewed_by = request.user
                txn.reviewed_at = timezone.now()
                txn.save(update_fields=["reviewed_by", "reviewed_at"])
            return Response({"ok": True, "action": action, "payment_id": txn.id})

        if action == "promote_ambassador":
            email = (request.data.get("email") or "").strip().lower()
            custom_code = (request.data.get("referral_code") or "").strip().upper()
            if not email:
                return Response({"error": "email is required."}, status=400)
            try:
                target = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return Response({"error": "No user found with that email address."}, status=404)

            target.is_ambassador = True
            if custom_code:
                target.referral_code = custom_code
            elif not target.referral_code:
                base = "".join(ch for ch in (target.full_name or "AMB").upper() if ch.isalnum())[:6] or "AMB"
                target.referral_code = f"{base}-{target.id}"
            target.save(update_fields=["is_ambassador", "referral_code"])
            return Response({
                "ok": True,
                "action": action,
                "user_id": target.id,
                "referral_code": target.referral_code,
            })


        if action == "grant_pass":
            user_id = request.data.get("user_id")
            if not user_id:
                return Response({"error": "user_id is required."}, status=400)
            try:
                target = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=404)
            target.activate_subscription(days=120, reference=f"ADMIN-GRANT-{target.id}")
            return Response({"ok": True, "action": action, "user_id": target.id})

        if action == "revoke_pass":
            user_id = request.data.get("user_id")
            if not user_id:
                return Response({"error": "user_id is required."}, status=400)
            try:
                target = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=404)
            target.has_paid = False
            target.is_subscribed = False
            target.subscription_expires_at = timezone.now()
            target.save(update_fields=["has_paid", "is_subscribed", "subscription_expires_at"])
            return Response({"ok": True, "action": action, "user_id": target.id})

        if action == "delete_user":
            raw_user_id = request.data.get("user_id")
            if raw_user_id is None or str(raw_user_id).strip() == "":
                return Response({"error": "user_id is required."}, status=400)
            try:
                user_id = int(str(raw_user_id).strip())
            except (TypeError, ValueError):
                return Response({"error": "Invalid user_id."}, status=400)
            if user_id == int(request.user.id):
                return Response({"error": "You cannot move your own currently logged-in account to Trash."}, status=400)
            target_user = User.objects.filter(id=user_id).first()
            if not target_user:
                return Response({"error": "User not found."}, status=404)
            target_user.is_active = False
            if hasattr(target_user, "is_ambassador"):
                target_user.is_ambassador = False
            target_user.save(update_fields=[f for f in ["is_active", "is_ambassador"] if hasattr(target_user, f)])
            return Response({
                "ok": True,
                "user_id": target_user.id,
                "email": target_user.email,
                "trashed": True,
            })
        if action == "restore_user":
            user_id = request.data.get("user_id")
            if not user_id:
                return Response({"error": "user_id is required."}, status=400)
            try:
                target = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=404)
            trashed = [x for x in _get_trashed_user_ids() if int(x) != int(target.id)]
            _set_trashed_user_ids(trashed)
            target.is_active = True
            target.save(update_fields=["is_active"])
            return Response({"ok": True, "action": action, "user_id": target.id})

        if action == "permanent_delete_user":
            user_id = request.data.get("user_id")
            if not user_id:
                return Response({"error": "user_id is required."}, status=400)
            if int(user_id) == int(request.user.id):
                return Response({"error": "You cannot permanently delete your own currently logged-in admin account."}, status=400)
            try:
                target = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=404)
            try:
                from payments.models import PaymentTransaction
                PaymentTransaction.objects.filter(student=target).delete()
            except Exception:
                pass
            try:
                AmbassadorCommission.objects.filter(ambassador=target).delete()
                AmbassadorCommission.objects.filter(referred_student=target).delete()
            except Exception:
                pass
            target.delete()
            trashed = [x for x in _get_trashed_user_ids() if int(x) != int(user_id)]
            _set_trashed_user_ids(trashed)
            return Response({"ok": True, "action": action, "user_id": user_id})

        if action == "send_notification":
            from accounts.notifications import dispatch_admin_message

            audience = (request.data.get("audience") or "single").strip().lower()
            target_email = (request.data.get("email") or "").strip().lower()
            channels = request.data.get("channels") or ["email"]
            if isinstance(channels, str):
                channels = [c.strip() for c in channels.split(",") if c.strip()]
            subject = (request.data.get("subject") or "NursifyGH Notification").strip()
            message = (request.data.get("message") or "").strip()
            category = (request.data.get("category") or "Update").strip()

            if not message:
                return Response({"error": "Message body is required."}, status=400)

            qs = User.objects.filter(is_active=True)
            if audience == "single":
                if not target_email:
                    return Response({"error": "Select a user or provide target email for single-user notification."}, status=400)
                qs = qs.filter(email__iexact=target_email)
            elif audience == "paid":
                qs = qs.filter(models.Q(has_paid=True) | models.Q(is_subscribed=True))
            elif audience == "trial":
                qs = qs.filter(has_paid=False, is_subscribed=False)
            elif audience == "all":
                pass
            else:
                return Response({"error": f"Unknown audience: {audience}"}, status=400)

            recipients = list(qs.distinct())
            if not recipients:
                return Response({"error": "No matching recipients found."}, status=404)

            summary = dispatch_admin_message(
                users=recipients,
                channels=channels,
                subject=subject,
                message=message,
                category=category,
            )
            return Response({"ok": True, "action": action, "summary": summary})

        if action == "delete_payment":
            payment_id = request.data.get("payment_id")
            if not payment_id:
                return Response({"error": "payment_id is required."}, status=400)
            try:
                txn = PaymentTransaction.objects.get(id=payment_id)
            except PaymentTransaction.DoesNotExist:
                return Response({"error": "Payment transaction not found."}, status=404)
            txn.delete()
            return Response({"ok": True, "action": action, "payment_id": payment_id})

        if action == "delete_commission":
            student_id = request.data.get("student_id")
            if not student_id:
                return Response({"error": "student_id is required."}, status=400)
            deleted_count, _ = AmbassadorCommission.objects.filter(referred_student_id=student_id).delete()
            return Response({"ok": True, "action": action, "deleted": deleted_count})

        if action == "clear_referral":
            student_id = request.data.get("student_id")
            if not student_id:
                return Response({"error": "student_id is required."}, status=400)
            try:
                student = User.objects.get(id=student_id)
            except User.DoesNotExist:
                return Response({"error": "Student not found."}, status=404)
            student.referred_by = ""
            student.save(update_fields=["referred_by"])
            return Response({"ok": True, "action": action, "student_id": student.id})

        return Response({"error": "Unsupported action."}, status=400)


# ─── AI ────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def ai_chat_proxy(request):
    message = (request.data.get("message") or "").strip()
    mode = (request.data.get("mode") or "public").strip().lower()

    if not message:
        return Response({"error": "Message is required"}, status=400)

    from academics.tutor_views import _clean_ai_output, _generate_tutor_response

    api_key = (
        getattr(settings, "GROQ_API_KEY", None)
        or os.getenv("LLM_API_KEY")
        or os.getenv("GROQ_API_KEY")
        or ""
    ).strip()

    api_url = (
        getattr(settings, "LLM_API_URL", None)
        or os.getenv("LLM_API_URL")
        or "https://api.groq.com/openai/v1/chat/completions"
    ).strip()
    model = (
        getattr(settings, "LLM_MODEL", None)
        or os.getenv("LLM_MODEL")
        or "openai/gpt-oss-120b"
    ).strip()

    platform_knowledge = (
        "NURSIFYGH PLATFORM & FEATURES (answer accurately whenever asked about NursifyGH):\n"
        "- Programs: 4 nursing/midwifery tracks (General Nursing, Midwifery, Psychiatric Nursing, Community Health Nursing).\n"
        "- Pricing & Access: 3-day free trial; GHS 30 for 120 days with manual MoMo activation.\n"
        "- AI Nursing & Science Tutor (/ai-tutor): Instant explanations across anatomy & physiology, biology, chemistry, "
        "pharmacology, nursing priorities, and exam rationales.\n"
        "- NMC Licensure Question Bank & CBT Simulator (/cbt-simulator): 3,000+ practice questions across courses and "
        "domains, 60-minute timed mock exams, and detailed rationales.\n"
        "- Interactive Clinical Case Studies (/cases): Ghanaian patient scenarios with vitals, triage priorities, "
        "rationales, and one-click Ask AI Tutor about this case stage support.\n"
        "- Flashcards & Revision (/revision): Active-recall study decks for rapid exam prep.\n"
        "- AI Nursing Care Plans & Clinical Logbook: Structured NANDA-style care planning and clinical skills logging.\n"
        "- Ambassador Program: 15% recurring referral commission for student ambassadors."
    )

    if mode == "student":
        system_prompt = (
            "You are the NursifyGH Chief Clinical Examiner and Academic Tutor — an authoritative, crystal-clear "
            "Ghanaian nursing educator, science & clinical tutor, and NMC licensure coach.\n\n"
            "STYLE RULES: Never output horizontal lines ('---'), raw '#' or '**' or '*' markdown markers, or pipe "
            "tables ('|'). Write clean plain text with short line headings and '• ' bullets that read cleanly on a phone.\n"
            "ACADEMIC & CLINICAL PRECISION RULES:\n"
            "- Start with a direct, accurate answer upfront before breaking down details.\n"
            "- Answer ANY legitimate science, anatomy/physiology, chemistry, biology, pharmacology, dosage math, or "
            "nursing question thoroughly with step-by-step reasoning and ABCDE/safety priorities where clinical.\n"
            "- For multiple-choice or case questions, explain why the best action wins AND why tempting distractors "
            "or delays carry risk.\n"
            "- Never invent unverified medication doses, infusion rates, or local protocols; state established clinical "
            "principles clearly and remind students to verify exact orders against current facility/NMC guidelines.\n\n"
            "- Never repeat any term, suffix, definition, or repeated line; when asked for N items, give distinct entries. When corrected by a student, acknowledge directly and adjust immediately.\n\n"
            f"{platform_knowledge}"
        )
    else:
        system_prompt = (
            "You are the NursifyGH AI Guide & Academic Tutor — a clear, articulate, and authoritative guide for "
            "visitors and prospective nursing students on NursifyGH.\n\n"
            "STYLE RULES: Never output horizontal lines ('---'), raw '#' or '**' or '*' markdown markers, or pipe "
            "tables ('|'). Write clean plain text with short line headings and '• ' bullets.\n"
            "ANSWERING RULES: Answer questions about NursifyGH features, plans, and getting started clearly, AND "
            "answer general science, anatomy/physiology, biology, chemistry, and nursing questions with crisp, "
            "accurate explanations so visitors experience how smart NursifyGH is.\n\n"
            f"{platform_knowledge}"
        )

    user_ctx = ""
    if getattr(request, "user", None) and request.user.is_authenticated:
        prog = getattr(request.user, "program", "") or ""
        lvl = getattr(request.user, "level", "") or ""
        parts = [x for x in [f"Level {lvl}" if lvl else "", prog] if x]
        if parts:
            user_ctx = f"[Student Profile: {' '.join(parts)}]\n"

    if api_key:
        try:
            response = requests.post(
                api_url,
                json={
                    "model": model or "openai/gpt-oss-120b",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        *[{"role": ("assistant" if m.get("role") == "assistant" else "user"), "content": str(m.get("content") or "")[:1200]} for m in (request.data.get("history") if isinstance(request.data.get("history"), list) else [])[-6:] if str(m.get("content") or "").strip()],
                        {"role": "user", "content": f"{user_ctx}{message}"},
                    ],
                    "temperature": 0.25,
                    "max_tokens": 1800,
                    "frequency_penalty": 0.45,
                    "presence_penalty": 0.25,
                },
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                timeout=45,
            )
            if response.status_code == 200:
                data = response.json()
                content = (((data.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
                if content:
                    return Response({"reply": _clean_ai_output(content)})
            else:
                logger.warning("Groq ai_chat_proxy HTTP %s: %s", response.status_code, response.text[:300])
        except Exception as exc:
            logger.warning("Groq ai_chat_proxy failed (%s): %s", type(exc).__name__, exc)

    fallback = _generate_tutor_response(message)
    return Response({"reply": fallback["reply"]})

@api_view(["POST"])
@permission_classes([AllowAny])
def ai_ncp_autofill(request):
    scenario = (request.data.get("scenario") or "").strip()
    if len(scenario) < 20:
        return Response(
            {"error": "Please provide a detailed clinical scenario (at least 20 characters)."},
            status=400,
        )

    api_key = getattr(settings, "GROQ_API_KEY", None)
    if not api_key:
        logger.error("GROQ_API_KEY is missing in settings")
        return Response({"error": "AI is not configured."}, status=500)

    content = ""
    try:
        r = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": model or "openai/gpt-oss-120b", # Use the same model that works in your Chat Widget
                "messages": [
                    {"role": "system", "content": NCP_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Patient scenario: {scenario}"},
                ],
                "temperature": 0.1,
                "max_tokens": 4096, 
                # REMOVED response_format: Groq's strict JSON validator is buggy and causes failures on complex prompts.
            },
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=60,
        )

        if r.status_code != 200:
            logger.error("Groq API error: %s - %s", r.status_code, r.text)
            return Response({"error": f"Groq API error ({r.status_code}). Please try again."}, status=500)

        content = (r.json()["choices"][0]["message"]["content"] or "").strip()

        # Bulletproof JSON cleaning
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()

        # Extract outermost JSON object if extra text wraps it
        start_idx = content.find("{")
        end_idx = content.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            content = content[start_idx : end_idx + 1]

        parsed = json.loads(content)
        return Response(parsed)

    except json.JSONDecodeError:
        logger.error("Groq returned invalid JSON: %s", content)
        return Response({"error": "AI returned invalid formatting. Please try again."}, status=500)
    except Exception as exc:
        logger.exception("Groq exception: %s", exc)
        return Response({"error": f"AI request failed: {str(exc)}"}, status=500)
