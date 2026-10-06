// Data, pricing, trolley, points, favourites. No DOM in here.
export const D = { layout: null, products: [], offers: [], recipes: [], images: {}, byCode: {}, byBarcode: {}, offerBy: {}, secById: {} };

export async function loadData() {
  const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  const [layout, products, offers, recipes] = await Promise.all([get('data/store-layout.json'), get('data/products.json'), get('data/offers.json'), get('data/recipes.json')]);
  const images = await get('data/images.json').catch(() => ({}));
  const rimgs = await get('data/recipe-images.json').catch(() => ({}));
  for (const [id, v] of Object.entries(rimgs)) images['recipe:' + id] = v;
  Object.assign(D, { layout, products, offers, recipes, images });
  D.byCode = Object.fromEntries(products.map(p => [p.code, p]));
  D.byBarcode = Object.fromEntries(products.map(p => [p.barcode, p]));
  D.offerBy = Object.fromEntries(offers.map(o => [o.code, o]));
  D.secById = Object.fromEntries(layout.sections.map(s => [s.id, s]));
}

/* ---------- formatting & offers (prices include GST) ---------- */
export const inr = n => '₹' + n.toLocaleString('en-IN');
export const dealLabel = o => o.type === 'percent' ? `${o.pct}% OFF` : o.type === 'multibuy' ? `${o.qty} for ${inr(o.price)}` : `Buy ${o.buy} get ${o.free} free`;
export const unitPrice = p => { const o = D.offerBy[p.code]; return o && o.type === 'percent' ? Math.round(p.price * (1 - o.pct / 100)) : p.price; };
export const priceHTML = p => { const o = D.offerBy[p.code]; return o && o.type === 'percent' ? `<s class="was">${inr(p.price)}</s> <b class="now">${inr(unitPrice(p))}</b>` : `<b class="now">${inr(p.price)}</b>`; };

/** price of `qty` of a product with its offer applied, plus status lines for the trolley */
export function lineCalc(code, qty) {
  const p = D.byCode[code], o = D.offerBy[code], orig = p.price * qty;
  if (!o) return { total: orig, orig, saving: 0, earned: '', remind: '' };
  if (o.type === 'percent') { const total = unitPrice(p) * qty; return { total, orig, saving: orig - total, earned: `${o.pct}% off applied`, remind: '' }; }
  if (o.type === 'multibuy') {
    const sets = Math.floor(qty / o.qty), r = qty % o.qty, total = sets * o.price + r * p.price;
    return { total, orig, saving: orig - total, earned: sets ? `${sets} × ${o.qty} for ${inr(o.price)} applied` : '',
      remind: r ? `${o.qty} for ${inr(o.price)} – add ${o.qty - r} more to save ${inr(p.price * o.qty - o.price)}` : '' };
  }
  const g = o.buy + o.free, sets = Math.floor(qty / g), r = qty % g, total = (sets * o.buy + r) * p.price;
  return { total, orig, saving: orig - total, earned: sets ? `${sets * o.free} free item${sets * o.free > 1 ? 's' : ''} applied` : '',
    remind: r ? `🎁 Buy ${o.buy} get ${o.free} free – add ${g - r} more` : '' };
}

/* ---------- product photos (data/images.json, files in assets/products and assets/recipes) ---------- */
export const imgSrc = code => (D.images[code] && !D.images[code].none) ? `assets/products/${code}.jpg` : null;
export const recipeImg = id => (D.images['recipe:' + id] && !D.images['recipe:' + id].none) ? `assets/recipes/${id}.jpg` : null;
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const tint = p => `hsl(${hash(p.name) % 360} 75% 92%)`;

/* ---------- persistent state ---------- */
const load = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
export const state = { cart: {}, points: 320, usePoints: false, favs: [], bought: {}, saved: [] };   // 320 = demo starting balance
const subs = new Set();
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach(f => f());
export function initState() {
  state.cart = load('bsm-cart', {}); state.points = +load('bsm-points', 320) || 0; state.usePoints = !!load('bsm-usepts', false);
  state.favs = load('bsm-favs', []); state.bought = load('bsm-bought', {}); state.saved = load('bsm-saved', []);
  for (const c of Object.keys(state.cart)) if (!D.byCode[c]) delete state.cart[c];
  state.favs = state.favs.filter(c => D.byCode[c]);
}
const persist = () => { save('bsm-cart', state.cart); save('bsm-points', state.points); save('bsm-usepts', state.usePoints); save('bsm-favs', state.favs); save('bsm-bought', state.bought); save('bsm-saved', state.saved); emit(); };

export function addToCart(code, qty = 1) {
  if (!D.byCode[code]) return;
  state.cart[code] = (state.cart[code] || 0) + qty; if (state.cart[code] <= 0) delete state.cart[code];
  persist(); return lineCalc(code, state.cart[code] || 0);
}
export const clearCart = () => { state.cart = {}; persist(); };
export const setUsePoints = v => { state.usePoints = v; persist(); };
export const isSaved = id => state.saved.includes(id);
export function toggleSaved(id) { state.saved = isSaved(id) ? state.saved.filter(x => x !== id) : [id, ...state.saved]; persist(); }
export const isFav = c => state.favs.includes(c);
export function toggleFav(c) { state.favs = isFav(c) ? state.favs.filter(x => x !== c) : [c, ...state.favs]; persist(); }
export const cartCount = () => Object.values(state.cart).reduce((a, b) => a + b, 0);
/** items to show under "Buy again": hearted first, then most-bought */
export function buyAgain() {
  const bought = Object.entries(state.bought).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  return [...new Set([...state.favs, ...bought])].filter(c => D.byCode[c]).map(c => D.byCode[c]);
}

export function totals() {
  const lines = Object.entries(state.cart).map(([c, q]) => ({ c, q, ...lineCalc(c, q) }));
  const orig = lines.reduce((s, l) => s + l.orig, 0), total = lines.reduce((s, l) => s + l.total, 0);
  const blocks = Math.min(Math.floor(state.points / 100), Math.floor(total / 10)), redeem = state.usePoints ? blocks * 10 : 0, pay = total - redeem;
  return { lines, orig, saving: orig - total, total, blocks, redeem, pay, gst: Math.round(pay * 5 / 105), earn: Math.floor(pay / 10) };
}
/** called after a successful (simulated) payment */
export function completeOrder(T) {
  state.points = state.points - (state.usePoints ? T.blocks * 100 : 0) + T.earn; state.usePoints = false;
  for (const l of T.lines) state.bought[l.c] = (state.bought[l.c] || 0) + l.q;
  state.cart = {}; persist();
}
