# Roof segmentation (Detectron2)

COCO-format instance segmentation for roof facets/planes. Train with your own labels (e.g. Roboflow → COCO JSON), then run inference and sum polygon areas in `utils.py` for report totals.

## Production integration (HD2D app)

The React Native app does **not** run Python. It uses **`POST /api/ai/roof-vision`** on the Cloudflare Worker, which proxies to **`backend/ml-vision-service`**. After training, copy **`output/model_final.pth`** and set in the vision service `.env`:

`VISION_PROVIDER=detectron2` and `DETECTRON2_WEIGHTS_PATH` to that file. See **`backend/ml-vision-service/README.md`**.

## Python version

Use **Python 3.10, 3.11, or 3.12** for training and for Detectron2 when possible. **3.14+** may lack prebuilt wheels or full support for some extensions.

## Setup (Windows)

### 1. Interpreter

- Prefer **`py -3`** if `python` is missing or opens the Microsoft Store stub.
- Turn off **App execution aliases** for `python.exe` / `python3.exe` (Settings → Apps → Advanced → App execution aliases).

### 2. Microsoft C++ Build Tools (required for Detectron2)

Detectron2 compiles native code (`detectron2._C`). Install:

- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) → workload **Desktop development with C++** (MSVC v143+ and Windows SDK).

Reopen the terminal (or use **x64 Native Tools Command Prompt for VS**) so `cl.exe` is available.

### 3. Virtual environment (recommended)

```powershell
cd roof-detectron
py -3 -m venv venv
.\venv\Scripts\Activate.ps1
```

### 4. Install PyTorch, deps, and Detectron2

```powershell
py -3 -m pip install --upgrade pip
py -3 -m pip install torch torchvision torchaudio
py -3 -m pip install -r requirements.txt
py -3 -m pip install "git+https://github.com/facebookresearch/detectron2.git" --no-build-isolation
```

`--no-build-isolation` lets the Detectron2 build see your installed `torch` (otherwise pip’s isolated env fails with `No module named 'torch'`).

**GPU (NVIDIA):** install the matching PyTorch CUDA build first, e.g. from [PyTorch Get Started](https://pytorch.org/get-started/locally/), then the same Detectron2 line.

### 5. One-shot script

From this folder:

```powershell
.\install-detectron2.ps1
```

### 6. PATH

If `uvicorn` / scripts are “not found”, add `...\Python3xx\Scripts` to PATH, or run `py -3 -m pip ...` and `py -3 -m uvicorn` for tools.

## Dataset

- Put training images in `dataset/train/images/` and `dataset/train/annotations.json` (COCO).
- Same for `dataset/val/`.
- Replace the placeholder empty JSON files with a real export (categories must include class id `1` = `roof` to match `NUM_CLASSES = 1`).

## Train

```bash
python train.py
```

Weights: `output/model_final.pth`.

## Inference

```bash
python inference.py path/to/image.jpg --weights output/model_final.pth --thresh 0.5
```

## Measurement hook

```python
from inference import detect_roof, setup_predictor
from utils import roof_measurement_summary

setup_predictor()
polys = detect_roof("ortho.png")
summary = roof_measurement_summary(polys, sqft_per_px_sq=YOUR_CALIBRATION)
# summary["total_area_sqft"] when scale is set
```

Calibrate `sqft_per_px_sq` from ground sample distance (GSD) or known reference length on the image. The same value can be set as **`DETECTRON2_SQFT_PER_PX_SQ`** in `backend/ml-vision-service/.env` so the API returns **`segmentation.estimatedRoofAreaSqFt`** for the app.

## Pro settings

In `train.py`, raise `cfg.SOLVER.MAX_ITER` (e.g. 8000) and in inference use `--thresh 0.7` after the model is strong enough.
