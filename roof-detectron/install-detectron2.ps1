# Install PyTorch + project deps + Detectron2 on Windows.
# Prerequisites:
#   - Python 3.10–3.12 strongly recommended (3.14 may not be supported by all wheels).
#   - Microsoft C++ Build Tools with MSVC + Windows SDK (required to compile detectron2._C):
#     https://visualstudio.microsoft.com/visual-cpp-build-tools/
#   - Use "x64 Native Tools Command Prompt" or ensure cl.exe is on PATH after installing Build Tools.
#   - If `python` is missing, use `py -3` (Python Launcher).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Invoke-Pip {
  param([Parameter(Mandatory)][string[]]$PipArgs)
  & py -3 -m pip @PipArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "==> Upgrading pip"
Invoke-Pip -PipArgs @('install', '--upgrade', 'pip')

Write-Host "==> Installing PyTorch (CPU default; edit for CUDA index-url if needed)"
Invoke-Pip -PipArgs @('install', 'torch', 'torchvision', 'torchaudio')

Write-Host "==> Installing requirements.txt"
Invoke-Pip -PipArgs @('install', '-r', 'requirements.txt')

Write-Host "==> Building Detectron2 from source (needs MSVC; torch must be visible)"
Invoke-Pip -PipArgs @('install', 'git+https://github.com/facebookresearch/detectron2.git', '--no-build-isolation')

Write-Host "==> Verifying"
py -3 -c "import detectron2; import torch; print('detectron2 OK, torch', torch.__version__)"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done."
