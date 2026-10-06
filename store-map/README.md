# BiteSpeed Mart – 3D store map

Low-poly, animated 3D model of the store (Three.js) built from `assets/floorplan.png`,
plus the product/location data the app will use.

## Run it
    cd store-map && npm install && npm start      # http://localhost:8000
    # optional: ANTHROPIC_API_KEY=sk-ant-... npm start   -> Claude-powered assistant
    #           (without a key the chat uses a simple offline keyword search)

**On a phone:** open the app on the same Wi-Fi at `http://<your-computer-ip>:8000`. Live camera scanning needs HTTPS
(browsers only allow the camera on `https://` or `localhost`) – deploy it (e.g. Railway) or tunnel it (`npx localtunnel --port 8000`,
ngrok). Over plain http the **Take / choose photo** button still scans a barcode from a photo.
Chrome/Edge/Android use the built-in `BarcodeDetector`; iPhone Safari/Firefox use the bundled ZXing library (`vendor/zxing.min.js`, MIT).

(`python3 -m http.server` also shows the 3D map and checkout, but the chat needs the Node server.)

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

## App layout
Bottom tabs (top menu on a computer): **Home** (this week's specials, buy again), **Shop** (aisle tiles, product grids with emoji icons,
sorting, search), a centre **Scan** button, **Map** (3D store with route to any item) and **Trolley** (items, savings, points, checkout).
The ♥ on a product adds it to "Buy again"; items you pay for are added there automatically. Code layout:
`index.html` (shell + styles), `js/app.js` (screens), `js/store.js` (data, prices, trolley, points), `js/scene.js` (3D), `js/scanner.js`, `js/chat.js`.

## Recipes
`data/recipes.json`: 14 recipes whose ingredients are catalogue codes. Shop → **Recipes** (filters: quick, veg, non-veg, dessert, breakfast, dinner).
The recipe page has a servings changer (fresh items scale up, spices and dry goods stay at one pack), a tick box per ingredient,
the method, and **Add N items** to put the ticked ingredients in the trolley (deals and reminders apply as usual).

## Offers & points
`data/offers.json` (sample deals, regenerate/edit freely): `percent` (`pct`), `multibuy` (`qty` for `price`) and `bogo`
(`buy` + `free`). Specials show first (strip at the top of the Find panel + "All specials"), the cart shows was/now prices,
savings and a **red reminder** such as "Buy 2 get 1 free – add 2 more" (also as a toast when you add the item).
Prices include GST. Reward points: earn 1 per ₹10 paid, redeem 100 points for ₹10 off at checkout (demo balance of 320 points,
kept in the browser). The assistant also knows the deals.

## Features
- 3D: orbit/zoom, hover tooltips, search, section chips, animated cart route from the entry, auto-rotate, top view, sliding doors, ambient shoppers.
- **Self-checkout:** cart panel; add by typing/pasting a barcode or code and pressing Enter, with the 📷 button
  (camera barcode scan, Chrome/Edge via `BarcodeDetector`), from search (+), or by clicking a shelf item.
  Checkout shows savings, points and a **simulated** payment, then the exit gate opens. Cart persists in the browser.
- **Assistant:** `server/server.mjs` exposes `/api/chat`. With an API key it runs Claude (`claude-opus-5-5`, override with
  `ANTHROPIC_MODEL`) in a tool-use loop over `search_products`, `list_section`, `add_to_cart`, `show_route`, `get_cart`;
  the browser applies the returned add/route actions. Without a key it falls back to offline keyword search.

`vendor/` holds Three.js (MIT) so it works offline.
