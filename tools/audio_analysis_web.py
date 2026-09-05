import os
import json
import threading
import time
import uuid
import re
import sys
import tempfile
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

ROOT_DIR = TOOLS_DIR.parent
DOCS_DIR = ROOT_DIR / "docs"
TEMPLATES_DIR = TOOLS_DIR / "web_templates"
MAX_UPLOAD_MB = 200
UPLOAD_STAGING_DIR = Path(tempfile.gettempdir()) / "aerovista_echoverse_audio_queue"
ANALYZER_SCRIPT = TOOLS_DIR / "audio_analysis_suite.py"

app = Flask(__name__, template_folder=str(TEMPLATES_DIR))
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

UPLOAD_STAGING_DIR.mkdir(parents=True, exist_ok=True)

def _bool(v):
    return str(v).strip().lower() in {"1", "true", "yes", "on"}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _sanitize_basename(name):
    stem = Path(name).stem or "audio"
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._")
    return safe or "audio"


STATE_LOCK = threading.Lock()
WORKER_THREAD = None
KILL_CURRENT_REQUESTED = False
CURRENT_PROCESS = None
QUEUE_STATE = {
    "paused": False,
    "stop_after_current": False,
    "running_job_id": None,
    "jobs": [],
    "updated_at": _now(),
    "output_dir": str(DOCS_DIR),
}


def _state_snapshot(include_internal=False):
    with STATE_LOCK:
        snap = json.loads(json.dumps(QUEUE_STATE))
    if include_internal:
        return snap
    for j in snap.get("jobs", []):
        j.pop("staged_input_path", None)
    return snap


def _persist_state():
    snapshot = _state_snapshot()
    output_dir = Path(snapshot.get("output_dir") or DOCS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    state_path = output_dir / "analysis_queue_state.json"
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)


def _start_worker_if_needed():
    global WORKER_THREAD
    with STATE_LOCK:
        alive = WORKER_THREAD is not None and WORKER_THREAD.is_alive()
    if alive:
        return
    WORKER_THREAD = threading.Thread(target=_worker_loop, daemon=True)
    WORKER_THREAD.start()


def _run_analysis_subprocess(input_path, options, output_path, max_runtime_sec):
    cmd = [
        sys.executable,
        str(ANALYZER_SCRIPT),
        str(input_path),
        "--profile",
        options.get("profile", "balanced"),
        "--out",
        str(output_path),
    ]
    if options.get("with_whisper"):
        cmd.extend(
            [
                "--with-whisper",
                "--whisper-model",
                options.get("whisper_model", "base"),
                "--whisper-task",
                options.get("whisper_task", "transcribe"),
            ]
        )
        if options.get("whisper_language"):
            cmd.extend(["--whisper-language", options["whisper_language"]])

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    started = time.time()
    timed_out = False
    killed = False
    global CURRENT_PROCESS, KILL_CURRENT_REQUESTED
    CURRENT_PROCESS = proc

    while True:
        rc = proc.poll()
        if rc is not None:
            break

        if max_runtime_sec and (time.time() - started) > max_runtime_sec:
            timed_out = True
            proc.kill()
            break

        if KILL_CURRENT_REQUESTED:
            killed = True
            proc.kill()
            break

        time.sleep(0.25)

    stdout, stderr = proc.communicate()
    CURRENT_PROCESS = None
    return {
        "returncode": proc.returncode,
        "stdout": stdout,
        "stderr": stderr,
        "timed_out": timed_out,
        "killed": killed,
    }


