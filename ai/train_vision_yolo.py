# =============================================================================
# YOLOv8n-seg Conveyor Belt Defect & Tear Training Pipeline
# =============================================================================
# This script fine-tunes Ultralytics YOLOv8 segmentation on conveyor belt
# defect datasets (specifically Tears, Holes, Punctures, Impact Damage) and
# automatically exports the trained model to `best.onnx` for the FastAPI backend.
#
# Usage:
#   1. Install training dependencies:
#      pip install ultralytics torch torchvision onnx roboflow
#
#   2. Run training:
#      python ai/train_vision_yolo.py --epochs 50 --batch 16 --data dataset/data.yaml
#
#   3. Or train on pre-configured Roboflow Conveyor Tear Dataset:
#      python ai/train_vision_yolo.py --roboflow --api-key YOUR_KEY
# =============================================================================

import argparse
import os
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_OUT = PROJECT_ROOT / "best.onnx"
DEFAULT_DATA_DIR = PROJECT_ROOT / "ai" / "dataset"

# 8 Target SCADA classes:
CLASSES = [
    "Hole",           # 0
    "Human",          # 1
    "Other Objects",  # 2
    "Puncture",       # 3
    "Roller",         # 4
    "Tear",           # 5  <-- Primary critical failure
    "impact damage",  # 6
    "patch work",     # 7
]


def check_environment():
    """Verify PyTorch and Ultralytics availability."""
    try:
        import torch
        import ultralytics
        print(f"âœ“ PyTorch Version: {torch.__version__} (CUDA Available: {torch.cuda.is_available()})")
        print(f"âœ“ Ultralytics Version: {ultralytics.__version__}")
        if torch.cuda.is_available():
            print(f"âœ“ GPU Detected: {torch.cuda.get_device_name(0)}")
        else:
            print("â„¹ï¸  No NVIDIA GPU detected â€” training will run on CPU (recommended: 20-50 epochs).")
    except ImportError:
        print("âŒ Missing required packages for training.")
        print("   Please install them via:")
        print("   pip install ultralytics torch torchvision onnx")
        sys.exit(1)


def generate_sample_data_yaml(dest_dir: Path) -> Path:
    """Generate a template data.yaml for conveyor belt defect annotation."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    yaml_path = dest_dir / "conveyor_defects.yaml"

    yaml_content = f"""# Conveyor Belt Defect & Tear Segmentation Dataset
path: {dest_dir.resolve().as_posix()}
train: images/train
val: images/val
test: images/test

names:
  0: Hole
  1: Human
  2: Other Objects
  3: Puncture
  4: Roller
  5: Tear
  6: impact damage
  7: patch work
