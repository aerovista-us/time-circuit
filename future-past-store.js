(() => {
  'use strict';

  const MANIFEST_URL = './store.json';

  const previewDesigns = [
    { id: 'rebel', name: 'Eighty-Eight Rebel', image: './images/marty.png', note: "Future's Past hoodie design // TC-01" },
    { id: 'bruiser', name: 'Full Cab Bruiser', image: './images/biff.png', note: "Future's Past hoodie design // TC-02" },
    { id: 'professor', name: 'Flux Professor', image: './images/flux.png', note: "Future's Past hoodie design // TC-03" },
    { id: 'queen', name: 'Paradox Queen', image: './images/chick.png', note: "Future's Past hoodie design // TC-04" },
    { id: 'doc', name: 'Circuit Professor', image: './images/doc.png', note: "Future's Past hoodie design // archive variant" },
    { id: 'roads', name: "Where We're Going", image: './images/www.png', note: "Future's Past hoodie design // archive variant" }
  ];

  const normalize = value => String(value ?? '').replace(/[’‘]/g, "'").trim().toLowerCase();
  const values = value => Array.isArray(value) ? value.map(normalize) : [normalize(value)];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const futurePastTokens = ["future's past", 'futures past', 'future past', 'futures-past', 'future-past'];
  const productIdPattern = /^avp_[a-z0-9_-]+$/i;
  const variantIdPattern = /^avv_[a-z0-9_-]+$/i;
  const forbiddenProviderKey = /^(?:square.*id|provider.*id|variation_id|squarevariationid|square_variation_id)$/i;

  function hasProviderIdentity(value) {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(hasProviderIdentity);
    return Object.entries(value).some(([key, child]) => forbiddenProviderKey.test(key) || hasProviderIdentity(child));
  }

  function isFuturePastHoodie(product) {
    const category = normalize([product.category, product.productType, product.type, product.name, product.title].join(' '));
    const hoodie = category.includes('hoodie') || values(product.tags).some(tag => tag.includes('hoodie'));
    if (!hoodie) return false;
    const identityText = [
      product.id,
      product.name,
      product.title,
      product.collection,
      product.presentation?.title,
      product.presentation?.badge,
      ...(Array.isArray(product.tags) ? product.tags : [])
    ].map(normalize).join(' ');
    return futurePastTokens.some(token => identityText.includes(token));
  }

  function hasCanonicalIdentity(product) {
    if (!productIdPattern.test(String(product.id || ''))) return false;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    return variants.every(variant => variantIdPattern.test(String(variant.id || '')));
  }

  function catalogProducts(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.products)) return payload.products;
    if (Array.isArray(payload?.catalog?.products)) return payload.catalog.products;
    return [];
  }

  function priceLabel(product, currency) {
    const prices = [product.price, ...(product.variants || []).map(v => v.price)]
      .map(Number).filter(Number.isFinite);
    if (!prices.length) return 'Price verified at checkout';
    const min = Math.min(...prices);
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(min)
        + (new Set(prices).size > 1 ? '+' : '');
    } catch {
      return `$${min.toFixed(2)}${new Set(prices).size > 1 ? '+' : ''}`;
    }
  }

  function renderPreview(root) {
    root.innerHTML = previewDesigns.map(item => `
      <article class="merch-card merch-preview">
        <div class="merch-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)} Future's Past design" loading="lazy"></div>
        <div class="merch-copy">
          <div class="merch-kicker">FUTURE'S PAST // DESIGN PREVIEW</div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.note)}</p>
          <button class="merch-action" type="button" disabled>Catalog activation pending</button>
        </div>
      </article>`).join('');
  }

  function renderLive(root, products, currency) {
    root.innerHTML = products.map(product => {
      const rawImage = product.image || product.images?.[0] || './images/flux.png';
      const image = escapeHtml(rawImage);
      const rawName = product.presentation?.title || product.name || product.title || "Future's Past Hoodie";
      const name = escapeHtml(rawName);
      const variants = Array.isArray(product.variants) ? product.variants.length : 0;
      return `
        <article class="merch-card merch-live">
          <div class="merch-image"><img src="${image}" alt="${name}" loading="lazy"></div>
          <div class="merch-copy">
            <div class="merch-kicker">FUTURE'S PAST // CANONICAL CATALOG</div>
            <h3>${name}</h3>
            <p>${escapeHtml(priceLabel(product, currency))} · ${variants} variant${variants === 1 ? '' : 's'}</p>
            <button class="merch-action" type="button" disabled>Canonical checkout handoff pending</button>
          </div>
        </article>`;
    }).join('');
  }

  async function sync() {
    const root = document.getElementById('futurePastStore');
    const status = document.getElementById('futurePastStoreStatus');
    if (!root || !status) return;

    renderPreview(root);
    status.textContent = "Future's Past preview loaded · checking Time Circuit manifest";

    try {
      const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const payload = await response.json();
      if (normalize(payload.destinationId) !== 'time-circuit') throw new Error('wrong destination manifest');
      if (hasProviderIdentity(payload)) throw new Error('provider identity rejected from browser manifest');

      const allProducts = catalogProducts(payload);
      const products = allProducts.filter(product => isFuturePastHoodie(product) && hasCanonicalIdentity(product));
      const rejected = allProducts.length - products.length;
      if (!products.length) {
        status.textContent = "Future's Past designs ready · canonical hoodie manifest pending";
        return;
      }

      renderLive(root, products, payload.currency);
      const version = payload.catalogVersion ? ` · ${payload.catalogVersion}` : '';
      const rejectedNote = rejected ? ` · ${rejected} out-of-scope rejected` : '';
      status.textContent = `${products.length} canonical Future's Past hoodie${products.length === 1 ? '' : 's'} loaded${version}${rejectedNote} · checkout gated`;
    } catch (error) {
      console.info("Future's Past manifest unavailable; preview-only safety mode.", error);
      status.textContent = "Future's Past preview-only · canonical manifest unavailable";
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
})();
