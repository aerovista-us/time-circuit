'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('time-circuit.css','utf8');
const retroCss = fs.readFileSync('time-circuit-80s.css','utf8');
const visualizerCss = fs.readFileSync('time-circuit-visualizer-v2.css','utf8');
const player = fs.readFileSync('time-circuit.js','utf8');
const visualUpgrade = fs.readFileSync('time-circuit-visual-upgrade.js','utf8');
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
assert.match(html, /id="btnSample"/);
assert.match(html, /id="visualizerArt"/);
assert.match(html, /id="coverImg" src="\.\/kids\.will\.love\.it\.png" alt="Kids Will Love It artwork"/);
assert.match(html, /time-circuit-80s\.css/);
assert.match(html, /time-circuit-visualizer-v2\.css/);
assert.match(html, /time-circuit-visual-upgrade\.js/);
assert.match(html, /property="og:image" content="https:\/\/time-circuit\.aerovista\.us\/images\/flux\.png"/);
assert.match(html, /name="twitter:card" content="summary_large_image"/);
assert.match(html, /RetroFlux plus TC-01 through TC-09 are available in Listen/);
assert.match(html, /Recovered Archive cuts are mirrored here as TC-05 through TC-09/);

assert.match(player, /createMediaElementSource/);
assert.match(player, /getByteTimeDomainData/);
assert.match(player, /getByteFrequencyData/);
assert.match(player, /window\.TimeCircuitFeed/);
assert.match(player, /analyser\.fftSize=4096/);
assert.match(player, /analyser\.smoothingTimeConstant=\.78/);
assert.match(player, /analyser\.minDecibels=-92/);
assert.match(player, /analyser\.maxDecibels=-12/);
assert.match(player, /02 — FULL CAB BRUISER\.mp3/);
assert.match(player, /03 — FLUX PROFESSOR\.mp3/);
assert.match(player, /number:'TC-05',title:'Kids Will Love It'/);
assert.match(player, /number:'TC-09',title:'Eighty-Eight Rebel — Alt 2'/);
assert.match(player, /new Audio\('\.\/kids\.gonnaLoveit\.mp3'\)/);
assert.match(player, /Stop Sample/);
assert.match(player, /SAMPLE_GAIN=1\.75\*1\.777142857/);
assert.match(player, /sampleLimiter\.threshold\.value=-4/);
assert.match(player, /sampleLimiter\.knee\.value=2/);
assert.match(player, /createGain\(\)/);
assert.match(player, /createDynamicsCompressor\(\)/);
assert.doesNotMatch(player, /cover\.src=current\.art/);

assert.match(visualUpgrade, /artBySignal/);
assert.match(visualUpgrade, /'TC-00':'\.\/images\/flux\.png'/);
assert.match(visualUpgrade, /cover\.src = '\.\/kids\.will\.love\.it\.png'/);
assert.match(visualUpgrade, /tcSpectrumPath/);
assert.match(visualUpgrade, /frequencyBand\(/);
assert.match(visualUpgrade, /logSpectrumValue\(/);
assert.match(visualUpgrade, /TRANSIENT LOCK/);
assert.match(visualUpgrade, /beatThreshold/);
assert.match(visualUpgrade, /TimeCircuitFeed/);
assert.match(visualUpgrade, /504bd7ad-9e98-46b4-b84e-122fdba69bb0/);
assert.match(visualUpgrade, /time-circuit-view-duration/);

assert.match(retroCss, /--magenta:#ff44d6/);
assert.match(retroCss, /\.viz-art-layer/);
assert.match(visualizerCss, /--tc-low:0/);
assert.match(visualizerCss, /\.viz-perspective-grid/);
assert.match(visualizerCss, /\.viz-band-panel/);
assert.match(visualizerCss, /\.viz-energy-panel/);
assert.match(visualizerCss, /\.viz-beat-lamp/);
assert.match(css, /Original Time Circuit Listen surface/);
assert.match(css, /Northline-inspired layout is intentionally confined to Store/);

assert.match(html, /id="bagButton"/);
assert.match(html, /id="cartDrawer"/);
assert.match(html, /id="checkoutButton"[^>]*disabled/);
assert.match(html, /Northline's store layout pattern, applied only here/);

assert.match(store, /images\/products\/marty\.png/);
assert.match(store, /images\/products\/biff\.png/);
assert.match(store, /images\/products\/flux\.png/);
assert.match(store, /images\/products\/paradox\.png/);
assert.match(store, /images\/products\/doc\.png/);
assert.doesNotMatch(store, /images\/products\/[^'"`]+\.webp/);
assert.match(store, /\.\/images\/marty\.png/);
assert.match(store, /\.\/images\/biff\.png/);
assert.match(store, /\.\/images\/flux\.png/);
assert.match(store, /\.\/images\/chick\.png/);
assert.match(store, /\.\/images\/doc\.png/);
assert.match(store, /data-gallery-image/);
assert.match(store, /data-gallery-main/);
assert.match(store, /product-thumbs/);

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

console.log('Time Circuit listen + store + visualizer v2 contracts: OK');