def _worker_loop():
    global KILL_CURRENT_REQUESTED
    while True:
        with STATE_LOCK:
            if QUEUE_STATE["paused"]:
                next_job = None
            else:
                next_job = next((j for j in QUEUE_STATE["jobs"] if j["status"] == "queued"), None)
                if next_job:
                    next_job["status"] = "running"
                    next_job["started_at"] = _now()
                    QUEUE_STATE["running_job_id"] = next_job["id"]
                    QUEUE_STATE["updated_at"] = _now()
                    KILL_CURRENT_REQUESTED = False

        if next_job is None:
            with STATE_LOCK:
                queued_exists = any(j["status"] == "queued" for j in QUEUE_STATE["jobs"])
                should_exit = (not queued_exists) or QUEUE_STATE["stop_after_current"]
            if should_exit:
                with STATE_LOCK:
                    QUEUE_STATE["running_job_id"] = None
                    QUEUE_STATE["updated_at"] = _now()
                _persist_state()
                return
            time.sleep(0.35)
            continue

        _persist_state()
        opts = next_job["options"]
        out_dir = Path(next_job["output_dir"])
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{_sanitize_basename(next_job['filename'])}_{next_job['id'][:8]}_analysis.json"

        try:
            run_info = _run_analysis_subprocess(
                next_job["staged_input_path"],
                opts,
                out_file,
                max_runtime_sec=opts.get("max_runtime_sec", 0),
            )

            if run_info["killed"]:
                status = "killed"
                err = "Manually killed by user."
            elif run_info["timed_out"]:
                status = "timeout"
                err = f"Exceeded max runtime ({opts.get('max_runtime_sec')}s)."
            elif run_info["returncode"] != 0:
                status = "failed"
                err = (run_info["stderr"] or run_info["stdout"] or "Analyzer returned non-zero exit code.").strip()
            else:
                status = "completed"
                err = None
        except Exception as e:
            status = "failed"
            err = str(e)

        preview = {}
        if status == "completed" and out_file.exists():
            try:
                with open(out_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                preview = {
                    "tempo_bpm_estimate": data.get("tempo_bpm_estimate"),
                    "key": (data.get("key_estimate") or {}).get("key"),
                    "reliability": ((data.get("quality") or {}).get("overall_reliability")),
                    "recommendations": (data.get("remix_recommendations") or [])[:2],
                }
            except Exception:
                preview = {}

        with STATE_LOCK:
            next_job["status"] = status
            next_job["error"] = err
            next_job["ended_at"] = _now()
            next_job["export_path"] = str(out_file) if out_file.exists() else None
            next_job["result_preview"] = preview
            QUEUE_STATE["running_job_id"] = None
            QUEUE_STATE["updated_at"] = _now()
            stop_after = QUEUE_STATE["stop_after_current"]

        _persist_state()

        try:
            staged = Path(next_job["staged_input_path"])
            if staged.exists():
                staged.unlink()
        except Exception:
            pass

        if stop_after:
            return


@app.route("/")
def home():
    doc_links = [
        {"name": "Audio Analysis Toolkit", "path": "audio-analysis-toolkit.md"},
        {"name": "Index Upgrade + Playlist", "path": "index-upgrade-and-playlist.md"},
        {"name": "Sample Analysis JSON", "path": "analysis-kids-gonnaLoveit.json"},
        {"name": "Sample Whisper Analysis JSON", "path": "analysis-kids-gonnaLoveit-whisper.json"},
    ]
    return render_template(
        "audio_analysis_ui.html",
        doc_links=doc_links,
        max_upload_mb=MAX_UPLOAD_MB,
        default_output_dir=str(DOCS_DIR),
    )


@app.route("/docs/<path:filename>")
def docs_file(filename):
    return send_from_directory(str(DOCS_DIR), filename)


@app.route("/favicon.png")
def favicon_png():
    return send_from_directory(str(ROOT_DIR / "images"), "logo (3).png")


@app.route("/api/queue/status", methods=["GET"])
def queue_status():
    return jsonify(_state_snapshot())


@app.route("/api/queue/control", methods=["POST"])
def queue_control():
    global KILL_CURRENT_REQUESTED
    payload = request.get_json(silent=True) or {}
    action = (payload.get("action") or "").strip()
    if not action:
        return jsonify({"error": "Missing action"}), 400

    with STATE_LOCK:
        if action == "pause":
            QUEUE_STATE["paused"] = True
        elif action == "resume":
            QUEUE_STATE["paused"] = False
            QUEUE_STATE["stop_after_current"] = False
        elif action == "stop_after_current":
            QUEUE_STATE["stop_after_current"] = True
        elif action == "kill_current":
            KILL_CURRENT_REQUESTED = True
        elif action == "clear_completed":
            QUEUE_STATE["jobs"] = [j for j in QUEUE_STATE["jobs"] if j["status"] not in {"completed", "failed", "killed", "timeout"}]
        else:
            return jsonify({"error": f"Unsupported action: {action}"}), 400
        QUEUE_STATE["updated_at"] = _now()

    _persist_state()
    _start_worker_if_needed()
    return jsonify(_state_snapshot())


@app.route("/api/queue/enqueue", methods=["POST"])
def queue_enqueue():
    files = request.files.getlist("audio_files")
    files = [f for f in files if f and f.filename]
    if not files:
        return jsonify({"error": "No files uploaded. Use form field 'audio_files' (multi-file supported)."}), 400

    profile = request.form.get("profile", "balanced")
    with_whisper = _bool(request.form.get("with_whisper", "false"))
    whisper_model = request.form.get("whisper_model", "base")
    whisper_language = request.form.get("whisper_language") or None
    whisper_task = request.form.get("whisper_task", "transcribe")
    output_dir = request.form.get("output_dir") or str(DOCS_DIR)
    max_runtime_sec = request.form.get("max_runtime_sec", "").strip()
    try:
        max_runtime_sec = float(max_runtime_sec) if max_runtime_sec else 0.0
    except ValueError:
        return jsonify({"error": "max_runtime_sec must be numeric."}), 400
    max_runtime_sec = max(0.0, min(max_runtime_sec, 7200.0))

    out_path = Path(output_dir).expanduser()
    if not out_path.is_absolute():
        out_path = (ROOT_DIR / out_path).resolve()
    out_path.mkdir(parents=True, exist_ok=True)

    added = []
    with STATE_LOCK:
        QUEUE_STATE["output_dir"] = str(out_path)
        QUEUE_STATE["updated_at"] = _now()
        for f in files:
            jid = uuid.uuid4().hex
            suffix = Path(f.filename).suffix or ".bin"
            staged = UPLOAD_STAGING_DIR / f"{jid}{suffix}"
            f.save(staged)
            job = {
                "id": jid,
                "filename": f.filename,
                "status": "queued",
                "created_at": _now(),
                "started_at": None,
                "ended_at": None,
                "error": None,
                "export_path": None,
                "staged_input_path": str(staged),
                "output_dir": str(out_path),
                "result_preview": {},
                "options": {
                    "profile": profile,
                    "with_whisper": with_whisper,
                    "whisper_model": whisper_model,
                    "whisper_language": whisper_language,
                    "whisper_task": whisper_task,
                    "max_runtime_sec": max_runtime_sec,
                },
            }
            QUEUE_STATE["jobs"].append(job)
            added.append({"id": jid, "filename": f.filename})

    _persist_state()
    _start_worker_if_needed()
    return jsonify({"added": added, "queue": _state_snapshot()})


@app.route("/api/queue/exported/<job_id>", methods=["GET"])
def queue_exported(job_id):
    snapshot = _state_snapshot()
    match = next((j for j in snapshot["jobs"] if j["id"] == job_id), None)
    if not match:
        return jsonify({"error": "Job not found"}), 404
    export_path = match.get("export_path")
    if not export_path:
        return jsonify({"error": "No export available for this job"}), 404
    p = Path(export_path)
    if not p.exists():
        return jsonify({"error": "Export file not found on disk"}), 404
    return send_from_directory(str(p.parent), p.name, as_attachment=True)


@app.route("/api/queue/result/<job_id>", methods=["GET"])
def queue_result(job_id):
    snapshot = _state_snapshot()
    match = next((j for j in snapshot["jobs"] if j["id"] == job_id), None)
    if not match:
        return jsonify({"error": "Job not found"}), 404
    export_path = match.get("export_path")
    if not export_path:
        return jsonify({"error": "No result available for this job"}), 404
    p = Path(export_path)
    if not p.exists():
        return jsonify({"error": "Export file not found on disk"}), 404
    with open(p, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    if "audio_file" not in request.files:
        return jsonify({"error": "No file uploaded. Use form field 'audio_file'."}), 400

    f = request.files["audio_file"]
    if not f or not f.filename:
        return jsonify({"error": "Uploaded file is empty."}), 400

    suffix = Path(f.filename).suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = Path(tmp.name)
        f.save(temp_path)

    out_file = UPLOAD_STAGING_DIR / f"{uuid.uuid4().hex}_single_analysis.json"
    try:
        with_whisper = _bool(request.form.get("with_whisper", "false"))
        whisper_model = request.form.get("whisper_model", "base")
        whisper_language = request.form.get("whisper_language") or None
        whisper_task = request.form.get("whisper_task", "transcribe")
        profile = request.form.get("profile", "balanced")
        max_runtime_sec = request.form.get("max_runtime_sec", "").strip()
        max_runtime_sec = float(max_runtime_sec) if max_runtime_sec else 0.0

        run_info = _run_analysis_subprocess(
            str(temp_path),
            {
                "with_whisper": with_whisper,
                "whisper_model": whisper_model,
                "whisper_language": whisper_language,
                "whisper_task": whisper_task,
                "profile": profile,
            },
            out_file,
            max_runtime_sec=max_runtime_sec,
        )
        if run_info["timed_out"]:
            return jsonify({"error": f"Analysis timed out after {max_runtime_sec}s"}), 408
        if run_info["killed"]:
            return jsonify({"error": "Analysis was manually killed."}), 409
        if run_info["returncode"] != 0:
            return jsonify({"error": (run_info["stderr"] or run_info["stdout"] or "Analyzer failed").strip()}), 500
        with open(out_file, "r", encoding="utf-8") as rf:
            result = json.load(rf)
        result["input_original_filename"] = f.filename
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if temp_path.exists():
            os.remove(temp_path)
        if out_file.exists():
            out_file.unlink()


if __name__ == "__main__":
    host = os.environ.get("AUDIO_UI_HOST", "127.0.0.1")
    port = int(os.environ.get("AUDIO_UI_PORT", "8765"))
    debug = _bool(os.environ.get("AUDIO_UI_DEBUG", "false"))
    app.run(host=host, port=port, debug=debug)
