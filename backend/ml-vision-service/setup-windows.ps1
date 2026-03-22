# Creates .venv and installs requirements. Run from this directory after Python 3.11+ is on PATH.
$ErrorActionPreference = "Stop"
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
  Write-Error "Python not found on PATH. Install from python.org (check 'Add to PATH'), disable Store app aliases for python.exe, then restart the terminal."
  exit 1
}
& $py.Source --version
Set-Location $PSScriptRoot
if (-not (Test-Path .venv)) {
  & $py.Source -m venv .venv
}
$pip = Join-Path $PSScriptRoot ".venv\Scripts\pip.exe"
& $pip install -r requirements.txt
Write-Host "Done. Activate: .\.venv\Scripts\Activate.ps1  then: uvicorn app.main:app --reload --port 8090"