"""
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

    for split in ["train", "val"]:
        (dest_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (dest_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

    print(f"âœ“ Dataset template created at: {yaml_path}")
    print("  Structure:")
    print(f"    - {dest_dir / 'images' / 'train'} (place your conveyor belt photos here)")
    print(f"    - {dest_dir / 'labels' / 'train'} (place your YOLO polygon .txt labels here)")
    return yaml_path


def download_roboflow_dataset(api_key: str, workspace: str = "conveyor-defects", project: str = "belt-damage-segmentation", version: int = 1) -> Path:
    """Download public conveyor defect segmentation dataset from Roboflow Universe."""
    try:
        from roboflow import Roboflow
        rf = Roboflow(api_key=api_key)
        proj = rf.workspace(workspace).project(project)
        dataset = proj.version(version).download("yolov8-seg", location=str(DEFAULT_DATA_DIR))
        print(f"âœ“ Roboflow dataset downloaded to: {dataset.location}")
        return Path(dataset.location) / "data.yaml"
    except Exception as e:
        print(f"âŒ Roboflow download failed: {e}")
        print("  Generating local dataset template instead...")
        return generate_sample_data_yaml(DEFAULT_DATA_DIR)


def train_yolo(data_yaml: Path, epochs: int = 50, batch_size: int = 16, img_size: int = 640, base_model: str = "yolov8n-seg.pt"):
    """
    Train / fine-tune YOLOv8 segmentation model with data augmentations
    specifically suited for industrial conveyor belts (tears, holes, lighting shifts).
    """
    from ultralytics import YOLO

    print("=" * 60)
    print(f"  STARTING CONVEYOR BELT TEAR TRAINING ({base_model})")
    print(f"  Epochs: {epochs} | Batch: {batch_size} | ImgSz: {img_size}")
    print("=" * 60)

    model = YOLO(base_model)

    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=0 if os.environ.get("CUDA_VISIBLE_DEVICES") else "auto",
        # Industrial Conveyor Belt Augmentation Hyperparameters:
        hsv_h=0.015,     # Slight hue variation for rubber lighting
        hsv_s=0.4,       # Saturation changes (dust / wet surface)
        hsv_v=0.4,       # High value variation (headlights / shadows)
        degrees=10.0,    # Conveyor belt runs straight; minor tilt only
        translate=0.1,   # Belt movement offset
        scale=0.3,       # Tear size variations
        shear=2.0,       # Belt tracking angle distortion
        perspective=0.0005,
        flipud=0.0,      # Conveyor belts move unidirectionally
        fliplr=0.5,      # Left/right tear symmetry
        mosaic=1.0,      # Combine defect images to learn small tears
        mixup=0.1,       # Belt texture blending
        patience=15,     # Early stopping if tear detection converges
        save=True,
        plots=True,
        project="conveyor_yolo_runs",
        name="belt_tear_detection",
    )

    print("\nâœ“ Training completed successfully!")
    metrics = model.val()
    print(f"âœ“ Validation mAP50-95: {metrics.box.map:.4f} (Box), {metrics.seg.map:.4f} (Mask)")

    # Export best model to ONNX for production backend
    print("\nExporting best checkpoint to ONNX format...")
    best_pt = Path(results.save_dir) / "weights" / "best.pt"
    if not best_pt.exists():
        best_pt = Path("conveyor_yolo_runs/belt_tear_detection/weights/best.pt")

    onnx_file = model.export(format="onnx", opset=12, dynamic=False, imgsz=img_size)
    print(f"âœ“ Model exported to ONNX: {onnx_file}")

    # Copy to project root best.onnx
    shutil.copy(onnx_file, DEFAULT_MODEL_OUT)
    print(f"âœ“ Successfully updated production model: {DEFAULT_MODEL_OUT}")
    print("  The FastAPI backend will now use this updated model on restart!")


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 Conveyor Belt Tear Defect Detector")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution")
    parser.add_argument("--data", type=str, default="", help="Path to data.yaml")
    parser.add_argument("--base", type=str, default="yolov8n-seg.pt", help="Base model (yolov8n-seg.pt, yolov8s-seg.pt)")
    parser.add_argument("--roboflow", action="store_true", help="Download dataset from Roboflow Universe")
    parser.add_argument("--api-key", type=str, default=os.getenv("ROBOFLOW_API_KEY", ""), help="Roboflow API key")

    args = parser.parse_args()

    check_environment()

    if args.data and Path(args.data).exists():
        data_yaml = Path(args.data)
    elif args.roboflow and args.api_key:
        data_yaml = download_roboflow_dataset(args.api_key)
    else:
        print("â„¹ï¸  No dataset specified. Setting up dataset folder structure...")
        data_yaml = generate_sample_data_yaml(DEFAULT_DATA_DIR)
        print("\nTo train on your own images:")
        print(f"1. Put conveyor belt defect images in: {DEFAULT_DATA_DIR / 'images' / 'train'}")
        print(f"2. Put YOLO segmentation labels in:   {DEFAULT_DATA_DIR / 'labels' / 'train'}")
        print(f"3. Re-run: python ai/train_vision_yolo.py --epochs {args.epochs} --data {data_yaml}")
        return

    train_yolo(data_yaml, epochs=args.epochs, batch_size=args.batch, img_size=args.imgsz, base_model=args.base)


if __name__ == "__main__":
    main()
