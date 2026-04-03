"""
SAM (Segment Anything Model) point-prompted roof segmentation.
Requires: torch, torchvision, segment-anything, opencv-python-headless.
Download checkpoint: https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth (~375 MB)
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

try:
    from segment_anything import SamPredictor, sam_model_registry

    _SAM_IMPORT_OK = True
except ImportError:
    _SAM_IMPORT_OK = False

_predictor: Any = None
_predictor_key: str | None = None


def sam_available() -> bool:
    return _SAM_IMPORT_OK


def _cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


def get_predictor(checkpoint_path: str, model_type: str = "vit_b") -> Any:
    global _predictor, _predictor_key
    if not sam_available():
        raise RuntimeError("segment-anything is not installed")

    key = f"{checkpoint_path}|{model_type}"
    if _predictor is not None and _predictor_key == key:
        return _predictor

    device = "cuda" if _cuda_available() else "cpu"
    sam = sam_model_registry[model_type](checkpoint=checkpoint_path)
    sam.to(device=device)
    _predictor = SamPredictor(sam)
    _predictor_key = key
    return _predictor


def _mask_to_polygon(mask: np.ndarray, simplify_eps: float = 0.005) -> list[list[float]] | None:
    """Convert binary mask to simplified polygon (largest contour)."""
    m = (mask.astype(np.uint8) * 255) if mask.dtype != np.uint8 else mask
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)
    if len(largest) < 3:
        return None
    peri = cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, simplify_eps * peri, True)
    pts: list[list[float]] = []
    for pt in approx:
        if len(pt) == 1:
            pts.append([float(pt[0][0]), float(pt[0][1])])
        elif len(pt) >= 2:
            pts.append([float(pt[0]), float(pt[1])])
    if len(pts) >= 3 and pts[0] != pts[-1]:
        pts.append(pts[0])
    return pts if len(pts) >= 4 else None


def _polygon_area(pts: list[list[float]]) -> float:
    if len(pts) < 3:
        return 0.0
    s = 0.0
    for i in range(len(pts) - 1):
        s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    return abs(s) / 2.0


def segment_at_point(
    image_bytes: bytes,
    point_x: int,
    point_y: int,
    checkpoint_path: str,
    model_type: str = "vit_b",
) -> dict[str, Any]:
    """Run SAM point-prompted segmentation and return the best polygon."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Could not decode image")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w = img_rgb.shape[:2]

    predictor = get_predictor(checkpoint_path, model_type)
    predictor.set_image(img_rgb)

    input_point = np.array([[point_x, point_y]])
    input_label = np.array([1])

    masks, scores, _ = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=True,
    )

    best_idx = int(np.argmax(scores))
    best_mask = masks[best_idx]
    confidence = float(scores[best_idx])

    polygon = _mask_to_polygon(best_mask)
    if polygon is None:
        return {
            "success": False,
            "error": "No roof segment found at click point",
            "polygon": None,
            "areaPx": 0,
            "confidence": 0,
            "imageWidth": w,
            "imageHeight": h,
        }

    area_px = _polygon_area(polygon)

    return {
        "success": True,
        "polygon": polygon,
        "areaPx": round(area_px, 2),
        "confidence": round(confidence, 4),
        "imageWidth": w,
        "imageHeight": h,
    }
