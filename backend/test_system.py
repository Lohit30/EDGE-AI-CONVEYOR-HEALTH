# =============================================================================
# Automated Verification & Health Test Suite
# Tests: ML Engine, Vision YOLOv8n-seg ONNX, Alert Manager, FastAPI, Simulator
# =============================================================================

import asyncio
import sys
import json
from pathlib import Path

# Add search paths
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np

errors = []

def report(name: str, passed: bool, details: str = ""):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}")
    if details:
        print(f"       -> {details}")
    if not passed:
        errors.append(f"{name}: {details}")

print("=" * 70)
print("  INDUSTRIAL CONVEYOR MONITORING SYSTEM — VERIFICATION TEST SUITE")
print("=" * 70)

# 1. TEST ML ENGINE
print("\n--- 1. Testing ML Engine ---")
try:
    from backend.ml_engine import engine as ml_engine
except ImportError:
    from ml_engine import engine as ml_engine

loaded = ml_engine.load_models()
report("ML Engine load_models()", loaded, f"Features: {len(ml_engine.features)}, Classes: {ml_engine.classes}")

# Test normal inference
normal_frame = {
    "vibration_left_g": 1.85,
    "vibration_right_g": 1.86,
    "vibration_left_mps2": 18.14,
    "vibration_right_mps2": 18.24,
    "load_left_kg": 1.05,
    "load_right_kg": 1.02,
    "load_imbalance_kg": 0.03,
    "total_load_kg": 2.07,
    "current_A": 2.24,
    "ir_left_blocked": False,
    "ir_right_blocked": False,
    "estop_active": False,
    "fault_active": False,
}
res_norm = ml_engine.predict(normal_frame)
report(
    "ML Normal Prediction",
    res_norm.get("classification") == "NORMAL",
    f"Got classification='{res_norm.get('classification')}', severity='{res_norm.get('severity')}', conf={res_norm.get('confidence')}"
)

# Test misalignment inference
misaligned_frame = {
    "vibration_left_g": 2.1,
    "vibration_right_g": 1.8,
    "vibration_left_mps2": 20.6,
    "vibration_right_mps2": 17.6,
    "load_left_kg": 2.3,
    "load_right_kg": 0.5,
    "load_imbalance_kg": 1.8,
    "total_load_kg": 2.8,
    "current_A": 2.4,
    "ir_left_blocked": True,
    "ir_right_blocked": False,
    "estop_active": False,
    "fault_active": False,
}
res_mis = ml_engine.predict(misaligned_frame)
report(
    "ML Misalignment Diagnosis",
    res_mis.get("classification") in ("BELT MISALIGNMENT", "OBJECT/JAM DETECTED") or res_mis.get("severity") in ("CRITICAL", "EMERGENCY", "WARNING"),
    f"Got classification='{res_mis.get('classification')}', severity='{res_mis.get('severity')}', component='{res_mis.get('failed_component')}'"
)

# Test Jam inference
jam_frame = {
    "vibration_left_g": 2.7,
    "vibration_right_g": 2.8,
    "vibration_left_mps2": 26.5,
    "vibration_right_mps2": 27.5,
    "load_left_kg": 7.0,
    "load_right_kg": 6.8,
    "load_imbalance_kg": 0.2,
    "total_load_kg": 13.8,
    "current_A": 3.4,
    "ir_left_blocked": False,
    "ir_right_blocked": False,
    "estop_active": False,
    "fault_active": False,
}
res_jam = ml_engine.predict(jam_frame)
report(
    "ML Object/Jam Diagnosis",
    res_jam.get("classification") == "OBJECT/JAM DETECTED" or res_jam.get("severity") in ("CRITICAL", "EMERGENCY"),
    f"Got classification='{res_jam.get('classification')}', severity='{res_jam.get('severity')}', cause='{res_jam.get('failure_cause')}'"
)


# 2. TEST VISION ENGINE & ONNX MODEL
print("\n--- 2. Testing Vision Engine & YOLOv8n-seg ONNX ---")
try:
    from backend.vision_engine import vision_engine, CLASS_NAMES
except ImportError:
    from vision_engine import vision_engine, CLASS_NAMES

vision_loaded = vision_engine.load_model()
report("Vision ONNX best.onnx loading", vision_loaded, f"Model path: {vision_engine.model_path}")

# Run synthetic frame inference
synth_frame = vision_engine.generate_synthetic_conveyor_frame()
report("Synthetic Conveyor Frame Generation", synth_frame is not None and synth_frame.shape == (480, 640, 3))

annotated, detections = vision_engine.predict(synth_frame, conf_threshold=0.25)
report("YOLOv8n-seg Inference Execution", annotated is not None and annotated.shape == (480, 640, 3), f"Inference latency: {vision_engine.last_inference_time_ms} ms, detections: {len(detections)}")


# 3. TEST ALERT MANAGER
print("\n--- 3. Testing Alert Manager ---")
try:
    from backend.alert_manager import alert_manager
except ImportError:
    from alert_manager import alert_manager

alert_manager.configure()
alert_res = alert_manager.process_prediction(res_jam, jam_frame)
report("Alert Manager Escalation", alert_res is not None, f"Generated alert severity: {alert_res.get('severity') if alert_res else 'None'}")


# 4. TEST DATA SIMULATOR
print("\n--- 4. Testing Data Simulator ---")
try:
    from backend.main import simulator
except ImportError:
    from main import simulator

simulator.load()
frame1 = simulator.next_frame()
frame2 = simulator.next_frame()
report("Data Simulator Dynamic Telemetry Generation", frame1 is not None and frame2 is not None and "vibration_left_g" in frame1, f"Frame 1 timestamp: {frame1.get('timestamp') if frame1 else 'N/A'}")


# 5. TEST FASTAPI APP & ENDPOINTS
print("\n--- 5. Testing FastAPI REST & Lifespan Endpoints ---")
try:
    from fastapi.testclient import TestClient
    from backend.main import app
except ImportError:
    from main import app
    from fastapi.testclient import TestClient

with TestClient(app) as client:
    # Health endpoint
    resp_health = client.get("/health")
    report("GET /health", resp_health.status_code == 200, f"Payload: {resp_health.json()}")

    # ML status endpoint
    resp_ml = client.get("/api/ml/status")
    report("GET /api/ml/status", resp_ml.status_code == 200, f"Payload: {resp_ml.json()}")

    # Vision status endpoint
    resp_vis = client.get("/api/vision/status")
    report("GET /api/vision/status", resp_vis.status_code == 200, f"Payload: {resp_vis.json()}")

    # Telemetry ingestion endpoint
    resp_telem = client.post("/api/telemetry", json=normal_frame)
    report("POST /api/telemetry", resp_telem.status_code == 200, f"Payload: {resp_telem.json().get('status')}")

    # Alerts history endpoint
    resp_alerts = client.get("/api/alerts")
    report("GET /api/alerts", resp_alerts.status_code == 200, f"Total alerts: {resp_alerts.json().get('total')}")

    # WebSocket connection test
    try:
        with client.websocket_connect("/ws") as ws:
            report("WebSocket /ws Connection", True, "Successfully connected to real-time SCADA telemetry stream")
    except Exception as ws_err:
        report("WebSocket /ws Connection", False, f"Error: {ws_err}")

print("\n" + "=" * 70)
if errors:
    print(f"FAILED: {len(errors)} issues encountered:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("ALL TESTS PASSED! System is 100% operational and verified.")
print("=" * 70)
