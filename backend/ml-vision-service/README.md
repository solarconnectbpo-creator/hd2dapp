# HD2D Roof Vision Service (Python)

FastAPI service for **CNN / hosted custom vision** beside the existing Cloudflare Worker + OpenAI flows.

## Prerequisites

- **Python 3.10–3.12** recommended for optional **Detectron2** builds; **3.11+** is fine for FastAPI-only (`stub` / `roboflow` / `http_json`).
- On your PATH: `python` or use the **`py`** launcher ([python.org](https://www.python.org/downloads/), tick **Add to PATH**).

### Windows: `python` still not found

1. **Close and reopen** the terminal (and Cursor) so PATH updates after install.
2. **App execution aliases**: Settings → Apps → **Advanced app settings** → **App execution aliases** → turn **off** `python.exe` and `python3.exe` (they point at the Store stub and can shadow the real install).
3. Confirm the real interpreter: `where.exe python` — you want a path like `...\Programs\Python\Python3xx\python.exe`, not only `WindowsApps\python.exe`.
4. Run `.\setup-windows.ps1` from this folder (creates `.venv` and installs `requirements.txt`).
5. **Detectron2 only:** install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ workload), then run `.\install-detectron2.ps1` **inside** this directory (adds torch + Detectron2 to `.venv`).

## What it does

- `POST /v1/roof-vision/infer` with JSON `{ "imageBase64": "...", "mimeType": "image/jpeg" }`
- Returns JSON aligned with roof-damage fields: `damageTypes`, `severity`, `confidence`, `recommendedAction`, etc.

## Providers (`VISION_PROVIDER`)

| Value | Use case |
|--------|----------|
| `stub` | Local dev; returns placeholder labels. |
| `roboflow` | [Roboflow Hosted Inference](https://docs.roboflow.com/inference/hosted-api) on a trained model. Set `ROBOFLOW_API_KEY` + `ROBOFLOW_MODEL_PATH`. |
| `http_json` | **Managed API** (Vertex AI Vision, Azure Custom Vision, Roboflow serverless URL you wrap, etc.): POST JSON to `HTTP_JSON_URL` and map response in `map_generic_to_hd2d`. |
| `detectron2` | **Local Mask R-CNN** roof instance segmentation (train in repo `roof-detectron/`, copy `output/model_final.pth`). Set `DETECTRON2_WEIGHTS_PATH` to that file. Requires PyTorch + Detectron2 (see below). Response includes `segmentation` (facet count, areas in px², image size; optional `polygons` if `DETECTRON2_INCLUDE_POLYGONS=true`). |

Tune `app/inference.py` → `map_roboflow_to_hd2d` to match **your** class names.

### Detectron2 (roof masks)

1. Train a COCO model in **`roof-detectron/`** at the repo root (or copy weights you already have).
2. Install extras in **this service’s `.venv`** (Windows: MSVC Build Tools required — see **`roof-detectron/README.md`**):

   ```bash
   .venv\Scripts\activate
   pip install --upgrade pip
   pip install torch torchvision torchaudio
   pip install -r requirements.txt
   pip install "git+https://github.com/facebookresearch/detectron2.git" --no-build-isolation
   ```

   Or from this folder: **`.\install-detectron2.ps1`**

   - **`--no-build-isolation`** is required so the build sees your installed `torch`.
   - Use [PyTorch CUDA wheels](https://pytorch.org/get-started/locally/) first if you have a GPU.

3. In `.env`:

   ```env
   VISION_PROVIDER=detectron2
   DETECTRON2_WEIGHTS_PATH=C:/path/to/model_final.pth
   ```

4. The **Expo app** calls `POST /api/ai/roof-vision` on the Worker; the Worker proxies here. The JSON response includes **`segmentation`** for the UI and report notes.

> The default **Dockerfile** here only installs `requirements.txt` (no torch/detectron2). For containerized Detectron2, extend the image with PyTorch + a matching Detectron2 build or mount weights at runtime.

## Run locally

```bash
cd backend/ml-vision-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8090
```

Health: `GET http://localhost:8090/health`

## Docker

```bash
docker build -t hd2d-roof-vision .
docker run -p 8090:8090 --env-file .env hd2d-roof-vision
```

Deploy to **Cloud Run**, **Fly.io**, **Railway**, **ECS**, etc. Use HTTPS in production.

## Wire Cloudflare Worker → this service

1. Deploy the container and note the **public base URL** (e.g. `https://roof-vision-xxxxx.run.app`).
2. Set Worker secrets (or `wrangler.toml` vars for dev):

   - `ROOF_VISION_SERVICE_URL` = that base URL (no trailing slash)
   - `ROOF_VISION_SERVICE_SECRET` = optional; must match `SERVICE_SECRET` in Python `.env`

3. The app calls **`POST /api/ai/roof-vision`** on your Worker; the Worker proxies to `/v1/roof-vision/infer`.

## Managed vision API (`http_json`)

Point `HTTP_JSON_URL` at any HTTPS endpoint that accepts:

```json
{ "imageBase64": "<raw base64>", "mimeType": "image/jpeg" }
```

and returns (or you adapt in code to) something like:

```json
{
  "damageTypes": ["Hail", "Wind"],
  "severity": 4,
  "confidence": 0.82,
  "recommendedAction": "Insurance Claim Help",
  "notes": "",
  "model": "vertex-custom-roof-v1"
}
```

Extend `map_generic_to_hd2d` if your provider uses different keys.

## Security

- Do **not** expose this service without TLS.
- Use `SERVICE_SECRET` + `X-HD2D-Secret` header so only your Worker can call inference.
