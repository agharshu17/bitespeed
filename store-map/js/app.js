// BiteSpeed Mart app shell: Home, Shop, Map, Trolley.
import { D, loadData, initState, state, subscribe, inr, dealLabel, priceHTML, lineCalc, imgSrc, recipeImg,
  addToCart, clearCart, setUsePoints, isFav, toggleFav, isSaved, toggleSaved, cartCount, buyAgain, totals, completeOrder } from './store.js';
import { createScene } from './scene.js';
import { initScanner } from './scanner.js';
import { initChat } from './chat.js';
import { ICON, PLACEHOLDER } from './icons.js';
const photo = (p, cls = '') => { const s = imgSrc(p.code); return s ? `<img class="${cls}" src="${s}" alt="${p.name}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',innerHTML:this.dataset.ph}))" data-ph='${ICON.bag.replace(/'/g, '&#39;')}'>` : PLACEHOLDER; };

const $ = id => document.getElementById(id);
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

await loadData(); initState();
const scene = createScene($('mapwrap'), D, { onPick: code => showInfo(code, false), onHover });

/* ---------- toast ---------- */
let flashT;
function flash(msg, remind) {
  const f = $('flash'); f.classList.toggle('deal', !!remind);
  f.innerHTML = remind ? `${ICON.check} ${msg}<br><span class="red">${remind}</span>` : msg;
  f.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('show'), remind ? 3200 : 1600);
}
function add(code, qty = 1, quiet) {
  const calc = addToCart(code, qty);
  if (!quiet && qty > 0) flash(`Added ${D.byCode[code].name}`, calc?.remind);
}

/* ---------- navigation ---------- */
let view = 'home', prevView = 'home', homeSig = '';
function go(v) {
  if (v !== view) prevView = view;
  view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'v-' + v));
  document.querySelectorAll('#tabs [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === (v === 'recipe' ? 'shop' : v)));
  scene.setActive(v === 'map');
  $('views').scrollTop = 0;
  if (v === 'home') renderHome();
}
document.querySelectorAll('#tabs [data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
$('brand').onclick = () => go('home');
$('ptsChip').onclick = () => go('cart');

/* ---------- product tiles ---------- */
const ctlHTML = c => { const q = state.cart[c] || 0; return q ? `<button data-act="dec" aria-label="Remove one">−</button><span>${q}</span><button data-act="inc" aria-label="Add one">+</button>` : `<button class="addbtn" data-act="inc">+ Add</button>`; };
function tile(p) {
  const o = D.offerBy[p.code], sec = D.secById[p.section];
  return `<article class="tile" data-code="${p.code}"><div class="art">${photo(p)}${o ? `<span class="badge">${dealLabel(o)}</span>` : ''}<button class="fav${isFav(p.code) ? ' on' : ''}" data-act="fav" aria-label="Favourite">${ICON.heart}</button></div>
    <div class="tn">${p.name}</div><button class="loc" data-act="loc">${ICON.pin} ${sec.label}</button><div class="tp">${priceHTML(p)}</div><div class="ctl">${ctlHTML(p.code)}</div></article>`;
}
const tiles = list => list.map(tile).join('');
$('views').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); const t = e.target.closest('.tile'); if (!b || !t) return;
  const code = t.dataset.code;
  if (b.dataset.act === 'inc') add(code); else if (b.dataset.act === 'dec') add(code, -1, true);
  else if (b.dataset.act === 'fav') toggleFav(code); else if (b.dataset.act === 'loc') locate(code);
});
function refreshTiles() {
  document.querySelectorAll('.tile').forEach(t => { const c = t.dataset.code; t.querySelector('.ctl').innerHTML = ctlHTML(c); t.querySelector('.fav').classList.toggle('on', isFav(c)); });
}

/* ---------- home ---------- */
function renderHome() {
  homeSig = state.favs.join() + '|' + Object.keys(state.bought).join() + '|' + state.saved.join();
  const feat = D.offers.filter(o => o.featured).map(o => D.byCode[o.code]);
  $('h-specials').innerHTML = tiles(feat);
  renderRecipeHome();
  const again = buyAgain();
  $('h-again').innerHTML = again.length ? tiles(again.slice(0, 14)) : '<div class="empty">Tap the heart on any product, or finish a shop, and your regular items will show up here for quick re-adding.</div>';
}
$('spall').onclick = () => { shop.section = '__offers'; shop.q = ''; $('gsearch').value = ''; go('shop'); renderShop(); };

