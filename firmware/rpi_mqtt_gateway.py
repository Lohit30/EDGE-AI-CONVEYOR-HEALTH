#!/usr/bin/env python3
# =============================================================================
# Raspberry Pi MQTT Gateway — Bridges ESP32 Sensors to Dashboard Backend
# =============================================================================
# Architecture:
#   [ESP32 Sensors] ──(MQTT Wi-Fi)──► [Raspberry Pi Broker]
#                                             │
#                                   (rpi_mqtt_gateway.py)
#                                             │ (HTTP POST /api/telemetry)
#                                             ▼
#                                  [FastAPI Backend & SCADA Dashboard]
#
# Runs on the Raspberry Pi:
#   1. Subscribes to local Mosquitto broker: conveyor/+/telemetry
#   2. Receives sensor frames from ESP32
#   3. Forwards them in real-time to the PC Backend for ML inference & SMS alerting
#
# Usage:
#   pip3 install paho-mqtt
#   python3 rpi_mqtt_gateway.py --dashboard http://192.168.1.3:8000
# =============================================================================

import argparse
import json
import logging
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("rpi-gateway")

# Defaults
DEFAULT_MQTT_BROKER = "127.0.0.1"      # Localhost on Raspberry Pi (Mosquitto)
DEFAULT_MQTT_PORT   = 1883
DEFAULT_MQTT_TOPIC  = "conveyor/#"     # Subscribes to telemetry, vision, and status topics
DEFAULT_DASHBOARD   = "http://192.168.1.3:8000"


