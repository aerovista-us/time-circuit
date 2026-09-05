import argparse
import json
import os
import re
import subprocess
import tempfile
import time
from collections import Counter

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import gaussian_filter1d
from scipy.signal import butter, find_peaks, sosfilt, stft


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
ANALYSIS_PROFILES = {
    "fast": {
        "target_sr": 32000,
        "stft_nperseg": 2048,
        "stft_hop": 512,
        "bass_frame_len": 768,
        "bass_hop": 384,
        "section_sigma": 2,
    },
    "balanced": {
        "target_sr": 44100,
        "stft_nperseg": 4096,
        "stft_hop": 512,
        "bass_frame_len": 1024,
        "bass_hop": 256,
        "section_sigma": 3,
    },
    "deep": {
        "target_sr": 48000,
        "stft_nperseg": 4096,
        "stft_hop": 256,
        "bass_frame_len": 1024,
        "bass_hop": 128,
        "section_sigma": 3,
    },
}


def _profile_or_default(name):
    return ANALYSIS_PROFILES.get(name, ANALYSIS_PROFILES["balanced"])


def _run(cmd):
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return p.returncode, p.stdout, p.stderr


def ffprobe_meta(path):
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration,bit_rate:stream=codec_name,sample_rate,channels",
        "-of",
        "json",
        path,
    ]
    rc, out, err = _run(cmd)
    if rc != 0:
        return {"error": err.strip() or "ffprobe failed"}
    try:
        return json.loads(out)
    except Exception:
        return {"error": "ffprobe parse failure"}


def ffmpeg_loudness(path):
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-filter_complex", "ebur128=framelog=verbose", "-f", "null", "-"]
    rc, _, err = _run(cmd)
    if rc != 0 and not err:
        return {"error": "ffmpeg ebur128 failed"}

    out = {}
    for line in err.splitlines():
        line = line.strip()
        m = re.match(r"^I:\s+(-?\d+(\.\d+)?)\s+LUFS$", line)
        if m:
            out["lufs_integrated"] = float(m.group(1))
        m = re.match(r"^LRA:\s+(-?\d+(\.\d+)?)\s+LU$", line)
        if m:
            out["loudness_range_lu"] = float(m.group(1))
        m = re.match(r"^Peak:\s+(-?\d+(\.\d+)?)\s+dBFS$", line)
        if m:
            out["peak_dbfs"] = float(m.group(1))
        m = re.match(r"^True peak:\s+(-?\d+(\.\d+)?)\s+dBTP$", line)
        if m:
            out["true_peak_dbtp"] = float(m.group(1))
    return out if out else {"error": "could not parse loudness output"}


def decode_wav(path, target_sr=44100):
    fd, tmp = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", path, "-vn", "-acodec", "pcm_s16le", "-ar", str(target_sr), tmp]
    rc, _, err = _run(cmd)
    if rc != 0:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise RuntimeError(err.strip() or "ffmpeg decode failed")
    return tmp


def transcribe_lyrics_with_whisper(path, model_name="base", language=None, task="transcribe"):
    try:
        import whisper
    except Exception as e:
        return {
            "status": "unavailable",
            "error": f"Whisper is unavailable: {e}",
            "model": model_name,
            "task": task,
        }

    try:
        model = whisper.load_model(model_name)
        result = model.transcribe(path, language=language, task=task, fp16=False)
        segments = []
        for seg in result.get("segments", []):
            segments.append(
                {
                    "start": round(float(seg.get("start", 0.0)), 2),
                    "end": round(float(seg.get("end", 0.0)), 2),
                    "text": (seg.get("text") or "").strip(),
                }
            )
        return {
            "status": "ok",
            "model": model_name,
            "task": task,
            "language": result.get("language") or language,
            "text": (result.get("text") or "").strip(),
            "segments": segments,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "model": model_name,
            "task": task,
            "language": language,
        }