/* ---------- shop ---------- */
const shop = { section: null, q: '', sort: 'default' };
const catHue = id => hash(id) % 360;
function sortList(list) {
  const price = p => D.offerBy[p.code]?.type === 'percent' ? Math.round(p.price * (1 - D.offerBy[p.code].pct / 100)) : p.price;
  const l = [...list];
  if (shop.sort === 'low') l.sort((a, b) => price(a) - price(b)); else if (shop.sort === 'high') l.sort((a, b) => price(b) - price(a));
  else if (shop.sort === 'az') l.sort((a, b) => a.name.localeCompare(b.name)); else if (shop.sort === 'deals') l.sort((a, b) => !!D.offerBy[b.code] - !!D.offerBy[a.code]);
  return l;
}
function search(q) {
  q = q.toLowerCase();
  return D.products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().startsWith(q) || p.barcode === q)
    .sort((a, b) => b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q) || a.name.localeCompare(b.name));
}
function renderShop() {
  let list = null, title = 'Shop by aisle';
  if (shop.q) { list = search(shop.q); title = `Results for “${shop.q}”`; }
  else if (shop.section === '__recipes') { list = []; title = 'Recipes'; }
  else if (shop.section === '__offers') { list = D.offers.map(o => D.byCode[o.code]); title = 'Specials'; }
  else if (shop.section) { list = D.products.filter(p => p.section === shop.section); const s = D.secById[shop.section]; title = s.label; }
  $('shoptitle').textContent = title; $('shopback').hidden = !list; $('sort').hidden = !list || shop.section === '__recipes';
  if (shop.section === '__recipes' && !shop.q) return renderRecipes();
  if (!list) {
    const collage = ids => { const imgs = ids.map(c => D.byCode[c]).filter(p => p && imgSrc(p.code)).slice(0, 4); return imgs.length ? `<span class="collage">${imgs.map(p => `<img src="${imgSrc(p.code)}" alt="" loading="lazy">`).join('')}</span>` : `<span class="collage ph1">${ICON.bag}</span>`; };
    const cat = (id, ids, label, n) => `<button class="cat" data-sec="${id}">${collage(ids)}<b>${label}</b><small>${n}</small></button>`;
    $('shopbody').innerHTML = `<div class="cats">${cat('__offers', D.offers.map(o => o.code), 'Specials', `${D.offers.length} deals`)}${cat('__recipes', [], 'Recipes', `${D.recipes.length} recipes · add all ingredients`).replace(/<span class="collage[^]*?<\/span>/, `<span class="collage rc">${D.recipes.map(r => recipeImg(r.id)).filter(Boolean).slice(0, 4).map(s => `<img src="${s}" alt="" loading="lazy">`).join('') || ICON.utensils}</span>`)}${D.layout.sections.map(s => cat(s.id, D.products.filter(p => p.section === s.id).map(p => p.code), s.label, s.blurb || `${D.products.filter(p => p.section === s.id).length} items`)).join('')}</div>`;
    $('shopbody').querySelectorAll('.cat').forEach(b => b.onclick = () => { shop.section = b.dataset.sec; renderShop(); $('views').scrollTop = 0; });
  } else $('shopbody').innerHTML = list.length ? `<div class="grid">${tiles(sortList(list))}</div>` : '<div class="empty">No product found. Try another name, like “sugar” or “paneer”.</div>';
}
$('shopback').onclick = () => { shop.section = null; shop.q = ''; $('gsearch').value = ''; renderShop(); };
$('sort').onchange = e => { shop.sort = e.target.value; renderShop(); };
$('gsearch').addEventListener('input', e => { shop.q = e.target.value.trim(); if (shop.q) shop.section = null; if (view !== 'shop') go('shop'); renderShop(); });
$('gsearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const p = D.byBarcode[e.target.value.trim()]; if (p) { add(p.code); e.target.value = ''; shop.q = ''; renderShop(); } } });


/* ---------- recipes ---------- */
const PERISHABLE = new Set(['seafood', 'frozen', 'fruits-greens', 'dairy', 'bakery']);   // scaled with servings; dry goods stay at 1 pack
const RFILTERS = [['all', 'All'], ['quick', 'Quick & easy'], ['veg', 'Veg'], ['non-veg', 'Non-veg'], ['dessert', 'Dessert'], ['Breakfast', 'Breakfast'], ['Dinner', 'Dinner'], ['Drinks', 'Drinks'], ['Snack', 'Snack']];
let rFilter = 'all';
const rMatch = r => rFilter === 'all' || r.tags.includes(rFilter) || r.course === rFilter;
const dots = n => `<span class="dots" aria-label="Difficulty ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const diffN = r => ({ Easy: 2, Medium: 3, Hard: 4 }[r.level] || 2);
const prepOf = r => Math.max(5, Math.round(r.minutes * 0.3 / 5) * 5), cookOf = r => Math.max(5, r.minutes - prepOf(r));
const mins = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;
const estServe = r => Math.round(r.ingredients.reduce((s, i) => s + lineCalc(i.code, 1).total, 0) / r.serves);
const rPhoto = (r, alt = true) => recipeImg(r.id) ? `<img src="${recipeImg(r.id)}" alt="${alt ? r.title : ''}" loading="lazy">` : `<div class="ph">${ICON.utensils}</div>`;
const bookmark = r => `<button class="bm${isSaved(r.id) ? ' on' : ''}" data-save="${r.id}" aria-label="${isSaved(r.id) ? 'Remove from saved' : 'Save recipe'}">${ICON.bookmark}</button>`;
const wideCard = r => `<article class="wcard" data-recipe="${r.id}" tabindex="0"><div class="wimg">${rPhoto(r)}</div><div class="wbody"><b>${r.title}</b><div class="wfacts"><div class="fx"><small>Prep</small><b>${mins(prepOf(r))}</b></div><div class="fx"><small>Cook</small><b>${mins(cookOf(r))}</b></div><div class="fx"><small>Difficulty</small>${dots(diffN(r))}</div></div><span class="est">Est. ${inr(estServe(r))} per serve</span></div></article>`;
const tallCard = r => `<article class="pcard" data-recipe="${r.id}" tabindex="0"><div class="pimg">${rPhoto(r)}${bookmark(r)}</div><div class="pb"><b>${r.title}</b><div class="pm"><span>${mins(r.minutes)}</span>${dots(diffN(r))}</div><span class="est">Est. ${inr(estServe(r))} per serve</span></div></article>`;
const POPULAR = ['paneer-butter-masala', 'veg-biryani', 'dal-tadka', 'pancakes', 'masala-chai', 'chole-masala', 'brownies', 'pasta-arrabbiata', 'poha', 'veg-sandwich', 'fish-curry', 'smoothie-bowl'];
const RIDEAS = [['quick', 'Quick & easy'], ['Breakfast', 'Breakfast'], ['Dinner', 'Dinner'], ['veg', 'Vegetarian'], ['non-veg', 'Non-veg'], ['dessert', 'Desserts'], ['Drinks', 'Drinks'], ['Snack', 'Snacks']];
function renderRecipeHome() {
  const dinners = D.recipes.filter(r => r.course === 'Dinner'), week = Math.floor(Date.now() / 6048e5), pick = [0, 1, 2].map(i => dinners[(week + i) % dinners.length]);
  $('h-dinner').innerHTML = pick.map(wideCard).join('');
  $('h-circs').innerHTML = RIDEAS.map(([k, l]) => { const r = D.recipes.find(x => (x.tags.includes(k) || x.course === k) && recipeImg(x.id)) || D.recipes.find(x => x.tags.includes(k) || x.course === k); return r ? `<button class="circ" data-rf="${k}"><span class="cimg">${rPhoto(r, false)}</span>${l}</button>` : ''; }).join('');
  $('h-popular').innerHTML = POPULAR.map(id => D.recipes.find(r => r.id === id)).filter(Boolean).map(tallCard).join('');
  const saved = state.saved.map(id => D.recipes.find(r => r.id === id)).filter(Boolean);
  $('h-saved-sec').hidden = !saved.length; $('h-saved').innerHTML = saved.map(tallCard).join('');
}
$('views').addEventListener('click', e => {
  const sv = e.target.closest('[data-save]'); if (sv) { e.stopPropagation(); toggleSaved(sv.dataset.save); return; }
  const rf = e.target.closest('[data-rf]'); if (rf) { rFilter = rf.dataset.rf; shop.section = '__recipes'; shop.q = ''; $('gsearch').value = ''; go('shop'); renderShop(); return; }
  const rc = e.target.closest('[data-recipe]'); if (rc) openRecipe(rc.dataset.recipe);
});
$('views').addEventListener('keydown', e => { if (e.key === 'Enter') { const rc = e.target.closest('[data-recipe]'); if (rc) openRecipe(rc.dataset.recipe); } });
function renderRecipes() {
  const list = D.recipes.filter(rMatch);
  $('shopbody').innerHTML = `<div class="chips">${RFILTERS.map(([k, l]) => `<button class="chip${rFilter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="rgrid">${list.map(r => `<article class="pcard" style="width:auto" data-recipe="${r.id}" tabindex="0"><div class="pimg">${rPhoto(r)}${bookmark(r)}</div><div class="pb"><b>${r.title}</b><div class="pm"><span>${mins(r.minutes)}</span>${dots(diffN(r))}<span>Serves ${r.serves}</span></div><span class="est">Est. ${inr(estServe(r))} per serve</span></div></article>`).join('')}</div>`;
  $('shopbody').querySelectorAll('.chip').forEach(b => b.onclick = () => { rFilter = b.dataset.f; renderRecipes(); });
}
const FR = { 0: '', .25: '¼', .5: '½', .75: '¾' };
function scaleAmount(str, ratio) {
  const m = str.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)(.*)$/); if (!m) return str;
  let v = m[1].includes('/') ? m[1].split('/').reduce((a, b) => a / b) : parseFloat(m[1]); v *= ratio;
  v = v >= 10 ? Math.round(v) : Math.round(v * 4) / 4; const whole = Math.floor(v), frac = FR[v - whole];
  return `${whole || !frac ? whole : ''}${frac}${m[2]}`;
}
let cur = null;   // { r, servings, on:Set }
function openRecipe(id) { const r = D.recipes.find(x => x.id === id); cur = { r, servings: r.serves, on: new Set(r.ingredients.map(i => i.code)) }; drawRecipe(); go('recipe'); }
const ingQty = (r, code) => PERISHABLE.has(D.byCode[code].section) ? Math.max(1, Math.ceil(cur.servings / r.serves)) : 1;
function drawRecipe() {
  const { r } = cur, ratio = cur.servings / r.serves, st = $('views').scrollTop;
  const rows = r.ingredients.map(i => { const p = D.byCode[i.code], q = ingQty(r, i.code), o = D.offerBy[i.code], c = lineCalc(i.code, q), on = cur.on.has(i.code);
    return `<div class="ing${on ? '' : ' off'}"><input type="checkbox" data-c="${i.code}" ${on ? 'checked' : ''} aria-label="Include ${p.name}"><div class="ing-main"><span class="th">${photo(p)}</span><div><div class="in">${p.name}${q > 1 ? ` × ${q}` : ''}</div><div class="ia">${scaleAmount(i.amount, ratio)}</div></div></div><div class="ip">${c.saving ? `<s class="was">${inr(c.orig)}</s> ` : ''}<b>${inr(c.total)}</b></div>${o ? `<div class="dl red">${dealLabel(o)}</div>` : ''}</div>`; }).join('');
  const sel = r.ingredients.filter(i => cur.on.has(i.code)), total = sel.reduce((s, i) => s + lineCalc(i.code, ingQty(r, i.code)).total, 0);
  $('recipepage').innerHTML = `<button class="rback" id="rback">← Back</button><h1 class="rtitle">${r.title}</h1><div class="rsub">${r.course} · ${r.tags.join(' · ')}</div>
    <div class="rhero">${rPhoto(r)}</div>
    <div class="rfacts card"><div class="fx"><small>Prep</small><b>${mins(prepOf(r))}</b></div><div class="fx"><small>Cook</small><b>${mins(cookOf(r))}</b></div><div class="fx"><small>Serves</small><b>${r.serves}</b></div><div class="fx"><small>Difficulty</small>${dots(diffN(r))}</div><div class="racts">${bookmark(r)}</div></div>
    <div class="rcols"><div><h3>${r.ingredients.length} Ingredients</h3><div class="card"><div class="servrow"><span>Number of servings</span><span class="stepper"><button data-s="-1" aria-label="Fewer servings">−</button><span>${cur.servings}</span><button data-s="1" aria-label="More servings">+</button></span></div>${rows}<div class="pantry-note">Fresh items scale with servings. Spices and dry goods are added as one pack, which covers several meals.</div></div>
        <div class="radd-wrap"><button class="btn" id="radd" ${sel.length ? '' : 'disabled'}>Add ${sel.length} item${sel.length === 1 ? '' : 's'} to trolley · ${inr(total)}</button></div></div>
      <div><h3>Description</h3><p class="rdesc">${r.blurb}</p><h3>Method</h3>${r.steps.map((s, i) => `<div class="card step"><small>Step ${i + 1} of ${r.steps.length}</small><p>${s}</p></div>`).join('')}</div></div>`;
  $('views').scrollTop = st;
}
$('recipepage').addEventListener('click', e => {
  if (e.target.closest('#rback')) { go(prevView === 'recipe' ? 'shop' : prevView); return; }
  const s = e.target.closest('[data-s]'); if (s) { cur.servings = Math.min(12, Math.max(1, cur.servings + +s.dataset.s)); drawRecipe(); return; }
  if (e.target.closest('#radd')) {
    const { r } = cur, sel = r.ingredients.filter(i => cur.on.has(i.code));
    sel.forEach(i => add(i.code, ingQty(r, i.code), true));
    flash(`Added ${sel.length} ingredient${sel.length === 1 ? '' : 's'} for ${r.title} – check your trolley for deals`);
  }
});
$('recipepage').addEventListener('change', e => { const c = e.target.dataset?.c; if (!c) return; e.target.checked ? cur.on.add(c) : cur.on.delete(c); drawRecipe(); });

