# =============================================================================
# SMS Service — Twilio SMS notification sender
# =============================================================================

import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger("sms_service")


class SMSService:
    """Sends SMS alerts via Twilio. Falls back to logging if not configured."""

    def __init__(self):
        self.client = None
        self.from_number: Optional[str] = None
        self.configured = False
        self.enabled = False

    def configure(self):
        """Initialize Twilio client from environment variables."""
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).resolve().parent / ".env")

        self.enabled = os.getenv("TWILIO_SMS_ENABLED", "false").strip().lower() in ("true", "1", "yes")
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER")

        if not all([account_sid, auth_token, self.from_number]):
            logger.warning(
                "Twilio not configured — SMS alerts will be logged only. "
                "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env"
            )
            return

        try:
            from twilio.rest import Client
            self.client = Client(account_sid, auth_token)
            self.configured = True
            status_str = "ACTIVE" if self.enabled else "MUTED (Credit Saver Mode)"
            logger.info("Twilio SMS service configured (%s, from: %s)", status_str, self.from_number)
        except Exception as e:
            logger.error("Failed to initialize Twilio: %s", e)

    def send_sms(self, to_number: str, message: str) -> bool:
        """
        Send an SMS message.

        Args:
            to_number: Recipient phone number (E.164 format, e.g. +917305196551)
            message: SMS body text (max 1600 chars)

        Returns:
            True if sent successfully, False otherwise.
        """
        # Truncate long messages
        if len(message) > 1600:
            message = message[:1597] + "..."

        if not self.enabled:
            logger.info("[SMS-PAUSED (CREDIT SAVER)] Muted dispatch to %s: %s", to_number, message)
            return True

        if not self.configured or not self.client:
            logger.info("[SMS-LOG] To: %s | %s", to_number, message)
            return False

        try:
            msg = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number,
            )
            logger.info("SMS sent to %s — SID: %s", to_number, msg.sid)
            return True
        except Exception as e:
            logger.error("SMS send failed to %s: %s", to_number, e)
            logger.info("[SMS-FALLBACK] To: %s | %s", to_number, message)
            return False


# Singleton
sms_service = SMSService()
