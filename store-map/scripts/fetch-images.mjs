// Fetches a free-licence photo for each product and records its source in data/images.json.
//   - Open Food Facts (CC BY-SA 3.0) for packaged goods
//   - Wikipedia / Wikimedia Commons for fresh produce and fish
// Resumable: re-running skips products already in data/images.json. Usage: node scripts/fetch-images.mjs [--only CODE,CODE]
// Needs `sharp` (npm i sharp, dev only). Be polite: Open Food Facts allows ~10 search requests per minute.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const outFile = path.join(root, 'data/images.json');
const imgDir = path.join(root, 'assets/products');
const UA = 'BiteSpeedMartDemo/1.0 (educational project)';
const db = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const save = () => fs.writeFileSync(outFile, JSON.stringify(db, null, 1));

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      const t = await r.text();
      if (r.ok) return JSON.parse(t);
    } catch {}
    await sleep(15000 * (i + 1));
  }
  return null;
}
async function saveImage(code, url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return false;
  const buf = Buffer.from(await r.arrayBuffer());
  await sharp(buf).resize(360, 360, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(imgDir, code + '.jpg'));
  return true;
}
const stem = w => w.replace(/ies$/, 'y').replace(/s$/, '');
const tokens = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
const nameMatches = (qTokens, text) => { const t = tokens(text).map(stem); return qTokens.every(q => { const s = stem(q); return t.some(w => w === s || (s.length > 3 && (w.startsWith(s) || (w.length > 3 && s.startsWith(w))))); }); };

/* ---------- Open Food Facts ---------- */
async function fromOFF(p) {
  const qt = tokens(p.name), attempts = [qt.join(' ')];
  if (qt.length >= 3) attempts.push(qt.slice(-2).join(' '));
  for (const [k, terms] of attempts.entries()) {
    for (const india of [true, false]) {
      const u = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(terms)}&search_simple=1&action=process&json=1&page_size=40&sort_by=unique_scans_n&fields=code,product_name,brands,image_front_url,countries_tags` + (india ? '&tagtype_0=countries&tag_contains_0=contains&tag_0=india' : '');
      const d = await getJSON(u); await sleep(6500);
      const hit = d?.products?.find(x => x.image_front_url && x.product_name && nameMatches(tokens(terms), x.product_name));
      if (hit && await saveImage(p.code, hit.image_front_url)) return { src: 'off', page: `https://world.openfoodfacts.org/product/${hit.code}`, title: hit.product_name, brand: hit.brands || '', license: 'CC BY-SA 3.0', credit: 'Open Food Facts contributors' };
      if (india && d && d.products?.length) break;      // India results existed but none matched: try next query instead of worldwide
    }
  }
  return null;
}

