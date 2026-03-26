"""
Roof image inference: stub, Roboflow hosted, or generic HTTP JSON provider.
Output shape matches HD2D roof-damage AI consumer (merge with GPT in Worker or app).
"""

from __future__ import annotations

import base64
from typing import Any

import httpx

from .config import settings
from . import segmentation_detectron2 as d2seg

DAMAGE_TYPES = [
    "Hail",
    "Wind",
    "Missing Shingles",
    "Leaks",
    "Flashing",
    "Structural",
]


def _clamp_severity(n: Any) -> int:
    try:
        v = int(float(n))
    except (TypeError, ValueError):
        return 3
    return max(1, min(5, v))


def _normalize_damage_list(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return ["Hail"]
    out: list[str] = []
    for x in raw:
        s = str(x).strip()
        if s in DAMAGE_TYPES:
            out.append(s)
    return out or ["Hail"]


async def infer_stub(_image_b64: str, _mime: str) -> dict[str, Any]:
    return {
        "success": True,
        "provider": "stub",
        "model": "stub-v1",
        "damageTypes": ["Hail"],
        "severity": 3,
        "recommendedAction": "Further Inspection",
        "confidence": 0.5,
        "notes": "Replace VISION_PROVIDER and configure a hosted model for real inference.",
        "raw": None,
    }


async def infer_roboflow(image_b64: str, mime: str) -> dict[str, Any]:
    key = settings.roboflow_api_key.strip()
    path = settings.roboflow_model_path.strip()
    if not key or not path:
        raise ValueError("ROBOFLOW_API_KEY and ROBOFLOW_MODEL_PATH are required for roboflow provider")

    try:
        raw = base64.b64decode(image_b64, validate=False)
    except Exception as e:
        raise ValueError(f"Invalid base64 for Roboflow: {e}") from e

    url = f"https://detect.roboflow.com/{path}"
    params = {"api_key": key}
    ext = "jpg"
    if "png" in (mime or "").lower():
        ext = "png"
    filename = f"upload.{ext}"
    files = {"file": (filename, raw, mime or "image/jpeg")}

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, params=params, files=files)
    r.raise_for_status()
    data = r.json()
    return map_roboflow_to_hd2d(data)


def map_roboflow_to_hd2d(data: dict[str, Any]) -> dict[str, Any]:
    """Map Roboflow prediction JSON to HD2D fields (tune to your model's class names)."""
    preds = data.get("predictions") or []
    labels: list[str] = []
    max_conf = 0.0
    for p in preds:
        if not isinstance(p, dict):
            continue
        cls = str(p.get("class") or p.get("label") or "").lower()
        conf = float(p.get("confidence") or p.get("score") or 0)
        max_conf = max(max_conf, conf)
        if "hail" in cls:
            labels.append("Hail")
        elif "wind" in cls:
            labels.append("Wind")
        elif "leak" in cls or "water" in cls:
            labels.append("Leaks")
        elif "flash" in cls:
            labels.append("Flashing")
        elif "miss" in cls or "shingle" in cls:
            labels.append("Missing Shingles")
        elif "struct" in cls:
            labels.append("Structural")

    labels = list(dict.fromkeys(labels)) or ["Hail"]
    severity = 3 if max_conf < 0.5 else 4 if max_conf < 0.75 else 5

    return {
        "success": True,
        "provider": "roboflow",
        "model": "roboflow-hosted",
        "damageTypes": labels[:5],
        "severity": severity,
        "recommendedAction": "Further Inspection",
        "confidence": round(min(1.0, max_conf or 0.5), 4),
        "notes": "Mapped from Roboflow predictions; adjust map_roboflow_to_hd2d for your labels.",
        "raw": data,
    }


async def infer_http_json(image_b64: str, mime: str) -> dict[str, Any]:
    url = settings.http_json_url.strip()
    if not url:
        raise ValueError("HTTP_JSON_URL is required for http_json provider")

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.http_json_bearer:
        headers["Authorization"] = f"Bearer {settings.http_json_bearer}"

    payload = {"imageBase64": image_b64, "mimeType": mime or "image/jpeg"}
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(url, json=payload, headers=headers)
    r.raise_for_status()
    data = r.json()
    return map_generic_to_hd2d(data)


def map_generic_to_hd2d(data: dict[str, Any]) -> dict[str, Any]:
    """Expect keys: damageTypes[], severity, confidence?, recommendedAction?, notes?"""
    return {
        "success": bool(data.get("success", True)),
        "provider": "http_json",
        "model": str(data.get("model") or "managed-api"),
        "damageTypes": _normalize_damage_list(data.get("damageTypes")),
        "severity": _clamp_severity(data.get("severity")),
        "recommendedAction": str(data.get("recommendedAction") or "Further Inspection"),
        "confidence": float(data.get("confidence") or 0.7),
        "notes": str(data.get("notes") or ""),
        "raw": data.get("raw"),
    }


async def infer_detectron2(image_b64: str, mime: str) -> dict[str, Any]:
    """Roof facet masks + areas (px²); damage fields default to conservative stub."""
    if not d2seg.detectron2_available():
        raise ValueError(
            "Detectron2 is not installed. Install torch, torchvision, opencv-python-headless, "
            "then: pip install 'git+https://github.com/facebookresearch/detectron2.git'"
        )
    wpath = settings.detectron2_weights_path.strip()
    if not wpath:
        raise ValueError(
            "DETECTRON2_WEIGHTS_PATH is required for VISION_PROVIDER=detectron2 "
            "(path to model_final.pth from training)",
        )
    try:
        raw = base64.b64decode(image_b64, validate=False)
    except Exception as e:
        raise ValueError(f"Invalid base64: {e}") from e

    img = d2seg.decode_image_bgr(raw)
    seg = d2seg.run_segmentation_bgr(
        img,
        weights_path=wpath,
        score_thresh=float(settings.detectron2_score_thresh),
        include_polygons=bool(settings.detectron2_include_polygons),
    )

    scale = float(settings.detectron2_sqft_per_px_sq or 0.0)
    total_px = float(seg.get("totalAreaPx") or 0)
    if scale > 0 and total_px > 0:
        seg["estimatedRoofAreaSqFt"] = round(total_px * scale, 1)

    base = await infer_stub(image_b64, mime)
    n = int(seg.get("polygonCount") or 0)
    notes = (
        f"Roof segmentation (Detectron2): {n} facet(s), ~{total_px:,.0f} px² total. "
        + (
            f" Calibrated ~{seg['estimatedRoofAreaSqFt']:,.1f} sq ft (DETECTRON2_SQFT_PER_PX_SQ)."
            if seg.get("estimatedRoofAreaSqFt") is not None
            else " Pixel areas — set DETECTRON2_SQFT_PER_PX_SQ (ft²/px²) from GSD or a known reference for sq ft."
        )
    )
    return {
        **base,
        "success": True,
        "provider": "detectron2",
        "model": "mask_rcnn_R_50_FPN_3x",
        "notes": notes,
        "segmentation": seg,
        "confidence": min(1.0, 0.55 + 0.05 * min(n, 8)),
    }


async def run_inference(image_b64: str, mime: str) -> dict[str, Any]:
    provider = settings.vision_provider.strip().lower()
    if provider == "stub":
        return await infer_stub(image_b64, mime)
    if provider == "roboflow":
        return await infer_roboflow(image_b64, mime)
    if provider in ("http_json", "http", "managed"):
        return await infer_http_json(image_b64, mime)
    if provider == "detectron2":
        return await infer_detectron2(image_b64, mime)
    raise ValueError(f"Unknown VISION_PROVIDER: {provider}")
