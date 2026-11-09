# =============================================================================
# Alert Manager — Escalation rules, rate limiting, SMS dispatch
# =============================================================================

import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

try:
    from .sms_service import sms_service
except ImportError:
    from sms_service import sms_service


logger = logging.getLogger("alert_manager")

DEFAULT_SMS_TEMPLATE = """[{prefix}] {conveyor_id}: {classification} ({confidence}%) on {failed_component}. Vib:{vib_l}/{vib_r}g Load:{load_l}kg. Immediate action required."""


class AlertManager:
    """
    Manages alert escalation, deduplication, and SMS dispatch.

    Rules:
    - EMERGENCY: Immediate SMS to ALL contacts (admin + maintenance)
    - CRITICAL:  SMS to admin + maintenance after 2 consecutive detections
    - WARNING:   SMS to admin only after 5 consecutive detections
    - NORMAL:    No SMS

    Rate limiting: max 1 SMS per defect type per 5 minutes to prevent spam.
    """

    def __init__(self):
        self.alert_contacts: list[dict] = []
        self.last_sms_sent: dict[str, float] = {}  # key: "severity:classification" → timestamp
        self.consecutive_counts: dict[str, int] = {}  # key: classification → count
        self.sms_cooldown_seconds = 300  # 5 minutes
        self.alert_history: list[dict] = []
        self.sms_template: str = os.getenv("ALERT_SMS_TEMPLATE", DEFAULT_SMS_TEMPLATE).strip()

    def configure(self):
        """Load alert contacts from environment variables."""
        # Admin contacts
        admin_numbers = os.getenv("ALERT_ADMIN_PHONES", "").split(",")
        for num in admin_numbers:
            num = num.strip()
            if num:
                self.alert_contacts.append({"number": num, "role": "admin", "name": "Admin"})

        # Maintenance crew contacts
        maint_numbers = os.getenv("ALERT_MAINTENANCE_PHONES", "").split(",")
        for num in maint_numbers:
            num = num.strip()
            if num:
                self.alert_contacts.append({"number": num, "role": "maintenance", "name": "Maintenance Crew"})

        if self.alert_contacts:
            logger.info("Alert contacts configured: %d contacts", len(self.alert_contacts))
            for c in self.alert_contacts:
                logger.info("  %s: %s (%s)", c["role"], c["number"], c["name"])
        else:
            logger.warning(
                "No alert contacts configured. Set ALERT_ADMIN_PHONES and "
                "ALERT_MAINTENANCE_PHONES in .env"
            )

    def process_prediction(self, prediction: dict, raw_frame: dict) -> Optional[dict]:
        """
        Process an ML prediction and trigger alerts if needed.

        Args:
            prediction: Output from MLEngine.predict()
            raw_frame: Raw sensor data frame

        Returns:
            Alert dict if an alert was generated, None otherwise.
        """
        severity = prediction.get("severity", "NORMAL")
        classification = prediction.get("classification", "UNKNOWN")
        confidence = prediction.get("confidence", 0.0)

        # Track consecutive detections
        if classification != "NORMAL" and severity != "NORMAL":
            self.consecutive_counts[classification] = (
                self.consecutive_counts.get(classification, 0) + 1
            )
        else:
            # Reset counters when normal
            self.consecutive_counts.clear()

        if severity == "NORMAL" or classification == "NORMAL":
            return None

        consecutive = self.consecutive_counts.get(classification, 1)

        # Debounce: require consecutive confirmations to avoid transient sensor noise spamming alerts
        # - EMERGENCY: 1 frame for E-Stop/Tear, 2 frames for others
        # - CRITICAL: at least 3 consecutive frames
        # - WARNING: at least 5 consecutive frames
        is_immediate = "ESTOP" in str(failed_component).upper() or "TEAR" in str(failed_component).upper()
        if severity == "EMERGENCY" and not is_immediate and consecutive < 2:
            return None
        if severity == "CRITICAL" and consecutive < 3:
            return None
        if severity == "WARNING" and consecutive < 5:
            return None

        # Build alert record
        failed_component = prediction.get("failed_component", "CONVEYOR SUBSYSTEM")
        failure_cause = prediction.get("failure_cause", "")

        alert = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": severity,
            "classification": classification,
            "failed_component": failed_component,
            "failure_cause": failure_cause,
            "confidence": confidence,
            "anomaly_score": prediction.get("anomaly_score", 0.0),
            "is_anomaly": prediction.get("is_anomaly", False),
            "consecutive_count": self.consecutive_counts.get(classification, 1),
            "sms_sent": False,
            "sensor_snapshot": {
                "vibration_left_g": raw_frame.get("vibration_left_g"),
                "vibration_right_g": raw_frame.get("vibration_right_g"),
                "load_left_kg": raw_frame.get("load_left_kg"),
                "load_right_kg": raw_frame.get("load_right_kg"),
                "current_A": raw_frame.get("current_A"),
                "motor_state": raw_frame.get("motor_state"),
                "estop_active": raw_frame.get("estop_active"),
            },
        }

        # Determine if we should send SMS
        should_sms = self._should_send_sms(severity, classification)

        if should_sms:
            message = self._format_sms(alert)
            recipients = self._get_recipients(severity)
            sent_count = 0

            for contact in recipients:
                success = sms_service.send_sms(contact["number"], message)
                if success:
                    sent_count += 1

            alert["sms_sent"] = sent_count > 0 or not sms_service.configured
            alert["sms_recipients"] = len(recipients)

            # Update cooldown (shorter for emergencies)
            cooldown_key = f"{severity}:{classification}"
            self.last_sms_sent[cooldown_key] = time.time()

            logger.warning(
                "ALERT [%s] Part: %s | %s (conf: %.1f%%) — SMS sent to %d/%d contacts",
                severity, failed_component, classification, confidence * 100,
                sent_count, len(recipients),
            )

        # Store in history (keep last 500)
        self.alert_history.append(alert)
        if len(self.alert_history) > 500:
            self.alert_history = self.alert_history[-500:]

        return alert

    def _should_send_sms(self, severity: str, classification: str) -> bool:
        """Check if SMS should be sent based on escalation rules and cooldown."""
        # 1. WARNING and NORMAL: strictly NO SMS (prevents false alarms / negative emergency spam)
        if severity not in ("EMERGENCY", "CRITICAL"):
            return False

        consecutive = self.consecutive_counts.get(classification, 1)

        # 2. Rate limit check: emergencies 180s cooldown, critical 300s cooldown (5 min)
        cooldown_key = f"{severity}:{classification}"
        last_sent = self.last_sms_sent.get(cooldown_key, 0)
        cooldown_limit = 180 if severity == "EMERGENCY" else 300

        if time.time() - last_sent < cooldown_limit:
            return False

        # 3. EMERGENCY: immediate dispatch for true emergencies (Tear, Motor Burnout Risk, E-Stop, Bearing Seizure)
        if severity == "EMERGENCY":
            return True

        # 4. CRITICAL: require 3+ consecutive confirmed frames to verify it is genuine before sending
        if severity == "CRITICAL":
            return consecutive >= 3

        return False

    def _get_recipients(self, severity: str) -> list[dict]:
        """Get SMS recipients based on severity level."""
        if severity in ("EMERGENCY", "CRITICAL"):
            return self.alert_contacts  # Admin + Maintenance crew
        elif severity == "WARNING":
            return [c for c in self.alert_contacts if c["role"] == "admin"]
        return []

    def _format_sms(self, alert: dict) -> str:
        """Format SMS message for an alert using customizable template."""
        severity = alert.get("severity", "CRITICAL")
        classification = alert.get("classification", "UNKNOWN")
        failed_component = alert.get("failed_component", "CONVEYOR SUBSYSTEM")
        failure_cause = alert.get("failure_cause", "Anomaly detected")
        confidence = alert.get("confidence", 0.0)
        ts = alert.get("timestamp", "")[:19].replace("T", " ")
        snap = alert.get("sensor_snapshot", {})

        if severity == "EMERGENCY":
            prefix = "EMERGENCY"
        elif severity == "CRITICAL":
            prefix = "CRITICAL"
        else:
            prefix = "WARNING"

        conveyor_id = os.getenv("CONVEYOR_ID", "CV-IRON-01")

        values = {
            "prefix": prefix,
            "severity": severity,
            "conveyor_id": conveyor_id,
            "failed_component": failed_component,
            "classification": classification,
            "confidence": f"{confidence * 100:.1f}",
            "failure_cause": failure_cause,
            "time": ts,
            "timestamp": ts,
            "vib_l": str(snap.get("vibration_left_g", "N/A")),
            "vib_r": str(snap.get("vibration_right_g", "N/A")),
            "load_l": str(snap.get("load_left_kg", "N/A")),
            "load_r": str(snap.get("load_right_kg", "N/A")),
            "current": str(snap.get("current_A", "N/A")),
            "motor_state": str(snap.get("motor_state", "N/A")),
        }

        try:
            return self.sms_template.format(**values)
        except Exception:
            # Fallback if custom template has extra or missing braces
            msg = self.sms_template
            for k, v in values.items():
                msg = msg.replace(f"{{{k}}}", str(v))
            return msg

    def get_template(self) -> str:
        """Return the current SMS template."""
        return self.sms_template

    def set_template(self, template: str):
        """Set a new SMS template."""
        if template and template.strip():
            self.sms_template = template.strip()

    def get_recent_alerts(self, limit: int = 50) -> list[dict]:
        """Return the most recent alerts."""
        return self.alert_history[-limit:]


# Singleton
alert_manager = AlertManager()
