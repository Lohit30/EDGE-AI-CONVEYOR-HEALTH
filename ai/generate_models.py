# =============================================================================
# Generate Baseline Scikit-Learn Models for Conveyor Anomaly Detection
# Matches feature_config.json exactly (18 features, 3 classes)
# =============================================================================

import json
from pathlib import Path
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

with open(MODEL_DIR / "feature_config.json", "r") as f:
    config = json.load(f)

features = config["features"]
classes = config["classes"]  # ["BELT MISALIGNMENT", "NORMAL", "OBJECT/JAM DETECTED"]

np.random.seed(42)
n_samples = 3000

# Synthesize operational conveyor distributions for small benchtop prototype:
# Normal:
#   vib: ~0.12g (~1.18 m/s²), current: ~1.15A (12V DC), total_load: ~0.95kg (dual HX711), load_diff: ~0.02kg
n_normal = 2000
n_misaligned = 500
n_jam = 500

# Normal records
vib_l_n = np.random.normal(0.12, 0.015, n_normal)
vib_r_n = np.random.normal(0.11, 0.015, n_normal)
load_l_n = np.random.normal(0.48, 0.025, n_normal)
load_r_n = np.random.normal(0.47, 0.025, n_normal)
curr_n = np.random.normal(1.15, 0.05, n_normal)
ir_l_n = np.zeros(n_normal)
ir_r_n = np.zeros(n_normal)
estop_n = np.zeros(n_normal)
fault_n = np.zeros(n_normal)
y_n = ["NORMAL"] * n_normal

# Misalignment records:
#   load_diff > 0.5kg or IR beam blocked
vib_l_m = np.random.normal(0.16, 0.03, n_misaligned)
vib_r_m = np.random.normal(0.11, 0.02, n_misaligned)
load_l_m = np.random.normal(0.85, 0.10, n_misaligned)
load_r_m = np.random.normal(0.18, 0.06, n_misaligned)
curr_m = np.random.normal(1.30, 0.08, n_misaligned)
ir_l_m = np.random.choice([0, 1], size=n_misaligned, p=[0.25, 0.75])
ir_r_m = np.zeros(n_misaligned)
estop_m = np.zeros(n_misaligned)
fault_m = np.zeros(n_misaligned)
y_m = ["BELT MISALIGNMENT"] * n_misaligned

# Object / Jam records:
#   current > 2.3A, total load > 3.0kg, increased vibration
vib_l_j = np.random.normal(0.28, 0.04, n_jam)
vib_r_j = np.random.normal(0.26, 0.04, n_jam)
load_l_j = np.random.normal(1.65, 0.25, n_jam)
load_r_j = np.random.normal(1.60, 0.25, n_jam)
curr_j = np.random.normal(2.65, 0.22, n_jam)
ir_l_j = np.random.choice([0, 1], size=n_jam, p=[0.6, 0.4])
ir_r_j = np.random.choice([0, 1], size=n_jam, p=[0.6, 0.4])
estop_j = np.zeros(n_jam)
fault_j = np.random.choice([0, 1], size=n_jam, p=[0.7, 0.3])
y_j = ["OBJECT/JAM DETECTED"] * n_jam

# Combine
vib_l = np.concatenate([vib_l_n, vib_l_m, vib_l_j])
vib_r = np.concatenate([vib_r_n, vib_r_m, vib_r_j])
load_l = np.concatenate([load_l_n, load_l_m, load_l_j])
load_r = np.concatenate([load_r_n, load_r_m, load_r_j])
curr = np.concatenate([curr_n, curr_m, curr_j])
ir_l = np.concatenate([ir_l_n, ir_l_m, ir_l_j])
ir_r = np.concatenate([ir_r_n, ir_r_m, ir_r_j])
estop = np.concatenate([estop_n, estop_m, estop_j])
fault = np.concatenate([fault_n, fault_m, fault_j])
y = np.array(y_n + y_m + y_j)

# Compute derived features matching ai/train_model.py
vib_left_mps2 = vib_l * 9.80665
vib_right_mps2 = vib_r * 9.80665
load_imbalance = np.abs(load_l - load_r)
total_load = load_l + load_r
vib_ratio = vib_l / (vib_r + 1e-6)
vib_total = vib_left_mps2 + vib_right_mps2
vib_diff = np.abs(vib_left_mps2 - vib_right_mps2)
load_ratio = load_l / (load_r + 1e-6)
power_proxy = curr * 12.0

data_map = {
    "vibration_left_g": vib_l,
    "vibration_right_g": vib_r,
    "vibration_left_mps2": vib_left_mps2,
    "vibration_right_mps2": vib_right_mps2,
    "load_left_kg": load_l,
    "load_right_kg": load_r,
    "load_imbalance_kg": load_imbalance,
    "total_load_kg": total_load,
    "current_A": curr,
    "ir_left_blocked": ir_l,
    "ir_right_blocked": ir_r,
    "estop_active": estop,
    "fault_active": fault,
    "vib_ratio": vib_ratio,
    "vib_total": vib_total,
    "vib_diff": vib_diff,
    "load_ratio": load_ratio,
    "power_proxy": power_proxy,
}

X = np.column_stack([data_map[f] for f in features])

le = LabelEncoder()
le.fit(classes)
y_encoded = le.transform(y)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, class_weight="balanced")
rf.fit(X_scaled, y_encoded)

# Isolation forest on normal baseline
iforest = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
iforest.fit(X_scaled[y == "NORMAL"])

# Dump joblibs
joblib.dump(rf, MODEL_DIR / "conveyor_rf.joblib")
joblib.dump(iforest, MODEL_DIR / "conveyor_iforest.joblib")
joblib.dump(scaler, MODEL_DIR / "scaler.joblib")
joblib.dump(le, MODEL_DIR / "label_encoder.joblib")

print("Generated models successfully:")
print(" -", MODEL_DIR / "conveyor_rf.joblib")
print(" -", MODEL_DIR / "conveyor_iforest.joblib")
print(" -", MODEL_DIR / "scaler.joblib")
print(" -", MODEL_DIR / "label_encoder.joblib")
