# Sets Cloudflare Worker secrets for roof vision proxy.
# Run: cd backend ; npm run worker:set-roof-vision -- -BaseUrl "https://your-app.fly.dev" -SharedSecret "..."
# Or:  .\scripts\set-roof-vision-worker-secrets.ps1 -BaseUrl "https://..." -SharedSecret "..."

param(
  [string] $BaseUrl = $env:ROOF_VISION_BASE_URL,
  [string] $SharedSecret = $env:ROOF_VISION_SHARED_SECRET
)

$ErrorActionPreference = "Stop"
# Script lives in backend/scripts → backend root is one level up
$backendRoot = Split-Path -Parent $PSScriptRoot
if (Test-Path (Join-Path $backendRoot "wrangler.toml")) {
  Set-Location $backendRoot
} elseif (Test-Path "wrangler.toml") {
  $backendRoot = Get-Location
} else {
  Write-Error "Could not find backend/wrangler.toml (expected next to backend/scripts)."
}

if (-not $BaseUrl -or -not $BaseUrl.Trim()) {
  Write-Error "Pass -BaseUrl (e.g. https://hd2d-roof-vision.fly.dev) or set ROOF_VISION_BASE_URL."
}
$u = $BaseUrl.Trim().TrimEnd("/")
if ($u -notmatch "^https://") {
  Write-Error "BaseUrl must be https://... (Fly/Railway/Cloud Run all use TLS)."
}

# Wrangler 4+: use stdin + explicit `--env ""` for top-level worker (see scripts/wrangler-secret-put-from-env.mjs).
Write-Host "Setting ROOF_VISION_SERVICE_URL on Worker..."
$env:ROOF_VISION_SERVICE_URL = $u
node (Join-Path $backendRoot "scripts\wrangler-secret-put-from-env.mjs") ROOF_VISION_SERVICE_URL ROOF_VISION_SERVICE_URL

if ($SharedSecret -and $SharedSecret.Trim()) {
  Write-Host "Setting ROOF_VISION_SERVICE_SECRET on Worker..."
  $env:ROOF_VISION_SERVICE_SECRET = $SharedSecret.Trim()
  node (Join-Path $backendRoot "scripts\wrangler-secret-put-from-env.mjs") ROOF_VISION_SERVICE_SECRET ROOF_VISION_SERVICE_SECRET
} else {
  Write-Warning "Skipped ROOF_VISION_SERVICE_SECRET (optional). Set -SharedSecret to require X-HD2D-Secret on the vision service."
}

Write-Host "Done. Redeploy Worker if needed: npm run deploy"
