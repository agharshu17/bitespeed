// BiteSpeed Mart app shell: Home, Shop, Map, Trolley.
import { D, loadData, initState, state, subscribe, inr, dealLabel, priceHTML, lineCalc, emojiFor, tint,
  addToCart, clearCart, setUsePoints, isFav, toggleFav, cartCount, buyAgain, totals, completeOrder } from './store.js';
import { createScene } from './scene.js';
import { initScanner } from './scanner.js';
import { initChat } from './chat.js';

const $ = id => document.getElementById(id);
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

await loadData(); initState();
const scene = createScene($('mapwrap'), D, { onPick: code => showInfo(code, false), onHover });

/* ---------- toast ---------- */
let flashT;
function flash(msg, remind) {
  const f = $('flash'); f.classList.toggle('deal', !!remind);
  f.innerHTML = remind ? `✅ ${msg}<br><span class="red">${remind}</span>` : msg;
  f.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('show'), remind ? 3200 : 1600);
}
function add(code, qty = 1, quiet) {
  const calc = addToCart(code, qty);
  if (!quiet && qty > 0) flash(`Added ${D.byCode[code].name}`, calc?.remind);
}

/* ---------- navigation ---------- */
let view = 'home', homeSig = '';
function go(v) {
  view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'v-' + v));
  document.querySelectorAll('#tabs [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === v));
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
  return `<article class="tile" data-code="${p.code}"><div class="art" style="background:${tint(p)}">${emojiFor(p)}${o ? `<span class="badge">${dealLabel(o)}</span>` : ''}<button class="fav${isFav(p.code) ? ' on' : ''}" data-act="fav" aria-label="Favourite">♥</button></div>
    <div class="tn">${p.name}</div><button class="loc" data-act="loc">📍 ${sec.label}</button><div class="tp">${priceHTML(p)}</div><div class="ctl">${ctlHTML(p.code)}</div></article>`;
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
  homeSig = state.favs.join() + '|' + Object.keys(state.bought).join();
  const feat = D.offers.filter(o => o.featured).map(o => D.byCode[o.code]);
  $('h-specials').innerHTML = tiles(feat);
  const again = buyAgain();
  $('h-again').innerHTML = again.length ? tiles(again.slice(0, 14)) : '<div class="empty">Tap the ♥ on any product, or finish a shop, and your regular items will show up here for quick re-adding.</div>';
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
  else if (shop.section === '__recipes') { list = []; title = '🍳 Recipes'; }
  else if (shop.section === '__offers') { list = D.offers.map(o => D.byCode[o.code]); title = '🏷 Specials'; }
  else if (shop.section) { list = D.products.filter(p => p.section === shop.section); const s = D.secById[shop.section]; title = `${s.icon} ${s.label}`; }
  $('shoptitle').textContent = title; $('shopback').hidden = !list; $('sort').hidden = !list || shop.section === '__recipes';
  if (shop.section === '__recipes' && !shop.q) return renderRecipes();
  if (!list) {
    const cat = (id, emoji, label, n, hue) => `<button class="cat" data-sec="${id}" style="background:hsl(${hue} 70% 92%)"><span class="ce">${emoji}</span><b>${label}</b><small>${n}</small></button>`;
    $('shopbody').innerHTML = `<div class="cats">${cat('__offers', '🏷', 'Specials', `${D.offers.length} deals`, 8)}${cat('__recipes', '🍳', 'Recipes', `${D.recipes.length} recipes · add all ingredients`, 30)}${D.layout.sections.map(s => cat(s.id, s.icon, s.label, s.blurb || `${D.products.filter(p => p.section === s.id).length} items`, catHue(s.id))).join('')}</div>`;
    $('shopbody').querySelectorAll('.cat').forEach(b => b.onclick = () => { shop.section = b.dataset.sec; renderShop(); $('views').scrollTop = 0; });
  } else $('shopbody').innerHTML = list.length ? `<div class="grid">${tiles(sortList(list))}</div>` : '<div class="empty">No product found. Try another name, like “sugar” or “paneer”.</div>';
}
$('shopback').onclick = () => { shop.section = null; shop.q = ''; $('gsearch').value = ''; renderShop(); };
$('sort').onchange = e => { shop.sort = e.target.value; renderShop(); };
$('gsearch').addEventListener('input', e => { shop.q = e.target.value.trim(); if (shop.q) shop.section = null; if (view !== 'shop') go('shop'); renderShop(); });
$('gsearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const p = D.byBarcode[e.target.value.trim()]; if (p) { add(p.code); e.target.value = ''; shop.q = ''; renderShop(); } } });


/* ---------- recipes ---------- */
const PERISHABLE = new Set(['seafood', 'frozen', 'fruits-greens', 'dairy', 'bakery']);   // scaled with servings; dry goods stay at 1 pack
const RFILTERS = [['all', 'All'], ['quick', '⚡ Quick'], ['veg', '🥦 Veg'], ['non-veg', '🍗 Non-veg'], ['dessert', '🍰 Dessert'], ['Breakfast', 'Breakfast'], ['Dinner', 'Dinner']];
let rFilter = 'all';
const rMatch = r => rFilter === 'all' || r.tags.includes(rFilter) || r.course === rFilter;
function renderRecipes() {
  const list = D.recipes.filter(rMatch);
  $('shopbody').innerHTML = `<div class="chips">${RFILTERS.map(([k, l]) => `<button class="chip${rFilter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="rgrid">${list.map(r => `<button class="rcard" data-recipe="${r.id}"><div class="rtop" style="background:${r.color}22">${r.emoji}</div><div class="rbody"><b>${r.title}</b><span class="rmeta">⏱ ${r.minutes} min · 👥 Serves ${r.serves} · ${r.level}</span><span class="rblurb">${r.blurb}</span><span>${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span></div></button>`).join('')}</div>`;
  $('shopbody').querySelectorAll('.chip').forEach(b => b.onclick = () => { rFilter = b.dataset.f; renderRecipes(); });
  $('shopbody').querySelectorAll('.rcard').forEach(b => b.onclick = () => openRecipe(b.dataset.recipe));
}
const FR = { 0: '', .25: '¼', .5: '½', .75: '¾' };
function scaleAmount(str, ratio) {
  const m = str.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)(.*)$/); if (!m) return str;
  let v = m[1].includes('/') ? m[1].split('/').reduce((a, b) => a / b) : parseFloat(m[1]); v *= ratio;
  v = v >= 10 ? Math.round(v) : Math.round(v * 4) / 4; const whole = Math.floor(v), frac = FR[v - whole];
  return `${whole || !frac ? whole : ''}${frac}${m[2]}`;
}
let cur = null;   // { r, servings, on:Set }
function openRecipe(id) { const r = D.recipes.find(x => x.id === id); cur = { r, servings: r.serves, on: new Set(r.ingredients.map(i => i.code)) }; drawRecipe(); $('recipe').classList.add('show'); $('recipebox').scrollTop = 0; }
const ingQty = (r, code) => PERISHABLE.has(D.byCode[code].section) ? Math.max(1, Math.ceil(cur.servings / r.serves)) : 1;
function drawRecipe(keepScroll) {
  const { r } = cur, ratio = cur.servings / r.serves, st = $('recipebox').scrollTop;
  const rows = r.ingredients.map(i => { const p = D.byCode[i.code], q = ingQty(r, i.code), o = D.offerBy[i.code], c = lineCalc(i.code, q), on = cur.on.has(i.code);
    return `<div class="ing${on ? '' : ' off'}"><input type="checkbox" data-c="${i.code}" ${on ? 'checked' : ''} aria-label="Include ${p.name}"><div><div class="in">${emojiFor(p)} ${p.name}${q > 1 ? ` × ${q}` : ''}</div><div class="ia">${scaleAmount(i.amount, ratio)}</div></div><div class="ip">${c.saving ? `<s class="was">${inr(c.orig)}</s> ` : ''}<b>${inr(c.total)}</b></div>${o ? `<div class="dl red">${dealLabel(o)}</div>` : ''}</div>`; }).join('');
  const sel = r.ingredients.filter(i => cur.on.has(i.code)), total = sel.reduce((s, i) => s + lineCalc(i.code, ingQty(r, i.code)).total, 0);
  $('recipebox').innerHTML = `<div class="rhead" style="background:${r.color}22"><button class="rclose" aria-label="Close">✕</button><div class="big">${r.emoji}</div><h3>${r.title}</h3><p>${r.blurb}</p>
      <div class="facts"><span class="fact">⏱ ${r.minutes} min</span><span class="fact">${r.level}</span><span class="fact">${r.course}</span>${r.tags.map(t => `<span class="fact">${t}</span>`).join('')}</div></div>
    <div class="rbody"><div class="servrow"><span>Servings</span><span class="stepper"><button data-s="-1" aria-label="Fewer servings">−</button><span>${cur.servings}</span><button data-s="1" aria-label="More servings">+</button></span></div>
      <h4>Ingredients</h4>${rows}<div class="pantry-note">Fresh items scale with servings. Spices and dry goods are added as one pack, which covers several meals.</div>
      <h4>Method</h4><ol>${r.steps.map(s => `<li>${s}</li>`).join('')}</ol></div>
    <div class="rfoot"><button class="btn" id="radd" ${sel.length ? '' : 'disabled'}>Add ${sel.length} item${sel.length === 1 ? '' : 's'} · ${inr(total)}</button></div>`;
  if (keepScroll) $('recipebox').scrollTop = st;
}
$('recipe').addEventListener('click', e => {
  if (e.target === $('recipe') || e.target.closest('.rclose')) { $('recipe').classList.remove('show'); return; }
  const s = e.target.closest('[data-s]'); if (s) { cur.servings = Math.min(12, Math.max(1, cur.servings + +s.dataset.s)); drawRecipe(true); return; }
  if (e.target.id === 'radd') {
    const { r } = cur, sel = r.ingredients.filter(i => cur.on.has(i.code));
    sel.forEach(i => add(i.code, ingQty(r, i.code), true));
    $('recipe').classList.remove('show'); flash(`Added ${sel.length} ingredient${sel.length === 1 ? '' : 's'} for ${r.title} – check your trolley for deals`);
  }
});
$('recipe').addEventListener('change', e => { const c = e.target.dataset?.c; if (!c) return; e.target.checked ? cur.on.add(c) : cur.on.delete(c); drawRecipe(true); });

