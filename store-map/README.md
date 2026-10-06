# BiteSpeed Mart – 3D store map

Low-poly, animated 3D model of the store (Three.js) built from `assets/floorplan.png`,
plus the product/location data the app will use.

## Run it
    cd store-map && npm install && npm start      # http://localhost:8000

**On a phone:** open the app on the same Wi-Fi at `http://<your-computer-ip>:8000`. Live camera scanning needs HTTPS
(browsers only allow the camera on `https://` or `localhost`) – deploy it (e.g. Railway) or tunnel it (`npx localtunnel --port 8000`,
ngrok). Over plain http the **Take / choose photo** button still scans a barcode from a photo.
Chrome/Edge/Android use the built-in `BarcodeDetector`; iPhone Safari/Firefox use the bundled ZXing library (`vendor/zxing.min.js`, MIT).

(`python3 -m http.server` works too.)

Deep link to a product: `http://localhost:8000/?item=2A17`

## Data (source of truth)
| File | What |
|---|---|
| `data/store-layout.json` | Every shelf/section/door as a rectangle in **floor-plan pixels**, which side shoppers pick from (`facing`), the walkway line (`walk`), and shelf grid (`tiers` × `cols`). |
| `data/products.json` | 430 products: `code` (e.g. `2A17`), `name`, `section`, `slot` (0-based index in the section). |
| `assets/floorplan.png` | Original floor plan. |

Product position = `section` + `slot`: `row = floor(slot / cols)` (0 = top shelf), `col = slot % cols`
(left→right or top→bottom of the plan).

Each product also has a `price` (₹, **placeholder values – replace with real ones**) and an `EAN-13` `barcode`
(generated; real shelf barcodes would replace these).

### Cleanups applied
- Duplicates merged (418 products): fresh breads/buns/pav/croissants/cream roll/fruit cake live only in **Bakery**;
  Rusk and Khari stay only in **4B**; Chocolate Milk only in **Dairy (C05)**. Slots/codes were not renumbered,
  so the removed spots (4B36, 4B39–45, 4B50, 4A37, 5-38, 5-39) are empty shelf gaps.
- `3A48` renamed **Fried Moong Dal** (a snack, different from raw Moong Dal 2B02).
- Frozen codes are now `FRZ-A01 … FRZ-A25`.

## Install it as an app (PWA)
The site is an installable web app: `manifest.webmanifest`, `sw.js` (offline cache of the whole shell, data and 3D library) and icons in `icons/`
(regenerate with `node scripts/make-icons.mjs`). Browsers only allow installing from **https** (or localhost), so deploy it first, e.g. on Railway:
set the service's *Root Directory* to `store-map`, start command `npm start` (it reads `PORT`).
- **Android / Chrome / Edge:** a green "Install BiteSpeed Mart" bar appears on Home (or use the browser's install button).
- **iPhone / Safari:** Share → Add to Home Screen (the bar shows this hint).
After a change, bump `VERSION` in `sw.js` so installed copies refresh.

### Railway, step by step
1. railway.com → **New Project → Deploy from GitHub repo** → pick `agharshu17/bitespeed`, branch `claude/practical-bohr-frok49` (or merge it into your main branch first).
2. Open the new service → **Settings → Source → Root Directory** → `store-map` (the repo root is an unrelated Java project).
3. **Settings → Networking → Generate Domain**. Railway builds with `store-map/railway.json` (`npm install --omit=dev`, then `npm start`) and serves over https.
4. Open the domain on your phone and install (see above). Nothing else to configure: no environment variables are needed.

## App layout
Bottom tabs (top menu on a computer): **Home** (this week's specials, buy again), **Shop** (aisle tiles, product grids with emoji icons,
sorting, search), a centre **Scan** button, **Map** (3D store with route to any item) and **Trolley** (items, savings, points, checkout).
The ♥ on a product adds it to "Buy again"; items you pay for are added there automatically. Code layout:
`index.html` (shell + styles), `js/app.js` (screens), `js/store.js` (data, prices, trolley, points), `js/scene.js` (3D), `js/scanner.js`.

## Icons
Products, aisles and recipes use emoji icons (picked by keyword in `js/store.js`, recipes carry their own in `data/recipes.json`), so there are no image files to manage.
`scripts/fetch-images.mjs` is an optional, unused helper that downloads free-licence photos if you ever want them.

## Trolley route
Trolley → **🧭 Plan my route** opens the Map, drops a marker on every item's shelf and walks the orange cart from the entry past
each one in a short walking order (nearest-first along the real walkways, pausing at each stop). **Clear route** resets it.

## Recipes
`data/recipes.json`: 55 recipes whose ingredients are catalogue codes; items the store doesn't sell (garlic, ginger, oil, lemon, okra, eggplant, cabbage, tahini, pita, feta, pizza base, curry leaves, lettuce) are listed under "Also needed (not sold in our store)" via an `extras` list. Shop → **Recipes** (filters: quick, veg, non-veg, dessert, breakfast, dinner).
The recipe page has a servings changer (fresh items scale up, spices and dry goods stay at one pack), a tick box per ingredient,
the method, and **Add N items** to put the ticked ingredients in the trolley (deals and reminders apply as usual).

## Offers & points
`data/offers.json` (sample deals, regenerate/edit freely): `percent` (`pct`), `multibuy` (`qty` for `price`) and `bogo`
(`buy` + `free`). Specials show first (strip at the top of the Find panel + "All specials"), the cart shows was/now prices,
savings and a **red reminder** such as "Buy 2 get 1 free – add 2 more" (also as a toast when you add the item).
Prices include GST. Reward points: earn 1 per ₹10 paid, redeem 100 points for ₹10 off at checkout (demo balance of 320 points,
kept in the browser).

## Features
- 3D: orbit/zoom, hover tooltips, search, section chips, animated cart route from the entry, auto-rotate, top view, sliding doors, ambient shoppers.
- **Self-checkout:** cart panel; add by typing/pasting a barcode or code and pressing Enter, with the 📷 button
  (camera barcode scan, Chrome/Edge via `BarcodeDetector`), from search (+), or by clicking a shelf item.
  Checkout shows savings, points and a **simulated** payment, then the exit gate opens. Cart persists in the browser.

`vendor/` holds Three.js (MIT) so it works offline.