/* ---------- image credits ---------- */
$('credBtn').onclick = () => {
  const rows = Object.entries(D.images).filter(([, v]) => !v.none).map(([k, v]) => { const name = k.startsWith('recipe:') ? D.recipes.find(r => r.id === k.slice(7))?.title : D.byCode[k]?.name; return `<li><span>${name || k}</span><span><a href="${v.page}" target="_blank" rel="noopener">${v.src === 'off' ? 'Open Food Facts' : 'Wikipedia'}</a> · ${v.license}</span></li>`; }).join('');
  $('creditsbox').innerHTML = `<h3>Image credits</h3><p>Packaged-product photos are from Open Food Facts contributors (CC BY-SA 3.0). Fresh produce, fish and recipe photos are from Wikipedia / Wikimedia Commons under the licence shown for each image. Brand names and packaging belong to their owners; photos are used here for a demo only.</p><ul>${rows}</ul>`;
  $('credits').classList.add('show');
};
$('credits').addEventListener('click', e => { if (e.target === $('credits')) $('credits').classList.remove('show'); });

/* ---------- map ---------- */
function onHover(code, x, y) {
  const tip = $('tip'); if (!code) { tip.style.display = 'none'; return; }
  const p = D.byCode[code], s = D.secById[p.section]; tip.innerHTML = `<b>${p.name}</b><br>${p.code} · ${s.label}`; tip.style.display = 'block'; tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
let infoCode = null;
function showInfo(code, fly) {
  const r = scene.select(code, fly); if (!r) return; $('i-add').hidden = false;
  const p = D.byCode[code], sec = D.secById[p.section], o = D.offerBy[code]; infoCode = code;
  $('i-name').textContent = p.name; $('i-code').textContent = p.code;
  $('i-meta').innerHTML = `<b>${sec.label}</b> (zone ${sec.number})<br>Shelf row ${r.row} from the top · position ${r.col} of ${sec.cols}<br>${priceHTML(p)} ${o ? `<span class="red">${dealLabel(o)}</span>` : ''}`;
  $('info').classList.add('show');
}
function locate(code) { go('map'); showInfo(code, true); }
$('i-add').onclick = () => infoCode && add(infoCode);
$('i-clear').onclick = () => { scene.clear(); infoCode = null; $('info').classList.remove('show'); scene.flyHome(); };
function planRoute() {
  const codes = Object.keys(state.cart); if (!codes.length) return;
  go('map'); const r = scene.selectRoute(codes); if (!r) return;
  infoCode = null; $('i-name').textContent = 'Route through your trolley'; $('i-code').textContent = `${r.order.length} item${r.order.length > 1 ? 's' : ''}`;
  $('i-meta').innerHTML = 'The orange cart visits each marked shelf in the quickest order, starting from the entry.'; $('i-add').hidden = true; $('info').classList.add('show');
}
$('route').onclick = planRoute;
$('b-rotate').onclick = e => { scene.setAutoRotate(!scene.autoRotate); e.currentTarget.classList.toggle('on', scene.autoRotate); };
$('b-top').onclick = () => scene.flyTop();
$('b-reset').onclick = () => { scene.setAutoRotate(false); $('b-rotate').classList.remove('on'); scene.flyHome(); };
D.layout.sections.forEach(s => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = `${s.icon} ${s.label}`; b.onclick = () => scene.flyToSection(s.id); $('mapchips').appendChild(b); });

