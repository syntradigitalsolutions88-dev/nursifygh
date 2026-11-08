"""API views for authentication, profile, and password reset."""

from __future__ import annotations

import logging
import requests

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class RegistrationRateThrottle(AnonRateThrottle):
    scope = "registration"


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (RegistrationRateThrottle,)


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

    def post(self, request, *args, **kwargs):
        serializer = PasswordChangeSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower().strip()

        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user:
            try:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                reset_url = (
                    f"{settings.FRONTEND_ORIGIN}/reset-password"
                    f"?uid={uid}&token={token}"
                )
                send_mail(
                    subject="Reset your NursifyGH password",
                    message=(
                        f"Hi {user.full_name},\n\n"
                        "We received a request to reset your NursifyGH password.\n\n"
                        "Click this link to choose a new password:\n\n"
                        f"{reset_url}\n\n"
                        "This link expires in 60 minutes. If you didn't request this, "
                        "you can ignore this email and your password will not change.\n\n"
                        "— The NursifyGH team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as exc:
                logger.exception(
                    "Password reset email failed for %s: %s", email, exc
                )

        return Response(
            {"detail": "If an account exists for that email, a reset link has been sent."}
        )


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response(
            {"detail": "Password has been reset. You can now log in."}
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def ai_chat_proxy(request):
    """Proxy a chat message to Groq and return the AI reply."""
    user_message = request.data.get("message")
    mode = request.data.get("mode", "public")

    if not user_message:
        return Response({"error": "Message is required"}, status=400)

    api_key = getattr(settings, "GROQ_API_KEY", None)
    if not api_key:
        print("ERROR: GROQ_API_KEY is missing from settings!")
        return Response({"error": "Server configuration error."}, status=500)

    if mode == "student":
        system_prompt = (
            "You are the NursifyGH Academic Tutor — an expert Ghanaian nursing educator. "
            "Help students understand medical concepts, NMC/N&MC exam questions, NANDA care plans, "
            "and how to use the platform. Be encouraging, concise, and accurate.\n\n"
            "IMPORTANT CONTEXT:\n"
            "- Nursing education in Ghana is paper-based. Students submit care plans on official N&MC forms.\n"
            "- NursifyGH is a STUDY TOOL to help students draft, refine, and understand care plans — "
            "not a direct submission platform.\n"
            "- When a student asks about care plan submission, remind them to transcribe onto the official "
            "N&MC form for their lecturer.\n"
            "- Always explain the 'why' behind NANDA diagnoses, SMART goals, and rationales — never just give answers.\n"
            "- You may answer any nursing, anatomy, pharmacology, or clinical question they ask.\n"
            "- If they ask about the app's features, refer them to the Help Center."
        )
    else:
        system_prompt = (
            "You are the NursifyGH Support Assistant. Your ONLY job is to help visitors understand and "
            "sign up for the NursifyGH platform. You must NOT answer nursing, medical, anatomy, "
            "pharmacology, or exam-prep questions on this page.\n\n"
            "You CAN answer questions about:\n"
            "- How to register for a NursifyGH account\n"
            "- What NursifyGH is and what it offers\n"
            "- Pricing (GHS 30 per semester for 120 days of full access)\n"
            "- What courses and programs are available\n"
            "- How Mobile Money payment works\n"
            "- What NANDA care plans and NMC past questions are\n"
            "- How to contact support (email syntradigitalsolutions88@gmail.com or call 0556 025 786)\n"
            "- How to log in, reset a password, or share a care plan with an instructor\n"
            "- Where to find the Help Center\n\n"
            "If a visitor asks a nursing, medical, or educational question, you MUST politely decline and say:\n"
            "'Great question! To get detailed nursing tutoring, please create a free account and log in. "
            "Once you're logged in, I'll be your full Academic Tutor and can answer any nursing question you have. "
            "Signing up takes about 2 minutes — just click \"Start studying free\" at the top of the page.'\n\n"
            "Never give a nursing, anatomy, medical, or exam answer on this page. Only refer them to registration."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.5,
        "max_tokens": 500,
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30,
        )

        if response.status_code != 200:
            print(f"--- GROQ ERROR: {response.text} ---")
            return Response({"error": "AI service rejected the request."}, status=500)

        response_data = response.json()
        ai_reply = response_data["choices"][0]["message"]["content"]
        print(f"--- GROQ SUCCESS: {len(ai_reply)} chars ---")
        return Response({"reply": ai_reply})

    except Exception as e:
        print(f"--- REQUEST FAILED: {e} ---")
        return Response({"error": "AI is currently unavailable."}, status=500)