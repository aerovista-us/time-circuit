# Audio Analysis Toolkit

AeroVista | EchoVerse remix-intelligence toolkit for fast, reliable track diagnostics.

It is designed to answer three production questions quickly:

1. **What is musically happening?** (tempo/key/sections/groove)
2. **How will this translate in a remix?** (low-end, stereo, dynamics)
3. **How trustworthy is this estimate?** (confidence + reliability fields)

## Quick Start

### Linux-first (recommended)

```bash
bash tools/setup_audio_tools_linux.sh
source .venv-audio/bin/activate
python tools/audio_analysis_suite.py "kids-will-love-it.mp3" --out "docs/analysis-kids-will-love-it.json"
```

### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\setup_audio_tools_windows.ps1
.\.venv-audio\Scripts\Activate.ps1
python .\tools\audio_analysis_suite.py "kids-will-love-it.mp3" --out "docs\analysis-kids-will-love-it.json"
```

### Docker Compose

```bash
docker compose up --build
```

Then open: `http://127.0.0.1:8765`

## Bulk processing + runtime guard

For large batches, use the Web UI queue:

- multi-file drag/drop
- user-defined export location
- per-job timeout (`max_runtime_sec`)
- controls for pause/resume/stop-after-current/kill-current

This gives safer long runs and prevents stalled jobs from blocking the full batch.

## Analysis Profiles (speed vs depth)

- `fast` - quickest turnaround, useful for batch pre-screening
- `balanced` - default and recommended for most remix prep
- `deep` - highest temporal detail, slower on long tracks
- `hybrid` - runs `fast` first, then auto-refines tempo/key with deeper settings only when confidence is low

CLI example:

```bash
python tools/audio_analysis_suite.py "track.mp3" --profile balanced
```

Hybrid example:

```bash
python tools/audio_analysis_suite.py "track.mp3" --profile hybrid
```

## Reliability-First Fields

Use these before trusting any single number:

- `tempo_analysis.confidence`
- `tempo_analysis.boundary_hit`
- `quality.overall_reliability`
- `key_estimate.confidence`
- `trimmed_silence.effective_duration_sec`
- `adaptive_refinement` (shows whether hybrid refinement triggered and if confidence improved)

### Practical interpretation

- Low tempo confidence + boundary hit -> verify BPM manually in DAW grid.
- Low key confidence -> treat key as a hint, not a final decision.
- Very short effective duration -> expect less stable estimates.

## Enriched Output (what changed)

The toolkit now includes:

- `analysis_profile` and `analysis_runtime_sec`
- silence-edge trimming metadata (`trimmed_silence`)
- `tempo_analysis` with method agreement and confidence
- `quality` block (tempo/key/bass confidence + overall reliability)
- `summary` block (low-end/stereo/dynamics character)
- `adaptive_refinement` block for hybrid decision transparency
- data-driven `remix_recommendations` with broader branching

## Whisper (lyrics)

Enable only when needed, because it is the most expensive step:

```bash
python tools/audio_analysis_suite.py "track.mp3" --with-whisper --whisper-model base
```

Tips:

- Start with `--whisper-model base`
- Use `--whisper-task translate` for English translation output
- On Windows, install VC++ Redistributable if PyTorch DLL errors appear (`vc_redist.x64.exe`)

## Web + API

For browser workflow and API usage, see `docs/audio-analysis-web-ui.md`.
