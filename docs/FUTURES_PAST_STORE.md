# Future's Past Store Contract

Time Circuit exposes a deliberately narrow merchandise surface for the **Future's Past** capsule.

## Hard rule

The site may render catalog merchandise only when all of these are true:

1. the product is a hoodie;
2. the catalog explicitly identifies it as Future's Past (`future's past`, `futures past`, `future past`, or the hyphenated equivalents);
3. the product uses a canonical AeroVista `avp_*` id;
4. every supplied variant uses a canonical AeroVista `avv_*` id;
5. the data arrived through the `time-circuit` destination manifest.

The page must never fall back to the broader AeroVista Apparel assortment when the capsule is empty.

## Presentation assets

The repository contains six Future's Past design assets under `images/` and renders them as the preview shelf:

- `marty.png` — Eighty-Eight Rebel / TC-01
- `biff.png` — Full Cab Bruiser / TC-02
- `flux.png` — Flux Professor / TC-03
- `chick.png` — Paradox Queen / TC-04
- `doc.png` — Circuit Professor / archive variant
- `www.png` — Where We're Going / archive variant

Those files are presentation assets only. They are **not** product identity, price, SKU, Square item id, or Square variation id.

Until corresponding canonical catalog products exist, the shelf remains preview-only and purchase controls stay disabled.

## Destination manifest

`store.json` is the browser-facing Time Circuit store authority.

It is intended to be produced from Catalog Console / Catalog Control for destination id:

```text
time-circuit
```

The page no longer downloads the full AeroVista Apparel catalog and filters it client-side. That broader catalog contains unrelated products and provider-level identity that does not belong in this experience.

The browser rejects a manifest when:

- `destinationId` is not `time-circuit`;
- provider/Square identity fields are present;
- product/variant IDs are not canonical `avp_*` / `avv_*` values;
- a product is not both Future's Past and a hoodie.

## Commerce boundary

Time Circuit does not resolve Square or Printful identity in the browser. NXCore Commerce remains authoritative for provider resolution, price/quote validation, and checkout.

A later checkout handoff should submit only canonical identity, for example:

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

Until that canonical Commerce endpoint is deployed and verified for the Time Circuit origin, purchase controls remain disabled.

## Audio / art contract

The numbered Time Circuit sequence is 88 BPM. The site wires the numbered masters actually present in the repository and keeps missing TC-02 / TC-03 masters visible as pending slots rather than pretending they exist.

Archive cuts remain separate from the numbered Future's Past sequence.
