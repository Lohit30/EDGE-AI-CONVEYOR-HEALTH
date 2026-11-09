# =============================================================================
# ML Inference Engine — Real-time anomaly detection for conveyor telemetry
# =============================================================================

import json
import logging
import warnings
from pathlib import Path
from typing import Optional
import numpy as np

warnings.filterwarnings("ignore", category=UserWarning)

logger = logging.getLogger("ml_engine")

def find_model_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent / "ai" / "models",
        Path(__file__).resolve().parent / "ai" / "models",
        Path("/app/ai/models"),
        Path("/workspace/ai/models"),
        Path.cwd() / "ai" / "models",
    ]
    for c in candidates:
        if c.exists() and (c / "feature_config.json").exists():
            return c
    return candidates[0]


MODEL_DIR = find_model_dir()


class MLEngine:
    """Loads trained ML models and performs real-time prediction on sensor frames."""

    def __init__(self):
        self.rf_model = None
        self.iforest_model = None
        self.scaler = None
        self.label_encoder = None
        self.features: list[str] = []
        self.classes: list[str] = []
        self.loaded = False

    def load_models(self) -> bool:
        """Load all trained models from disk. Returns True if successful."""
        global MODEL_DIR
        MODEL_DIR = find_model_dir()
        try:
            import joblib

            rf_path = MODEL_DIR / "conveyor_rf.joblib"
            if_path = MODEL_DIR / "conveyor_iforest.joblib"
            sc_path = MODEL_DIR / "scaler.joblib"
            le_path = MODEL_DIR / "label_encoder.joblib"
            fc_path = MODEL_DIR / "feature_config.json"

            if not all(p.exists() for p in [rf_path, if_path, sc_path, le_path, fc_path]):
                logger.warning("ML models not fully present in %s — using rule-based diagnostic fallback", MODEL_DIR)
                if fc_path.exists():
                    try:
                        with open(fc_path) as f:
                            config = json.load(f)
                        self.features = config.get("features", [])
                        self.classes = config.get("classes", [])
                    except Exception:
                        pass
                return False

            self.rf_model = joblib.load(rf_path)
            self.iforest_model = joblib.load(if_path)
            self.scaler = joblib.load(sc_path)
            self.label_encoder = joblib.load(le_path)

            with open(fc_path) as f:
                config = json.load(f)
            self.features = config["features"]
            self.classes = config["classes"]

            self.loaded = True
            logger.info("ML models loaded — %d features, %d classes", len(self.features), len(self.classes))
            return True

        except Exception as e:
            logger.error("Failed to load ML models: %s", e)
            return False

    def predict(self, frame: dict) -> dict:
        """
        Run inference on a single sensor frame.

        Returns:
            {
                "classification": "NORMAL" | "BELT MISALIGNMENT" | "OBJECT/JAM DETECTED",
                "confidence": 0.0-1.0,
                "anomaly_score": float (negative = more anomalous),
                "is_anomaly": bool,
                "severity": "NORMAL" | "WARNING" | "CRITICAL" | "EMERGENCY"
            }
        """
        if not self.loaded:
            # Rule-based diagnostic fallback
            load_l = float(frame.get("load_left_kg", 0.0))
            load_r = float(frame.get("load_right_kg", 0.0))
            load_diff = abs(load_l - load_r)
            current = float(frame.get("current_A", 0.0))
            ir_l = bool(frame.get("ir_left_blocked", False))
            ir_r = bool(frame.get("ir_right_blocked", False))
            total_load = float(frame.get("total_load_kg", load_l + load_r))

            if current >= 2.4 or total_load > 3.0:
                cls = "OBJECT/JAM DETECTED"
                conf = 0.94
            elif load_diff >= 0.50 or ir_l or ir_r:
                cls = "BELT MISALIGNMENT"
                conf = 0.92
            else:
                cls = "NORMAL"
                conf = 0.98

            severity, failed_component, failure_cause = self._identify_component_failure(
                cls, conf, 0.05, False, frame
            )
            return {
                "classification": cls,
                "confidence": conf,
                "anomaly_score": 0.05,
                "is_anomaly": False,
                "severity": str(severity),
                "failed_component": str(failed_component),
                "failure_cause": str(failure_cause),
            }

        try:
            # Build feature vector from frame
            feature_vector = self._extract_features(frame)
            X = np.array([feature_vector])
            X_scaled = self.scaler.transform(X)

            # Random Forest classification
            rf_pred = self.rf_model.predict(X_scaled)[0]
            rf_proba = self.rf_model.predict_proba(X_scaled)[0]
            classification = self.label_encoder.inverse_transform([rf_pred])[0]
            confidence = float(np.max(rf_proba))

            # Isolation Forest anomaly score
            anomaly_score = float(self.iforest_model.decision_function(X_scaled)[0])
            is_anomaly = self.iforest_model.predict(X_scaled)[0] == -1

            # Determine component failure and severity level
            severity, failed_component, failure_cause = self._identify_component_failure(
                classification, confidence, anomaly_score, is_anomaly, frame
            )

            return {
                "classification": str(classification),
                "confidence": round(float(confidence), 4),
                "anomaly_score": round(float(anomaly_score), 4),
                "is_anomaly": bool(is_anomaly),
                "severity": str(severity),
                "failed_component": str(failed_component),
                "failure_cause": str(failure_cause),
            }

        except Exception as e:
            logger.error("Prediction failed: %s", e)
            return {
                "classification": "ERROR",
                "confidence": 0.0,
                "anomaly_score": 0.0,
                "is_anomaly": False,
                "severity": "NORMAL",
                "failed_component": "NONE",
                "failure_cause": str(e),
            }

    def _extract_features(self, frame: dict) -> list[float]:
        """Extract the feature vector from a raw sensor frame dict."""
        # Direct sensor readings
        vib_left_g = frame.get("vibration_left_g", 0.0)
        vib_right_g = frame.get("vibration_right_g", 0.0)
        vib_left_mps2 = frame.get("vibration_left_mps2", 0.0)
        vib_right_mps2 = frame.get("vibration_right_mps2", 0.0)
        load_left = frame.get("load_left_kg", 0.0)
        load_right = frame.get("load_right_kg", 0.0)
        load_imbalance = frame.get("load_imbalance_kg", abs(load_left - load_right))
        total_load = frame.get("total_load_kg", load_left + load_right)
        current = frame.get("current_A", 0.0)

        # Boolean sensors
        ir_left = int(frame.get("ir_left_blocked", False))
        ir_right = int(frame.get("ir_right_blocked", False))
        estop = int(frame.get("estop_active", False))
        fault = int(frame.get("fault_active", False))

        # Engineered features (must match training)
        vib_ratio = vib_left_g / (vib_right_g + 1e-6)
        vib_total = vib_left_mps2 + vib_right_mps2
        vib_diff = abs(vib_left_mps2 - vib_right_mps2)
        load_ratio = load_left / (load_right + 1e-6)
        power_proxy = current * 12.0

        return [
            vib_left_g, vib_right_g, vib_left_mps2, vib_right_mps2,
            load_left, load_right, load_imbalance, total_load, current,
            ir_left, ir_right, estop, fault,
            vib_ratio, vib_total, vib_diff, load_ratio, power_proxy,
        ]

    def _identify_component_failure(
        self, classification: str, confidence: float,
        anomaly_score: float, is_anomaly: bool, frame: dict
    ) -> tuple[str, str, str]:
        """
        Diagnose the specific failing component and determine severity level.

        Returns:
            (severity, failed_component, failure_cause)
        """
        vib_left = float(frame.get("vibration_left_g", 0.0))
        vib_right = float(frame.get("vibration_right_g", 0.0))
        load_left = float(frame.get("load_left_kg", 0.0))
        load_right = float(frame.get("load_right_kg", 0.0))
        load_diff = abs(load_left - load_right)
        total_load = float(frame.get("total_load_kg", load_left + load_right))
        current = float(frame.get("current_A", 0.0))
        ir_left = bool(frame.get("ir_left_blocked", False))
        ir_right = bool(frame.get("ir_right_blocked", False))
        estop = bool(frame.get("estop_active", False))
        fault = bool(frame.get("fault_active", False))

        # 1. Emergency Stop Active
        if estop:
            return (
                "EMERGENCY",
                "EMERGENCY STOP (E-STOP)",
                "Emergency Stop circuit triggered by operator / safety relay open",
            )

        # 2. Object / Mechanical Jam Detected (Drive Motor & Gearbox Risk)
        if classification == "OBJECT/JAM DETECTED":
            if current >= 2.5 or confidence >= 0.92 or total_load > 3.0:
                return (
                    "EMERGENCY",
                    "DRIVE MOTOR & GEARBOX",
                    f"Severe Material Jam & Overcurrent ({current:.2f}A, Total Load: {total_load:.2f}kg). Motor burnout risk!",
                )
            return (
                "CRITICAL",
                "DRIVE MOTOR & GEARBOX",
                f"Conveyor Jam Detected (Current: {current:.2f}A, Conf: {confidence*100:.1f}%)",
            )

        # 3. Belt Misalignment / Tracking Failure (Load Cells & Belt Edge)
        if classification == "BELT MISALIGNMENT" or ir_left or ir_right:
            if load_diff >= 0.8 or (ir_left and ir_right):
                return (
                    "EMERGENCY",
                    "CONVEYOR BELT TRACKING & LOAD CELLS",
                    f"Severe Belt Runoff! Load delta {load_diff:.2f}kg, Optical Beams Breached. Immediate tear danger!",
                )
            if confidence >= 0.88 or load_diff >= 0.50 or ir_left or ir_right:
                return (
                    "CRITICAL",
                    "CONVEYOR BELT TRACKING & LOAD CELLS",
                    f"Belt Misaligned on Idlers (Load Delta: {load_diff:.2f}kg, IR L/R: {int(ir_left)}/{int(ir_right)})",
                )
            return (
                "WARNING",
                "CONVEYOR BELT TRACKING",
                f"Belt Drift Warning (Load Delta: {load_diff:.2f}kg, Conf: {confidence*100:.1f}%)",
            )

        # 4. Bearing Degradation / Severe Vibration (Head/Tail Pulley)
        max_vib = max(vib_left, vib_right)
        if max_vib >= 2.8:
            which_bearing = "Left Bearing" if vib_left >= vib_right else "Right Bearing"
            return (
                "EMERGENCY",
                f"PULLEY BEARINGS ({which_bearing.upper()})",
                f"Critical Bearing Vibration ({max_vib:.2f}g)! Seizure imminent!",
            )
        if max_vib >= 2.2:
            which_bearing = "Left Bearing" if vib_left >= vib_right else "Right Bearing"
            return (
                "CRITICAL",
                f"PULLEY BEARINGS ({which_bearing.upper()})",
                f"High Vibration on {which_bearing} ({max_vib:.2f}g) — Lubrication / Spindle Defect",
            )

        # 5. Generic Fault / Anomaly Detection Fallback
        if fault:
            return (
                "CRITICAL",
                "CONVEYOR SAFETY INTERLOCK",
                "Machine Fault Flag Active from hardware sensor bus",
            )

        if is_anomaly and anomaly_score < -0.15:
            return (
                "WARNING",
                "ANOMALY IN CONVEYOR DYNAMICS",
                f"Unsupervised ML flagged out-of-distribution sensor profile (Score: {anomaly_score:.3f})",
            )

        return ("NORMAL", "ALL SYSTEMS OPERATIONAL", "Nominal telemetry parameters")


# Singleton instance
engine = MLEngine()
