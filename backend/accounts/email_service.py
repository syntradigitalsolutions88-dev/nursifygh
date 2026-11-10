"""Email sending via Resend."""

from __future__ import annotations

import logging

import resend
from django.conf import settings

logger = logging.getLogger(__name__)

resend.api_key = getattr(settings, "RESEND_API_KEY", None)

FROM_EMAIL = "NursifyGH <onboarding@resend.dev>"


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send a single email via Resend. Returns True on success."""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY is missing — cannot send email to %s", to)
        return False

    try:
        params: dict = {
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        if text:
            params["text"] = text

        response = resend.Emails.send(params)
        logger.info("Email sent to %s — id=%s", to, response.get("id"))
        return True
    except Exception as exc:
        logger.exception("Failed to send email to %s: %s", to, exc)
        return False


# ─── Templates ────────────────────────────────────────────────────────────────


def send_welcome_email(*, to: str, full_name: str) -> bool:
    first_name = full_name.split(" ")[0]
    subject = f"Welcome to NursifyGH, {first_name}"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fafafa;">
      <div style="background: white; border: 1px solid #e5e5e5; padding: 40px;">
        <p style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #666; margin: 0 0 8px;">NursifyGH</p>
        <h1 style="font-size: 26px; margin: 0 0 16px; color: #0f172a;">Welcome, {first_name} 👋</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          You've joined NursifyGH — the study companion built for Ghanaian nursing students.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
          Here's what you can do right now:
        </p>
        <ul style="font-size: 15px; line-height: 1.7; color: #334155; margin: 0 0 24px; padding-left: 20px;">
          <li>Browse 148 NMC courses across all departments</li>
          <li>Take 60-minute mock exams with instant grading</li>
          <li>Track clinical procedures in your personal logbook</li>
          <li>Build N&amp;MC-format care plans with AI assistance</li>
        </ul>
        <a href="https://nursifygh-frontend.vercel.app/dashboard" style="display: inline-block; background: #047857; color: white; padding: 12px 24px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Dashboard →</a>
        <p style="font-size: 13px; color: #64748b; margin: 32px 0 0; border-top: 1px solid #e5e5e5; padding-top: 20px;">
          Questions? Reply to this email or use the chat widget inside the app.
        </p>
      </div>
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 20px 0 0;">
        NursifyGH · Study Smart · Pass Your N&MC Exam
      </p>
    </div>
    """
    text = (
        f"Welcome to NursifyGH, {first_name}!\n\n"
        "You've joined the study companion built for Ghanaian nursing students.\n\n"
        "Start with your first course: https://nursifygh-frontend.vercel.app/dashboard\n\n"
        "— The NursifyGH team"
    )
    return send_email(to, subject, html, text)


def send_subscription_activated(*, to: str, full_name: str, expires_at) -> bool:
    first_name = full_name.split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "—"
    subject = "Your NursifyGH Semester Pass is now active ✅"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fafafa;">
      <div style="background: white; border: 1px solid #e5e5e5; padding: 40px;">
        <p style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #047857; margin: 0 0 8px;">Subscription Active</p>
        <h1 style="font-size: 26px; margin: 0 0 16px; color: #0f172a;">You're in, {first_name} 🎉</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
          Your Semester Pass is now active. Everything is unlocked:
        </p>
        <ul style="font-size: 15px; line-height: 1.7; color: #334155; margin: 0 0 24px; padding-left: 20px;">
          <li>✅ All 148 NMC courses + 1,000+ practice questions</li>
          <li>✅ Mock Exam Simulator (60-min exams)</li>
          <li>✅ Clinical Tracker with supervisor log</li>
          <li>✅ AI Care Plan Autofill</li>
          <li>✅ Community care plan library</li>
        </ul>
        <div style="background: #ecfdf5; border-left: 3px solid #047857; padding: 12px 16px; margin: 0 0 24px;">
          <p style="font-size: 13px; color: #065f46; margin: 0;">
            <strong>Active until:</strong> {expiry}
          </p>
        </div>
        <a href="https://nursifygh-frontend.vercel.app/dashboard" style="display: inline-block; background: #047857; color: white; padding: 12px 24px; text-decoration: none; font-weight: 600; font-size: 14px;">Start studying →</a>
      </div>
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 20px 0 0;">
        NursifyGH · Study Smart · Pass Your N&MC Exam
      </p>
    </div>
    """
    text = (
        f"Hi {first_name},\n\n"
        f"Your NursifyGH Semester Pass is now active until {expiry}.\n\n"
        "Everything is unlocked — go to your dashboard:\n"
        "https://nursifygh-frontend.vercel.app/dashboard\n\n"
        "— The NursifyGH team"
    )
    return send_email(to, subject, html, text)


def send_subscription_expiring(*, to: str, full_name: str, expires_at) -> bool:
    first_name = full_name.split(" ")[0]
    expiry = expires_at.strftime("%d %B %Y") if expires_at else "soon"
    subject = "Your NursifyGH pass expires in 7 days"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fafafa;">
      <div style="background: white; border: 1px solid #e5e5e5; padding: 40px;">
        <p style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #b45309; margin: 0 0 8px;">Heads up</p>
        <h1 style="font-size: 26px; margin: 0 0 16px; color: #0f172a;">Your pass expires in 7 days</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hi {first_name} — your NursifyGH Semester Pass expires on <strong>{expiry}</strong>.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
          Renew now to keep uninterrupted access to all your courses, mock exams, and AI care plans.
        </p>
        <a href="https://nursifygh-frontend.vercel.app/subscribe" style="display: inline-block; background: #047857; color: white; padding: 12px 24px; text-decoration: none; font-weight: 600; font-size: 14px;">Renew for GHS 30 →</a>
      </div>
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 20px 0 0;">
        NursifyGH · Study Smart · Pass Your N&MC Exam
      </p>
    </div>
    """
    text = (
        f"Hi {first_name},\n\n"
        f"Your NursifyGH Semester Pass expires on {expiry}.\n\n"
        "Renew for GHS 30 to keep access: https://nursifygh-frontend.vercel.app/subscribe\n\n"
        "— The NursifyGH team"
    )
    return send_email(to, subject, html, text)
