"""
Train Mask R-CNN (Detectron2) on COCO-format roof segmentation data.
Place images under dataset/train/images and dataset/val/images with matching annotations.json
"""

from __future__ import annotations

import os

from detectron2 import model_zoo
from detectron2.config import get_cfg
from detectron2.data.datasets import register_coco_instances
from detectron2.engine import DefaultTrainer

# Register datasets (paths relative to this file)
_ROOT = os.path.dirname(os.path.abspath(__file__))
_TRAIN_JSON = os.path.join(_ROOT, "dataset", "train", "annotations.json")
_TRAIN_IMG = os.path.join(_ROOT, "dataset", "train", "images")
_VAL_JSON = os.path.join(_ROOT, "dataset", "val", "annotations.json")
_VAL_IMG = os.path.join(_ROOT, "dataset", "val", "images")

register_coco_instances("roof_train", {}, _TRAIN_JSON, _TRAIN_IMG)
register_coco_instances("roof_val", {}, _VAL_JSON, _VAL_IMG)


def main() -> None:
    cfg = get_cfg()
    cfg.merge_from_file(
        model_zoo.get_config_file(
            "COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml",
        ),
    )

    cfg.DATASETS.TRAIN = ("roof_train",)
    cfg.DATASETS.TEST = ("roof_val",)

    cfg.DATALOADER.NUM_WORKERS = 2

    cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url(
        "COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml",
    )

    cfg.SOLVER.IMS_PER_BATCH = 2
    cfg.SOLVER.BASE_LR = 0.00025
    cfg.SOLVER.MAX_ITER = 3000

    cfg.MODEL.ROI_HEADS.BATCH_SIZE_PER_IMAGE = 128
    cfg.MODEL.ROI_HEADS.NUM_CLASSES = 1

    cfg.OUTPUT_DIR = os.path.join(_ROOT, "output")
    os.makedirs(cfg.OUTPUT_DIR, exist_ok=True)

    trainer = DefaultTrainer(cfg)
    trainer.resume_or_load(resume=False)
    trainer.train()


if __name__ == "__main__":
    main()
