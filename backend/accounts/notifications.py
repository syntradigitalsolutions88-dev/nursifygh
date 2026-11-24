"""Unified Email, SMS, and WhatsApp notification dispatcher."""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.parse
import urllib.request

from django.conf import settings

from .email_service import (
    send_custom_notification_email,
    send_subscription_activated,
    send_welcome_email,
)

logger = logging.getLogger(__name__)


def normalize_gh_phone(phone: str | None) -> str:
    """Normalize Ghanaian numbers (024xxxxxxx -> 23324xxxxxxx) or international digits."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", str(phone).strip())
    if not digits:
        return ""
    if digits.startswith("0") and len(digits) == 10:
        return "233" + digits[1:]
    if len(digits) == 9:
        return "233" + digits
    return digits


def build_whatsapp_link(phone: str | None, message: str) -> str:
    """Return a ready-to-open https://wa.me/<digits>?text=... URL."""
    norm = normalize_gh_phone(phone)
    encoded = urllib.parse.quote(message or "")
    if norm:
        return f"https://wa.me/{norm}?text={encoded}"
    return f"https://wa.me/?text={encoded}"


def send_sms(*, phone: str | None, message: str) -> dict:
    """Send SMS if SMS_API_URL and SMS_API_KEY are configured; otherwise log cleanly."""
    norm_phone = normalize_gh_phone(phone)
    if not norm_phone:
        return {"ok": False, "status": "no_phone", "detail": "Missing or invalid phone number"}

    sms_url = (os.getenv("SMS_API_URL") or getattr(settings, "SMS_API_URL", "") or "").strip()
    sms_key = (os.getenv("SMS_API_KEY") or getattr(settings, "SMS_API_KEY", "") or "").strip()
    sender_id = (os.getenv("SMS_SENDER_ID") or getattr(settings, "SMS_SENDER_ID", "") or "NursifyGH").strip()

    if not sms_url or not sms_key:
        logger.info("SMS dry-run/unconfigured (to=%s): %s", norm_phone, message[:100])
        return {
            "ok": False,
            "status": "not_configured",
            "phone": norm_phone,
            "detail": "SMS_API_URL / SMS_API_KEY not set on server",
        }

    payload = json.dumps({
        "sender": sender_id,
        "recipient": norm_phone,
        "recipients": [norm_phone],
        "message": message,
    }).encode("utf-8")

    req = urllib.request.Request(
        sms_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {sms_key}",
            "api-key": sms_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            logger.info("SMS sent to %s (status=%s)", norm_phone, resp.status)
            return {"ok": True, "status": "sent", "phone": norm_phone, "response": body[:200]}
    except Exception as exc:
        logger.error("Failed to send SMS to %s: %s", norm_phone, exc)
        return {"ok": False, "status": "error", "phone": norm_phone, "detail": str(exc)}


def send_whatsapp(*, phone: str | None, message: str) -> dict:
    """Send WhatsApp via Cloud API if configured, and always provide a wa.me fallback link."""
    norm_phone = normalize_gh_phone(phone)
    wa_link = build_whatsapp_link(norm_phone, message)

    token = (os.getenv("WHATSAPP_TOKEN") or getattr(settings, "WHATSAPP_TOKEN", "") or "").strip()
    phone_number_id = (
        os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        or getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")
        or ""
    ).strip()

    if not norm_phone:
        return {"ok": False, "status": "no_phone", "wa_link": wa_link, "detail": "Missing phone number"}

    if not token or not phone_number_id:
        logger.info("WhatsApp link generated for %s (Cloud API not configured)", norm_phone)
        return {
            "ok": False,
            "status": "link_ready",
            "phone": norm_phone,
            "wa_link": wa_link,
            "detail": "WhatsApp Cloud API not configured; use WhatsApp link to send directly",
        }

    url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
    payload = json.dumps({
        "messaging_product": "whatsapp",
        "to": norm_phone,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            logger.info("WhatsApp message sent to %s", norm_phone)
            return {"ok": True, "status": "sent", "phone": norm_phone, "wa_link": wa_link, "response": body[:200]}
    except Exception as exc:
        logger.error("Failed to send WhatsApp to %s: %s", norm_phone, exc)
        return {"ok": False, "status": "error", "phone": norm_phone, "wa_link": wa_link, "detail": str(exc)}


def notify_user_registered(user) -> None:
    """Send registration welcome notifications across configured channels."""
    try:
        if getattr(user, "email", None):
            send_welcome_email(to=user.email, full_name=getattr(user, "full_name", "") or "")
    except Exception:
        logger.exception("Registration welcome email failed for %s", getattr(user, "email", ""))

    phone = getattr(user, "phone_number", "") or ""
    if phone:
        first_name = ((getattr(user, "full_name", "") or "Student").strip().split(" ")[0])
        msg = f"Welcome to NursifyGH, {first_name}! Your student study account is ready."
        send_sms(phone=phone, message=msg)


def notify_payment_succeeded(txn) -> None:
    """Send payment confirmation email (and SMS if configured) when a payment succeeds."""
    student = getattr(txn, "student", None)
    if not student:
        return
    try:
        if getattr(student, "email", None):
            send_subscription_activated(
                to=student.email,
                full_name=getattr(student, "full_name", "") or "",
                expires_at=getattr(student, "subscription_expires_at", None),
            )
    except Exception:
        logger.exception("Payment confirmation email failed for %s", getattr(student, "email", ""))

    phone = getattr(student, "phone_number", "") or ""
    if phone:
        first_name = ((getattr(student, "full_name", "") or "Student").strip().split(" ")[0])
        amount = getattr(txn, "amount_ghs", "")
        ref = getattr(txn, "provider_reference", "") or getattr(txn, "reference", "")
        msg = f"NursifyGH: Payment of GHS {amount} confirmed (Ref: {ref}). Your study access is active!"
        send_sms(phone=phone, message=msg)


def dispatch_admin_message(
    *,
    users,
    channels: list[str],
    subject: str,
    message: str,
    category: str = "Update",
) -> dict:
    """Send a custom message to a list of User objects across email, sms, and/or whatsapp."""
    ch_set = {c.lower().strip() for c in (channels or ["email"])}
    email_sent = 0
    email_failed = 0
    sms_sent = 0
    sms_skipped = 0
    wa_links: list[dict] = []

    for u in users:
        name = getattr(u, "full_name", "") or getattr(u, "email", "Student")
        email = (getattr(u, "email", "") or "").strip()
        phone = (getattr(u, "phone_number", "") or "").strip()

        if "email" in ch_set and email:
            if send_custom_notification_email(
                to=email,
                full_name=name,
                subject=subject or f"NursifyGH {category}",
                message=message,
                category=category,
            ):
                email_sent += 1
            else:
                email_failed += 1

        if "sms" in ch_set and phone:
            res = send_sms(phone=phone, message=f"{subject}: {message}" if subject else message)
            if res.get("ok"):
                sms_sent += 1
            else:
                sms_skipped += 1
        elif "sms" in ch_set and not phone:
            sms_skipped += 1

        if "whatsapp" in ch_set:
            wa_res = send_whatsapp(phone=phone, message=f"*{subject}*\n{message}" if subject else message)
            wa_links.append({
                "name": name,
                "email": email,
                "phone": phone or "No phone",
                "status": wa_res.get("status", "link_ready"),
                "wa_link": wa_res.get("wa_link", ""),
            })

    return {
        "recipients_count": len(users),
        "email_sent": email_sent,
        "email_failed": email_failed,
        "sms_sent": sms_sent,
        "sms_skipped": sms_skipped,
        "whatsapp_links": wa_links[:15],
    }