def trim_silence_edges(mono, left, right, sr):
    if len(mono) < 8:
        return mono, left, right, 0.0, 0.0

    win = max(256, int(sr * 0.02))
    hop = max(128, int(win // 2))
    starts = np.arange(0, max(1, len(mono) - win), hop)
    rms = np.array([np.sqrt(np.mean(mono[s : s + win] ** 2)) for s in starts], dtype=np.float64)
    if len(rms) == 0:
        return mono, left, right, 0.0, 0.0

    peak = float(np.max(rms))
    if peak <= 0:
        return mono, left, right, 0.0, 0.0

    thr = max(peak * 0.05, 1e-4)
    active = np.where(rms >= thr)[0]
    if len(active) == 0:
        return mono, left, right, 0.0, 0.0

    s_idx = int(max(0, starts[int(active[0])] - win))
    e_idx = int(min(len(mono), starts[int(active[-1])] + 2 * win))
    if e_idx <= s_idx:
        return mono, left, right, 0.0, 0.0

    start_sec = s_idx / sr
    end_trim_sec = max(0.0, (len(mono) - e_idx) / sr)
    return mono[s_idx:e_idx], left[s_idx:e_idx], right[s_idx:e_idx], float(start_sec), float(end_trim_sec)


def midi_to_note(midi):
    n = int(np.round(midi))
    octave = (n // 12) - 1
    return f"{NOTE_NAMES[n % 12]}{octave}"


def hz_to_midi(hz):
    return 69.0 + 12.0 * np.log2(np.maximum(hz, 1e-6) / 440.0)


def _normalize_tempo_range(bpm, bpm_lo=70.0, bpm_hi=180.0):
    if bpm is None or not np.isfinite(bpm):
        return None
    v = float(bpm)
    while v < bpm_lo:
        v *= 2.0
    while v > bpm_hi:
        v /= 2.0
    return v


def estimate_tempo_from_ioi(onset_times, bpm_lo=70.0, bpm_hi=180.0):
    if len(onset_times) < 2:
        return {"bpm": None, "confidence": 0.0, "method": "ioi"}

    ioi = np.diff(onset_times)
    ioi = ioi[(ioi >= 0.06) & (ioi <= 2.0)]
    if len(ioi) < 4:
        return {"bpm": None, "confidence": 0.0, "method": "ioi"}

    cand = np.arange(bpm_lo, bpm_hi + 0.5, 0.5)
    scores = []
    for bpm in cand:
        beat = 60.0 / bpm
        s = np.sum(np.exp(-((ioi - beat) ** 2) / (2 * 0.025**2)))
        s += 0.55 * np.sum(np.exp(-((ioi - 2 * beat) ** 2) / (2 * 0.045**2)))
        s += 0.35 * np.sum(np.exp(-((ioi - 0.5 * beat) ** 2) / (2 * 0.018**2)))
        scores.append(s)
    scores = np.array(scores, dtype=np.float64)
    best_idx = int(np.argmax(scores))
    best = float(scores[best_idx])
    if best <= 0:
        return {"bpm": None, "confidence": 0.0, "method": "ioi"}

    second = float(np.partition(scores, -2)[-2]) if len(scores) > 1 else 0.0
    confidence = max(0.0, min(1.0, (best - second) / (best + 1e-12)))
    return {
        "bpm": float(cand[best_idx]),
        "confidence": float(confidence),
        "method": "ioi",
    }


def estimate_tempo_from_autocorr(onset_env, fps, bpm_lo=70.0, bpm_hi=180.0):
    if onset_env is None or len(onset_env) < 8 or fps <= 0:
        return {"bpm": None, "confidence": 0.0, "method": "autocorr"}

    env = np.asarray(onset_env, dtype=np.float64)
    env = env - np.mean(env)
    env[env < 0] = 0.0
    if np.max(env) <= 0:
        return {"bpm": None, "confidence": 0.0, "method": "autocorr"}

    ac = np.correlate(env, env, mode="full")[len(env) - 1 :]
    lag_lo = max(1, int(round((60.0 / bpm_hi) * fps)))
    lag_hi = min(len(ac) - 1, int(round((60.0 / bpm_lo) * fps)))
    if lag_hi <= lag_lo:
        return {"bpm": None, "confidence": 0.0, "method": "autocorr"}

    window = ac[lag_lo : lag_hi + 1]
    peaks, _ = find_peaks(window, distance=max(1, int(fps * 0.08)))
    if len(peaks):
        # strongest local peak in the valid lag window
        p_idx = int(peaks[np.argmax(window[peaks])])
    else:
        p_idx = int(np.argmax(window))

    lag = lag_lo + p_idx
    bpm = 60.0 * fps / lag
    peak_val = float(window[p_idx])
    median_val = float(np.median(window))
    confidence = max(0.0, min(1.0, (peak_val - median_val) / (abs(peak_val) + 1e-12)))

    return {
        "bpm": float(_normalize_tempo_range(bpm, bpm_lo=bpm_lo, bpm_hi=bpm_hi)),
        "confidence": float(confidence),
        "method": "autocorr",
    }


def select_tempo(ioi_result, ac_result, bpm_lo=70.0, bpm_hi=180.0):
    cand = []
    if ioi_result.get("bpm") is not None:
        cand.append(ioi_result)
    if ac_result.get("bpm") is not None:
        cand.append(ac_result)

    if not cand:
        return {
            "bpm": None,
            "confidence": 0.0,
            "selected_method": "none",
            "ioi_bpm": None,
            "autocorr_bpm": None,
            "boundary_hit": False,
        }

    scored = []
    for c in cand:
        bpm_norm = _normalize_tempo_range(c["bpm"], bpm_lo=bpm_lo, bpm_hi=bpm_hi)
        boundary_hit = abs(bpm_norm - bpm_hi) <= 0.5 or abs(bpm_norm - bpm_lo) <= 0.5
        score = float(c["confidence"])
        if boundary_hit:
            score -= 0.20
        if c["method"] == "autocorr":
            score += 0.03
        scored.append((score, bpm_norm, boundary_hit, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    _, bpm, boundary_hit, best = scored[0]

    return {
        "bpm": float(bpm),
        "confidence": float(best["confidence"]),
        "selected_method": best["method"],
        "ioi_bpm": ioi_result.get("bpm"),
        "autocorr_bpm": ac_result.get("bpm"),
        "boundary_hit": bool(boundary_hit),
    }


def tempo_key_pass(mono, sr, profile_cfg):
    stft_n = int(profile_cfg["stft_nperseg"])
    stft_hop = int(profile_cfg["stft_hop"])
    f, _, Z = stft(mono, fs=sr, nperseg=stft_n, noverlap=stft_n - stft_hop, boundary=None)
    S = np.abs(Z)

    # Tempo branch
    sos = butter(4, [35 / (sr / 2), 180 / (sr / 2)], btype="bandpass", output="sos")
    bass_sig = sosfilt(sos, mono)
    frame_len = int(profile_cfg["bass_frame_len"])
    hop = int(profile_cfg["bass_hop"])
    starts = np.arange(0, max(1, len(bass_sig) - frame_len), hop)
    env = np.array([np.sqrt(np.mean(bass_sig[s : s + frame_len] ** 2)) for s in starts], dtype=np.float64)
    env_s = gaussian_filter1d(env, sigma=2)
    d = np.diff(env_s, prepend=env_s[0])
    d[d < 0] = 0
    pthr = np.percentile(d, 76) if len(d) else 0.0
    peaks, _ = find_peaks(d, height=pthr, distance=max(1, int((0.08 * sr) / hop)))
    onset_times = (peaks * hop) / sr
    ioi_tempo = estimate_tempo_from_ioi(onset_times, bpm_lo=70.0, bpm_hi=180.0)

    spectral_flux = np.sum(np.maximum(np.diff(S, axis=1), 0.0), axis=0)
    spectral_flux = gaussian_filter1d(spectral_flux, sigma=2)
    flux_fps = sr / float(stft_hop)
    ac_tempo = estimate_tempo_from_autocorr(spectral_flux, fps=flux_fps, bpm_lo=70.0, bpm_hi=180.0)
    tempo_info = select_tempo(ioi_tempo, ac_tempo, bpm_lo=70.0, bpm_hi=180.0)

    return tempo_info, key_from_chroma(f, S), f, S, onset_times


def key_from_chroma(freqs, mag):
    chroma = np.zeros(12, dtype=np.float64)
    # mag shape: [freq_bin, frame]
    mean_mag = np.mean(mag, axis=1)
    for i, f in enumerate(freqs):
        if f < 40 or f > 5000:
            continue
        midi = hz_to_midi(f)
        pc = int(np.round(midi)) % 12
        chroma[pc] += float(mean_mag[i])

    if np.sum(chroma) <= 0:
        return {"key": None, "confidence": 0.0, "chroma_profile": []}

    chroma_norm = chroma / (np.sum(chroma) + 1e-12)
    major_template = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], dtype=np.float64)
    minor_template = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17], dtype=np.float64)
    major_template /= np.sum(major_template)
    minor_template /= np.sum(minor_template)

    best = (-1.0, None)
    for shift in range(12):
        maj = np.roll(major_template, shift)
        mino = np.roll(minor_template, shift)
        maj_score = float(np.dot(chroma_norm, maj))
        min_score = float(np.dot(chroma_norm, mino))
        if maj_score > best[0]:
            best = (maj_score, f"{NOTE_NAMES[shift]} major")
        if min_score > best[0]:
            best = (min_score, f"{NOTE_NAMES[shift]} minor")

    return {
        "key": best[1],
        "confidence": round(best[0], 4),
        "chroma_profile": [[NOTE_NAMES[i], round(float(chroma_norm[i]), 4)] for i in range(12)],
    }


def analyze(
    path,
    whisper_enabled=False,
    whisper_model="base",
    whisper_language=None,
    whisper_task="transcribe",
    analysis_profile="balanced",
):
    started = time.perf_counter()
    requested_profile = analysis_profile
    base_profile_name = "fast" if analysis_profile == "hybrid" else analysis_profile
    profile = _profile_or_default(base_profile_name)
    meta = ffprobe_meta(path)
    loud = ffmpeg_loudness(path)
    wav_path = decode_wav(path, target_sr=profile["target_sr"])

    try:
        sr, y = wavfile.read(wav_path)
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)

    if y.ndim == 1:
        y = y.astype(np.float32)
        left = y
        right = y
    else:
        y = y.astype(np.float32)
        left = y[:, 0]
        right = y[:, 1] if y.shape[1] > 1 else y[:, 0]

    max_abs = max(np.max(np.abs(left)), np.max(np.abs(right)), 1.0)
    left = left / max_abs
    right = right / max_abs
    mono = 0.5 * (left + right)
    duration_raw = len(mono) / sr
    mono, left, right, trim_start_sec, trim_end_sec = trim_silence_edges(mono, left, right, sr)
    duration = len(mono) / sr

    peak = float(np.max(np.abs(mono)))
    rms = float(np.sqrt(np.mean(mono**2)))
    crest = float(peak / (rms + 1e-12))

    stft_n = int(profile["stft_nperseg"])
    stft_hop = int(profile["stft_hop"])
    f, t, Z = stft(mono, fs=sr, nperseg=stft_n, noverlap=stft_n - stft_hop, boundary=None)
    S = np.abs(Z)

    def band_ratio(lo, hi):
        idx = np.where((f >= lo) & (f < hi))[0]
        if len(idx) == 0:
            return 0.0
        band = np.mean(np.sum(S[idx, :] ** 2, axis=0))
        full = np.mean(np.sum(S**2, axis=0)) + 1e-12
        return float(band / full)

    bands = {
        "sub_20_60_ratio": round(band_ratio(20, 60), 6),
        "bass_60_120_ratio": round(band_ratio(60, 120), 6),
        "lowmid_120_250_ratio": round(band_ratio(120, 250), 6),
        "presence_2k_5k_ratio": round(band_ratio(2000, 5000), 6),
    }

    bass_idx = np.where((f >= 35) & (f <= 220))[0]
    Sb = S[bass_idx, :]
    loc = np.argmax(Sb, axis=0)
    bass_freq = f[bass_idx][loc]
    bass_mag = Sb[loc, np.arange(Sb.shape[1])]
    strong = bass_mag >= np.percentile(bass_mag, 60)
    bass_freq_s = bass_freq[strong]
    bass_mag_s = bass_mag[strong]
    bass_notes = [midi_to_note(hz_to_midi(hz)) for hz in bass_freq_s]
    weights = bass_mag_s / (np.sum(bass_mag_s) + 1e-12)
    note_counter = Counter()
    for n, w in zip(bass_notes, weights):
        note_counter[n] += float(w)
    top_notes = [[n, round(w, 4)] for n, w in note_counter.most_common(12)]

    tempo_info, key_est, _, _, onset_times = tempo_key_pass(mono, sr, profile)
    tempo = tempo_info["bpm"]

    ioi = np.diff(onset_times) if len(onset_times) > 1 else np.array([])
    groove = {
        "onset_count": int(len(onset_times)),
        "ioi_mean_sec": round(float(np.mean(ioi)), 3) if len(ioi) else None,
        "ioi_median_sec": round(float(np.median(ioi)), 3) if len(ioi) else None,
        "ioi_std_sec": round(float(np.std(ioi)), 3) if len(ioi) else None,
    }

    # Stereo image metrics.
    side = 0.5 * (left - right)
    mid = 0.5 * (left + right)
    mid_rms = float(np.sqrt(np.mean(mid**2)))
    side_rms = float(np.sqrt(np.mean(side**2)))
    corr = float(np.corrcoef(left, right)[0, 1]) if len(left) > 10 else 1.0
    stereo = {
        "mid_rms": round(mid_rms, 6),
        "side_rms": round(side_rms, 6),
        "side_to_mid_ratio": round(side_rms / (mid_rms + 1e-12), 6),
        "l_r_correlation": round(corr, 6),
    }

    # Section boundaries from novelty curve.
    eng = np.sqrt(np.mean(S**2, axis=0))
    eng = eng / (np.max(eng) + 1e-12)
    centroid = np.sum(S * f[:, None], axis=0) / (np.sum(S, axis=0) + 1e-12)
    centroid = centroid / (np.max(centroid) + 1e-12)
    novelty = np.abs(np.diff(eng, prepend=eng[0])) + 0.7 * np.abs(np.diff(centroid, prepend=centroid[0]))
    novelty_s = gaussian_filter1d(novelty, sigma=profile["section_sigma"])
    min_dist_frames = int((8.0 * sr) / stft_hop)  # ~8s min section spacing
    sec_peaks, _ = find_peaks(novelty_s, height=np.percentile(novelty_s, 82), distance=max(1, min_dist_frames))
    boundaries = sorted(set([0] + sec_peaks.tolist() + [len(t) - 1]))
    sections = []
    for i in range(len(boundaries) - 1):
        a = boundaries[i]
        b = boundaries[i + 1]
        if b <= a:
            continue
        sections.append(
            {
                "start_sec": round(float(t[a]), 2),
                "end_sec": round(float(t[b]), 2),
                "energy_mean": round(float(np.mean(eng[a:b])), 4),
                "centroid_mean": round(float(np.mean(centroid[a:b])), 4),
            }
        )

    hybrid_refinement = {
        "enabled": requested_profile == "hybrid",
        "triggered": False,
        "base_profile": base_profile_name,
        "refine_profile": "deep" if requested_profile == "hybrid" else None,
    }

    if requested_profile == "hybrid":
        pre_tempo = dict(tempo_info)
        pre_key = dict(key_est)
        needs_refine = (
            tempo_info["confidence"] < 0.18
            or tempo_info["boundary_hit"]
            or float(key_est.get("confidence") or 0.0) < 0.09
        )
        if needs_refine:
            hybrid_refinement["triggered"] = True
            hybrid_refinement["reason"] = "low confidence in base fast pass"
            refined_tempo, refined_key, _, _, _ = tempo_key_pass(mono, sr, _profile_or_default("deep"))

            if refined_tempo.get("bpm") is not None:
                tempo_improved = refined_tempo["confidence"] >= (tempo_info["confidence"] + 0.015)
                tempo_recovered = tempo_info.get("bpm") is None
                if tempo_improved or tempo_recovered:
                    tempo_info = refined_tempo

            refined_key_conf = float(refined_key.get("confidence") or 0.0)
            current_key_conf = float(key_est.get("confidence") or 0.0)
            if refined_key_conf >= (current_key_conf + 0.008):
                key_est = refined_key

            hybrid_refinement["base_tempo_confidence"] = round(float(pre_tempo.get("confidence") or 0.0), 4)
            hybrid_refinement["refined_tempo_confidence"] = round(float(tempo_info.get("confidence") or 0.0), 4)
            hybrid_refinement["base_key_confidence"] = round(float(pre_key.get("confidence") or 0.0), 4)
            hybrid_refinement["refined_key_confidence"] = round(float(key_est.get("confidence") or 0.0), 4)
        else:
            hybrid_refinement["reason"] = "base fast pass confidence acceptable"

    tempo = tempo_info["bpm"]
    key_conf = float(key_est.get("confidence") or 0.0)

    remix_notes = []
    if tempo_info["confidence"] < 0.2 or tempo_info["boundary_hit"]:
        remix_notes.append("Tempo estimate has low confidence; verify with manual tap or DAW grid before final arrangement.")
    elif tempo and tempo >= 150:
        remix_notes.append("High-tempo detected: audition both full-time and halftime drum patterns for drop contrast.")

    if bands["sub_20_60_ratio"] < 0.001:
        remix_notes.append("Sub range is very light; add a dedicated mono sub layer around 40-60 Hz.")
    elif bands["sub_20_60_ratio"] < 0.008:
        remix_notes.append("Low sub energy detected; consider gentle sub reinforcement for better club translation.")

    if bands["lowmid_120_250_ratio"] > 0.25:
        remix_notes.append("Low-mid density is high; trim around 160-250 Hz to keep bass layering clear.")
    elif bands["presence_2k_5k_ratio"] > 0.50 and bands["lowmid_120_250_ratio"] < 0.06:
        remix_notes.append("Track is presence-heavy versus low-mid body; add mid-bass texture to avoid a thin drop.")

    if stereo["l_r_correlation"] < 0.2:
        remix_notes.append("Very wide stereo field detected; check mono collapse before mastering.")
    elif stereo["l_r_correlation"] > 0.98 and bands["presence_2k_5k_ratio"] > 0.35:
        remix_notes.append("Mix is highly mono; widen highs and FX returns while keeping bass mono-centered.")

    if crest < 6.0:
        remix_notes.append("Low crest factor suggests heavy compression; preserve transients in the drop for punch.")
    elif crest > 14.0:
        remix_notes.append("High crest factor suggests large dynamic swings; control peaks for louder masters.")

    if key_conf < 0.075:
        remix_notes.append("Key confidence is low; validate key by ear before locking melodic reharmonization.")

    if len(sections) < 3 and duration > 30:
        remix_notes.append("Limited section contrast detected; add clearer intro/build/drop transitions.")
    if not remix_notes:
        remix_notes.append("Current balance is remix-ready; prioritize arrangement contrast and stronger drop transitions.")

    low_end_class = (
        "sub-heavy"
        if bands["sub_20_60_ratio"] >= 0.15
        else "mid-bass heavy"
        if bands["lowmid_120_250_ratio"] >= 0.15
        else "balanced"
    )
    stereo_class = (
        "very-wide"
        if stereo["l_r_correlation"] < 0.3
        else "mostly-mono"
        if stereo["l_r_correlation"] > 0.96
        else "moderate-width"
    )
    tempo_conf = float(tempo_info["confidence"])
    bass_conf = float(min(1.0, len(bass_freq_s) / 1200.0))
    key_conf = float(key_est.get("confidence") or 0.0)
    reliability = max(0.0, min(1.0, 0.45 * tempo_conf + 0.35 * key_conf + 0.20 * bass_conf))
    runtime_sec = time.perf_counter() - started

    report = {
        "input_path": path,
        "duration_sec": round(float(duration_raw), 3),
        "sample_rate": int(sr),
        "analysis_profile": requested_profile if requested_profile in {"fast", "balanced", "deep", "hybrid"} else "balanced",
        "analysis_profile_base": base_profile_name,
        "analysis_runtime_sec": round(float(runtime_sec), 3),
        "trimmed_silence": {
            "start_sec": round(trim_start_sec, 3),
            "end_sec": round(trim_end_sec, 3),
            "effective_duration_sec": round(float(duration), 3),
        },
        "meta": meta,
        "loudness": loud,
        "tempo_bpm_estimate": round(float(tempo), 2) if tempo else None,
        "tempo_half_time_bpm": round(float(tempo / 2), 2) if tempo else None,
        "tempo_analysis": {
            "selected_method": tempo_info["selected_method"],
            "confidence": round(float(tempo_info["confidence"]), 4),
            "ioi_bpm": round(float(tempo_info["ioi_bpm"]), 2) if tempo_info["ioi_bpm"] else None,
            "autocorr_bpm": round(float(tempo_info["autocorr_bpm"]), 2) if tempo_info["autocorr_bpm"] else None,
            "boundary_hit": tempo_info["boundary_hit"],
        },
        "key_estimate": key_est,
        "dynamics": {
            "peak_linear": round(peak, 6),
            "rms_linear": round(rms, 6),
            "crest_factor": round(crest, 4),
        },
        "bands": bands,
        "bass": {
            "dominant_freq_mean_hz": round(float(np.mean(bass_freq_s)), 2) if len(bass_freq_s) else None,
            "dominant_freq_10_90_hz": [
                round(float(np.percentile(bass_freq_s, 10)), 2),
                round(float(np.percentile(bass_freq_s, 90)), 2),
            ]
            if len(bass_freq_s)
            else None,
            "top_notes_weighted": top_notes,
        },
        "groove": groove,
        "stereo_image": stereo,
        "sections": sections,
        "quality": {
            "tempo_confidence": round(tempo_conf, 4),
            "key_confidence": round(key_conf, 4),
            "bass_confidence": round(bass_conf, 4),
            "overall_reliability": round(reliability, 4),
        },
        "summary": {
            "tempo_feel_hint": "halftime-candidate" if (tempo and tempo >= 140) else "standard-time",
            "low_end_character": low_end_class,
            "stereo_character": stereo_class,
            "dynamic_character": "compressed" if crest < 6.5 else "punchy" if crest > 10 else "controlled",
        },
        "adaptive_refinement": hybrid_refinement,
        "remix_recommendations": remix_notes,
    }

    if whisper_enabled:
        report["lyrics_transcription"] = transcribe_lyrics_with_whisper(
            path,
            model_name=whisper_model,
            language=whisper_language,
            task=whisper_task,
        )

    return report


