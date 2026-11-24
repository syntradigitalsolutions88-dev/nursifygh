"""Email sending via Resend."""

from __future__ import annotations

import logging
import os

import resend
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_api_key() -> str | None:
    return os.getenv("RESEND_API_KEY") or getattr(settings, "RESEND_API_KEY", None) or None


def _get_sender() -> tuple[str, str]:
    """Read the sender from Django settings (DEFAULT_FROM_EMAIL)."""
    raw = (os.getenv("DEFAULT_FROM_EMAIL") or getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()

    if "<" in raw and ">" in raw:
        name = raw.split("<")[0].strip().strip('"').strip("'")
        email = raw.split("<")[1].split(">")[0].strip()
        return (name or "NursifyGH", email)

    if "@" in raw:
        return ("NursifyGH", raw)

    return ("NursifyGH", "noreply@nursifygh.com")


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    api_key = _get_api_key()
    if not api_key:
        logger.warning("RESEND_API_KEY is missing — cannot send email to %s", to)
        return False

    resend.api_key = api_key
    sender_name, sender_email = _get_sender()
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
        resp = resend.Emails.send(params)
        msg_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
        logger.info("Email sent to %s via Resend (from=%s, id=%s)", to, sender_email, msg_id)
        return True
    except Exception as exc:
        logger.error("Failed to send email via Resend to %s (from=%s): %s", to, sender_email, exc)
        return False


def send_welcome_email(*, to: str, full_name: str) -> bool:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
    first_name = (full_name or "Student").strip().split(" ")[0]
    subject = f"Welcome to NursifyGH, {first_name}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <h1 style="color: #0f172a; margin-bottom: 12px;">Welcome, {first_name} 👋</h1>
      <p style="color: #334155; line-height: 1.6;">
        You've joined <strong>NursifyGH</strong> — the study companion for Ghanaian nursing students.
      </p>
      <a href="{frontend_url}/dashboard" style="display:inline-block; margin-top:16px; background:#047857; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold;">
        Open Dashboard →
      </a>
    </div>
    """
    text = f"Welcome to NursifyGH, {first_name}!\n\nOpen your dashboard: {frontend_url}/dashboard"
    return send_email(to, subject, html, text)


def send_subscription_activated(*, to: str, full_name: str, expires_at) -> bool:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
    first_name = (full_name or "Student").strip().split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "active period"
    subject = "Your NursifyGH Semester Pass is now active ✅"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <h1 style="color: #0f172a; margin-bottom: 12px;">Payment Confirmed — You're in, {first_name} 🎉</h1>
      <p style="color: #334155; line-height: 1.6;">
        Your NursifyGH access is now active until <strong>{expiry}</strong>.
      </p>
      <a href="{frontend_url}/dashboard" style="display:inline-block; margin-top:16px; background:#047857; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold;">
        Start studying →
      </a>
    </div>
    """
    text = f"Hi {first_name}, your NursifyGH payment is confirmed and your access is active until {expiry}."
    return send_email(to, subject, html, text)


def send_subscription_expiring(*, to: str, full_name: str, expires_at) -> bool:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
    first_name = (full_name or "Student").strip().split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "soon"
    subject = "Your NursifyGH pass expires in 7 days"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <h1 style="color: #0f172a; margin-bottom: 12px;">Your pass expires in 7 days</h1>
      <p style="color: #334155; line-height: 1.6;">
        Hi {first_name}, your pass expires on <strong>{expiry}</strong>.
      </p>
      <a href="{frontend_url}/subscribe" style="display:inline-block; margin-top:16px; background:#047857; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold;">
        Renew Pass →
      </a>
    </div>
    """
    text = f"Hi {first_name}, your pass expires on {expiry}."
    return send_email(to, subject, html, text)


def send_custom_notification_email(*, to: str, full_name: str, subject: str, message: str, category: str = "Update") -> bool:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", "https://nursifygh.vercel.app").rstrip("/")
    first_name = (full_name or "Student").strip().split(" ")[0]
    safe_message = "<br>".join((message or "").splitlines())
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #047857; margin-bottom: 8px;">
        NursifyGH · {category}
      </div>
      <h2 style="color: #0f172a; margin: 0 0 14px 0;">{subject}</h2>
      <p style="color: #334155; margin: 0 0 12px 0;">Hi {first_name},</p>
      <p style="color: #1e293b; line-height: 1.65; margin: 0 0 20px 0;">{safe_message}</p>
      <a href="{frontend_url}/dashboard" style="display:inline-block; background:#047857; color:white; padding:10px 20px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:13px;">
        Go to NursifyGH →
      </a>
    </div>
    """
    text = f"NursifyGH ({category}) - {subject}\n\nHi {first_name},\n\n{message}"
    return send_email(to, subject, html, text)
