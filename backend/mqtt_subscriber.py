# =============================================================================
# MQTT Subscriber — Ingests telemetry & vision from Raspberry Pi over Wi-Fi
# =============================================================================

import asyncio
import json
import logging
import os
import threading
import time
from typing import Callable, Optional

import paho.mqtt.client as mqtt

logger = logging.getLogger("mqtt_subscriber")


class MQTTSubscriber:
    """
    Background MQTT client that subscribes to the Raspberry Pi Mosquitto broker
    over Wi-Fi or internet, forwarding sensor and vision frames into the dashboard.
    """

    def __init__(self, broadcast_callback: Optional[Callable] = None):
        self.broadcast_callback = broadcast_callback
        self.client: Optional[mqtt.Client] = None
        self.thread: Optional[threading.Thread] = None
        self.connected = False
        self.loop: Optional[asyncio.AbstractEventLoop] = None

        # Configuration from environment
        self.enabled = os.getenv("MQTT_ENABLED", "false").lower() in ("true", "1", "yes")
        self.broker = (os.getenv("MQTT_HOST") or os.getenv("MQTT_BROKER_HOST") or "localhost").strip()
        self.port = int(os.getenv("MQTT_PORT") or os.getenv("MQTT_BROKER_PORT") or "1883")
        self.telemetry_topic = os.getenv("MQTT_TOPIC", "conveyor/+/telemetry")
        self.vision_topic = os.getenv("MQTT_VISION_TOPIC", "conveyor/+/vision")
        self.username = os.getenv("MQTT_USERNAME", "").strip()
        self.password = os.getenv("MQTT_PASSWORD", "").strip()

    def set_callback(self, callback: Callable):
        self.broadcast_callback = callback

    def start(self, event_loop: asyncio.AbstractEventLoop):
        """Start the background MQTT subscription loop."""
        self.loop = event_loop

        # Auto-enable if a broker host is configured
        if self.broker and not self.enabled:
            self.enabled = True

        if not self.enabled or not self.broker:
            logger.info("MQTT Subscriber disabled (no MQTT_BROKER_HOST configured in .env). Use HTTP POST /api/telemetry or set MQTT_BROKER_HOST to Raspberry Pi IP.")
            return

        logger.info("Starting MQTT Subscriber -> Broker: %s:%d | Topics: %s, %s", self.broker, self.port, self.telemetry_topic, self.vision_topic)

        try:
            self.client = mqtt.Client(
                client_id=f"scada-web-sub-{int(time.time())}",
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            )

            if self.username:
                self.client.username_pw_set(self.username, self.password)

            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message

            self.client.connect_async(self.broker, self.port, keepalive=60)
            self.client.loop_start()

        except Exception as e:
            logger.error("Failed to start MQTT subscriber to %s:%d: %s", self.broker, self.port, e)

    def stop(self):
        """Stop the background MQTT subscription."""
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
                logger.info("MQTT Subscriber stopped")
            except Exception as e:
                logger.debug("Error stopping MQTT: %s", e)
            self.connected = False

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.connected = True
            logger.info("Connected to Raspberry Pi MQTT broker at %s:%d", self.broker, self.port)
            topics = [(self.telemetry_topic, 1), (self.vision_topic, 1), ("conveyor/data", 1), ("conveyor/#", 1)]
            client.subscribe(topics)
            logger.info("Subscribed to MQTT topics: %s, %s, conveyor/data, conveyor/#", self.telemetry_topic, self.vision_topic)
        else:
            self.connected = False
            logger.warning("Failed to connect to MQTT broker at %s (rc=%d)", self.broker, rc)

    def _on_disconnect(self, client, userdata, flags, rc, properties=None):
        self.connected = False
        logger.warning("Disconnected from MQTT broker at %s (rc=%d). Reconnecting in background...", self.broker, rc)

    def _on_message(self, client, userdata, msg):
        """Process incoming sensor frame or vision frame from Raspberry Pi."""
        try:
            payload_str = msg.payload.decode("utf-8")
            data = json.loads(payload_str)

            # Route message based on topic or content
            if "vision" in msg.topic or "defect" in data or "defect_type" in data:
                # Format as vision payload
                frame = {
                    "gateway": "RaspberryPi-Vision",
                    "vision": {
                        "defect_detected": True,
                        "defect_type": data.get("defect_type") or data.get("defect", "DEFECT"),
                        "confidence": float(data.get("confidence", 0.9)),
                        "details": data.get("details", f"Vision defect detected on topic {msg.topic}"),
                        "is_emergency": str(data.get("defect_type") or data.get("defect")).lower() in ("tear", "human"),
                    },
                    "timestamp": data.get("timestamp"),
                }
            else:
                frame = data

            # Forward into FastAPI broadcast pipeline via event loop
            if self.broadcast_callback and self.loop and self.loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_callback(frame, source="RPI_MQTT"),
                    self.loop
                )

        except Exception as e:
            logger.error("Error parsing MQTT packet on %s: %s", msg.topic, e)


# Singleton
mqtt_subscriber = MQTTSubscriber()
