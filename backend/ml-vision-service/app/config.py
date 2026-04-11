from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 8090

    # stub | roboflow | http_json | detectron2
    vision_provider: str = "stub"

    # Optional shared secret (set same on Worker proxy)
    service_secret: str = ""

    # Comma-separated browser origins for CORS; empty = allow all (*)
    cors_allowed_origins: str = ""

    # --- Detectron2 Mask R-CNN (roof instance segmentation) ---
    # Train with repo roof-detectron; point to model_final.pth
    detectron2_weights_path: str = ""
    detectron2_score_thresh: float = 0.5
    detectron2_include_polygons: bool = False
    # Pixel² → ft² for mask totals: calibrate from ortho GSD or a known reference length on the image.
    # When > 0, segmentation JSON includes estimatedRoofAreaSqFt for the app / estimates.
    detectron2_sqft_per_px_sq: float = 0.0

    # --- Roboflow hosted model (https://docs.roboflow.com/inference/hosted-api) ---
    roboflow_api_key: str = ""
    roboflow_model_path: str = ""  # e.g. workspace/project/version

    # --- SAM (Segment Anything) for click-to-trace roof segmentation ---
    sam_checkpoint_path: str = ""
    sam_model_type: str = "vit_b"

    # --- Any managed API that accepts JSON and returns JSON you map below ---
    http_json_url: str = ""
    http_json_bearer: str = ""


settings = Settings()
