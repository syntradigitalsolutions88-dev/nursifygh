"""Email sending via Brevo (free tier, no domain required)."""

from __future__ import annotations

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
FROM_EMAIL = "syntradigitalsolutions88@gmail.com"
FROM_NAME = "NursifyGH"


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    api_key = getattr(settings, "BREVO_API_KEY", None)
    if not api_key:
        logger.warning("BREVO_API_KEY is missing — cannot send email to %s", to)
        return False

    payload = {
        "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html,
    }
    if text:
        payload["textContent"] = text

    try:
        response = requests.post(
            BREVO_API_URL,
            json=payload,
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json",
            },
            timeout=30,
        )
        if response.status_code in (200, 201, 202):
            logger.info("Email sent to %s via Brevo", to)
            return True
        else:
            logger.error("Brevo error %s: %s", response.status_code, response.text[:500])
            return False
    except Exception as exc:
        logger.exception("Failed to send email via Brevo to %s: %s", to, exc)
        return False


def send_welcome_email(*, to: str, full_name: str) -> bool:
    first_name = full_name.split(" ")[0]
    subject = f"Welcome to NursifyGH, {first_name}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #0f172a;">Welcome, {first_name} 👋</h1>
      <p>You've joined NursifyGH — the study companion for Ghanaian nursing students.</p>
      <a href="https://nursifygh-frontend.vercel.app/dashboard" style="display:inline-block; background:#047857; color:white; padding:12px 24px; text-decoration:none;">Open Dashboard →</a>
    </div>
    """
    text = f"Welcome to NursifyGH, {first_name}!\n\nVisit: https://nursifygh-frontend.vercel.app/dashboard"
    return send_email(to, subject, html, text)


def send_subscription_activated(*, to: str, full_name: str, expires_at) -> bool:
    first_name = full_name.split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "—"
    subject = "Your NursifyGH Semester Pass is now active ✅"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1>You're in, {first_name} 🎉</h1>
      <p>Your pass is active until <strong>{expiry}</strong>.</p>
      <a href="https://nursifygh-frontend.vercel.app/dashboard" style="display:inline-block; background:#047857; color:white; padding:12px 24px; text-decoration:none;">Start studying →</a>
    </div>
    """
    text = f"Hi {first_name}, your pass is active until {expiry}."
    return send_email(to, subject, html, text)


def send_subscription_expiring(*, to: str, full_name: str, expires_at) -> bool:
    first_name = full_name.split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "soon"
    subject = "Your NursifyGH pass expires in 7 days"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1>Your pass expires in 7 days</h1>
      <p>Hi {first_name}, your pass expires on <strong>{expiry}</strong>.</p>
      <a href="https://nursifygh-frontend.vercel.app/subscribe" style="display:inline-block; background:#047857; color:white; padding:12px 24px; text-decoration:none;">Renew for GHS 30 →</a>
    </div>
    """
    text = f"Hi {first_name}, your pass expires on {expiry}."
    return send_email(to, subject, html, text)