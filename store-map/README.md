# BiteSpeed Mart – 3D store map

Low-poly, animated 3D model of the store (Three.js) built from `assets/floorplan.png`,
plus the product/location data the app will use.

## Run it
Browsers block `fetch()` on `file://`, so serve the folder:

    cd store-map && python3 -m http.server 8000   # then open http://localhost:8000

Deep link to a product: `http://localhost:8000/?item=2A17`

## Data (source of truth)
| File | What |
|---|---|
| `data/store-layout.json` | Every shelf/section/door as a rectangle in **floor-plan pixels**, which side shoppers pick from (`facing`), the walkway line (`walk`), and shelf grid (`tiers` × `cols`). |
| `data/products.json` | 430 products: `code` (e.g. `2A17`), `name`, `section`, `slot` (0-based index in the section). |
| `assets/floorplan.png` | Original floor plan. |

Product position = `section` + `slot`: `row = floor(slot / cols)` (0 = top shelf), `col = slot % cols`
(left→right or top→bottom of the plan).

Note: some names appear in more than one section (e.g. Pav 4B43 / 5-13, Chocolate Milk 4A37 / C05);
searches return every location.

## Features
Orbit/zoom, hover tooltips, search by name or code, section chips, click any item for an animated
cart route from the entry, auto-rotate, top view, sliding doors and ambient shoppers.

`vendor/` holds Three.js (MIT) so it works offline.
