param(
    [string]$VenvName = ".venv-audio"
)

$ErrorActionPreference = "Stop"

# Windows bootstrap for the audio analysis toolkit.
# Creates a local virtual environment and installs Python deps.

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "python is required but was not found in PATH."
}

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw "ffmpeg was not found in PATH. Install ffmpeg first."
}

if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) {
    throw "ffprobe was not found in PATH. Install ffmpeg/ffprobe first."
}

python -m venv $VenvName

$ActivatePath = Join-Path $ProjectRoot "$VenvName\Scripts\Activate.ps1"
. $ActivatePath

python -m pip install --upgrade pip
python -m pip install -r "tools/requirements-audio-tools.txt"

Write-Host ""
Write-Host "Setup complete."
Write-Host "Activate with: .\$VenvName\Scripts\Activate.ps1"
Write-Host "Run analyzer: python tools/audio_analysis_suite.py `"<audio-file>`""
