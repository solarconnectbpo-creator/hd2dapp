from __future__ import annotations

import base64
import re

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .inference import run_inference

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