class RPiGateway:
    def __init__(self, broker: str, port: int, topic: str, dashboard_url: str):
        self.broker = broker
        self.port = port
        self.topic = topic
        self.telemetry_api = f"{dashboard_url.rstrip('/')}/api/telemetry"
        self.forwarded_count = 0
        self.error_count = 0
        self.last_log_time = time.time()

        self.mqtt_client = mqtt.Client(
            client_id="rpi-edge-gateway",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_message = self.on_message
        self.mqtt_client.on_disconnect = self.on_disconnect

    def on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            logger.info("Connected to local Mosquitto broker at %s:%d", self.broker, self.port)
            logger.info("Subscribing to topic: %s", self.topic)
            client.subscribe(self.topic, qos=1)
        else:
            logger.error("Failed to connect to MQTT broker (rc=%d)", rc)

    def on_disconnect(self, client, userdata, flags, rc, properties=None):
        logger.warning("Disconnected from MQTT broker (rc=%d). Reconnecting...", rc)

    def on_message(self, client, userdata, msg):
        """Called whenever an ESP32 sensor or RPi vision frame arrives via MQTT."""
        try:
            payload_str = msg.payload.decode("utf-8")
            frame = json.loads(payload_str)

            # Ensure timestamp and source tagging
            if "timestamp" not in frame:
                frame["timestamp"] = datetime.now(timezone.utc).isoformat()
            frame["gateway"] = "RaspberryPi-Edge"

            # Check if this is a vision defect packet from local webcam model
            if "vision" in msg.topic or "defect" in frame or "defect_type" in frame:
                if "vision" not in frame:
                    defect_name = frame.get("defect_type") or frame.get("defect", "DEFECT")
                    frame["vision"] = {
                        "defect_detected": True,
                        "defect_type": defect_name,
                        "confidence": float(frame.get("confidence", 0.9)),
                        "details": frame.get("details", f"RPi webcam vision flagged {defect_name}"),
                        "is_emergency": str(defect_name).lower() in ("tear", "human"),
                        "source": "RPI_WEBCAM",
                    }
                logger.warning("🚨 [VISION DEFECT] Forwarding %s to Web Dashboard", frame["vision"].get("defect_type"))

            # Normalize fields from PCB hardware firmware (conveyorbeltpt6espnowLED / esp32_sensor_node)
            if "mpu1_vibration" in frame or "loadcell1_kg" in frame or "current_mA" in frame:
                if "vibration_left_g" not in frame:
                    frame["vibration_left_g"] = float(frame.get("mpu1_vibration", 0.0))
                if "vibration_right_g" not in frame:
                    frame["vibration_right_g"] = float(frame.get("mpu2_vibration", 0.0))
                if "vibration_left_mps2" not in frame:
                    frame["vibration_left_mps2"] = round(float(frame.get("vibration_left_g", 0.0)) * 9.80665, 3)
                if "vibration_right_mps2" not in frame:
                    frame["vibration_right_mps2"] = round(float(frame.get("vibration_right_g", 0.0)) * 9.80665, 3)
                if "load_left_kg" not in frame:
                    frame["load_left_kg"] = float(frame.get("loadcell1_kg", 0.0))
                if "load_right_kg" not in frame:
                    frame["load_right_kg"] = float(frame.get("loadcell2_kg", 0.0))
                if "load_imbalance_kg" not in frame:
                    frame["load_imbalance_kg"] = round(abs(frame["load_left_kg"] - frame["load_right_kg"]), 3)
                if "total_load_kg" not in frame:
                    frame["total_load_kg"] = round(frame["load_left_kg"] + frame["load_right_kg"], 3)
                if "current_A" not in frame:
                    frame["current_A"] = round(float(frame.get("current_mA", 0.0)) / 1000.0, 3)
                if "ir_left_blocked" not in frame:
                    frame["ir_left_blocked"] = bool(frame.get("ir_left", 0))
                if "ir_right_blocked" not in frame:
                    frame["ir_right_blocked"] = bool(frame.get("ir_right", 0))
                if "motor_state" not in frame:
                    frame["motor_state"] = "RUNNING" if frame.get("motor_running", 1) else "STOPPED"

            # Forward to Web Dashboard Backend API
            self.forward_to_dashboard(frame)

        except Exception as e:
            logger.error("Error processing MQTT message: %s", e)

    def forward_to_dashboard(self, frame: dict):
        """HTTP/HTTPS POST to FastAPI /api/telemetry for real-time ML & SCADA update."""
        data = json.dumps(frame).encode("utf-8")
        req = urllib.request.Request(
            self.telemetry_api,
            data=data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "RPi-Gateway/1.0",
            },
        )

        try:
            import ssl
            # Allow flexible SSL verification if user hosts behind self-signed certificate
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            with urllib.request.urlopen(req, timeout=3.0, context=ctx) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                self.forwarded_count += 1

                # Check if backend triggered an alert
                alert = result.get("alert")
                if alert:
                    logger.warning(
                        "[ALERT DISPATCHED] %s — Defect: %s | Conf: %.1f%% | SMS Sent: %s",
                        alert.get("severity"),
                        alert.get("classification"),
                        alert.get("confidence", 0) * 100,
                        alert.get("sms_sent"),
                    )

                # Periodic throughput log
                now = time.time()
                if now - self.last_log_time >= 5.0:
                    pred = result.get("prediction", {})
                    logger.info(
                        "Forwarded %d frames | ESP32 Vib: %.2f/%.2f g | Load: %.2f kg | ML: %s (%.1f%%)",
                        self.forwarded_count,
                        frame.get("vibration_left_g", 0),
                        frame.get("vibration_right_g", 0),
                        frame.get("total_load_kg", 0),
                        pred.get("classification", "NORMAL"),
                        pred.get("confidence", 0) * 100,
                    )
                    self.last_log_time = now

        except urllib.error.URLError as e:
            self.error_count += 1
            if self.error_count % 10 == 1:
                logger.warning("Failed to reach Dashboard at %s: %s", self.telemetry_api, e)

    def run(self):
        logger.info("=" * 65)
        logger.info("  Raspberry Pi MQTT Edge Gateway")
        logger.info("  ESP32 MQTT Source   : %s:%d (Topic: %s)", self.broker, self.port, self.topic)
        logger.info("  Target Dashboard API: %s", self.telemetry_api)
        logger.info("=" * 65)

        logger.info("Connecting to MQTT broker...")
        try:
            self.mqtt_client.connect(self.broker, self.port, keepalive=60)
        except Exception as e:
            logger.error("Cannot connect to local broker at %s:%d: %s", self.broker, self.port, e)
            logger.info("Make sure mosquitto is running on Raspberry Pi: sudo systemctl start mosquitto")
            sys.exit(1)

        self.mqtt_client.loop_forever()


def main():
    parser = argparse.ArgumentParser(description="Raspberry Pi MQTT to Dashboard Forwarder")
    parser.add_argument("--broker", default=DEFAULT_MQTT_BROKER, help="Local MQTT broker IP on RPi (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=DEFAULT_MQTT_PORT, help="MQTT broker port (default: 1883)")
    parser.add_argument("--topic", default=DEFAULT_MQTT_TOPIC, help="MQTT topic to subscribe to")
    parser.add_argument("--dashboard", default=DEFAULT_DASHBOARD, help="Dashboard backend URL (e.g. http://192.168.1.3:8000)")
    args = parser.parse_args()

    gateway = RPiGateway(
        broker=args.broker,
        port=args.port,
        topic=args.topic,
        dashboard_url=args.dashboard,
    )
    try:
        gateway.run()
    except KeyboardInterrupt:
        logger.info("\nGateway stopped.")


if __name__ == "__main__":
    main()
