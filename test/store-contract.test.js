'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html','utf8');
const store = fs.readFileSync('future-past-store.js','utf8');
const manifest = JSON.parse(fs.readFileSync('store.json','utf8'));

assert.match(html, /data-view="listen"/);
assert.match(html, /data-view="archive"/);
assert.match(html, /data-view="store"/);
assert.match(html, /id="bagButton"/);
assert.match(html, /id="cartDrawer"/);
assert.match(html, /id="checkoutButton"[^>]*disabled/);
assert.match(html, /time-circuit\.css/);
assert.match(html, /time-circuit\.js/);

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

console.log('Time Circuit store contract: OK');
