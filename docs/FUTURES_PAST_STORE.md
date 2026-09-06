# Future's Past Store Contract

Time Circuit exposes a deliberately narrow merchandise surface for the **Future's Past** capsule.

## Hard rule

The site may render purchase controls only for catalog records that satisfy both conditions:

1. the product is a hoodie; and
2. the catalog explicitly identifies it as Future's Past (`future's past`, `futures past`, or `futures-past`) through collection, tags, name, or canonical id.

The page must never fall back to the broader AeroVista Apparel assortment when the capsule is empty.

## Current state

The repository already contains six approved-looking Future's Past design assets under `images/` and the Time Circuit site renders them as a capsule preview shelf:

- `biff.png`
- `chick.png`
- `doc.png`
- `flux.png`
- `marty.png`
- `www.png`

Those files are presentation assets only. They are **not** product identity, price, SKU, Square item id, or Square variation id.

Until corresponding catalog products exist, the shelf remains preview-only and purchase controls stay disabled.

## Catalog adapter

The browser attempts a read-only catalog sync from AeroVista Apparel. It filters the returned records through the hard rule above before rendering any live merchandise. If fetch/CORS/catalog shape is unavailable, the local preview shelf still renders and no checkout identity is invented.

## Commerce boundary

Time Circuit does not submit Square checkout directly. Apparel/NXCore Commerce remains authoritative for product identity, variation identity, price, quote, and checkout. A later cutover can add a verified product deep-link or Commerce session handoff once that contract exists for the Time Circuit origin.

## Audio / art contract

The numbered Time Circuit sequence is 88 BPM. The site currently wires the numbered audio files actually present in the repository and keeps missing numbered masters visible as pending slots rather than pretending they exist.