def main():
    parser = argparse.ArgumentParser(description="Advanced audio analysis for remix prep.")
    parser.add_argument("input_path", help="Input audio file path")
    parser.add_argument("--out", help="Output JSON path. Defaults to stdout.")
    parser.add_argument("--with-whisper", action="store_true", help="Run Whisper lyric transcription.")
    parser.add_argument("--whisper-model", default="base", help="Whisper model name (tiny, base, small, medium, large).")
    parser.add_argument("--whisper-language", help="Optional language code (e.g., en).")
    parser.add_argument(
        "--whisper-task",
        default="transcribe",
        choices=["transcribe", "translate"],
        help="Whisper task mode.",
    )
    parser.add_argument(
        "--profile",
        default="balanced",
        choices=["fast", "balanced", "deep", "hybrid"],
        help="Analysis profile to balance speed and detail; hybrid auto-refines tempo/key when confidence is low.",
    )
    args = parser.parse_args()

    report = analyze(
        args.input_path,
        whisper_enabled=args.with_whisper,
        whisper_model=args.whisper_model,
        whisper_language=args.whisper_language,
        whisper_task=args.whisper_task,
        analysis_profile=args.profile,
    )
    text = json.dumps(report, indent=2)

    if args.out:
        out_dir = os.path.dirname(args.out)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        print(f"Wrote analysis to {args.out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
