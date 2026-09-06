(() => {
  const CATALOG_URL = 'https://apparel.aerovista.us/square_products_latest.json';
  const APPAREL_URL = 'https://apparel.aerovista.us/';

  const previewDesigns = [
    { id: 'rebel', name: "Eighty-Eight Rebel", image: './images/marty.png', note: 'Future\'s Past hoodie design // TC-01' },
    { id: 'bruiser', name: 'Full Cab Bruiser', image: './images/biff.png', note: 'Future\'s Past hoodie design // TC-02' },
    { id: 'professor', name: 'Flux Professor', image: './images/flux.png', note: 'Future\'s Past hoodie design // TC-03' },
    { id: 'queen', name: 'Paradox Queen', image: './images/chick.png', note: 'Future\'s Past hoodie design // TC-04' },
    { id: 'doc', name: 'Circuit Professor', image: './images/doc.png', note: 'Future\'s Past hoodie design // archive variant' },
    { id: 'roads', name: "Where We're Going", image: './images/www.png', note: 'Future\'s Past hoodie design // archive variant' }
  ];

  const normalize = value => String(value ?? '').trim().toLowerCase();
  const values = value => Array.isArray(value) ? value.map(normalize) : [normalize(value)];
  const futurePastTokens = ["future's past", 'futures past', 'future past', 'futures-past', 'future-past'];

  function isFuturePastHoodie(product) {
    const category = normalize(product.category || product.type);
    const hoodie = category.includes('hoodie') || values(product.tags).some(tag => tag.includes('hoodie'));
    if (!hoodie) return false;
    const identityText = [
      product.id,
      product.name,
      product.collection,
      ...(Array.isArray(product.tags) ? product.tags : [])
    ].map(normalize).join(' ');
    return futurePastTokens.some(token => identityText.includes(token));
  }

  function catalogProducts(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.products)) return payload.products;
    if (Array.isArray(payload?.catalog?.products)) return payload.catalog.products;
    return [];
  }

  function priceLabel(product) {
    const prices = [product.price, ...(product.variants || []).map(v => v.price)]
      .map(Number).filter(Number.isFinite);
    if (!prices.length) return 'Price at checkout';
    const min = Math.min(...prices);
    return `$${min.toFixed(2)}${new Set(prices).size > 1 ? '+' : ''}`;
  }

  function renderPreview(root) {
    root.innerHTML = previewDesigns.map(item => `
      <article class="merch-card merch-preview">
        <div class="merch-image"><img src="${item.image}" alt="${item.name} Future's Past design" loading="lazy"></div>
        <div class="merch-copy">
          <div class="merch-kicker">FUTURE'S PAST // DESIGN PREVIEW</div>
          <h3>${item.name}</h3>
          <p>${item.note}</p>
          <button class="merch-action" type="button" disabled>Catalog activation pending</button>
        </div>
      </article>`).join('');
  }

  function renderLive(root, products) {
    root.innerHTML = products.map(product => {
      const image = product.image || product.images?.[0] || './images/flux.png';
      return `
        <article class="merch-card merch-live">
          <div class="merch-image"><img src="${image}" alt="${product.name || 'Future\'s Past hoodie'}" loading="lazy"></div>
          <div class="merch-copy">
            <div class="merch-kicker">FUTURE'S PAST // VERIFIED CATALOG</div>
            <h3>${product.name || 'Future\'s Past Hoodie'}</h3>
            <p>${priceLabel(product)} · ${product.variants?.length || 0} variant${product.variants?.length === 1 ? '' : 's'}</p>
            <a class="merch-action" href="${APPAREL_URL}" target="_blank" rel="noopener">Open AeroVista Apparel</a>
          </div>
        </article>`;
    }).join('');
  }

  async function sync() {
    const root = document.getElementById('futurePastStore');
    const status = document.getElementById('futurePastStoreStatus');
    if (!root || !status) return;

    renderPreview(root);
    status.textContent = 'Preview shelf loaded · checking verified catalog';

    try {
      const response = await fetch(CATALOG_URL, { cache: 'no-store', mode: 'cors' });
      if (!response.ok) throw new Error(`catalog ${response.status}`);
      const payload = await response.json();
      const products = catalogProducts(payload).filter(isFuturePastHoodie);
      if (!products.length) {
        status.textContent = "Future's Past designs ready · no verified hoodie records in catalog yet";
        return;
      }
      renderLive(root, products);
      status.textContent = `${products.length} verified Future's Past hoodie${products.length === 1 ? '' : 's'} synced`;
    } catch (error) {
      console.info('Future\'s Past catalog sync unavailable; preview-only safety mode.', error);
      status.textContent = "Future's Past preview-only · commerce catalog unavailable from this origin";
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
})();
