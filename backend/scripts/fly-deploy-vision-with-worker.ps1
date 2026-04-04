# Same as fly-deploy-vision.ps1 but sets FLY_AUTO_WORKER_SECRETS=1 so Cloudflare Worker
# ROOF_VISION_SERVICE_URL / ROOF_VISION_SERVICE_SECRET are updated after a successful Fly deploy.
$ErrorActionPreference = "Stop"
$env:FLY_AUTO_WORKER_SECRETS = "1"
& (Join-Path $PSScriptRoot "fly-deploy-vision.ps1")
