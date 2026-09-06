# Time Circuit Release / Playlist / Store

This document tracks the public `index.html` experience for Time Circuit.

## Current experience

The page is now one integrated EchoVerse release surface with:

- seven repository audio cuts wired into one player;
- per-track artwork using the newly uploaded Time Circuit image set;
- a six-image Timeline Artifacts gallery;
- 88 BPM project metadata across the release;
- Web Audio visualization with native-audio fallback;
- auto-next, previous/next, seek, and sample playback;
- a fail-closed Future's Past hoodie store surface.

## Wired tracks

| # | Title | Cut | File | Artwork |
|---|---|---|---|---|
| 01 | Eighty-Eight Rebel | Master | `01 — EIGHTY-EIGHT REBEL.mp3` | `images/marty.png` |
| 02 | Eighty-Eight Rebel | Alternate Cut A | `01 — EIGHTY-EIGHT REBEL (1).mp3` | `images/doc.png` |
| 03 | Eighty-Eight Rebel | Alternate Cut B | `01 — EIGHTY-EIGHT REBEL (2).mp3` | `images/biff.png` |
| 04 | Paradox Queen | Track 04 | `04 — PARADOX QUEEN.mp3` | `images/chick.png` |
| 05 | Kids Will Love It | Time-Circuit Drop | `kids-will-love-it.mp3` | `kids.will.love.it.png` |
| 06 | Flux Swamp | 1955 | `FLUX_SWAMP_(1955).mp3` | `images/flux.png` |
| 07 | Momento × LowFreq × New Sound | Flux Mashup | `momentoxLowFreqxNEW_SOUND.mp3` | `images/www.png` |

`kids.gonnaLoveit.mp3` remains a short sample-trigger asset and is not counted as a playlist track.

## Artwork

The Timeline Artifacts gallery uses:

- `images/marty.png`
- `images/doc.png`
- `images/biff.png`
- `images/chick.png`
- `images/flux.png`
- `images/www.png`

Selecting an artifact moves the player to its paired timeline cut.

## Future's Past store boundary

`store.json` is the Time Circuit destination manifest.

The browser accepts a product only when both conditions are true:

1. the product identity/collection contains **Future's Past** (straight or curly apostrophe is normalized);
2. its category/type/name identifies it as a **hoodie**.

Everything else is rejected before rendering.

The manifest uses canonical AeroVista product/variant IDs only (`avp_*`, `avv_*`). Square provider IDs must not be added to this browser-facing file.

Checkout is fail-closed. A product button is enabled only when:

- the product has a canonical `avp_*` ID;
- the selected variant has a canonical `avv_*` ID;
- `store.json.checkout.endpoint` is explicitly configured.

The checkout body is canonical identity only:

```json
{
  "destinationId": "time-circuit",
  "items": [
    {
      "productId": "avp_...",
      "variantId": "avv_...",
      "quantity": 1
    }
  ]
}
```

NXCore Commerce remains responsible for resolving provider/payment data server-side.

## Current catalog state

The current Time Circuit manifest intentionally contains no substitute products. Until the exact Future's Past hoodies are accepted into canonical catalog authority and distributed to `time-circuit`, the store displays a capsule-pending state.

Do not work around this by inserting another hoodie collection or by placing Square variation IDs in `store.json`.

## Next commerce action

After the Future's Past hoodie products exist in canonical authority:

1. add `time-circuit` as a Catalog Control destination if it is not already registered;
2. assign only the Future's Past hoodie canonical product IDs;
3. generate the destination manifest;
4. publish/copy that reviewed manifest to this repo's `store.json` through the deliberate publication path;
5. configure the canonical Commerce checkout endpoint only after its contract is live and verified.
