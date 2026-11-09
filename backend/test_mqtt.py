import json
import time
import paho.mqtt.client as mqtt

print("Testing MQTT Publish to broker...")
client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
client.connect("mqtt", 1883)
msg = {
    "vibration_left_g": 1.88,
    "vibration_right_g": 1.85,
    "load_left_kg": 1.05,
    "load_right_kg": 1.02,
    "total_load_kg": 2.07,
    "current_A": 2.25,
    "motor_state": "RUNNING",
}
client.publish("conveyor/cv-iron-01/telemetry", json.dumps(msg))
time.sleep(0.5)
client.disconnect()
print("MQTT Publish SUCCESSFUL!")
