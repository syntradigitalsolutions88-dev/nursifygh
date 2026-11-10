"""Authentication, profile, clinical tracking, and AI endpoints."""

from __future__ import annotations

import json
import logging

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .email_service import send_welcome_email
from .models import ClinicalLog, ClinicalSkill
from .serializers import (
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

DEFAULT_CLINICAL_SKILLS = [
    ("Vital Signs", "Core Procedures", 5),
    ("Wound Dressing", "Core Procedures", 5),
    ("IM Injection", "Medication", 10),
    ("IV Cannulation", "Medication", 10),
    ("Urinary Catheterization", "Core Procedures", 3),
    ("NG Tube Insertion", "Core Procedures", 3),
    ("Bed Bathing", "Patient Care", 10),
    ("Blood Transfusion", "Medication", 2),
]

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
        for name, category, required in DEFAULT_CLINICAL_SKILLS:
            ClinicalSkill.objects.get_or_create(
                student=request.user,
                procedure_name=name,
                defaults={"category": category, "required_count": required},
            )

        skills = ClinicalSkill.objects.filter(student=request.user)
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
            "You are the NursifyGH Academic Tutor — an expert Ghanaian nursing educator. "
            "Help students understand medical concepts, NMC/N&MC exam questions, NANDA care plans, "
            "and how to use the platform."
        )
    else:
        system_prompt = (
            "You are the NursifyGH Support Assistant. Only help visitors understand and sign up. "
            "Do NOT answer nursing questions. Refer them to registration."
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
                "temperature": 0.5,
                "max_tokens": 500,
            },
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=30,
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