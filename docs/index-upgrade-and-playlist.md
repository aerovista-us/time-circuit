# Index Upgrade and Playlist Prep

This document tracks the `index.html` upgrade for the Time Circuit release page.

## What changed

- Added cover artwork integration using `./kids.will.love.it.png`.
- Updated the visual theme to match the artwork direction:
  - Electric blue accents
  - Ember/orange highlights
  - Dark cinematic background gradients
- Reworked layout into a cleaner release-page structure:
  - Hero area with artwork and track identity
  - Player controls panel
  - Dedicated playlist panel
  - Visualizer panel
- Preserved and restyled the time-circuit visualizer.
- Kept robust audio fallback behavior when WebAudio analyzer setup is unavailable.

## Audio pathing

Track sources use robust relative paths from the project root:

- `./kids-will-love-it.mp3` — original Time-Circuit drop (~4:32)
- `./FLUX_SWAMP_(1955).mp3` — Flux Swamp (1955) intro cut (~1:11)
- `./momentoxLowFreqxNEW_SOUND.mp3` — Momento × LowFreq × New Sound mashup (~4:59)
- `./kids.will.love.it.png` — shared cover art (all playlist entries)
- `./kids.gonnaLoveit.mp3` — short sample clip for the quote button (not in playlist)

**Not wired:** `newsound.mp3` is a 2-byte placeholder/empty file and is intentionally omitted.

## Multi-track playlist

The page uses a `playlist` array in the script block and supports:

- Track list rendering
- Active track highlight
- Prev/Next controls
- Click-to-load track behavior
- Auto-advance on track end
- Shared metadata binding (title, description, BPM, key, art)

### Current playlist (2026-09-05)

| # | Title | File | Notes |
|---|-------|------|-------|
| 1 | Kids Will Love It (Time-Circuit Drop) | `kids-will-love-it.mp3` | Analyzed BPM/key: 90.25 halftime / G-centered |
| 2 | Flux Swamp (1955) | `FLUX_SWAMP_(1955).mp3` | Suno tag title; provisional BPM/key |
| 3 | Momento × LowFreq × New Sound | `momentoxLowFreqxNEW_SOUND.mp3` | Multi-act mashup; provisional BPM/key |

### Add more tracks

Add objects to the `playlist` array using this shape:

```js
{
  title: "Track Name",
  subtitle: "Genre/Style",
  src: "./track-file.mp3",
  art: "./cover-image.png",
  bpm: "90 halftime",
  key: "G minor",
  description: "Short release description."
}
```

After saving, the playlist UI and transport controls update automatically.

## Recommended next upgrades

- Run `tools/audio_analysis_suite.py` on Flux Swamp + Momento and replace provisional BPM/key.
- Add per-track artwork once dedicated covers exist (currently all share `kids.will.love.it.png`).
- Add per-track duration labels after metadata loads.
- Add shuffle/repeat modes.
- Remove or replace empty `newsound.mp3`.
- Soften page chrome that still hard-codes the Kids Will Love It quote as the only sample line.

## Analyzer integration

An advanced remix-prep analyzer is available in `tools/audio_analysis_suite.py`.

Use it to generate per-track production metadata (tempo, key estimate, low-end profile, groove stats, stereo image, and section boundaries), then copy key fields into playlist metadata and remix prompts.

See `docs/audio-analysis-toolkit.md` for install and run instructions.

Browser-first workflow is also available via `tools/audio_analysis_web.py`. See `docs/audio-analysis-web-ui.md`.
