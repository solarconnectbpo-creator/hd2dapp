from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 8090

    # stub | roboflow | http_json
    vision_provider: str = "stub"

    # Optional shared secret (set same on Worker proxy)
    service_secret: str = ""

    # --- Roboflow hosted model (https://docs.roboflow.com/inference/hosted-api) ---
    roboflow_api_key: str = ""
    roboflow_model_path: str = ""  # e.g. workspace/project/version

    # --- Any managed API that accepts JSON and returns JSON you map below ---
    http_json_url: str = ""
    http_json_bearer: str = ""


settings = Settings()
