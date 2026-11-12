"""Email sending via Resend."""

from __future__ import annotations

import logging
import os

import resend
from django.conf import settings

logger = logging.getLogger(__name__)

# Set the API key from environment variables (or Django settings)
resend.api_key = os.getenv("RESEND_API_KEY") or getattr(settings, "RESEND_API_KEY", None)


def _get_sender() -> tuple[str, str]:
    """Read the sender from Django settings (DEFAULT_FROM_EMAIL)."""
    raw = getattr(settings, "DEFAULT_FROM_EMAIL", "") or ""
    raw = raw.strip()

    if "<" in raw and ">" in raw:
        name = raw.split("<")[0].strip().strip('"').strip("'")
        email = raw.split("<")[1].split(">")[0].strip()
        return (name or "NursifyGH", email)

    if "@" in raw:
        return ("NursifyGH", raw)

    return ("NursifyGH", "noreply@nursifygh.com")


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    if not resend.api_key:
        logger.warning("RESEND_API_KEY is missing — cannot send email to %s", to)
        return False

    sender_name, sender_email = _get_sender()

    # Resend expects the sender in "Name <email>" format
    from_address = f"{sender_name} <{sender_email}>"

    params: resend.Emails.SendParams = {
        "from": from_address,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        params["text"] = text

    try:
        email = resend.Emails.send(params)
        logger.info("Email sent to %s via Resend (from=%s, id=%s)", to, sender_email, email.get("id"))
        return True
    except Exception as exc:
        logger.exception("Failed to send email via Resend to %s (from=%s): %s", to, sender_email, exc)
        return False


def send_welcome_email(*, to: str, full_name: str) -> bool:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
    first_name = full_name.split(" ")[0]
    subject = f"Welcome to NursifyGH, {first_name}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #0f172a;">Welcome, {first_name} 👋</h1>
      <p>You've joined NursifyGH — the study companion for Ghanaian nursing students.</p>
      <a href="{frontend_url}/dashboard" style="display:inline-block; background:#047857; color:white; padding:12px 24px; text-decoration:none; border-radius:6px;">Open Dashboard →</a>
    </div>
    """
    text = f"Welcome to NursifyGH, {first_name}!\n\nVisit: {frontend_url}/dashboard"
    return send_email(to, subject, html, text)


def send_subscription_activated(*, to: str, full_name: str, expires_at) -> bool:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
    first_name = full_name.split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "—"
    subject = "Your NursifyGH Semester Pass is now active ✅"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1>You're in, {first_name} 🎉</h1>
      <p>Your pass is active until <strong>{expiry}</strong>.</p>
      <a href="{frontend_url}/dashboard" style="display:inline-block; background:#047857; color:white; padding:12px 24px; text-decoration:none; border-radius:6px;">Start studying →</a>
    </div>
    """
    text = f"Hi {first_name}, your pass is active until {expiry}."
    return send_email(to, subject, html, text)


def send_subscription_expiring(*, to: str, full_name: str, expires_at) -> bool:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
    first_name = full_name.split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "soon"
    subject = "Your NursifyGH pass expires in 7 days"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1>Your pass expires in 7 days</h1>
      <p>Hi {first_name}, your pass expires on <strong>{expiry}</strong>.</p>
      <a href="{frontend_url}/subscribe" style="display:inline-block; background:#047857; color:white; padding:12px 24px; text-decoration:none; border-radius:6px;">Renew for GHS 30 →</a>
    </div>
    """
    text = f"Hi {first_name}, your pass expires on {expiry}."
    return send_email(to, subject, html, text)