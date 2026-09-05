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

The current track source uses robust relative paths:

- `./kids-will-love-it.mp3`
- `./kids.will.love.it.png`

## Multi-track playlist readiness

The page now uses a `playlist` array in the script block and supports:

- Track list rendering
- Active track highlight
- Prev/Next controls
- Click-to-load track behavior
- Auto-advance on track end
- Shared metadata binding (title, description, BPM, key, art)

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

- Add per-track duration labels after metadata loads.
- Add shuffle/repeat modes.
- Add optional waveform seek preview for longer sets.
- Add second/third tracks now that the structure is ready.
