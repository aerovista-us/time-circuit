#!/usr/bin/env bash
set -euo pipefail

# Linux-first bootstrap for the audio analysis toolkit.
# Creates a local virtual environment and installs Python deps.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but was not found."
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg was not found in PATH. Install it first (example: sudo apt install ffmpeg)."
  exit 1
fi

if ! command -v ffprobe >/dev/null 2>&1; then
  echo "ffprobe was not found in PATH. Install it first (usually bundled with ffmpeg)."
  exit 1
fi

VENV_DIR=".venv-audio"
python3 -m venv "$VENV_DIR"

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip
python -m pip install -r tools/requirements-audio-tools.txt

echo ""
echo "Setup complete."
echo "Activate with: source $VENV_DIR/bin/activate"
echo "Run analyzer: python tools/audio_analysis_suite.py \"<audio-file>\""
