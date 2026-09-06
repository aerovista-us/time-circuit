# Time Circuit Audio Archive

This document tracks the current Time Circuit release experience.

## Experience shell

The public site exposes three views, but only the **Store** view borrows layout/interaction ideas from Northline:

- **Listen** — the native Time Circuit player: cover art beside the large SVG/WebAudio visualizer, TIME CIRCUITS DEST/FLUX readout, classic transport, and the TC-01 through TC-04 numbered playlist;
- **Archive** — recovered cuts and TC-01 alternate source renders, kept outside the numbered sequence and presented in Time Circuit's own style;
- **Store** — the Future's Past hoodie-only capsule using the Northline-style product-card, variant, Bag, and cart-drawer interaction pattern.

`index.html` owns the page structure, `time-circuit.css` owns presentation, `time-circuit.js` owns the Time Circuit player/visualizer/navigation behavior, and `future-past-store.js` owns the store boundary and cart presentation.

## Numbered Future's Past sequence

| Slot | Title | Audio state | Artwork | Tempo |
|---|---|---|---|---|
| TC-01 | Eighty-Eight Rebel | `01 — EIGHTY-EIGHT REBEL.mp3` wired | `images/marty.png` | 88 BPM |
| TC-02 | Full Cab Bruiser | master pending | `images/biff.png` | 88 BPM target |
| TC-03 | Flux Professor | master pending | `images/flux.png` | 88 BPM target |
| TC-04 | Paradox Queen | `04 — PARADOX QUEEN.mp3` wired | `images/chick.png` | 88 BPM |

The additional `01 — EIGHTY-EIGHT REBEL (1).mp3` and `(2).mp3` files are alternate renders of TC-01, not separate numbered songs. They appear in Archive as source renders and are never used to fill TC-02 or TC-03.

## Archive cuts

The player preserves the older Time Circuit experiments as a separate archive lane:

- `kids-will-love-it.mp3` — Kids Will Love It
- `FLUX_SWAMP_(1955).mp3` — Flux Swamp (1955)
- `momentoxLowFreqxNEW_SOUND.mp3` — Momento × LowFreq × New Sound

`kids.gonnaLoveit.mp3` remains the short sample asset and is not a numbered release track.

The analyzer documentation remains linked from the Listen surface at `docs/audio-analysis-toolkit.md`.

## Artwork

The six Future's Past design/timeline assets are wired into the experience or store preview:

- `images/marty.png` — Eighty-Eight Rebel / TC-01
- `images/biff.png` — Full Cab Bruiser / TC-02
- `images/flux.png` — Flux Professor / TC-03
- `images/chick.png` — Paradox Queen / TC-04
- `images/doc.png` — Circuit Professor / archive visual
- `images/www.png` — Where We're Going / archive visual

## Store

The Future's Past hoodie surface is intentionally separate from the broader AeroVista Apparel catalog.

- `future-past-store.js` renders the product grid, variant selectors, local Bag, and cart drawer while enforcing the boundary;
- `store.json` is the browser-facing `time-circuit` destination manifest;
- only Future's Past hoodies with canonical `avp_*` / `avv_*` identity may become live product cards;
- provider/Square IDs are rejected from the browser manifest;
- when no canonical hoodie records exist, the six design previews remain visible and Add to Bag stays unavailable;
- when canonical products exist, users can choose a canonical variant and build a local cart;
- checkout remains disabled until the verified canonical NXCore Commerce handoff is deployed.

Northline is a Store-tab UX reference only. Its Listen/player presentation is not copied into Time Circuit.

See `docs/FUTURES_PAST_STORE.md` for the complete store contract.

## Player behavior

The native Time Circuit player supports:

- play/pause;
- previous/next across actual playable numbered masters;
- restart;
- seek/duration display;
- volume control;
- Media Session metadata;
- the original Time Circuit SVG visualizer geometry with real WebAudio time-domain waveform and frequency bars;
- dynamic DEST/FLUX readout driven by playback/analyzer state;
- pending numbered slots that remain visible but are never faked as playable masters;
- separate playback of archive cuts and alternate renders.

## Next content action

When TC-02 and TC-03 masters are finalized, add the exact numbered MP3 files and switch their existing slots from pending to playable. Do not renumber the archive or substitute alternate TC-01 renders to make the numbered sequence appear complete.
