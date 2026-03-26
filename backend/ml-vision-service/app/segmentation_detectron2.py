"""
Optional Detectron2 Mask R-CNN roof instance segmentation.
Requires: torch, torchvision, opencv-python-headless, detectron2 (see README).
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

try:
    from detectron2 import model_zoo
    from detectron2.config import get_cfg
    from detectron2.engine import DefaultPredictor

    _DETECTRON2_IMPORT_OK = True
except ImportError:
    _DETECTRON2_IMPORT_OK = False

_predictor: Any = None
_predictor_key: str | None = None


def detectron2_available() -> bool:
    return _DETECTRON2_IMPORT_OK


def _cuda_available() -> bool:
    try:
        import torch

        return torch.cuda.is_available()
    except Exception:
        return False


def _masks_to_polygons(masks: np.ndarray) -> list[list[list[float]]]:
    polygons: list[list[list[float]]] = []
    for mask in masks:
        m = (mask.astype(np.uint8) * 255) if mask.dtype != np.uint8 else mask
        contours, _ = cv2.findContours(
            m,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE,
        )
        for cnt in contours:
            if len(cnt) < 3:
                continue
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.01 * peri, True)
            polygons.append(approx.tolist())
    return polygons


def _flatten_contour_to_xy(poly: list) -> list[list[float]]:
    out: list[list[float]] = []
    for pt in poly:
        if not isinstance(pt, (list, tuple)):
            continue
        if (
            len(pt) == 1
            and isinstance(pt[0], (list, tuple))
            and len(pt[0]) >= 2
        ):
            out.append([float(pt[0][0]), float(pt[0][1])])
        elif len(pt) >= 2 and isinstance(pt[0], (int, float)):
            out.append([float(pt[0]), float(pt[1])])
    return out


def _polygon_area_px(contour: list[list[float]]) -> float:
    if len(contour) < 3:
        return 0.0
    pts = [(float(p[0]), float(p[1])) for p in contour]
    if pts[0] != pts[-1]:
        pts = pts + [pts[0]]
    s = 0.0
    for i in range(len(pts) - 1):
        s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    return abs(s) / 2.0


def _areas_from_polygons(polygons: list[list[list[float]]]) -> tuple[float, list[float]]:
    areas: list[float] = []
    for poly in polygons:
        flat = _flatten_contour_to_xy(poly)
        areas.append(_polygon_area_px(flat))
    return (sum(areas), areas)


def get_predictor(weights_path: str, score_thresh: float) -> Any:
    global _predictor, _predictor_key
    if not detectron2_available():
        raise RuntimeError("detectron2 is not installed")

    key = f"{weights_path}|{score_thresh}"
    if _predictor is not None and _predictor_key == key:
        return _predictor

    cfg = get_cfg()
    cfg.merge_from_file(
        model_zoo.get_config_file(
            "COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml",
        ),
    )
    cfg.MODEL.ROI_HEADS.NUM_CLASSES = 1
    cfg.MODEL.WEIGHTS = weights_path
    cfg.MODEL.DEVICE = "cuda" if _cuda_available() else "cpu"
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = score_thresh

    _predictor = DefaultPredictor(cfg)
    _predictor_key = key
    return _predictor


def run_segmentation_bgr(
    image_bgr: np.ndarray,
    *,
    weights_path: str,
    score_thresh: float,
    include_polygons: bool,
) -> dict[str, Any]:
    """Run Mask R-CNN; returns JSON-serializable dict."""
    h, w = image_bgr.shape[:2]
    pred = get_predictor(weights_path, score_thresh)
    outputs = pred(image_bgr)
    inst = outputs["instances"]
    if len(inst) == 0:
        return {
            "polygonCount": 0,
            "totalAreaPx": 0.0,
            "perPolygonAreaPx": [],
            "imageWidth": w,
            "imageHeight": h,
            "polygons": [] if include_polygons else None,
        }

    masks = inst.pred_masks.cpu().numpy()
    polygons = _masks_to_polygons(masks)
    total_px, per_px = _areas_from_polygons(polygons)
    out: dict[str, Any] = {
        "polygonCount": len(polygons),
        "totalAreaPx": round(total_px, 2),
        "perPolygonAreaPx": [round(x, 2) for x in per_px],
        "imageWidth": w,
        "imageHeight": h,
    }
    if include_polygons:
        out["polygons"] = polygons
    else:
        out["polygons"] = None
    return out


def decode_image_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes as BGR")
    return img
