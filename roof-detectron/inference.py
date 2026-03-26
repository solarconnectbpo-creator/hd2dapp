"""
Run inference with a trained roof model; export polygons for your measurement engine.
"""

from __future__ import annotations

import argparse
import os
from typing import Any

import cv2
import numpy as np
from detectron2 import model_zoo
from detectron2.config import get_cfg
from detectron2.engine import DefaultPredictor

_ROOT = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_WEIGHTS = os.path.join(_ROOT, "output", "model_final.pth")

_predictor: DefaultPredictor | None = None


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


def setup_predictor(
    weights_path: str | None = None,
    *,
    score_thresh: float = 0.5,
    num_classes: int = 1,
) -> DefaultPredictor:
    global _predictor
    weights = weights_path or _DEFAULT_WEIGHTS
    if not os.path.isfile(weights):
        raise FileNotFoundError(
            f"Missing weights at {weights}. Train first (python train.py) or pass --weights.",
        )

    cfg = get_cfg()
    cfg.merge_from_file(
        model_zoo.get_config_file(
            "COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml",
        ),
    )
    cfg.MODEL.ROI_HEADS.NUM_CLASSES = num_classes
    cfg.MODEL.WEIGHTS = weights
    cfg.MODEL.DEVICE = "cuda" if _cuda_available() else "cpu"
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = score_thresh

    _predictor = DefaultPredictor(cfg)
    return _predictor


def _cuda_available() -> bool:
    try:
        import torch

        return torch.cuda.is_available()
    except Exception:
        return False


def get_predictor() -> DefaultPredictor:
    if _predictor is None:
        return setup_predictor()
    return _predictor


def detect_roof(
    image_path: str,
    *,
    predictor: DefaultPredictor | None = None,
) -> list[list[list[float]]]:
    """
    Returns polygon rings as OpenCV-style point lists (nested lists from approxPolyDP).
    """
    pred = predictor or get_predictor()
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    outputs = pred(img)
    inst = outputs["instances"]
    if len(inst) == 0:
        return []

    masks = inst.pred_masks.cpu().numpy()
    return _masks_to_polygons(masks)


def detect_roof_with_masks(
    image_path: str,
    *,
    predictor: DefaultPredictor | None = None,
) -> dict[str, Any]:
    """Return raw masks, scores, and polygons (single forward pass)."""
    pred = predictor or get_predictor()
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    outputs = pred(img)
    inst = outputs["instances"]
    if len(inst) == 0:
        return {"polygons": [], "masks": None, "scores": None}

    masks = inst.pred_masks.cpu().numpy()
    scores = inst.scores.cpu().numpy()
    polygons = _masks_to_polygons(masks)

    return {
        "polygons": polygons,
        "masks": masks,
        "scores": scores,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Roof instance segmentation inference")
    parser.add_argument("image", nargs="?", default="test.jpg", help="Path to image")
    parser.add_argument(
        "--weights",
        default=None,
        help="Path to model_final.pth",
    )
    parser.add_argument(
        "--thresh",
        type=float,
        default=0.5,
        help="Score threshold (pro training: try 0.7)",
    )
    args = parser.parse_args()

    setup_predictor(args.weights, score_thresh=args.thresh)
    polys = detect_roof(args.image)
    print(f"Found {len(polys)} polygon rings")
    for i, p in enumerate(polys):
        print(f"  {i}: {len(p)} vertices")


if __name__ == "__main__":
    main()
