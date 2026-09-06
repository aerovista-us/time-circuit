# Time Circuit Audio Archive

This document tracks the current `index.html` release experience.

## Release structure

Time Circuit now separates the numbered **Future's Past** sequence from older archive cuts.

### Numbered Future's Past sequence

| Slot | Title | Audio state | Artwork | Tempo |
|---|---|---|---|---|
| TC-01 | Eighty-Eight Rebel | `01 — EIGHTY-EIGHT REBEL.mp3` wired | `images/marty.png` | 88 BPM |
| TC-02 | Full Cab Bruiser | master pending | `images/biff.png` | 88 BPM target |
| TC-03 | Flux Professor | master pending | `images/flux.png` | 88 BPM target |
| TC-04 | Paradox Queen | `04 — PARADOX QUEEN.mp3` wired | `images/chick.png` | 88 BPM |

The additional `01 — EIGHTY-EIGHT REBEL (1).mp3` and `(2).mp3` files are alternate renders of TC-01, not separate numbered songs. They remain source/archive assets until one is deliberately promoted.

### Archive cuts

The player also preserves the older Time Circuit experiments as a separate archive lane:

- `kids-will-love-it.mp3` — Kids Will Love It
- `FLUX_SWAMP_(1955).mp3` — Flux Swamp (1955)
- `momentoxLowFreqxNEW_SOUND.mp3` — Momento × LowFreq × New Sound

`kids.gonnaLoveit.mp3` remains the short sample asset and is not a numbered release track.

## Artwork

The six Future's Past design/timeline assets are all wired into the experience or store preview:

- `images/marty.png` — Eighty-Eight Rebel / TC-01
- `images/biff.png` — Full Cab Bruiser / TC-02
- `images/flux.png` — Flux Professor / TC-03
- `images/chick.png` — Paradox Queen / TC-04
- `images/doc.png` — Circuit Professor / archive visual
- `images/www.png` — Where We're Going / archive visual

## Store

The Future's Past hoodie shelf is intentionally separate from the broader AeroVista Apparel catalog.

- `future-past-store.js` renders the shelf and enforces the boundary.
- `store.json` is the browser-facing `time-circuit` destination manifest.
- only Future's Past hoodies with canonical `avp_*` / `avv_*` identity may render as catalog products;
- provider/Square IDs are rejected from the browser manifest;
- when no canonical hoodie records exist, the six design previews remain visible and commerce stays locked;
- NXCore Commerce remains checkout authority.

See `docs/FUTURES_PAST_STORE.md` for the complete store contract.

## Player behavior

The static page supports:

- play/pause;
- previous/next across playable masters;
- seek/duration display;
- active-track state;
- pending numbered slots that are visible but not faked as playable masters;
- automatic advance to the next available playable track.

## Next content action

When TC-02 and TC-03 masters are finalized, add the exact numbered MP3 files and switch their existing slots from pending to playable. Do not renumber the archive to make missing masters appear complete.
