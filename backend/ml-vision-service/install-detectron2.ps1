# Optional: add PyTorch + Detectron2 to this service's venv for VISION_PROVIDER=detectron2.
# Run from backend/ml-vision-service after creating .venv (see README).
# Prerequisites: same as roof-detectron/install-detectron2.ps1 (MSVC Build Tools, Python 3.10–3.12).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
  Write-Error "Create .venv first: py -3 -m venv .venv"
  exit 1
}

function Invoke-VenvPip {
  param([Parameter(Mandatory)][string[]]$PipArgs)
  & $venvPy -m pip @PipArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Invoke-VenvPip -PipArgs @('install', '--upgrade', 'pip')
Invoke-VenvPip -PipArgs @('install', 'torch', 'torchvision', 'torchaudio')
Invoke-VenvPip -PipArgs @('install', '-r', 'requirements.txt')
Invoke-VenvPip -PipArgs @('install', 'git+https://github.com/facebookresearch/detectron2.git', '--no-build-isolation')

& $venvPy -c "import detectron2; print('detectron2 OK')"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Set VISION_PROVIDER=detectron2 and DETECTRON2_WEIGHTS_PATH in .env"
