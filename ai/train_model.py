# =============================================================================
# ML Training Pipeline â€” Conveyor Belt Anomaly Detection
# =============================================================================
# Loads the 3 sensor JSON datasets, engineers features, and trains:
#   1. Random Forest Classifier (NORMAL / BELT_MISALIGNMENT / OBJECT_JAM)
#   2. Isolation Forest (anomaly scoring for unseen defect patterns)
#
# Usage:  python ai/train_model.py
# Output: ai/models/conveyor_rf.joblib
#         ai/models/conveyor_iforest.joblib
#         ai/models/scaler.joblib
#         ai/models/label_encoder.joblib
# =============================================================================

import json
import os
import sys
import time
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILES = [
    PROJECT_ROOT / "Datasetsih1.json",
    PROJECT_ROOT / "Datasetsih2.json",
    PROJECT_ROOT / "Datasetsih3.json",
]
MODEL_DIR = Path(__file__).resolve().parent / "models"

FEATURE_COLS = [
    "vibration_left_g",
    "vibration_right_g",
    "vibration_left_mps2",
    "vibration_right_mps2",
    "load_left_kg",
    "load_right_kg",
    "load_imbalance_kg",
    "total_load_kg",
    "current_A",
]
BOOL_COLS = ["ir_left_blocked", "ir_right_blocked", "estop_active", "fault_active"]
LABEL_COL = "ai_prediction"


def load_datasets() -> pd.DataFrame:
    """Load and concatenate all JSON sensor datasets."""
    frames = []
    for fp in DATA_FILES:
        if not fp.exists():
            print(f"  âš  Skipping missing file: {fp.name}")
            continue
        print(f"  Loading {fp.name} â€¦", end=" ", flush=True)
        t0 = time.time()
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        df = pd.DataFrame(data["records"])
        frames.append(df)
        print(f"{len(df):,} records ({time.time()-t0:.1f}s)")
    if not frames:
        print("ERROR: No data files found.")
        sys.exit(1)
    combined = pd.concat(frames, ignore_index=True)
    print(f"\n  âœ“ Total records: {len(combined):,}")
    return combined


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create derived features for better ML performance."""
    # Vibration ratio (imbalance between left and right)
    df["vib_ratio"] = df["vibration_left_g"] / (df["vibration_right_g"] + 1e-6)
    df["vib_total"] = df["vibration_left_mps2"] + df["vibration_right_mps2"]
    df["vib_diff"] = abs(df["vibration_left_mps2"] - df["vibration_right_mps2"])

    # Load features
    df["load_ratio"] = df["load_left_kg"] / (df["load_right_kg"] + 1e-6)

    # Power proxy (current Ã— assumed voltage ~12V)
    df["power_proxy"] = df["current_A"] * 12.0

    # Boolean to int
    for col in BOOL_COLS:
        df[col] = df[col].astype(int)

    return df


def train_models(df: pd.DataFrame):
    """Train Random Forest classifier + Isolation Forest anomaly detector."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Prepare features
    eng_features = FEATURE_COLS + BOOL_COLS + [
        "vib_ratio", "vib_total", "vib_diff", "load_ratio", "power_proxy"
    ]

    # Drop UNKNOWN labels (ambiguous — would pollute the NORMAL class)
    df_clean = df.copy()
    unknown_count = (df_clean[LABEL_COL] == "UNKNOWN").sum()
    df_clean = df_clean[df_clean[LABEL_COL] != "UNKNOWN"]
    print(f"  Dropped {unknown_count:,} UNKNOWN records (ambiguous labels)")

    # Drop rows with NaN in features
    df_clean = df_clean.dropna(subset=eng_features + [LABEL_COL])
    print(f"\n  Clean records for training: {len(df_clean):,}")

    X = df_clean[eng_features].values
    y_raw = df_clean[LABEL_COL].values

    # Encode labels
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    print(f"  Classes: {list(le.classes_)}")
    print(f"  Class distribution:")
    for cls, count in zip(*np.unique(y_raw, return_counts=True)):
        print(f"    {cls}: {count:,}")

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # â”€â”€ 1) Random Forest Classifier â”€â”€
    print("\n  Training Random Forest Classifier â€¦")
    t0 = time.time()
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    rf_time = time.time() - t0

    y_pred = rf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  âœ“ Random Forest trained in {rf_time:.1f}s â€” Accuracy: {acc*100:.2f}%")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Feature importance
    importances = rf.feature_importances_
    feat_imp = sorted(zip(eng_features, importances), key=lambda x: x[1], reverse=True)
    print("  Top Feature Importances:")
    for feat, imp in feat_imp[:8]:
        print(f"    {feat:30s}  {imp:.4f}")

    # â”€â”€ 2) Isolation Forest (Anomaly Detector) â”€â”€
    print("\n  Training Isolation Forest Anomaly Detector â€¦")
    t0 = time.time()
    # Train only on NORMAL data for anomaly detection
    normal_mask = y_raw == "NORMAL"
    X_normal = scaler.transform(df_clean.loc[normal_mask, eng_features].values)
    iforest = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    iforest.fit(X_normal)
    if_time = time.time() - t0
    print(f"  âœ“ Isolation Forest trained in {if_time:.1f}s on {len(X_normal):,} normal samples")

    # â”€â”€ Save models â”€â”€
    joblib.dump(rf, MODEL_DIR / "conveyor_rf.joblib")
    joblib.dump(iforest, MODEL_DIR / "conveyor_iforest.joblib")
    joblib.dump(scaler, MODEL_DIR / "scaler.joblib")
    joblib.dump(le, MODEL_DIR / "label_encoder.joblib")

    # Save feature list for inference
    import json as _json
    with open(MODEL_DIR / "feature_config.json", "w") as f:
        _json.dump({"features": eng_features, "classes": list(le.classes_)}, f, indent=2)

    print(f"\n  âœ“ All models saved to {MODEL_DIR}/")
    print(f"    - conveyor_rf.joblib       (Random Forest classifier)")
    print(f"    - conveyor_iforest.joblib   (Isolation Forest anomaly detector)")
    print(f"    - scaler.joblib             (StandardScaler)")
    print(f"    - label_encoder.joblib      (LabelEncoder)")
    print(f"    - feature_config.json       (feature list + classes)")


def main():
    print("=" * 70)
    print("  CONVEYOR BELT ML TRAINING PIPELINE")
    print("=" * 70)

    print("\n[1/3] Loading sensor datasets â€¦")
    df = load_datasets()

    print("\n[2/3] Engineering features â€¦")
    df = engineer_features(df)

    print("\n[3/3] Training models â€¦")
    train_models(df)

    print("\n" + "=" * 70)
    print("  âœ“ TRAINING COMPLETE â€” Models ready for deployment")
    print("=" * 70)


if __name__ == "__main__":
    main()

