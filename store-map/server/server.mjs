// Static file server + /api/chat (Claude shopping assistant with tool use).
// Run: ANTHROPIC_API_KEY=sk-ant-... npm start   (without a key the assistant falls back to simple keyword search)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'data/store-layout.json'), 'utf8'));
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const offerBy = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root, 'data/offers.json'), 'utf8')).map(o => [o.code, o]));
const dealText = o => !o ? null : o.type === 'percent' ? `${o.pct}% off` : o.type === 'multibuy' ? `${o.qty} for ₹${o.price}` : `Buy ${o.buy} get ${o.free} free`;
const lineTotal = (p, q) => { const o = offerBy[p.code]; if (!o) return p.price * q; if (o.type === 'percent') return Math.round(p.price * (1 - o.pct / 100)) * q; if (o.type === 'multibuy') return Math.floor(q / o.qty) * o.price + (q % o.qty) * p.price; const g = o.buy + o.free; return (Math.floor(q / g) * o.buy + (q % g)) * p.price; };
const sections = Object.fromEntries(layout.sections.map(s => [s.id, s]));
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const useClaude = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = useClaude ? new Anthropic() : null;

/* ---------- store lookups ---------- */
const describe = p => {
  const s = sections[p.section], row = Math.floor(p.slot / s.cols) + 1, col = (p.slot % s.cols) + 1;
  return { code: p.code, name: p.name, price: p.price, deal: dealText(offerBy[p.code]), location: `${s.label} (zone ${s.number}), shelf row ${row} from the top, position ${col} of ${s.cols}`, section: s.id };
};
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
function search(query, limit = 8) {
  const q = norm(query); if (!q.length) return [];
  const scored = products.map(p => {
    const n = norm(p.name), hay = n.join(' ') + ' ' + p.section.replace('-', ' ') + ' ' + p.code.toLowerCase();
    let score = 0;
    for (const t of q) { if (n.includes(t)) score += 3; else if (hay.includes(t)) score += 1; else if (t.length > 3 && n.some(w => w.startsWith(t.slice(0, -1)))) score += 1.5; }
    if (n.join(' ') === q.join(' ')) score += 5;
    return { p, score };
  }).filter(x => x.score >= q.length).sort((a, b) => b.score - a.score || a.p.name.length - b.p.name.length);
  return scored.slice(0, limit).map(x => describe(x.p));
}

/* ---------- Claude tools ---------- */
const tools = [
  { name: 'search_products', description: 'Search the store catalogue by product name, category word or code. Returns matches with price and exact shelf location. Call it once per distinct item the shopper mentions.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'list_section', description: 'List every product in one store section. Section ids: seafood, aisle-2A, aisle-2B, aisle-3A, aisle-3B, aisle-4A, aisle-4B, bakery, frozen, fruits-greens, dairy.',
    input_schema: { type: 'object', properties: { section: { type: 'string' } }, required: ['section'], additionalProperties: false } },
  { name: 'add_to_cart', description: 'Add a product (by exact code from search results) to the shopper\'s cart.',
    input_schema: { type: 'object', properties: { code: { type: 'string' }, quantity: { type: 'integer', minimum: 1 } }, required: ['code'], additionalProperties: false } },
  { name: 'show_route', description: 'Show the shopper the walking route and highlight a product on the 3D map. Use when they ask where something is or how to get to it.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'], additionalProperties: false } },
  { name: 'get_specials', description: 'List current special offers (discounts, multi-buy and buy-X-get-Y-free deals), optionally limited to one section id.',
    input_schema: { type: 'object', properties: { section: { type: 'string' } }, additionalProperties: false } },
  { name: 'get_cart', description: 'Get the current cart contents and total.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false } },
];
const SYSTEM = `You are the shopping assistant on a smart-cart screen in BiteSpeed Mart, a grocery store. Help shoppers find products, answer where things are, add items to their cart and suggest recipes or substitutes using ONLY products from the catalogue (always check with search_products; never invent items, prices or locations). Keep replies short and friendly (2-4 sentences, a short list is fine). When you name a product give its code and location. If something isn't stocked, say so and offer the closest alternative. Prices are in rupees (₹) and include GST. Items may carry a "deal" (percentage off, multi-buy such as '2 for ₹150', or 'Buy 2 get 1 free'): mention a deal whenever you recommend or add an item that has one, and when the shopper has fewer items than the deal needs, remind them how many more to add. There is also a get_specials tool for browsing current offers.`;

