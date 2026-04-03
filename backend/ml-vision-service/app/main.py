from __future__ import annotations

import base64
import re

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .inference import run_inference
from . import segmentation_sam as sam_mod

app = FastAPI(title="HD2D Roof Vision", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class InferBody(BaseModel):
    imageBase64: str = Field(..., description="Raw base64 or data URL (data:image/jpeg;base64,...)")
    mimeType: str | None = Field(default="image/jpeg")


class SegmentAtPointBody(BaseModel):
    imageBase64: str = Field(..., description="Raw base64 or data URL")
    pointX: int = Field(..., description="Click X in image pixels")
    pointY: int = Field(..., description="Click Y in image pixels")
    imageWidth: int | None = Field(default=None)
    imageHeight: int | None = Field(default=None)


def decode_image_b64(raw: str) -> tuple[bytes, str]:
    s = raw.strip()
    mime = "image/jpeg"
    m = re.match(r"data:([^;]+);base64,(.+)", s, re.DOTALL)
    if m:
        mime = m.group(1).strip() or mime
        s = m.group(2).strip()
    try:
        return base64.b64decode(s), mime
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}") from e


@app.get("/health")
def health():
    return {"ok": True, "provider": settings.vision_provider}


@app.post("/v1/roof-vision/infer")
async def infer(
    body: InferBody,
    x_hd2d_secret: str | None = Header(default=None, alias="X-HD2D-Secret"),
):
    if settings.service_secret and x_hd2d_secret != settings.service_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    raw_b64 = body.imageBase64
    mime = body.mimeType or "image/jpeg"
    # Allow data URL in imageBase64
    if raw_b64.strip().startswith("data:"):
        _bytes, mime = decode_image_b64(raw_b64)
        raw_b64 = base64.b64encode(_bytes).decode("ascii")

    try:
        out = await run_inference(raw_b64, mime)
        return out
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@app.post("/v1/roof-vision/segment-at-point")
async def segment_at_point(
    body: SegmentAtPointBody,
    x_hd2d_secret: str | None = Header(default=None, alias="X-HD2D-Secret"),
):
    if settings.service_secret and x_hd2d_secret != settings.service_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not sam_mod.sam_available():
        raise HTTPException(
            status_code=501,
            detail="SAM (segment-anything) is not installed. pip install segment-anything torch torchvision",
        )
    checkpoint = settings.sam_checkpoint_path.strip()
    if not checkpoint:
        raise HTTPException(
            status_code=501,
            detail="SAM_CHECKPOINT_PATH not set. Download sam_vit_b_01ec64.pth and set the path in .env",
        )

    raw_b64 = body.imageBase64
    if raw_b64.strip().startswith("data:"):
        image_bytes, _ = decode_image_b64(raw_b64)
    else:
        try:
            image_bytes = base64.b64decode(raw_b64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64: {e}") from e

    try:
        result = sam_mod.segment_at_point(
            image_bytes=image_bytes,
            point_x=body.pointX,
            point_y=body.pointY,
            checkpoint_path=checkpoint,
            model_type=settings.sam_model_type,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