/* ---------- Wikipedia (fresh produce and fish, by exact article title) ---------- */
const WIKI = {
  Apples: 'Apple', Bananas: 'Banana', Oranges: 'Orange (fruit)', Mangoes: 'Mango', Grapes: 'Grape', Watermelon: 'Watermelon', Muskmelon: 'Cantaloupe', Papaya: 'Papaya',
  Pineapple: 'Pineapple', Pomegranate: 'Pomegranate', Guava: 'Guava', Pears: 'Pear', Kiwi: 'Kiwifruit', Strawberries: 'Strawberry', Chikoo: 'Sapodilla', Potatoes: 'Potato',
  Onions: 'Onion', Tomatoes: 'Tomato', Carrots: 'Carrot', Cucumber: 'Cucumber', Spinach: 'Spinach', Coriander: 'Coriander', Mint: 'Mentha', 'Green Chillies': 'Chili pepper', Capsicum: 'Bell pepper',
  'Rohu Fish': 'Rohu', 'Catla Fish': 'Catla', Pomfret: 'Pomfret', Surmai: 'Narrow-barred Spanish mackerel', Bangda: 'Indian mackerel', Rawas: 'Fourfinger threadfin', Hilsa: 'Hilsa',
  Salmon: 'Atlantic salmon', Tuna: 'Tuna', Mackerel: 'Atlantic mackerel', Prawns: 'Shrimp', 'King Prawns': 'Penaeus monodon', Squid: 'Squid', Crab: 'Crab', 'Fish Fillets': 'Fish fillet',
};
async function fromWikipedia(p) {
  const title = WIKI[p.name]; if (!title) return null;
  const d = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&redirects=1&prop=pageimages&piprop=thumbnail|name&pithumbsize=500&format=json&origin=*`); await sleep(400);
  const pg = Object.values(d?.query?.pages || {})[0]; if (!pg?.thumbnail) return null;
  const info = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(pg.pageimage)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`); await sleep(400);
  const md = Object.values(info?.query?.pages || {})[0]?.imageinfo?.[0]?.extmetadata || {};
  const lic = md.LicenseShortName?.value || '';
  if (!/^(CC0|CC BY|CC BY-SA|Public domain|PD)/i.test(lic)) return null;
  if (!(await saveImage(p.code, pg.thumbnail.source))) return null;
  return { src: 'wikipedia', page: `https://en.wikipedia.org/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}`, title: pg.title, license: lic, credit: (md.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons contributors' };
}

/* ---------- recipe photos (Wikipedia dish articles) ---------- */
const RECIPE_WIKI = { 'paneer-butter-masala': 'Paneer tikka masala', 'veg-biryani': 'Biryani', 'dal-tadka': 'Dal', 'chole-masala': 'Chana masala', poha: 'Poha (food)', 'masala-chai': 'Masala chai',
  'pasta-arrabbiata': 'Arrabbiata sauce', 'veg-sandwich': 'Vegetable sandwich', 'fish-curry': 'Fish curry', pancakes: 'Pancake', brownies: 'Chocolate brownie', 'smoothie-bowl': 'Smoothie',
  'cold-coffee': 'Iced coffee', 'fruit-chaat': 'Chaat' };
async function recipePhotos() {
  for (const [id, title] of Object.entries(RECIPE_WIKI)) {
    const key = 'recipe:' + id; if (db[key] && !process.argv.includes('--force-recipes')) continue;
    const d = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&redirects=1&prop=pageimages&piprop=thumbnail|name&pithumbsize=800&format=json&origin=*`); await sleep(400);
    const pg = Object.values(d?.query?.pages || {})[0]; let r = null;
    if (pg?.thumbnail) {
      const info = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(pg.pageimage)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`); await sleep(400);
      const md = Object.values(info?.query?.pages || {})[0]?.imageinfo?.[0]?.extmetadata || {}, lic = md.LicenseShortName?.value || '';
      if (/^(CC0|CC BY|CC BY-SA|Public domain|PD)/i.test(lic)) {
        const res = await fetch(pg.thumbnail.source, { headers: { 'User-Agent': UA } });
        if (res.ok) { await sharp(Buffer.from(await res.arrayBuffer())).resize(800, 450, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(root, 'assets/recipes', id + '.jpg'));
          r = { src: 'wikipedia', page: `https://en.wikipedia.org/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}`, title: pg.title, license: lic, credit: (md.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons contributors' }; }
      }
    }
    db[key] = r || { none: true }; console.log('recipe', id, '->', r ? r.title : 'none'); save();
  }
}
if (process.argv.includes('--recipes')) { await recipePhotos(); process.exit(0); }

const FRESH = new Set(['fruits-greens', 'seafood']);
const todo = products.filter(p => (only ? only.includes(p.code) : !db[p.code]));
console.log(todo.length, 'products to fetch');
let n = 0;
for (const p of todo) {
  let r = null;
  try { r = FRESH.has(p.section) ? await fromWikipedia(p) : await fromOFF(p); } catch (e) { console.log('error', p.code, e.message); }
  db[p.code] = r || { none: true };
  console.log(`${++n}/${todo.length} ${p.code} ${p.name} -> ${r ? r.src + ': ' + r.title : 'none'}`);
  if (n % 5 === 0) save();
}
save(); console.log('done');
