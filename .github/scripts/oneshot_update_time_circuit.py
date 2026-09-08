from pathlib import Path
import hashlib
import shutil
import subprocess


def run(*args):
    return subprocess.run(args, check=True, text=True, capture_output=True)


js_path = Path('time-circuit.js')
index_path = Path('index.html')
audio_path = Path('RetroFlux.mp3')

text = js_path.read_text(encoding='utf-8')
archive_start = text.index('  const archiveTracks = [')
archive_end = text.index('\n\n  const $ =', archive_start)
archive_before = hashlib.sha256(text[archive_start:archive_end].encode()).hexdigest()

if "number:'TC-05'" in text:
    raise SystemExit('TC-05 already exists; refusing duplicate update')

marker = '\n  ];\n\n  const archiveTracks = ['
if text.count(marker) != 1:
    raise SystemExit('Numbered/archive boundary not found exactly once')

addition = """,
    {number:'TC-05',title:'Kids Will Love It',subtitle:'Recovered archive // numbered listen circuit',src:'./kids-will-love-it.mp3',art:'./kids.will.love.it.png',bpm:'90.25 halftime',lane:'TC-05',playable:true,description:'The original cinematic quote-slam and halftime SwampHop drop that opened the Time Circuit.'},
    {number:'TC-06',title:'Flux Swamp (1955)',subtitle:'Recovered archive // numbered listen circuit',src:'./FLUX_SWAMP_(1955).mp3',art:'./images/doc.png',bpm:'~90 groove',lane:'TC-06',playable:true,description:'Tape hiss, swamp night, clean guitar, and the older time-travel experiment.'},
    {number:'TC-07',title:'Momento × LowFreq × New Sound',subtitle:'Recovered archive // numbered listen circuit',src:'./momentoxLowFreqxNEW_SOUND.mp3',art:'./images/www.png',bpm:'variable',lane:'TC-07',playable:true,description:'A multi-era mashup moving from nostalgia bounce through swamp-western fracture into the future.'},
    {number:'TC-08',title:'Eighty-Eight Rebel — Alt 1',subtitle:'Recovered alternate // numbered listen circuit',src:'./01 — EIGHTY-EIGHT REBEL (1).mp3',art:'./images/marty.png',bpm:'88 BPM',lane:'TC-08',playable:true,description:'Alternate render of TC-01, mirrored into the Listen sequence.'},
    {number:'TC-09',title:'Eighty-Eight Rebel — Alt 2',subtitle:'Recovered alternate // numbered listen circuit',src:'./01 — EIGHTY-EIGHT REBEL (2).mp3',art:'./images/marty.png',bpm:'88 BPM',lane:'TC-09',playable:true,description:'Second alternate render of TC-01, mirrored into the Listen sequence.'}
  ];

  const archiveTracks = ["""
text = text.replace(marker, addition, 1)

archive_start = text.index('  const archiveTracks = [')
archive_end = text.index('\n\n  const $ =', archive_start)
archive_after = hashlib.sha256(text[archive_start:archive_end].encode()).hexdigest()
print('Archive block SHA256:', archive_before)
if archive_before != archive_after:
    raise SystemExit('Archive data block changed; refusing update')
js_path.write_text(text, encoding='utf-8')

html = index_path.read_text(encoding='utf-8')
old_count = '<span id="trackCount">1 / 4</span>'
old_note = '<div class="playlist-note">All four Future\'s Past numbered masters are loaded at 88 BPM. Archive cuts remain separate from the numbered circuit.</div>'
new_count = '<span id="trackCount">1 / 10</span>'
new_note = '<div class="playlist-note">RetroFlux plus TC-01 through TC-09 are available in Listen. Recovered Archive cuts are mirrored here as TC-05 through TC-09; the Archive page remains unchanged.</div>'
if old_count not in html or old_note not in html:
    raise SystemExit('Expected Listen-page copy not found; refusing update')
index_path.write_text(html.replace(old_count, new_count, 1).replace(old_note, new_note, 1), encoding='utf-8')

if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
    raise SystemExit('ffmpeg/ffprobe are required')

before = float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(audio_path)).stdout.strip())
tmp_audio = Path('RetroFlux.trimmed.mp3')
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '4', '-i', str(audio_path),
    '-map_metadata', '0', '-c:a', 'libmp3lame', '-q:a', '0', str(tmp_audio)
], check=True)
after = float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(tmp_audio)).stdout.strip())
delta = before - after
print(f'RetroFlux: {before:.3f}s -> {after:.3f}s; trimmed {delta:.3f}s')
if abs(delta - 4.0) > 0.12:
    tmp_audio.unlink(missing_ok=True)
    raise SystemExit(f'Unexpected trim delta: {delta:.3f}s')
tmp_audio.replace(audio_path)

subprocess.run(['node', '--check', 'time-circuit.js'], check=True)
if "number:'TC-05',title:'Kids Will Love It'" not in js_path.read_text(encoding='utf-8'):
    raise SystemExit('TC-05 verification failed')
if "number:'TC-09',title:'Eighty-Eight Rebel — Alt 2'" not in js_path.read_text(encoding='utf-8'):
    raise SystemExit('TC-09 verification failed')
if 'Recovered Archive cuts are mirrored here as TC-05 through TC-09' not in index_path.read_text(encoding='utf-8'):
    raise SystemExit('Listen-page copy verification failed')
subprocess.run(['git', 'diff', '--check'], check=True)
