# Industrial Conveyor Belt Monitoring System

An end-to-end industrial SCADA platform for conveyor belts featuring **real-time hardware telemetry**, **machine learning defect classification (98.38% accuracy)**, **YOLOv8n-seg camera belt inspection**, **predictive health monitoring**, **automated maintenance recommendations**, and **Twilio SMS emergency escalation**.

---

## 🚀 Key Features

- **Live SCADA Dashboard**: Industrial HMI with real-time gauges, strip charts, and system status across 10 monitoring pages.
- **ML Anomaly & Defect Detection**:
  - Supervised Random Forest Classifier trained on 328,000+ real operational records with **98.38% test accuracy**.
  - Detects **NORMAL**, **BELT MISALIGNMENT**, and **OBJECT/JAM DETECTED**.
  - Unsupervised Isolation Forest for unknown novel anomalies.
- **YOLOv8n-seg Camera Inspection**: Real-time belt surface defect detection — Tear, Hole, Puncture, Impact Damage, Human — via laptop webcam or Raspberry Pi camera.
- **Predictive Health Module**: Component health scoring (Drive-End Bearing, Belt Surface, DC Motor & Gearbox, Load Cell Array, Gearbox Coupling) with Remaining Useful Life (RUL) estimation.
- **Maintenance Recommendations** *(new)*: Automatically derives actionable maintenance recommendations from live sensor data, ML engine output, camera detections, and predictive health results. See full details below.
- **Automated SMS Emergency Alerts**: Real-time SMS dispatch via Twilio to plant admins and maintenance teams on critical events.
- **Raspberry Pi Telemetry Support**: Real hardware ingestion via HTTP REST (`/api/telemetry`) and MQTT.

---

## 🔧 Maintenance Recommendations

The Maintenance page now includes a live **Maintenance Recommendations** panel that automatically evaluates:

| Source | What it checks |
|---|---|
| Sensor Bus | Vibration (g), Load Imbalance (kg), Motor Current (A), IR beam blockage |
| ML Engine | Random Forest classification (JAM / MISALIGNMENT / NORMAL), confidence, Isolation Forest anomaly score |
| Camera / Vision | YOLOv8n-seg defect type (Tear, Hole, Puncture, etc.), emergency flag |
| Predictive Health | Component health scores, RUL trends |

**Each recommendation includes:**
- Component name + detected condition
- Risk level: `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`
- Recommended action (e.g. *Halt belt and inspect bearing*, *Schedule lubrication*, *Continue monitoring*)
- Priority: `P1 – Immediate` → `P4 – Monitor`
- Recommended timing (e.g. *Immediately*, *Within 4 hours*, *Next scheduled window*)
- Supporting evidence panel — exact sensor readings, ML classification, camera detection that triggered the recommendation

**Operator workflow:**
1. **Acknowledge** → **Start Maintenance** → **Record Completion**
2. On completion, fills in technician name, actions taken, and parts used
3. Automatically logged as a new row in the **Active Work Orders** table (Maintenance Log)
4. Completed recommendations move to a collapsible **"Completed this session"** archive section
5. Recommendations **refresh every 60 seconds** from live telemetry

> ⚠️ When the backend is not connected, all evidence values are clearly marked **DEMO DATA**.

---

## 🌐 System Architecture

