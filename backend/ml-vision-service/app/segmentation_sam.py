"""
SAM (Segment Anything Model) point-prompted roof segmentation.
Requires: torch, torchvision, segment-anything, opencv-python-headless.
Download checkpoint: https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth (~375 MB)
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from .roof_line_geometry import infer_roof_lines_from_mask_and_polygon

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


def _mask_to_polygon(mask: np.ndarray, simplify_eps: float = 0.0011) -> list[list[float]] | None:
    """Convert binary mask to simplified polygon (largest contour).

    Uses CHAIN_APPROX_NONE so roof edges are not collapsed to axis-aligned segments
    before simplification (which previously produced near-rectangles). Simplification
    epsilon is a fraction of perimeter — keep moderate vertex count on complex roofs.
    """
    m = (mask.astype(np.uint8) * 255) if mask.dtype != np.uint8 else mask
    # Light close to bridge 1px gaps without wiping thin ridges
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=1)

    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)
    if len(largest) < 3:
        return None
    peri = cv2.arcLength(largest, True)
    if peri <= 1e-6:
        return None

    eps = max(0.8, simplify_eps * peri)
    approx = cv2.approxPolyDP(largest, eps, True)
    # If Douglas–Peucker collapsed a complex roof to a quad, retry with a tighter epsilon
    if len(approx) <= 5 and peri > 120.0:
        eps_tight = max(0.35, simplify_eps * 0.35 * peri)
        approx2 = cv2.approxPolyDP(largest, eps_tight, True)
        if len(approx2) > len(approx):
            approx = approx2

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


def _point_in_foreground(mask: np.ndarray, px: int, py: int) -> bool:
    h, w = mask.shape[:2]
    if px < 0 or py < 0 or px >= w or py >= h:
        return False
    return bool(mask[py, px] > 0.5)


def _mask_fraction(mask: np.ndarray, h: int, w: int) -> float:
    return float(np.sum(mask > 0.5)) / float(h * w) if h * w else 0.0


def _component_mask_at_point(mask: np.ndarray, px: int, py: int) -> np.ndarray:
    """Keep only the 8-connected foreground component that contains the click (or nearest foreground)."""
    binary = ((mask > 0.5).astype(np.uint8)) * 255
    hi, wi = binary.shape[:2]
    px = int(np.clip(px, 0, wi - 1))
    py = int(np.clip(py, 0, hi - 1))
    if binary[py, px] == 0:
        ys, xs = np.where(binary > 0)
        if len(xs) == 0:
            return (mask > 0.5).astype(np.float32)
        d = (xs.astype(np.float64) - px) ** 2 + (ys.astype(np.float64) - py) ** 2
        j = int(np.argmin(d))
        px, py = int(xs[j]), int(ys[j])
    _nlab, labels, _stats, _centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
    lid = int(labels[py, px])
    if lid == 0:
        return (mask > 0.5).astype(np.float32)
    isolated = (labels == lid).astype(np.float32)
    return isolated


def _pick_best_multimask(
    masks: np.ndarray,
    scores: np.ndarray,
    point_x: int,
    point_y: int,
    h: int,
    w: int,
) -> tuple[int, float]:
    """Prefer a tight mask on one roof: small area among high-scoring SAM outputs."""
    n = len(masks)
    max_s = float(np.max(scores))
    min_frac = 0.0005
    max_frac = 0.48  # ~single building in crop; larger usually means merged neighbors

    scored: list[tuple[int, float, float]] = []
    for i in range(n):
        m = masks[i]
        frac = _mask_fraction(m, h, w)
        if not (min_frac < frac < 0.92):
            continue
        if not _point_in_foreground(m, point_x, point_y):
            continue
        s = float(scores[i])
        scored.append((i, frac, s))

    if not scored:
        idx = int(np.argmax(scores))
        return idx, float(scores[idx])

    # 1) Smallest area among masks with strong score and reasonable coverage
    tight = [(i, f, s) for i, f, s in scored if f <= max_frac and s >= max_s - 0.12]
    if tight:
        tight.sort(key=lambda t: t[1])
        i, _f, _s = tight[0]
        return i, float(scores[i])

    # 2) Smallest area among any mask under max_frac
    under = [(i, f, s) for i, f, s in scored if f <= max_frac]
    if under:
        under.sort(key=lambda t: t[1])
        i, _f, _s = under[0]
        return i, float(scores[i])

    # 3) Smallest area among scores near top (avoid a huge low-score blob)
    near = [(i, f, s) for i, f, s in scored if s >= max_s - 0.18]
    if near:
        near.sort(key=lambda t: t[1])
        i, _f, _s = near[0]
        return i, float(scores[i])

    scored.sort(key=lambda t: t[1])
    i, _f, _s = scored[0]
    return i, float(scores[i])


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

    best_idx, raw_score = _pick_best_multimask(masks, scores, point_x, point_y, h, w)
    best_mask = np.asarray(masks[best_idx], dtype=np.float32)
    # Keep only the roof blob under the click (drops merged neighbors if mask had disjoint parts).
    best_mask = _component_mask_at_point(best_mask, point_x, point_y)
    confidence = float(np.clip(raw_score, 0.0, 1.0))

    # If the mask covers almost the entire crop, SAM is not isolating a roof—usually need to zoom in.
    mask_pixels = float(np.sum(best_mask > 0.5))
    mask_frac = mask_pixels / float(h * w) if h * w else 0.0
    if mask_frac > 0.85:
        return {
            "success": False,
            "error": "Segmentation filled almost the whole view—zoom in closer to the roof and click again.",
            "polygon": None,
            "areaPx": 0,
            "confidence": confidence,
            "imageWidth": w,
            "imageHeight": h,
            "maskCoverage": round(mask_frac, 4),
        }
    if mask_frac < 0.0005:
        return {
            "success": False,
            "error": "Segmentation too small—click directly on roof surface.",
            "polygon": None,
            "areaPx": 0,
            "confidence": confidence,
            "imageWidth": w,
            "imageHeight": h,
            "maskCoverage": round(mask_frac, 4),
        }
    # After isolation, >~75% of the crop usually means multiple buildings still in frame.
    if mask_frac > 0.78:
        return {
            "success": False,
            "error": "Segmentation still covers most of the view—zoom in closer so one roof dominates, then Auto Trace again.",
            "polygon": None,
            "areaPx": 0,
            "confidence": confidence,
            "imageWidth": w,
            "imageHeight": h,
            "maskCoverage": round(mask_frac, 4),
        }

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

    roof_lines_raw = infer_roof_lines_from_mask_and_polygon(best_mask, polygon)
    roof_lines: list[dict[str, Any]] = []
    for rl in roof_lines_raw:
        roof_lines.append(
            {
                "type": rl["type"],
                "coordinates": rl["coordinates"],
            }
        )

    return {
        "success": True,
        "polygon": polygon,
        "roofLines": roof_lines,
        "areaPx": round(area_px, 2),
        "confidence": round(confidence, 4),
        "imageWidth": w,
        "imageHeight": h,
        "maskCoverage": round(mask_frac, 4),
    }
