#!/usr/bin/env python3
# =============================================================================
# Raspberry Pi Sensor Publisher — MQTT Telemetry for Conveyor Belt Monitoring
# =============================================================================
# Runs on the Raspberry Pi connected to the conveyor belt sensors.
# Reads data from:
#   - MPU6050 (I2C) — Left & Right vibration accelerometers
#   - HX711 (GPIO)  — Left & Right load cells
#   - INA219 (I2C)  — Current/voltage sensor
#   - IR sensors (GPIO) — Belt alignment optical sensors
#   - Rotary encoder (GPIO) — Belt speed
#
# Publishes JSON telemetry frames to MQTT broker at ~10 Hz.
# The FastAPI backend subscribes to these topics and runs ML inference.
#
# Usage:
#   pip install paho-mqtt smbus2 RPi.GPIO hx711 adafruit-circuitpython-ina219
#   python rpi_sensor_publisher.py
#
# For testing WITHOUT real hardware, use --simulate flag:
#   python rpi_sensor_publisher.py --simulate
# =============================================================================

import json
import time
import math
import argparse
import logging
import random
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("rpi-publisher")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MQTT_BROKER = "192.168.1.100"  # <-- Change to your backend PC's IP address
MQTT_PORT = 1883
MQTT_TOPIC = "conveyor/cv-iron-01/telemetry"
MQTT_CLIENT_ID = "rpi-conveyor-01"
PUBLISH_RATE_HZ = 10  # 10 frames per second

# I2C addresses
MPU6050_LEFT_ADDR = 0x68
MPU6050_RIGHT_ADDR = 0x69
INA219_ADDR = 0x40

# GPIO pins
HX711_LEFT_DT = 5
HX711_LEFT_SCK = 6
HX711_RIGHT_DT = 13
HX711_RIGHT_SCK = 19
IR_LEFT_PIN = 17
IR_RIGHT_PIN = 27
ENCODER_PIN_A = 22
ENCODER_PIN_B = 23
ESTOP_PIN = 24
MOTOR_RELAY_PIN = 25