/* ---------- trolley ---------- */
function renderCart() {
  const T = totals(), n = cartCount();
  $('ccount').textContent = n ? `(${n} item${n > 1 ? 's' : ''})` : '';
  $('lines').innerHTML = T.lines.length ? '' : '<div class="empty">Your trolley is empty. Scan an item, or add one from Home or Shop.</div>';
  for (const l of T.lines) {
    const p = D.byCode[l.c], d = document.createElement('div'); d.className = 'line';
    d.innerHTML = `<span class="n"><span class="th">${photo(p)}</span>${p.name}</span><span class="qty"><button data-d="-1" aria-label="Remove one">−</button>${l.q}<button data-d="1" aria-label="Add one">+</button></span><span class="c">${l.c} · ${priceHTML(p)}</span><span class="c" style="text-align:right">${l.saving ? `<s class="was">${inr(l.orig)}</s> ` : ''}<b style="color:var(--ink)">${inr(l.total)}</b></span>${l.remind ? `<span class="deal-row red">${l.remind}</span>` : l.earned ? `<span class="deal-row green">✓ ${l.earned} · saved ${inr(l.saving)}</span>` : ''}`;
    d.querySelector('.n').onclick = () => locate(l.c);
    d.querySelectorAll('.qty button').forEach(b => b.onclick = () => add(l.c, +b.dataset.d, true));
    $('lines').appendChild(d);
  }
  $('csub').textContent = inr(T.orig);
  $('csaverow').hidden = !T.saving; $('csave').textContent = '−' + inr(T.saving);
  $('usepts').hidden = !(T.blocks > 0 || state.usePoints); $('usepts-cb').checked = state.usePoints && T.blocks > 0;
  $('usepts-t').textContent = T.blocks ? `Use ${T.blocks * 100} points (−${inr(T.blocks * 10)})` : 'Not enough points for this trolley';
  $('ctot').textContent = inr(T.pay); $('cgst').textContent = `incl. GST ${inr(T.gst)}`; $('cearn').textContent = `${T.earn} points`;
  $('checkout').disabled = !T.lines.length; $('route').disabled = !T.lines.length; $('nbadge').textContent = n; $('nbadge').hidden = !n;
  $('ptsval').textContent = state.points;
}
$('usepts-cb').onchange = e => setUsePoints(e.target.checked);
$('cclear').onclick = clearCart;

