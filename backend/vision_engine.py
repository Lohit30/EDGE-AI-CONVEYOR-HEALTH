# =============================================================================
# Vision Engine — Ultralytics YOLOv8n-seg Belt Defect & Damage Detection
# =============================================================================

import asyncio
import cv2
import logging
import numpy as np
import os
from pathlib import Path
import time
from typing import Optional

logger = logging.getLogger("vision_engine")

CLASS_NAMES = {
    0: "Hole",
    1: "Human",
    2: "Other Objects",
    3: "Puncture",
    4: "Roller",
    5: "Tear",
    6: "impact damage",
    7: "patch work",
}

# Distinct BGR colors for annotations
CLASS_COLORS = {
    0: (180, 105, 255),  # Hole: Violet / Purple
    1: (0, 220, 255),    # Human: Bright Yellow (Safety hazard)
    2: (0, 140, 255),    # Other Objects: Orange
    3: (30, 80, 220),    # Puncture: Dark Orange-Red
    4: (50, 180, 50),    # Roller: Green
    5: (0, 0, 235),      # Tear: High-Alert Crimson Red (Emergency rip)
    6: (147, 20, 255),   # impact damage: Deep Pink
    7: (230, 230, 0),    # patch work: Cyan
}


class VisionEngine:
    """
    Inference and streaming engine for YOLOv8n-seg conveyor belt inspection.
    Detects tears, punctures, holes, foreign debris, and worker safety hazards.
    """

    def __init__(self):
        self.session = None
        self.loaded = False
        self.model_path = ""
        self.cap: Optional[cv2.VideoCapture] = None
        self.source_mode = "webcam"  # 'webcam' or 'simulation'
        self.last_inference_time_ms = 0.0
        self.last_fps = 0.0
        self.frame_count = 0
        self.fps_start_time = time.time()
        self.latest_detections: list[dict] = []
        self.latest_defect_summary: dict[str, int] = {name: 0 for name in CLASS_NAMES.values()}
        self.camera_index = 0
        self.synthetic_tick = 0

    def load_model(self) -> bool:
        """Find and load the YOLOv8n-seg ONNX model."""
        project_root = Path(__file__).resolve().parent.parent
        possible_paths = [
            project_root / "best.onnx",
            Path(__file__).resolve().parent / "best.onnx",
            Path("/app/best.onnx"),
            Path("/workspace/best.onnx"),
            Path.cwd() / "best.onnx",
            Path.cwd() / "conveyor-belt-monitoring-main" / "best.onnx",
            project_root / "ai" / "models" / "conveyor_yolov8n_seg.onnx",
            project_root / "ai" / "models" / "best.onnx",
            Path("/app/ai/models/best.onnx"),
        ]

        found_path = None
        for p in possible_paths:
            if p.exists():
                found_path = p
                break

        if not found_path:
            logger.warning("No YOLOv8n-seg model found at %s", possible_paths)
            return False

        try:
            import onnxruntime as ort
            self.session = ort.InferenceSession(
                str(found_path),
                providers=["CPUExecutionProvider"]
            )
            self.model_path = str(found_path)
            self.loaded = True
            logger.info("YOLOv8n-seg model loaded successfully from %s", found_path)
            return True
        except Exception as e:
            logger.error("Failed to load ONNX vision model from %s: %s", found_path, e)
            return False

    def init_camera(self) -> bool:
        """Initialize the local webcam device."""
        if self.cap is not None and self.cap.isOpened():
            return True

        try:
            self.cap = cv2.VideoCapture(self.camera_index)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                logger.info("Webcam index %d opened successfully", self.camera_index)
                return True
            else:
                logger.warning("Webcam %d could not be opened; using synthetic stream", self.camera_index)
                return False
        except Exception as e:
            logger.warning("Camera init error (%s); fallback to simulation", e)
            return False

    def release_camera(self):
        """Release camera resources."""
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
            self.cap = None

    def predict(self, frame_bgr: np.ndarray, conf_threshold: float = 0.35, nms_threshold: float = 0.45) -> tuple[np.ndarray, list[dict]]:
        """
        Run YOLOv8n-seg inference on a BGR image frame.

        Returns:
            annotated_frame_bgr: image with bounding boxes, segmentation masks, and HUD labels
            detections: list of detection dicts
        """
        if not self.loaded or self.session is None:
            return frame_bgr, []

        h_orig, w_orig = frame_bgr.shape[:2]
        t0 = time.time()

        # 1. Preprocess: 640x640 letterbox & normalize
        img_resized = cv2.resize(frame_bgr, (640, 640))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        input_tensor = (img_rgb.transpose(2, 0, 1).astype(np.float32) / 255.0)[np.newaxis, ...]

        # 2. Run ONNX session
        outputs = self.session.run(None, {"images": input_tensor})
        self.last_inference_time_ms = round((time.time() - t0) * 1000.0, 1)

        output0 = outputs[0][0].transpose(1, 0)  # shape (8400, 44)
        proto_masks = outputs[1][0]               # shape (32, 160, 160)

        # 3. Parse boxes, class scores, mask coefficients
        boxes = output0[:, :4]       # cx, cy, w, h
        scores = output0[:, 4:12]    # 8 classes
        mask_coeffs = output0[:, 12:]  # 32 coefficients

        class_ids = np.argmax(scores, axis=1)
        confidences = np.max(scores, axis=1)

        # Filter by confidence threshold
        mask = confidences >= conf_threshold
        boxes = boxes[mask]
        class_ids = class_ids[mask]
        confidences = confidences[mask]
        mask_coeffs = mask_coeffs[mask]

        detections = []
        annotated = frame_bgr.copy()

        if len(boxes) == 0:
            self.latest_detections = []
            return annotated, []

        # Convert cx, cy, w, h (640x640 space) to x1, y1, x2, y2 (original image space)
        scale_x = w_orig / 640.0
        scale_y = h_orig / 640.0

        nms_boxes = []
        nms_confidences = []
        for b, conf in zip(boxes, confidences):
            cx, cy, w, h = b
            x1 = int((cx - w / 2) * scale_x)
            y1 = int((cy - h / 2) * scale_y)
            bw = int(w * scale_x)
            bh = int(h * scale_y)
            nms_boxes.append([x1, y1, bw, bh])
            nms_confidences.append(float(conf))

        indices = cv2.dnn.NMSBoxes(nms_boxes, nms_confidences, conf_threshold, nms_threshold)

        if len(indices) == 0:
            self.latest_detections = []
            return annotated, []

        # Color overlay layer for masks
        mask_overlay = np.zeros_like(annotated, dtype=np.uint8)
        mask_applied = False

        defect_counts = {name: 0 for name in CLASS_NAMES.values()}

        for idx in indices.flatten():
            cls_id = int(class_ids[idx])
            cls_name = CLASS_NAMES.get(cls_id, f"Class {cls_id}")
            conf = float(confidences[idx])
            color = CLASS_COLORS.get(cls_id, (0, 255, 0))
            defect_counts[cls_name] = defect_counts.get(cls_name, 0) + 1

            x1, y1, bw, bh = nms_boxes[idx]
            x2 = max(0, min(w_orig, x1 + bw))
            y2 = max(0, min(h_orig, y1 + bh))
            x1 = max(0, min(w_orig, x1))
            y1 = max(0, min(h_orig, y1))

            # Reconstruct mask from prototype
            try:
                coeff = mask_coeffs[idx]
                raw_mask = np.matmul(coeff, proto_masks.reshape(32, -1)).reshape(160, 160)
                sig_mask = 1.0 / (1.0 + np.exp(-raw_mask))
                resized_mask = cv2.resize(sig_mask, (w_orig, h_orig))
                bin_mask = (resized_mask > 0.5).astype(np.uint8)

                # Crop mask to bbox
                cropped_mask = np.zeros_like(bin_mask)
                cropped_mask[y1:y2, x1:x2] = bin_mask[y1:y2, x1:x2]

                # Draw color overlay
                mask_overlay[cropped_mask == 1] = color
                mask_applied = True
            except Exception as e:
                logger.debug("Mask reconstruction skipped for box: %s", e)

            # Draw bounding box
            line_thickness = 3 if cls_name in ("Tear", "Human") else 2
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, line_thickness)

            # Draw label banner
            label_text = f"{cls_name.upper()} {conf * 100:.1f}%"
            (tw, th), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, max(0, y1 - th - 6)), (x1 + tw + 6, max(0, y1)), color, -1)
            cv2.putText(
                annotated, label_text, (x1 + 3, max(th, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA
            )

            detections.append({
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "bbox": [x1, y1, x2, y2],
                "is_emergency": cls_name in ("Tear", "Human"),
            })

        # Alpha-blend masks onto original frame
        if mask_applied:
            annotated = cv2.addWeighted(annotated, 1.0, mask_overlay, 0.45, 0)

        self.latest_detections = detections
        self.latest_defect_summary = defect_counts
        return annotated, detections

    def generate_synthetic_conveyor_frame(self) -> np.ndarray:
        """
        Render a realistic synthetic top-down conveyor belt camera frame with moving texture
        and periodic defects (Tears, Holes, Debris, Rollers) for testing without live camera hardware.
        """
        self.synthetic_tick += 1
        t = self.synthetic_tick

        h, w = 480, 640
        frame = np.full((h, w, 3), 35, dtype=np.uint8)  # Steel bed dark background

        # Conveyor belt channel (x: 80 to 560)
        bx1, bx2 = 80, 560
        frame[:, bx1:bx2] = (50, 52, 54)  # Rubber belt base color

        # Belt guide rails
        cv2.line(frame, (bx1, 0), (bx1, h), (180, 190, 200), 4)
        cv2.line(frame, (bx2, 0), (bx2, h), (180, 190, 200), 4)

        # Moving belt ribs / texture
        offset = (t * 8) % 60
        for y in range(-60, h + 60, 40):
            yy = y + offset
            if 0 <= yy < h:
                cv2.line(frame, (bx1 + 10, yy), (bx2 - 10, yy), (40, 42, 44), 2)

        # Idler roller outlines
        for ry in [80, 240, 400]:
            cv2.line(frame, (bx1 - 15, ry), (bx1, ry), (120, 130, 140), 6)
            cv2.line(frame, (bx2, ry), (bx2 + 15, ry), (120, 130, 140), 6)

        # Periodic simulated defect cycles (every ~180 frames)
        cycle = (t // 100) % 4
        pos_y = (t * 6) % (h + 80) - 40

        if cycle == 1:
            # Longitudinal Tear simulation
            cv2.line(frame, (280, pos_y), (310, pos_y + 90), (10, 10, 10), 8)
            cv2.line(frame, (282, pos_y + 10), (308, pos_y + 80), (25, 25, 25), 4)
        elif cycle == 2:
            # Puncture / Hole simulation
            cv2.circle(frame, (360, pos_y + 40), 22, (15, 15, 15), -1)
            cv2.circle(frame, (360, pos_y + 40), 16, (30, 30, 30), -1)
        elif cycle == 3:
            # Foreign Object simulation
            pts = np.array([[220, pos_y], [260, pos_y + 20], [245, pos_y + 50], [210, pos_y + 35]], np.int32)
            cv2.fillPoly(frame, [pts], (80, 120, 160))

        # Camera timestamp & overlay
        ts_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, f"CAM-CV01 TOP-DOWN // {ts_str}", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)

        return frame

    def capture_frame(self) -> np.ndarray:
        """Capture from real webcam if available, or generate synthetic conveyor frame."""
        if self.source_mode == "webcam":
            if self.cap is None or not self.cap.isOpened():
                now = time.time()
                if getattr(self, "last_camera_check", 0.0) == 0.0 or now - getattr(self, "last_camera_check", 0.0) > 5.0:
                    self.last_camera_check = now
                    if not self.init_camera():
                        return self.generate_synthetic_conveyor_frame()
                else:
                    return self.generate_synthetic_conveyor_frame()

            ret, frame = self.cap.read()
            if ret and frame is not None:
                return frame
            else:
                return self.generate_synthetic_conveyor_frame()

        return self.generate_synthetic_conveyor_frame()

    def get_processed_frame(self, conf_threshold: float = 0.35) -> tuple[np.ndarray, list[dict]]:
        """Capture, run YOLOv8n-seg inference, compute FPS, and add HUD info."""
        raw_frame = self.capture_frame()
        annotated, detections = self.predict(raw_frame, conf_threshold=conf_threshold)

        # Calculate FPS
        self.frame_count += 1
        elapsed = time.time() - self.fps_start_time
        if elapsed >= 1.0:
            self.last_fps = round(self.frame_count / elapsed, 1)
            self.frame_count = 0
            self.fps_start_time = time.time()

        # Render SCADA HUD overlay
        hud_h = 42
        overlay = annotated.copy()
        cv2.rectangle(overlay, (0, 0), (annotated.shape[1], hud_h), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.75, annotated, 0.25, 0, annotated)

        # HUD Text
        has_emergency = any(d["is_emergency"] for d in detections)
        status_text = "EMERGENCY: BELT TEAR / WORKER DETECTED!" if has_emergency else "CONVEYOR SCAN NOMINAL"
        status_color = (0, 0, 255) if has_emergency else (0, 230, 100)

        cv2.putText(annotated, "CV-IRON-01 // VISION AI (YOLOv8n-seg)", (12, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(annotated, f"FPS: {self.last_fps:.1f} | Latency: {self.last_inference_time_ms:.0f}ms | Mode: {self.source_mode.upper()}", (12, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 200, 220), 1)
        cv2.putText(annotated, status_text, (annotated.shape[1] - 340, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.45, status_color, 2)

        return annotated, detections

    async def generate_mjpeg_stream(self, conf_threshold: float = 0.35):
        """Yield multipart MJPEG frames for HTTP video streaming."""
        while True:
            try:
                frame, _ = self.get_processed_frame(conf_threshold=conf_threshold)
                ret, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if not ret:
                    await asyncio.sleep(0.01)
                    continue

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
                )
                await asyncio.sleep(0.04)  # ~25 FPS target
            except Exception as e:
                logger.error("Error in MJPEG stream: %s", e)
                await asyncio.sleep(0.1)


# Singleton instance
vision_engine = VisionEngine()