```
                                  ┌────────────────────────┐
                                  │   Custom Hardware PCB  │
                                  │   (ESP32 Sensor Node)  │
                                  │ - Dual MPU6050 (I2C)   │
                                  │ - Dual HX711 (GPIO)    │
                                  │ - INA219 Current (I2C) │
                                  │ - Dual IR Tracking     │
                                  │ - BTS7960 Motor Driver │
                                  │ - 4x Diagnostic LEDs   │
                                  └──────┬──────────┬──────┘
                                         │          │
                 Primary Wi-Fi MQTT      │          │ ESP-NOW Failover
                 Topic: conveyor/data    │          │ (Peer: 80:F3:DA:5D:C7:FC)
                                         ▼          ▼
                       ┌───────────────────┐    ┌───────────────────┐
                       │  Raspberry Pi     │    │  ESP32 #2 Gateway │
                       │  Mosquitto Broker │    │  (LoRa Standby)   │
                       └─────────┬─────────┘    └───────────────────┘
                                 │
                                 ▼ (HTTP POST /api/telemetry @ 10 Hz)
                       ┌──────────────────────────────────────────┐
                       │  PC Backend (FastAPI)                    │
                       │  - Random Forest + Isolation Forest ML   │
                       │  - YOLOv8n-seg Vision Engine             │
                       │  - Alert Manager + Twilio SMS            │
                       └─────────┬────────────────────────────────┘
                                 │
                                 ▼ (WebSocket real-time stream)
                       ┌──────────────────────────────────────────┐
                       │ SCADA Dashboard (React + Vite)           │
                       │  - Overview, Vibration, Load, Speed      │
                       │  - Electrical, Camera Inspection         │
                       │  - Predictive Health, Analytics          │
                       │  - Maintenance (Recommendations + Log)   │
                       │  - Alerts, Settings                      │
                       └──────────────────────────────────────────┘
```

---

## 🔌 Sensor & Custom PCB Hardware Setup

The system runs on a **custom-designed industrial PCB board** integrating sensor acquisition, motor drive, diagnostic status LEDs, and dual redundant telemetry links.

### 1. Custom PCB Board Pinout

| Subsystem | Component / Signal | ESP32 GPIO Pin | Description / Notes |
|---|---|---|---|
| **Vibration Left** | MPU6050 #1 | SDA: GPIO 21, SCL: GPIO 22 | I2C address `0x68` (AD0 tied to GND) |
| **Vibration Right**| MPU6050 #2 | SDA: GPIO 21, SCL: GPIO 22 | I2C address `0x69` (AD0 tied to 3.3V) |
| **Current / Power**| INA219 Sensor | SDA: GPIO 21, SCL: GPIO 22 | I2C address `0x40` (Bus voltage & motor mA) |
| **Load Cell 1 (Left)** | HX711 #1 | DT / DOUT: **GPIO 18**, SCK: **GPIO 19** | Left belt load cell with tare & calibration |
| **Load Cell 2 (Right)**| HX711 #2 | DT / DOUT: **GPIO 32**, SCK: **GPIO 33** | Right belt load cell with tare & calibration |
| **Left Tracking IR** | Optical Switch | Signal: **GPIO 27** | Digital Input — Left belt edge detection |
| **Right Tracking IR**| Optical Switch | Signal: **GPIO 14** | Digital Input — Right belt edge detection |
| **Motor Driver (Enable)** | BTS7960 | R_EN: **GPIO 13**, L_EN: **GPIO 23** | Digital Output — Motor driver bridge enable |
| **Motor Driver (PWM)**    | BTS7960 | RPWM: **GPIO 16**, LPWM: **GPIO 17** | Hardware LEDC PWM (1 kHz, 8-bit, 0–100%) |
| **LED: Power / System**   | Red LED #1 | Anode: **GPIO 15** | Steady ON when ESP32 system boots |
| **LED: Sensor Status**    | Green LED  | Anode: **GPIO 4** | Steady ON when sensors initialize and run |
| **LED: WiFi & MQTT**      | Blue LED   | Anode: **GPIO 5** | Blinking = WiFi & MQTT OK; Solid = Partial; OFF = Down |
| **LED: LoRa Failover**    | Red LED #2 | Anode: **GPIO 2** | ON only during MQTT failover (ESP-NOW active) |

### 2. Dual Telemetry & Failover Architecture

1. **Primary Link (Wi-Fi MQTT)**:
   - Publishes live telemetry frames to `conveyor/data` every 500 ms.
   - Listens on `conveyor/motor/set` for remote speed commands from SCADA (0–100%).
