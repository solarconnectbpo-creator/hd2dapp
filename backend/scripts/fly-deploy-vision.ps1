# Deploy ml-vision-service to Fly.io (Dockerfile.sam — SAM checkpoint baked in image).
# Checklist: roofing-estimator-vite/docs/PHASE0_GREEN_PATH.md (deploy vision → Worker secrets → Worker deploy).
# Prerequisites: iwr https://fly.io/install.ps1 -useb | iex  then  fly auth login
#
# Usage (from backend/):
#   npm run deploy:vision:fly
# Optional: set SERVICE_SECRET on Fly first (recommended):
#   $env:Path = "$env:USERPROFILE\.fly\bin;$env:Path"
#   cd ml-vision-service
#   flyctl secrets set SERVICE_SECRET="<long-random-string>"

$ErrorActionPreference = "Stop"
$flyBin = Join-Path $env:USERPROFILE ".fly\bin"
if (Test-Path $flyBin) {
  $env:Path = "$flyBin;$env:Path"
}

$backendRoot = Split-Path -Parent $PSScriptRoot
$visionDir = Join-Path $backendRoot "ml-vision-service"
if (-not (Test-Path (Join-Path $visionDir "fly.toml"))) {
  Write-Error "Expected ml-vision-service/fly.toml under $backendRoot"
}

$flyExe = $null
foreach ($name in @("fly", "flyctl")) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if ($c) { $flyExe = $c.Source; break }
}
if (-not $flyExe) {
  Write-Error "fly / flyctl not found. Install: iwr https://fly.io/install.ps1 -useb | iex (then restart the terminal or add $flyBin to PATH)"
}

# Avoid PowerShell treating fly's stderr (e.g. metrics token warnings) as terminating errors under $ErrorActionPreference Stop.
$p = Start-Process -FilePath $flyExe -ArgumentList @("auth", "whoami") -NoNewWindow -Wait -PassThru
if ($p.ExitCode -ne 0) {
  Write-Error "Not logged in to Fly.io. Run: fly auth login"
}

Set-Location $visionDir

if ($env:FLY_SERVICE_SECRET -and $env:FLY_SERVICE_SECRET.Trim()) {
  Write-Host "Setting Fly secret SERVICE_SECRET (from env FLY_SERVICE_SECRET)..." -ForegroundColor Cyan
  & $flyExe secrets set ("SERVICE_SECRET=" + $env:FLY_SERVICE_SECRET.Trim())
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Deploying from $visionDir (Dockerfile.sam, SAM checkpoint in image)..." -ForegroundColor Cyan
& $flyExe deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$app = "hd2d-roof-vision"
try {
  $cfg = Get-Content (Join-Path $visionDir "fly.toml") -Raw
  if ($cfg -match 'app\s*=\s*"([^"]+)"') { $app = $Matches[1] }
} catch { }

$base = "https://$app.fly.dev"
Write-Host ""
Write-Host "If health is OK: curl $base/health" -ForegroundColor Green

$autoWorker = $env:FLY_AUTO_WORKER_SECRETS -and ($env:FLY_AUTO_WORKER_SECRETS.Trim() -match '^(1|true|yes)$')
if ($autoWorker) {
  Write-Host "FLY_AUTO_WORKER_SECRETS: setting Cloudflare Worker ROOF_VISION_SERVICE_URL (and secret if FLY_SERVICE_SECRET is set)..." -ForegroundColor Cyan
  Set-Location $backendRoot
  $setScript = Join-Path $PSScriptRoot "set-roof-vision-worker-secrets.ps1"
  if ($env:FLY_SERVICE_SECRET -and $env:FLY_SERVICE_SECRET.Trim()) {
    & $setScript -BaseUrl $base -SharedSecret $env:FLY_SERVICE_SECRET.Trim()
  } else {
    & $setScript -BaseUrl $base
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Done. Deploy Worker if needed: npm run deploy" -ForegroundColor Green
} else {
  Write-Host "Set Worker secrets (from backend/), matching Fly SERVICE_SECRET if you use one:" -ForegroundColor Green
  if ($env:FLY_SERVICE_SECRET -and $env:FLY_SERVICE_SECRET.Trim()) {
    $s = $env:FLY_SERVICE_SECRET.Trim()
    Write-Host "  npm run worker:set-roof-vision -- -BaseUrl `"$base`" -SharedSecret `"$s`"" -ForegroundColor White
  } else {
    Write-Host "  npm run worker:set-roof-vision -- -BaseUrl `"$base`" -SharedSecret `"<same-as-SERVICE_SECRET>`"" -ForegroundColor White
  }
  Write-Host "Or re-run this deploy with: `$env:FLY_AUTO_WORKER_SECRETS='1'` (and optional FLY_SERVICE_SECRET) to set secrets automatically." -ForegroundColor DarkGray
}
