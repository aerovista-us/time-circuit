# Audio Analysis Web UI

Browser-first interface for the AeroVista | EchoVerse analysis pipeline.

It is intended for collaborators who should not need CLI knowledge.

## Batch workflow (recommended)

1. Drag and drop multiple files into the queue panel.
2. Set:
   - export directory
   - analysis profile
   - per-job `max_runtime_sec`
3. Add files to queue.
4. Use queue controls:
   - `Pause Queue`
   - `Resume Queue`
   - `Stop After Current`
   - `Kill Current`
5. Download completed JSON exports directly from queue rows.

The backend writes queue progress snapshots to:

- `<output_dir>/analysis_queue_state.json`

## Start the web app

Linux/macOS:

```bash
source .venv-audio/bin/activate
python tools/audio_analysis_web.py
```

Windows PowerShell:

```powershell
.\.venv-audio\Scripts\Activate.ps1
python .\tools\audio_analysis_web.py
```

Open:

- `http://127.0.0.1:8765`

## Docker Compose (Linux first)

From project root:

```bash
docker compose up --build
```

Then open:

- `http://127.0.0.1:8765`

Stop:

```bash
docker compose down
```

## Docker Compose on Windows

Use Docker Desktop and run from PowerShell in project root:

```powershell
docker compose up --build
```

The same compose file is used for both Linux and Windows hosts.

## Docker files

- `docker-compose.yml`
- `Dockerfile.audio-analyzer-ui`
- `.dockerignore`

## Optional environment controls

- `AUDIO_UI_HOST` (default `127.0.0.1`)
- `AUDIO_UI_PORT` (default `8765`)
- `AUDIO_UI_DEBUG` (`true` or `false`, default `false`)

Example:

```bash
AUDIO_UI_PORT=8780 python tools/audio_analysis_web.py
```

## Features

- Multi-file drag and drop queue
- Auto export JSON per completed job to user-defined directory
- Queue controls: pause/resume/stop-after-current/kill-current
- Per-job runtime guard (`max_runtime_sec`) to kill hung jobs
- Choose analysis profile (`fast`, `balanced`, `deep`, `hybrid`)
- Optional Whisper transcription/translation controls
- Quick KPI cards for tempo/key/sub/loudness/stereo/dynamics
- Tempo reliability data in raw JSON (`tempo_analysis`)
- Remix recommendations panel
- Raw JSON output pane with copy button
- Direct links to project docs and sample reports

## API endpoint

### Queue enqueue

`POST /api/queue/enqueue` with multipart fields:

- `audio_files` (one or many files)
- `output_dir` (path where JSON exports should be written)
  - relative paths are resolved from project root
  - absolute paths are recommended for clarity
- `max_runtime_sec` (numeric seconds, `0` disables timeout)
- `with_whisper` (`true` / `false`)
- `profile` (`fast` / `balanced` / `deep` / `hybrid`)
- `whisper_model` (`tiny`, `base`, `small`, `medium`, `large`)
- `whisper_task` (`transcribe` / `translate`)
- `whisper_language` (optional code, e.g. `en`)

### Queue status + control

- `GET /api/queue/status`
- `POST /api/queue/control` with JSON action:
  - `pause`
  - `resume`
  - `stop_after_current`
  - `kill_current`
  - `clear_completed`

### Download export for a completed job

- `GET /api/queue/exported/<job_id>`
- `GET /api/queue/result/<job_id>` (returns parsed JSON for in-app preview)

### Single-file direct analysis (legacy/simple)

`POST /api/analyze` with multipart form fields:

- `audio_file` (required file upload)
- `with_whisper` (`true` / `false`)
- `profile` (`fast` / `balanced` / `deep` / `hybrid`)
- `max_runtime_sec` (numeric seconds, `0` disables timeout)
- `whisper_model` (`tiny`, `base`, `small`, `medium`, `large`)
- `whisper_task` (`transcribe` / `translate`)
- `whisper_language` (optional code, e.g. `en`)