function runTool(name, input, ctx) {
  if (name === 'search_products') return search(input.query);
  if (name === 'list_section') return products.filter(p => p.section === input.section).map(p => `${p.code} ${p.name} ₹${p.price}`);
  if (name === 'add_to_cart' || name === 'show_route') {
    const p = products.find(x => x.code === input.code); if (!p) return { error: 'unknown code' };
    if (name === 'add_to_cart') { const q = input.quantity || 1; ctx.actions.push({ type: 'add', code: p.code, qty: q }); ctx.cart[p.code] = (ctx.cart[p.code] || 0) + q; return { added: p.name, quantity: q }; }
    ctx.actions.push({ type: 'route', code: p.code }); return { showing: describe(p) };
  }
  if (name === 'get_specials') return Object.keys(offerBy).map(c => products.find(p => p.code === c)).filter(p => p && (!input.section || p.section === input.section)).slice(0, 25).map(describe);
  if (name === 'get_cart') {
    const items = Object.entries(ctx.cart).map(([c, q]) => { const p = products.find(x => x.code === c); return p && { code: c, name: p.name, qty: q, price: p.price, deal: dealText(offerBy[p.code]), line_total: lineTotal(p, q) }; }).filter(Boolean);
    return { items, total: items.reduce((s, i) => s + i.line_total, 0), note: 'line_total already includes offers; prices include GST' };
  }
  return { error: 'unknown tool' };
}

async function chatClaude(messages, ctx) {
  for (let i = 0; i < 8; i++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 4096, system: SYSTEM, tools, messages, output_config: { effort: 'low' } });
    messages.push({ role: 'assistant', content: res.content });
    if (res.stop_reason === 'refusal') return "Sorry, I can't help with that one.";
    if (res.stop_reason !== 'tool_use') return res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    const results = res.content.filter(b => b.type === 'tool_use').map(b => ({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(runTool(b.name, b.input, ctx)) }));
    messages.push({ role: 'user', content: results });
  }
  return 'Sorry, that took too many steps – could you rephrase?';
}

/* ---------- offline fallback (no API key) ---------- */
function chatFallback(text, ctx) {
  const t = text.toLowerCase();
  const wantsAdd = /\b(add|buy|get me|need|want)\b/.test(t);
  const q = t.replace(/\b(where|is|are|the|can|you|find|me|i|a|an|some|please|add|to|my|cart|buy|get|need|want|located|location|of|do|have|does|how|much|price)\b/g, ' ');
  const hits = search(q, 3);
  if (!hits.length) return "I couldn't find that in our catalogue. Try another name (e.g. \"sugar\" or \"paneer\").";
  const top = hits[0];
  ctx.actions.push({ type: 'route', code: top.code });
  if (wantsAdd) { ctx.actions.push({ type: 'add', code: top.code, qty: 1 }); return `Added ${top.name} (₹${top.price}${top.deal ? ', ' + top.deal : ''}) to your cart. It's in ${top.location}.`; }
  return `${top.name} (${top.code}, ₹${top.price}${top.deal ? ' – ' + top.deal : ''}) is in ${top.location}. I've marked it on the map.` + (hits.length > 1 ? `\nAlso: ${hits.slice(1).map(h => h.name).join(', ')}.` : '');
}

/* ---------- http ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
const PUBLIC = ['index.html', 'js', 'data', 'assets', 'vendor'];
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let body = ''; for await (const c of req) { body += c; if (body.length > 2e6) return res.writeHead(413).end(); }
    try {
      const { messages = [], text = '', cart = {} } = JSON.parse(body);
      const ctx = { actions: [], cart: { ...cart } };
      let reply, history = messages;
      if (useClaude) { history = [...messages, { role: 'user', content: text }]; reply = await chatClaude(history, ctx); }
      else reply = chatFallback(text, ctx);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ reply, actions: ctx.actions, messages: history, mode: useClaude ? 'claude' : 'offline' }));
    } catch (e) {
      console.error(e); res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ reply: 'Sorry, the assistant hit an error. Please try again.', actions: [], messages: [] }));
    }
    return;
  }
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !PUBLIC.includes(rel.split('/')[0]) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not found');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 8000, () => console.log(`BiteSpeed Mart on http://localhost:${process.env.PORT || 8000}  (assistant: ${useClaude ? 'Claude ' + MODEL : 'offline fallback – set ANTHROPIC_API_KEY'})`));