# ---------------------------------------------------------------------------
# Hardware Sensor Readers (real RPi hardware)
# ---------------------------------------------------------------------------
class RealSensorReader:
    """Reads actual sensors connected to Raspberry Pi GPIO/I2C."""

    def __init__(self):
        self.initialized = False

    def setup(self):
        """Initialize all sensor hardware."""
        try:
            import smbus2
            import RPi.GPIO as GPIO

            # I2C bus
            self.bus = smbus2.SMBus(1)

            # GPIO setup
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(IR_LEFT_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.setup(IR_RIGHT_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.setup(ESTOP_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.setup(ENCODER_PIN_A, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.setup(ENCODER_PIN_B, GPIO.IN, pull_up_down=GPIO.PUD_UP)

            # Initialize MPU6050 sensors
            self._init_mpu6050(MPU6050_LEFT_ADDR)
            self._init_mpu6050(MPU6050_RIGHT_ADDR)

            # Initialize HX711 load cells
            from hx711 import HX711
            self.hx_left = HX711(dout_pin=HX711_LEFT_DT, pd_sck_pin=HX711_LEFT_SCK)
            self.hx_right = HX711(dout_pin=HX711_RIGHT_DT, pd_sck_pin=HX711_RIGHT_SCK)
            self.hx_left.set_scale_ratio(2280)  # Calibrate with known weight
            self.hx_right.set_scale_ratio(2280)

            # Initialize INA219
            import adafruit_ina219
            import board
            i2c = board.I2C()
            self.ina = adafruit_ina219.INA219(i2c, addr=INA219_ADDR)

            # Encoder pulse counter
            self.encoder_pulses = 0
            self.last_encoder_time = time.time()
            GPIO.add_event_detect(
                ENCODER_PIN_A, GPIO.RISING,
                callback=self._encoder_callback, bouncetime=1
            )

            self.initialized = True
            logger.info("All sensors initialized successfully")

        except Exception as e:
            logger.error("Sensor init failed: %s", e)
            logger.info("Falling back to simulated mode")
            raise

    def _init_mpu6050(self, addr):
        """Wake up MPU6050 and set +/- 4g range."""
        self.bus.write_byte_data(addr, 0x6B, 0x00)  # Wake up
        self.bus.write_byte_data(addr, 0x1C, 0x08)  # +/- 4g range

    def _read_mpu6050_accel(self, addr):
        """Read acceleration magnitude from MPU6050 in g."""
        raw = self.bus.read_i2c_block_data(addr, 0x3B, 6)
        ax = (raw[0] << 8 | raw[1])
        ay = (raw[2] << 8 | raw[3])
        az = (raw[4] << 8 | raw[5])
        # Convert to signed
        for val in [ax, ay, az]:
            if val > 32767:
                val -= 65536
        # Convert to g (4g range: 8192 LSB/g)
        ax_g = ax / 8192.0
        ay_g = ay / 8192.0
        az_g = az / 8192.0
        magnitude = math.sqrt(ax_g**2 + ay_g**2 + az_g**2)
        return round(magnitude, 4)

    def _encoder_callback(self, channel):
        self.encoder_pulses += 1

    def read_frame(self) -> dict:
        """Read all sensors and return a telemetry frame."""
        import RPi.GPIO as GPIO

        # Vibration
        vib_left_g = self._read_mpu6050_accel(MPU6050_LEFT_ADDR)
        vib_right_g = self._read_mpu6050_accel(MPU6050_RIGHT_ADDR)

        # Load cells
        load_left = max(0, round(self.hx_left.get_weight_mean(5) / 1000.0, 3))
        load_right = max(0, round(self.hx_right.get_weight_mean(5) / 1000.0, 3))

        # Current/Voltage
        current_a = round(self.ina.current / 1000.0, 3)  # mA to A

        # IR alignment
        ir_left = not GPIO.input(IR_LEFT_PIN)   # Active low
        ir_right = not GPIO.input(IR_RIGHT_PIN)

        # E-stop
        estop = not GPIO.input(ESTOP_PIN)

        # Encoder speed (pulses per second -> m/s)
        now = time.time()
        dt = now - self.last_encoder_time
        if dt > 0:
            pps = self.encoder_pulses / dt
            # 100 PPR encoder, 64mm roller diameter
            rps = pps / 100.0
            speed_ms = rps * math.pi * 0.064
        else:
            speed_ms = 0.0
        self.encoder_pulses = 0
        self.last_encoder_time = now

        motor_running = speed_ms > 0.01

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "vibration_left_g": vib_left_g,
            "vibration_right_g": vib_right_g,
            "vibration_left_mps2": round(vib_left_g * 9.80665, 4),
            "vibration_right_mps2": round(vib_right_g * 9.80665, 4),
            "load_left_kg": load_left,
            "load_right_kg": load_right,
            "load_imbalance_kg": round(abs(load_left - load_right), 3),
            "total_load_kg": round(load_left + load_right, 3),
            "current_A": current_a,
            "ir_left_blocked": ir_left,
            "ir_right_blocked": ir_right,
            "motor_state": "RUNNING" if motor_running else "IDLE",
            "estop_active": estop,
            "fault_active": ir_left or ir_right or estop,
            "communication": "WIFI",
        }


# ---------------------------------------------------------------------------
# Simulated Sensor Reader (for testing without hardware)
# ---------------------------------------------------------------------------
class SimulatedSensorReader:
    """Generates realistic sensor data for testing without real hardware."""

    def __init__(self):
        self.t = 0

    def setup(self):
        logger.info("Using SIMULATED sensor data (no hardware)")

    def read_frame(self) -> dict:
        self.t += 1
        noise = lambda base, amp: round(base + random.gauss(0, amp), 4)

        # Occasionally inject anomalies
        is_anomaly = random.random() < 0.05
        anomaly_type = random.choice(["misalign", "jam", "none"])

        vib_left = noise(1.85, 0.08)
        vib_right = noise(1.88, 0.08)
        load_left = noise(4.58, 0.04)
        load_right = noise(4.55, 0.04)
        current = noise(2.25, 0.05)

        if is_anomaly and anomaly_type == "misalign":
            vib_left += random.uniform(0.3, 0.8)
            vib_right -= random.uniform(0.1, 0.3)
        elif is_anomaly and anomaly_type == "jam":
            current += random.uniform(0.5, 1.5)
            load_left += random.uniform(1.0, 3.0)

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "vibration_left_g": vib_left,
            "vibration_right_g": vib_right,
            "vibration_left_mps2": round(vib_left * 9.80665, 4),
            "vibration_right_mps2": round(vib_right * 9.80665, 4),
            "load_left_kg": load_left,
            "load_right_kg": load_right,
            "load_imbalance_kg": round(abs(load_left - load_right), 3),
            "total_load_kg": round(load_left + load_right, 3),
            "current_A": current,
            "ir_left_blocked": False,
            "ir_right_blocked": False,
            "motor_state": "RUNNING",
            "estop_active": False,
            "fault_active": False,
            "communication": "WIFI",
        }


# ---------------------------------------------------------------------------
# MQTT Publisher
# ---------------------------------------------------------------------------
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info("Connected to MQTT broker at %s:%d", MQTT_BROKER, MQTT_PORT)
    else:
        logger.error("MQTT connection failed (rc=%d)", rc)


def on_disconnect(client, userdata, flags, rc, properties=None):
    logger.warning("Disconnected from MQTT broker (rc=%d)", rc)


def main():
    parser = argparse.ArgumentParser(description="Raspberry Pi Conveyor Belt Sensor Publisher")
    parser.add_argument("--simulate", action="store_true", help="Use simulated sensor data (no hardware needed)")
    parser.add_argument("--http", default="http://localhost:8000", help="HTTP backend URL (e.g. http://192.168.1.50:8000)")
    parser.add_argument("--use-mqtt", action="store_true", help="Use MQTT broker instead of HTTP POST")
    parser.add_argument("--broker", default=MQTT_BROKER, help="MQTT broker address")
    parser.add_argument("--port", type=int, default=MQTT_PORT, help="MQTT broker port")
    parser.add_argument("--rate", type=int, default=PUBLISH_RATE_HZ, help="Publish rate in Hz (default: 10)")
    args = parser.parse_args()

    # Initialize sensor reader
    if args.simulate:
        reader = SimulatedSensorReader()
    else:
        reader = RealSensorReader()

    reader.setup()

    interval = 1.0 / args.rate
    frame_count = 0

    if args.use_mqtt:
        # Connect to MQTT
        client = mqtt.Client(
            client_id=MQTT_CLIENT_ID,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
        client.on_connect = on_connect
        client.on_disconnect = on_disconnect

        logger.info("Connecting to MQTT broker at %s:%d ...", args.broker, args.port)
        try:
            client.connect(args.broker, args.port, keepalive=60)
            client.loop_start()
        except Exception as e:
            logger.error("Cannot connect to MQTT broker: %s", e)
            logger.info("Tip: You can use direct HTTP mode without any broker: python rpi_sensor_publisher.py --http http://<PC_IP>:8000")
            return

        logger.info("Publishing telemetry at %d Hz via MQTT to topic: %s", args.rate, MQTT_TOPIC)
        try:
            while True:
                frame = reader.read_frame()
                payload = json.dumps(frame)
                client.publish(MQTT_TOPIC, payload, qos=1)

                frame_count += 1
                if frame_count % (args.rate * 10) == 0:
                    logger.info(
                        "Published %d frames | Vib: %.2f/%.2f g | Load: %.2f kg | Current: %.2f A",
                        frame_count,
                        frame["vibration_left_g"], frame["vibration_right_g"],
                        frame["total_load_kg"], frame["current_A"],
                    )
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("\nStopping... Published %d total frames", frame_count)
        finally:
            client.loop_stop()
            client.disconnect()

    else:
        # Direct HTTP POST mode (Default — zero broker setup required!)
        import urllib.request
        import urllib.error

        api_url = f"{args.http.rstrip('/')}/api/telemetry"
        logger.info("Streaming live telemetry directly to Dashboard at %s (%d Hz)", api_url, args.rate)
        logger.info("Mode: HTTP REST (No MQTT broker needed)")
        logger.info("Press Ctrl+C to stop\n")

        try:
            while True:
                frame = reader.read_frame()
                data = json.dumps(frame).encode("utf-8")
                req = urllib.request.Request(
                    api_url,
                    data=data,
                    headers={"Content-Type": "application/json", "User-Agent": "RaspberryPi-Conveyor/1.0"},
                )

                try:
                    with urllib.request.urlopen(req, timeout=1.5) as resp:
                        res_data = json.loads(resp.read().decode("utf-8"))
                        pred = res_data.get("prediction", {})
                        alert = res_data.get("alert")
                        if alert:
                            logger.warning(
                                "[ALERT TRIGGERED] Severity: %s | Defect: %s | SMS Sent: %s",
                                alert.get("severity"), alert.get("classification"), alert.get("sms_sent"),
                            )
                except urllib.error.URLError as e:
                    logger.warning("Failed to reach dashboard at %s: %s", api_url, e)
                    time.sleep(1.0)
                    continue

                frame_count += 1
                if frame_count % (args.rate * 5) == 0:
                    logger.info(
                        "Sent %d frames to Dashboard | Vib: %.2f/%.2f g | Load: %.2f kg | Current: %.2f A",
                        frame_count,
                        frame["vibration_left_g"], frame["vibration_right_g"],
                        frame["total_load_kg"], frame["current_A"],
                    )

                time.sleep(interval)

        except KeyboardInterrupt:
            logger.info("\nStopping... Sent %d total frames", frame_count)


if __name__ == "__main__":
    main()
