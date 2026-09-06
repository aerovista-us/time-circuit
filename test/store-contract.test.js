'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('time-circuit.css','utf8');
const player = fs.readFileSync('time-circuit.js','utf8');
const store = fs.readFileSync('future-past-store.js','utf8');
const manifest = JSON.parse(fs.readFileSync('store.json','utf8'));

assert.match(html, /data-view="listen"/);
assert.match(html, /data-view="archive"/);
assert.match(html, /data-view="store"/);
assert.match(html, /id="viz"/);
assert.match(html, /id="wave"/);
assert.match(html, /id="bars"/);
assert.match(html, /id="dest"/);
assert.match(html, /id="flux"/);
assert.match(html, /id="btnRestart"/);
assert.match(html, /id="vol"/);
assert.match(player, /createMediaElementSource/);
assert.match(player, /getByteTimeDomainData/);
assert.match(player, /getByteFrequencyData/);
assert.match(css, /Original Time Circuit Listen surface/);
assert.match(css, /Northline-inspired layout is intentionally confined to Store/);

assert.match(html, /id="bagButton"/);
assert.match(html, /id="cartDrawer"/);
assert.match(html, /id="checkoutButton"[^>]*disabled/);
assert.match(html, /Northline's store layout pattern, applied only here/);

assert.equal(manifest.destinationId, 'time-circuit');
assert.equal(manifest.policy.collectionMustMatch, "Future's Past");
assert.equal(manifest.policy.productTypeMustContain, 'hoodie');
assert.equal(manifest.policy.canonicalProductIdsOnly, true);
assert.equal(manifest.policy.canonicalVariantIdsOnly, true);
assert.equal(manifest.policy.denyNonMatchingProducts, true);

assert.match(store, /\^avp_/);
assert.match(store, /\^avv_/);
assert.match(store, /wrong destination manifest/);
assert.match(store, /provider identity rejected from browser manifest/);
assert.match(store, /Add to Bag/);
assert.doesNotMatch(store, /square_products_latest\.json/);

console.log('Time Circuit listen + store contracts: OK');