2. **Backup Link (ESP-NOW to LoRa Gateway)**:
   - Concurrently broadcasts binary struct packets to secondary gateway ESP32 #2 (`80:F3:DA:5D:C7:FC`).
   - If MQTT drops for > 5000 ms, the node automatically switches to **BACKUP MODE**, activates the Red LED on GPIO 2, and signals ESP32 #2 to forward telemetry via LoRa.

Flash the firmware:
1. Open [`firmware/esp32_sensor_node/esp32_sensor_node.ino`](file:///c:/Users/DELL/Downloads/conveyor-belt-monitoring-main/conveyor-belt-monitoring-main/firmware/esp32_sensor_node/esp32_sensor_node.ino) in Arduino IDE.
2. Verify your `WIFI_SSID`, `WIFI_PASSWORD`, and `MQTT_SERVER` (your Raspberry Pi or local broker IP).
3. Select board `ESP32 Dev Module` and flash to the PCB.

---

### 3. Raspberry Pi Setup (MQTT Broker + Gateway)

```bash
# 1. Install and start Mosquitto MQTT broker
sudo apt update
sudo apt install -y mosquitto mosquitto-clients python3-pip
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# Allow external connections from ESP32 PCB:
sudo nano /etc/mosquitto/conf.d/local.conf
# Add these two lines:
#   listener 1883
#   allow_anonymous true
sudo systemctl restart mosquitto

# 2. Install gateway dependencies
pip3 install paho-mqtt

# 3. Run the gateway forwarder to your PC dashboard
# (Replace 192.168.1.3 with your PC's IP address)
python3 firmware/rpi_mqtt_gateway.py --dashboard http://192.168.1.3:8000
```

---

## 🖥️ Starting the Application Locally

### 1. Backend (FastAPI + ML + Vision + SMS)

```bash
cd backend
pip install -r requirements.txt

# Configure environment variables (copy .env.example → .env, never commit .env)
cp .env.example .env
# Edit .env with your Twilio credentials

# Start backend server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Environment variables** (`backend/.env` — never committed to git):
```ini
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
ALERT_ADMIN_PHONES=+91xxxxxxxxxx
ALERT_MAINTENANCE_PHONES=+91xxxxxxxxxx
CONVEYOR_ID=CV-IRON-01
```

> ℹ️ The `.env` file is excluded from version control via `.gitignore`. Use `backend/.env.example` as a template.

### 2. Frontend Dashboard (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Navigate to **Maintenance** to see the live recommendations panel.

---

## 📊 Dashboard Pages

| Page | Description |
|---|---|
| **Overview** | Full system status — gauges, schematic, live telemetry |
| **Vibration** | ISO 10816-3 bearing vibration diagnostics |
| **Load** | HX711 load cell readings, imbalance detection |
| **Belt Speed** | Encoder-derived belt speed, motor RPM |
| **Electrical** | INA219 current/voltage/power monitoring |
| **Camera Inspection** | YOLOv8n-seg live belt defect detection |
| **Predictive Health** | ML health scores, RUL estimation, anomaly history |
| **Analytics** | Trend analysis and performance charts |
| **Maintenance** | Work orders, PM schedule, spare parts, **live recommendations** |
| **Alerts** | Alert history, SMS log |
| **Settings** | SMS contacts, alert templates, system config |

---

## 🧠 Retraining the ML Model

```bash
python ai/train_model.py
```

Outputs model binaries to `ai/models/`. The Random Forest achieves **98.38% test accuracy** on the conveyor fault classification task.

---

## 🔒 Security Notes

- **Never commit `backend/.env`** — it contains API keys and phone numbers. It is listed in `.gitignore`.
- Use `backend/.env.example` as the template for new deployments.
- Rotate Twilio credentials immediately if accidentally exposed.