/* ---------- scanning ---------- */
const resolve = raw => D.byBarcode[raw.trim()] || D.byCode[raw.trim().toUpperCase()] || null;
const scanner = initScanner({ resolve, onScan: p => add(p.code, 1, true) });
$('camBtn').onclick = $('n-scan').onclick = () => scanner.open();
function scanValue(v) { const p = resolve(v) || D.products.find(x => x.name.toLowerCase() === v.trim().toLowerCase()); if (!p) { flash('Item not found: ' + v); return false; } add(p.code); return true; }
$('scan').addEventListener('keydown', e => { if (e.key === 'Enter' && scanValue(e.target.value)) e.target.value = ''; });
$('scanAdd').onclick = () => { if (scanValue($('scan').value)) $('scan').value = ''; };

/* ---------- checkout (simulated payment) ---------- */
function openPay() {
  const T = totals(); let method = 'UPI';
  const row = (a, b, cls = '') => `<div class="rline ${cls}"><span>${a}</span><span>${b}</span></div>`;
  const lines = T.lines.map(l => row(`${l.q} × ${D.byCode[l.c].name}`, `${l.saving ? `<s class="was">${inr(l.orig)}</s> ` : ''}${inr(l.total)}`)).join('');
  $('paybox').innerHTML = `<h3>Checkout</h3>${lines}<hr style="border:0;border-top:1px solid var(--line)">${row('Subtotal', inr(T.orig))}${T.saving ? row('Specials savings', '−' + inr(T.saving), 'green') : ''}${T.redeem ? row(`Points redeemed (${T.blocks * 100})`, '−' + inr(T.redeem), 'green') : ''}
    <div class="rline" style="font-weight:800;font-size:17px"><span>Total</span><span>${inr(T.pay)}</span></div>${row('Includes GST', inr(T.gst))}
    <p class="green" style="font-size:12px;margin:8px 0 0">${ICON.star} You'll earn ${T.earn} points${T.saving + T.redeem ? ` · you're saving ${inr(T.saving + T.redeem)}` : ''}</p>
    <div class="methods"><button data-m="UPI" class="on">UPI</button><button data-m="Card">Card</button><button data-m="Wallet">Wallet</button></div>
    <div style="display:flex;gap:8px"><button class="btn ghost" id="payCancel">Back</button><button class="btn" id="payGo" style="flex:1">Pay ${inr(T.pay)}</button></div>
    <p style="font-size:11px;color:var(--muted);margin:10px 0 0">Demo only – no real payment is taken.</p>`;
  $('pay').classList.add('show');
  $('paybox').querySelectorAll('.methods button').forEach(b => b.onclick = () => { method = b.dataset.m; $('paybox').querySelectorAll('.methods button').forEach(x => x.classList.toggle('on', x === b)); });
  $('payCancel').onclick = () => $('pay').classList.remove('show');
  $('payGo').onclick = () => {
    $('payGo').disabled = true; $('payGo').textContent = 'Processing…';
    setTimeout(() => {
      const id = 'BSM-' + Date.now().toString(36).toUpperCase(), when = new Date().toLocaleString();
      completeOrder(T); scene.clear(); $('info').classList.remove('show'); go('map'); scene.flyToExit(); scene.openExit(8);
      $('paybox').innerHTML = `<div class="ok"><div class="tick">${ICON.check}</div><h3>Payment successful</h3><p style="color:var(--muted);font-size:13px">Order ${id}<br>${when} · paid ${inr(T.pay)} via ${method}</p>${T.saving + T.redeem ? `<p class="green">You saved ${inr(T.saving + T.redeem)} today!</p>` : ''}<p>${ICON.star} +${T.earn} points · balance ${state.points}</p><p>The exit gate is open – thank you for shopping!</p><button class="btn" id="payDone">Done</button></div>`;
      $('payDone').onclick = () => { $('pay').classList.remove('show'); go('home'); };
    }, 1200);
  };
}
$('checkout').onclick = openPay;

/* ---------- assistant ---------- */
initChat({ onAction: a => { if (a.type === 'add') add(a.code, a.qty, true); else if (a.type === 'route') locate(a.code); } });

/* ---------- boot ---------- */
subscribe(() => { renderCart(); refreshTiles(); document.querySelectorAll('.bm').forEach(b => b.classList.toggle('on', isSaved(b.dataset.save))); const sig = state.favs.join() + '|' + Object.keys(state.bought).join() + '|' + state.saved.join(); if (view === 'home' && sig !== homeSig) renderHome(); });
renderCart(); renderHome(); renderShop();
$('loading').classList.add('hide');
const item = new URLSearchParams(location.search).get('item');
if (item && D.byCode[item.toUpperCase()]) locate(item.toUpperCase());
window.__store = { add, locate, go, state, scene, D };