/* ---------- map ---------- */
function onHover(code, x, y) {
  const tip = $('tip'); if (!code) { tip.style.display = 'none'; return; }
  const p = D.byCode[code], s = D.secById[p.section]; tip.innerHTML = `<b>${p.name}</b><br>${p.code} · ${s.icon} ${s.label}`; tip.style.display = 'block'; tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
let infoCode = null;
function showInfo(code, fly) {
  const r = scene.select(code, fly); if (!r) return; $('i-add').hidden = false;
  const p = D.byCode[code], sec = D.secById[p.section], o = D.offerBy[code]; infoCode = code;
  $('i-name').textContent = p.name; $('i-code').textContent = p.code;
  $('i-meta').innerHTML = `📍 <b>${sec.icon} ${sec.label}</b> (zone ${sec.number})<br>Shelf row ${r.row} from the top · position ${r.col} of ${sec.cols}<br>${priceHTML(p)} ${o ? `<span class="red">${dealLabel(o)}</span>` : ''}`;
  $('info').classList.add('show');
}
function locate(code) { go('map'); showInfo(code, true); }
$('i-add').onclick = () => infoCode && add(infoCode);
$('i-clear').onclick = () => { scene.clear(); infoCode = null; $('info').classList.remove('show'); scene.flyHome(); };
function planRoute() {
  const codes = Object.keys(state.cart); if (!codes.length) return;
  go('map'); const r = scene.selectRoute(codes); if (!r) return;
  infoCode = null; $('i-name').textContent = '🧭 Route through your trolley'; $('i-code').textContent = `${r.order.length} item${r.order.length > 1 ? 's' : ''}`;
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
    d.innerHTML = `<span class="n">${emojiFor(p)} ${p.name}</span><span class="qty"><button data-d="-1" aria-label="Remove one">−</button>${l.q}<button data-d="1" aria-label="Add one">+</button></span><span class="c">${l.c} · ${priceHTML(p)}</span><span class="c" style="text-align:right">${l.saving ? `<s class="was">${inr(l.orig)}</s> ` : ''}<b style="color:var(--ink)">${inr(l.total)}</b></span>${l.remind ? `<span class="deal-row red">${l.remind}</span>` : l.earned ? `<span class="deal-row green">✓ ${l.earned} · saved ${inr(l.saving)}</span>` : ''}`;
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
  $('paybox').innerHTML = `<h3>🧾 Checkout</h3>${lines}<hr style="border:0;border-top:1px solid var(--line)">${row('Subtotal', inr(T.orig))}${T.saving ? row('Specials savings', '−' + inr(T.saving), 'green') : ''}${T.redeem ? row(`Points redeemed (${T.blocks * 100})`, '−' + inr(T.redeem), 'green') : ''}
    <div class="rline" style="font-weight:800;font-size:17px"><span>Total</span><span>${inr(T.pay)}</span></div>${row('Includes GST', inr(T.gst))}
    <p class="green" style="font-size:12px;margin:8px 0 0">⭐ You'll earn ${T.earn} points${T.saving + T.redeem ? ` · you're saving ${inr(T.saving + T.redeem)}` : ''}</p>
    <div class="methods"><button data-m="UPI" class="on">📱 UPI</button><button data-m="Card">💳 Card</button><button data-m="Wallet">👛 Wallet</button></div>
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
      $('paybox').innerHTML = `<div class="ok"><div class="tick">✅</div><h3>Payment successful</h3><p style="color:var(--muted);font-size:13px">Order ${id}<br>${when} · paid ${inr(T.pay)} via ${method}</p>${T.saving + T.redeem ? `<p class="green">You saved ${inr(T.saving + T.redeem)} today!</p>` : ''}<p>⭐ +${T.earn} points · balance ${state.points}</p><p>🚪 Exit gate is open – thank you for shopping!</p><button class="btn" id="payDone">Done</button></div>`;
      $('payDone').onclick = () => { $('pay').classList.remove('show'); go('home'); };
    }, 1200);
  };
}
$('checkout').onclick = openPay;

/* ---------- assistant ---------- */
initChat({ onAction: a => { if (a.type === 'add') add(a.code, a.qty, true); else if (a.type === 'route') locate(a.code); } });

/* ---------- boot ---------- */
subscribe(() => { renderCart(); refreshTiles(); const sig = state.favs.join() + '|' + Object.keys(state.bought).join(); if (view === 'home' && sig !== homeSig) renderHome(); });
renderCart(); renderHome(); renderShop();
$('loading').classList.add('hide');
const item = new URLSearchParams(location.search).get('item');
if (item && D.byCode[item.toUpperCase()]) locate(item.toUpperCase());
window.__store = { add, locate, go, state, scene, D };
