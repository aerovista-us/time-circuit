(() => {
  'use strict';

  const MANIFEST_URL = './store.json';
  const CART_KEY = 'time_circuit_future_past_cart_v1';
  const previewDesigns = [
    { id:'rebel', name:'Eighty-Eight Rebel', image:'./images/marty.png', note:"Future's Past hoodie design // TC-01" },
    { id:'bruiser', name:'Full Cab Bruiser', image:'./images/biff.png', note:"Future's Past hoodie design // TC-02" },
    { id:'professor', name:'Flux Professor', image:'./images/flux.png', note:"Future's Past hoodie design // TC-03" },
    { id:'queen', name:'Paradox Queen', image:'./images/chick.png', note:"Future's Past hoodie design // TC-04" },
    { id:'doc', name:'Circuit Professor', image:'./images/doc.png', note:"Future's Past hoodie design // archive variant" },
    { id:'roads', name:"Where We're Going", image:'./images/www.png', note:"Future's Past hoodie design // archive variant" }
  ];

  const normalize = value => String(value ?? '').replace(/[’‘]/g,"'").trim().toLowerCase();
  const values = value => Array.isArray(value) ? value.map(normalize) : [normalize(value)];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const futurePastTokens = ["future's past",'futures past','future past','futures-past','future-past'];
  const productIdPattern = /^avp_[a-z0-9_-]+$/i;
  const variantIdPattern = /^avv_[a-z0-9_-]+$/i;
  const forbiddenProviderKey = /^(?:square|provider|variation_id)/i;

  const state = { products:[], currency:'USD', cart:[] };
  const $ = id => document.getElementById(id);

  function hasProviderIdentity(value){
    if(!value || typeof value!=='object') return false;
    if(Array.isArray(value)) return value.some(hasProviderIdentity);
    return Object.entries(value).some(([key,child])=>forbiddenProviderKey.test(key)||hasProviderIdentity(child));
  }

  function isFuturePastHoodie(product){
    const category=normalize([product.category,product.productType,product.type,product.name,product.title].join(' '));
    const hoodie=category.includes('hoodie')||values(product.tags).some(tag=>tag.includes('hoodie'));
    if(!hoodie) return false;
    const identityText=[product.id,product.name,product.title,product.collection,product.presentation?.title,product.presentation?.badge,...(Array.isArray(product.tags)?product.tags:[])].map(normalize).join(' ');
    return futurePastTokens.some(token=>identityText.includes(token));
  }

  function hasCanonicalIdentity(product){
    if(!productIdPattern.test(String(product.id||''))) return false;
    const variants=Array.isArray(product.variants)?product.variants:[];
    return variants.length>0 && variants.every(variant=>variantIdPattern.test(String(variant.id||'')));
  }

  function catalogProducts(payload){
    if(Array.isArray(payload)) return payload;
    if(Array.isArray(payload?.products)) return payload.products;
    if(Array.isArray(payload?.catalog?.products)) return payload.catalog.products;
    return [];
  }

  function numericPrice(value){
    if(value===null||value===undefined||String(value).trim()==='')return null;
    const amount=Number(value);return Number.isFinite(amount)?amount:null;
  }

  function money(value,currency=state.currency){
    const amount=numericPrice(value);if(amount===null) return null;
    try{return new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD'}).format(amount);}catch{return `$${amount.toFixed(2)}`;}
  }

  function productPrice(product){
    const prices=[product.price,...(product.variants||[]).map(variant=>variant.price)].map(numericPrice).filter(value=>value!==null);
    if(!prices.length) return 'Verified at checkout';
    const min=Math.min(...prices),max=Math.max(...prices);const label=money(min);
    return min===max?label:`${label}+`;
  }

  function variantLabel(variant){
    const parts=[];
    for(const value of [variant.name,variant.title,variant.size,variant.color]){
      const text=String(value||'').trim();if(text&&!parts.includes(text))parts.push(text);
    }
    return parts.join(' / ')||'Standard';
  }

  function productImage(product){return product.image||product.images?.[0]||'./images/flux.png';}
  function productTitle(product){return product.presentation?.title||product.name||product.title||"Future's Past Hoodie";}
  function productDescription(product){return product.presentation?.description||product.description||"Future's Past hoodie // Time Circuit capsule";}

  function renderPreview(){
    const root=$('futurePastStore');if(!root)return;
    root.innerHTML=previewDesigns.map(item=>`<article class="product-card preview">
      <div class="product-art"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)} Future's Past design" loading="lazy"></div>
      <div class="product-info">
        <div class="product-top"><div><p class="eyebrow">FUTURE'S PAST / DESIGN PREVIEW</p><h2>${escapeHtml(item.name)}</h2></div><p class="price">Preview</p></div>
        <p>${escapeHtml(item.note)}</p>
        <div class="variant-picker"><span>Size</span><select disabled aria-label="Size unavailable"><option>Catalog pending</option></select></div>
        <button class="product-action" type="button" disabled>Catalog activation pending</button>
      </div>
    </article>`).join('');
    const count=$('futurePastCount');if(count)count.textContent='06 DESIGNS';
  }

  function renderLive(){
    const root=$('futurePastStore');if(!root)return;
    root.innerHTML=state.products.map((product,index)=>{
      const variants=product.variants||[];
      return `<article class="product-card live" data-product-index="${index}">
        <div class="product-art"><img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(productTitle(product))}" loading="lazy"></div>
        <div class="product-info">
          <div class="product-top"><div><p class="eyebrow">FUTURE'S PAST / CANONICAL</p><h2>${escapeHtml(productTitle(product))}</h2></div><p class="price">${escapeHtml(productPrice(product))}</p></div>
          <p>${escapeHtml(productDescription(product))}</p>
          <label class="variant-picker"><span>Variant</span><select data-variant-select aria-label="Choose ${escapeHtml(productTitle(product))} variant">${variants.map((variant,variantIndex)=>`<option value="${variantIndex}">${escapeHtml(variantLabel(variant))}${numericPrice(variant.price)!==null?` — ${escapeHtml(money(variant.price)||'')}`:''}</option>`).join('')}</select></label>
          <button class="product-action" type="button" data-add-to-bag>Add to Bag</button>
        </div>
      </article>`;
    }).join('');

    root.querySelectorAll('[data-product-index]').forEach(card=>{
      const product=state.products[Number(card.dataset.productIndex)];
      const select=card.querySelector('[data-variant-select]');
      card.querySelector('[data-add-to-bag]')?.addEventListener('click',()=>{
        const variant=product?.variants?.[Number(select?.value||0)];
        if(!variant||!variantIdPattern.test(String(variant.id||'')))return;
        addToBag(product,variant);
      });
    });

    const count=$('futurePastCount');if(count)count.textContent=`${String(state.products.length).padStart(2,'0')} LIVE`;
  }

  function loadCart(){
    try{
      const saved=JSON.parse(localStorage.getItem(CART_KEY)||'[]');
      state.cart=Array.isArray(saved)?saved.filter(line=>productIdPattern.test(String(line.productId||''))&&variantIdPattern.test(String(line.variantId||''))):[];
    }catch{state.cart=[];}
  }

  function saveCart(){try{localStorage.setItem(CART_KEY,JSON.stringify(state.cart));}catch{}renderCart();}

  function addToBag(product,variant){
    const productId=String(product.id||''),variantId=String(variant.id||'');
    if(!productIdPattern.test(productId)||!variantIdPattern.test(variantId))return;
    const existing=state.cart.find(line=>line.productId===productId&&line.variantId===variantId);
    if(existing)existing.quantity+=1;
    else {
      const variantPrice=numericPrice(variant.price),fallbackPrice=numericPrice(product.price);
      state.cart.push({productId,variantId,title:productTitle(product),variantLabel:variantLabel(variant),image:productImage(product),price:variantPrice??fallbackPrice,quantity:1});
    }
    saveCart();openCart();
  }

  function removeCartLine(index){state.cart.splice(index,1);saveCart();}

  function renderCart(){
    const items=$('cartItems'),empty=$('cartEmpty'),summary=$('cartSummary'),subtotal=$('cartSubtotal'),count=$('bagCount');if(!items||!empty||!summary||!subtotal||!count)return;
    count.textContent=String(state.cart.reduce((sum,line)=>sum+(Number(line.quantity)||0),0));
    items.innerHTML=state.cart.map((line,index)=>`<div class="cart-line">
      <img src="${escapeHtml(line.image)}" alt="">
      <div><strong>${escapeHtml(line.title)}</strong><span>${escapeHtml(line.variantLabel)} · Qty ${Number(line.quantity)||1}</span></div>
      <button class="cart-remove" type="button" data-remove-cart="${index}" aria-label="Remove ${escapeHtml(line.title)}">×</button>
    </div>`).join('');
    items.querySelectorAll('[data-remove-cart]').forEach(button=>button.addEventListener('click',()=>removeCartLine(Number(button.dataset.removeCart))));
    const hasItems=state.cart.length>0;empty.hidden=hasItems;summary.hidden=!hasItems;
    if(!hasItems){subtotal.textContent='—';return;}
    const allPriced=state.cart.every(line=>numericPrice(line.price)!==null);
    subtotal.textContent=allPriced?money(state.cart.reduce((sum,line)=>sum+numericPrice(line.price)*Number(line.quantity||1),0)):'Verified at checkout';
  }

  function openCart(){const drawer=$('cartDrawer');if(drawer){drawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}}
  function closeCart(){const drawer=$('cartDrawer');if(drawer){drawer.setAttribute('aria-hidden','true');document.body.style.overflow='';}}

  function bindCart(){
    $('bagButton')?.addEventListener('click',openCart);$('cartClose')?.addEventListener('click',closeCart);$('cartScrim')?.addEventListener('click',closeCart);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCart();});
  }

  async function sync(){
    const status=$('futurePastStoreStatus');renderPreview();loadCart();renderCart();bindCart();
    if(status)status.textContent="Future's Past preview loaded · checking Time Circuit manifest";
    try{
      const response=await fetch(MANIFEST_URL,{cache:'no-store'});if(!response.ok)throw new Error(`manifest ${response.status}`);
      const payload=await response.json();
      if(normalize(payload.destinationId)!=='time-circuit')throw new Error('wrong destination manifest');
      if(hasProviderIdentity(payload))throw new Error('provider identity rejected from browser manifest');
      const allProducts=catalogProducts(payload);const products=allProducts.filter(product=>isFuturePastHoodie(product)&&hasCanonicalIdentity(product));const rejected=allProducts.length-products.length;
      state.currency=String(payload.currency||'USD');state.products=products;
      if(!products.length){if(status)status.textContent="Future's Past designs ready · canonical hoodie manifest pending";return;}
      renderLive();
      const version=payload.catalogVersion?` · ${payload.catalogVersion}`:'';const rejectedNote=rejected?` · ${rejected} out-of-scope rejected`:'';
      if(status)status.textContent=`${products.length} canonical hoodie${products.length===1?'':'s'} loaded${version}${rejectedNote} · bag ready · checkout gated`;
    }catch(error){
      console.info("Future's Past manifest unavailable; preview-only safety mode.",error);
      if(status)status.textContent="Future's Past preview-only · canonical manifest unavailable";
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
})();
