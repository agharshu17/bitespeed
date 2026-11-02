// 3D store: shelves, products, animated shoppers, guide cart + route. No page UI in here.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

export function createScene(container, { layout, products }, cb = {}) {
/* ---------- helpers ---------- */
const CX = layout.map.originX + layout.map.width / 2, CZ = layout.map.originY + layout.map.height / 2;
const px2x = v => (v - CX) / 10, px2z = v => (v - CZ) / 10;
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------- renderer / scene ---------- */
const W = () => container.clientWidth || 1, H = () => container.clientHeight || 1;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W(), H());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.style.display = 'block'; container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#dfe9f3');
const camera = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 400);
const PORTRAIT = innerWidth < 760;
const secById = Object.fromEntries(layout.sections.map(s => [s.id, s]));
const byCode = Object.fromEntries(products.map(p => [p.code, p]));
const HOME = PORTRAIT ? { pos: new THREE.Vector3(0, 150, 118), target: new THREE.Vector3(0, 0, -2) } : { pos: new THREE.Vector3(-14, 90, 104), target: new THREE.Vector3(-14, 0, 4) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 12; controls.maxDistance = 190;
controls.autoRotateSpeed = 0.8;

scene.add(new THREE.HemisphereLight('#ffffff', '#c9b79c', 1.35));
const sun = new THREE.DirectionalLight('#fff4e0', 2.0);
sun.position.set(-40, 80, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 55, bottom: -55, near: 10, far: 220 });
sun.shadow.bias = -0.0004;
scene.add(sun);

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .75, metalness: 0, ...o });
function box(w, h, d, mat, x, y, z, parent = scene, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}

/* ---------- floor + walls ---------- */
const MW = layout.map.width / 10, MH = layout.map.height / 10;
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#f0e3b8'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ead9a8'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(MW / 3, MH / 3); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(MW, 1, MH), [0, 1, 2, 3, 4, 5].map(i => i === 2 ? new THREE.MeshStandardMaterial({ map: tex, roughness: .9 }) : std('#c9b588')));
  floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor);
  const base = new THREE.Mesh(new THREE.BoxGeometry(MW + 6, 1.2, MH + 6), std('#b7c4d4'));
  base.position.y = -1.6; base.receiveShadow = true; scene.add(base);
  const wallMat = std('#fbf7ee'), t = 0.8, wh = 1.4;
  box(MW + t, wh, t, wallMat, 0, wh / 2, -MH / 2 - t / 2 + .1);          // back
  box(t, wh, MH, wallMat, -MW / 2 - t / 2, wh / 2, 0);                   // left
  box(t, wh, MH, wallMat, MW / 2 + t / 2, wh / 2, 0);                    // right
  // front wall with door gaps (entry & exit)
  const gaps = ['entry', 'exit', 'cart'].map(k => layout.doors[k].rect).filter((_, i) => i < 2).map(r => [px2x(r.x), px2x(r.x + r.w)]).sort((a, b) => a[0] - b[0]);
  let cur = -MW / 2;
  for (const [a, b] of [...gaps, [MW / 2, MW / 2]]) {
    if (a > cur) box(a - cur, wh, t, wallMat, (a + cur) / 2, wh / 2, MH / 2 + t / 2 - .1);
    cur = b;
  }
}

/* ---------- label sprites ---------- */
function labelSprite(text, { icon = '', badge = '', bg = '#ffffff', fg = '#1f2a37', scale = 1 } = {}) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 160;
  const g = c.getContext('2d');
  g.font = '700 54px ui-rounded, "Nunito", system-ui, sans-serif';
  const label = (icon ? icon + ' ' : '') + text;
  const tw = g.measureText(label).width, bw = badge ? 90 : 0;
  const w = Math.min(620, tw + 70 + bw), x0 = (640 - w) / 2;
  g.fillStyle = 'rgba(31,42,55,.18)'; g.beginPath(); g.roundRect(x0 + 4, 26, w, 100, 50); g.fill();
  g.fillStyle = bg; g.beginPath(); g.roundRect(x0, 18, w, 100, 50); g.fill();
  if (badge) { g.fillStyle = '#ff6b35'; g.beginPath(); g.roundRect(x0 + 12, 30, 76, 76, 38); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 38px ui-rounded, system-ui, sans-serif'; g.fillText(badge, x0 + 50, 70); }
  g.fillStyle = fg; g.font = '700 54px ui-rounded, "Nunito", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, x0 + bw + (w - bw) / 2, 70);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(11 * scale, 2.75 * scale, 1); return s;
}

/* ---------- sections: shelves + products ---------- */
const productMeshes = [];           // for raycasting
const productInfo = new Map();      // code -> {mesh, pos(Vector3), walk:{x,y}, row, col}
const sectionGroups = {};
const floatingSigns = [];

function buildSection(sec) {
  const r = sec.rect, vertical = sec.facing === 'left' || sec.facing === 'right';
  const sx = r.w / 10, sz = r.h / 10;
  const H = sec.id === 'seafood' ? 2.6 : sec.id === 'bakery' ? 2.8 : vertical ? 3.8 : 4.4;
  const cx = px2x(r.x + r.w / 2), cz = px2z(r.y + r.h / 2);
  const group = new THREE.Group(); group.position.set(cx, 0, cz); scene.add(group); sectionGroups[sec.id] = group;
  const dir = { left: [-1, 0], right: [1, 0], down: [0, 1] }[sec.facing];
  const body = box(sx, H, sz, std(sec.fridge ? '#7fb6cf' : sec.color, { roughness: .6 }), 0, H / 2, 0, group);
  box(sx + .15, .25, sz + .15, std(sec.fridge ? '#e6f6fb' : '#c98f68'), 0, H + .12, 0, group);   // cap

  const len = vertical ? sz : sx, margin = .5, cellL = (len - 2 * margin) / sec.cols;
  const tierH = (H - .5) / sec.tiers, ledgeD = .62, prodD = .46;
  const ledgeMat = std(sec.fridge ? '#f4fbff' : '#f8efe4');
  const list = products.filter(p => p.section === sec.id);
  for (let t = 0; t < sec.tiers; t++) {
    const y = .32 + (sec.tiers - 1 - t) * tierH;
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(vertical ? ledgeD : len, .1, vertical ? len : ledgeD), ledgeMat);
    ledge.position.set(dir[0] * (sx / 2 + ledgeD / 2) * (vertical ? 1 : 0), y, dir[1] * (sz / 2 + ledgeD / 2) * (vertical ? 0 : 1));
    ledge.receiveShadow = ledge.castShadow = true; group.add(ledge);
  }
  const geoms = [new THREE.BoxGeometry(1, 1, 1), new THREE.CylinderGeometry(.5, .5, 1, 14)];
  for (const p of list) {
    const t = Math.floor(p.slot / sec.cols), c = p.slot % sec.cols, h = hash(p.name);
    const hue = (h % 360) / 360, color = new THREE.Color().setHSL(hue, .55 + (h >> 8) % 25 / 100, .58 + (h >> 12) % 14 / 100);
    const bh = tierH * (.5 + (h >> 4) % 25 / 100), bl = cellL * .72;
    const shape = (h >> 3) % 3 === 0 ? 1 : 0;
    const m = new THREE.Mesh(geoms[shape], std(color, { roughness: .55 }));
    const yb = .32 + (sec.tiers - 1 - t) * tierH + .05 + bh / 2;
    const along = -len / 2 + margin + (c + .5) * cellL;
    const off = (vertical ? sx : sz) / 2 + (shape ? ledgeD : ledgeD) / 2;
    const w = vertical ? [prodD, bh, bl] : [bl, bh, prodD];
    if (shape) { const d = Math.min(prodD, bl) * 1; m.scale.set(d, bh, d); } else m.scale.set(...w);
    m.position.set(vertical ? dir[0] * off : along, yb, vertical ? along : dir[1] * off);
    m.castShadow = true; m.receiveShadow = true; m.userData.code = p.code; m.userData.base = m.scale.clone(); m.userData.baseColor = color.clone();
    group.add(m); productMeshes.push(m);
    const wp = m.getWorldPosition(new THREE.Vector3());
    const pxAlong = vertical ? r.y + (margin + (c + .5) * cellL) * 10 : r.x + (margin + (c + .5) * cellL) * 10;
    productInfo.set(p.code, { mesh: m, pos: wp, row: t + 1, col: c + 1, topY: H,
      walk: vertical ? { x: sec.walk, y: pxAlong } : { x: pxAlong, y: sec.walk } });
  }
  // floating sign
  const sign = labelSprite(sec.label, { icon: sec.icon, badge: sec.number });
  const sp = vertical ? new THREE.Vector3(cx, H + 3.2, cz + (sec.id === 'seafood' || sec.id === 'bakery' ? 0 : -sz / 2 + 2)) : new THREE.Vector3(cx, H + 3, cz + 5.5);
  sign.position.copy(sp); sign.userData.baseY = sp.y; sign.userData.phase = hash(sec.id) % 6; scene.add(sign); floatingSigns.push(sign);
}
layout.sections.forEach(buildSection);

/* ---------- doors & cart bay ---------- */
const doorPanels = [];
function buildDoor(key, label) {
  const d = layout.doors[key], r = d.rect, w = r.w / 10, cx = px2x(r.x + r.w / 2), z = px2z(r.y);
  box(w, .12, r.h / 10, std(d.color, { roughness: .9 }), cx, .06, px2z(r.y + r.h / 2), scene, false);   // floor mat
  const glass = new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: .45, roughness: .1 });
  const L = box(w / 2, 3.2, .18, glass, cx - w / 4, 1.6, px2z(r.y + r.h - 2), scene, false);
  const R = box(w / 2, 3.2, .18, glass, cx + w / 4, 1.6, px2z(r.y + r.h - 2), scene, false);
  box(w + .6, .35, .5, std('#2b3544'), cx, 3.4, px2z(r.y + r.h - 2));
  doorPanels.push({ L, R, cx, w, key, phase: key === 'entry' ? 0 : 2 });
  const s = labelSprite(label, { icon: key === 'entry' ? '➡️' : '🚪', bg: '#27b24f', fg: '#fff', scale: .8 });
  s.position.set(cx, 5.4, px2z(r.y + r.h - 2)); scene.add(s);
}
buildDoor('entry', 'ENTRY'); buildDoor('exit', 'EXIT');

function makeCart(color = '#c9ced6') {
  const g = new THREE.Group(), m = std(color, { metalness: .4, roughness: .4 });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.5, .8, 2.2), new THREE.MeshStandardMaterial({ color: '#e8edf3', transparent: true, opacity: .75, roughness: .4 }));
  basket.position.y = 1.25; basket.castShadow = true; g.add(basket);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, .1, 2.2), m); frame.position.y = .8; g.add(frame);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(1.5, .1, .1), std('#ff6b35')); handle.position.set(0, 1.9, 1.15); g.add(handle);
  const post = new THREE.Mesh(new THREE.BoxGeometry(.1, .8, .1), m); post.position.set(0, 1.5, 1.1); g.add(post);
  for (const [x, z] of [[-.6, -.9], [.6, -.9], [-.6, .9], [.6, .9]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .1, 10), std('#333')); w.rotation.z = Math.PI / 2; w.position.set(x, .2, z); g.add(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
{ // cart bay
  const d = layout.doors.cart, r = d.rect;
  box(r.w / 10, .12, r.h / 10, std(d.color, { roughness: .9 }), px2x(r.x + r.w / 2), .06, px2z(r.y + r.h / 2), scene, false);
  for (let i = 0; i < 9; i++) { const c = makeCart(); c.position.set(px2x(r.x + 30 + i * 30), 0, px2z(r.y + 50)); c.rotation.y = Math.PI; scene.add(c); }
  const s = labelSprite('Carts', { icon: '🛒', scale: .8 }); s.position.set(px2x(r.x + r.w / 2), 5, px2z(r.y + 20)); scene.add(s);
}

/* ---------- shoppers (ambient animation) ---------- */
function makeShopper(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .8, 4, 10), std(color)); body.position.y = 1.0; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.34, 14, 12), std('#f6d3b3')); head.position.y = 1.150 + .7; head.castShadow = true; g.add(head);
  g.userData.body = [body, head]; return g;
}
const pathPx = pts => pts.map(([x, y]) => new THREE.Vector3(px2x(x), 0, px2z(y)));
const walkers = [];
function addWalker(color, pts, speed, offset = 0) {
  const path = pathPx(pts), lens = []; let total = 0;
  for (let i = 1; i < path.length; i++) { const l = path[i].distanceTo(path[i - 1]); lens.push(l); total += l; }
  const mesh = makeShopper(color); const cart = makeCart('#9aa4b2'); cart.scale.setScalar(.7); cart.position.z = 1.0; mesh.add(cart);
  scene.add(mesh); walkers.push({ mesh, path, lens, total, speed, d: offset });
}
addWalker('#4f8cff', [[175, 550], [175, 90], [372, 90], [372, 550]], 3.4, 20);
addWalker('#e0457b', [[595, 550], [595, 90], [820, 90], [820, 550]], 3.0, 60);
addWalker('#2fbf71', [[372, 550], [595, 550], [595, 300], [372, 300]], 3.2, 10);
addWalker('#9b5de5', [[820, 550], [820, 120], [595, 120], [595, 550]], 2.8, 40);
function placeOnPath(path, lens, total, dist, out) {
  let d = ((dist % (2 * total)) + 2 * total) % (2 * total); const back = d > total; if (back) d = 2 * total - d;
  let i = 0; while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
  const t = Math.min(1, d / lens[i]), a = path[i], b = path[i + 1];
  out.pos.lerpVectors(a, b, t); out.dir.subVectors(b, a).normalize(); if (back) out.dir.negate();
}

/* ---------- guide cart + route + beacon ---------- */
const guide = new THREE.Group(); const gCart = makeCart('#ff6b35'); gCart.scale.setScalar(1.2); guide.add(gCart);
const tag = labelSprite('Follow me!', { icon: '🛒', bg: '#ff6b35', fg: '#fff', scale: .55 }); tag.position.y = 4; guide.add(tag);
const entryC = layout.doors.entry.rect;
const START = new THREE.Vector3(px2x(entryC.x + entryC.w / 2), 0, px2z(entryC.y + 20));
guide.position.copy(START); guide.rotation.y = Math.PI; scene.add(guide);

const routeDots = new THREE.Group(); scene.add(routeDots);
const markers = [];   // one per highlighted shelf: { g, pin, beam, ring, pinY }
const pinMat = std('#ff3b30', { emissive: '#ff3b30', emissiveIntensity: .6 }), beamMat = new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: .6 });
function makeMarker(info) {
  const g = new THREE.Group(), pinY = info.topY + 1.8;
  const pin = new THREE.Mesh(new THREE.ConeGeometry(.7, 1.6, 16), pinMat); pin.rotation.x = Math.PI; g.add(pin);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 8), beamMat); beam.scale.y = pinY - info.pos.y; beam.position.y = (pinY + info.pos.y) / 2; g.add(beam);
  g.position.set(info.pos.x, 0, info.pos.z); scene.add(g);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.2, 40), new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(px2x(info.walk.x), .2, px2z(info.walk.y)); scene.add(ring);
  return { g, pin, beam, ring, pinY };
}

/* walkway network (floor-plan px): four vertical walkways joined by a top (y=85) and bottom (y=550) corridor */
const COLS = [175, 372, 595, 820], TOP = 85, BOT = 550;
const nearestCol = x => COLS.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
function anchorOf([x, y]) {
  if (y <= TOP + 1) { const c = nearestCol(x); return { col: c, y: TOP, tail: [[c, TOP], [x, TOP]] }; }
  if (y >= BOT - 1) { const c = nearestCol(x); return { col: c, y: BOT, tail: [[c, BOT], [x, BOT], [x, y]] }; }
  return { col: x, y, tail: [[x, y]] };
}
function netPath(A, B) {
  const a = anchorOf(A), b = anchorOf(B), pts = [...a.tail].reverse();
  if (a.col === b.col) pts.push([b.col, b.y]);
  else { const cost = Y => Math.abs(a.y - Y) + Math.abs(Y - b.y), Y = cost(TOP) <= cost(BOT) ? TOP : BOT; pts.push([a.col, Y], [b.col, Y], [b.col, b.y]); }
  return pts.concat(b.tail);
}
const pxLen = pts => pts.reduce((t, p, i) => i ? t + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
const entryR = layout.doors.entry.rect, ENTRY_PX = [entryR.x + entryR.w / 2, entryR.y + 20];
/** nearest-neighbour order of stops, starting at the entry */
function orderStops(stops) {
  const left = [...stops], out = []; let cur = ENTRY_PX;
  while (left.length) {
    let bi = 0, bd = Infinity;
    left.forEach((s, i) => { const d = pxLen(netPath(cur, [s.info.walk.x, s.info.walk.y])); if (d < bd) { bd = d; bi = i; } });
    const s = left.splice(bi, 1)[0]; out.push(s); cur = [s.info.walk.x, s.info.walk.y];
  }
  return out;
}

let route = null, selected = [], travelled = 0, pauseUntil = 0, nextStop = 0;
function pathLength(path) { let t = 0; for (let i = 1; i < path.length; i++) t += path[i].distanceTo(path[i - 1]); return t; }
function pointAt(path, d, out) {
  for (let i = 1; i < path.length; i++) { const l = path[i].distanceTo(path[i - 1]); if (d <= l || i === path.length - 1) { const t = l ? Math.min(1, d / l) : 0; out.pos.lerpVectors(path[i - 1], path[i], t); out.dir.subVectors(path[i], path[i - 1]).normalize(); return; } d -= l; }
}
const tmp = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };

const dotGeo = new THREE.CircleGeometry(.28, 12);
function clearRoute() {
  selected = []; route = null; pauseUntil = 0; nextStop = 0;
  markers.splice(0).forEach(m => { scene.remove(m.g); scene.remove(m.ring); });
  routeDots.clear(); guide.position.copy(START); guide.rotation.y = Math.PI;
  productMeshes.forEach(m => { m.material.emissive.set('#000'); m.scale.copy(m.userData.base); });
}

/** highlight shelves and walk the guide cart past them; one code = "take me there", several = trolley route */
function plan(codes, fly = true) {
  clearRoute();
  const stops = codes.map(c => ({ c, info: productInfo.get(c) })).filter(x => x.info); if (!stops.length) return null;
  const ordered = stops.length > 1 ? orderStops(stops) : stops;
  const px = [ENTRY_PX], stopIdx = []; let cur = ENTRY_PX;
  for (const s of ordered) {
    const to = [s.info.walk.x, s.info.walk.y];
    for (const p of netPath(cur, to)) { const l = px[px.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > .01) px.push(p); }
    stopIdx.push(px.length - 1); cur = to;
  }
  const path = pathPx(px); route = { path, len: pathLength(path), stops: [] }; travelled = 0;
  let acc = 0; const cum = path.map((p, i) => i ? (acc += p.distanceTo(path[i - 1])) : 0); route.stops = stopIdx.map(i => cum[i]);
  for (let d = 0; d < route.len; d += 1.4) {
    const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ff6b35', transparent: true, opacity: .25 }));
    dot.rotation.x = -Math.PI / 2; pointAt(path, d, tmp); dot.position.set(tmp.pos.x, .16, tmp.pos.z); dot.userData.d = d; routeDots.add(dot);
  }
  for (const s of ordered) { s.info.mesh.material.emissive.set('#ff3b30'); s.info.mesh.material.emissiveIntensity = .7; markers.push(makeMarker(s.info)); }
  selected = ordered.map(s => s.c);
  if (fly) {
    if (ordered.length === 1) { const i = ordered[0].info; flyTo(new THREE.Vector3(i.pos.x * .7, 42, i.pos.z * .7 + 52), new THREE.Vector3(i.pos.x, 0, i.pos.z)); }
    else flyTo(new THREE.Vector3(0, PORTRAIT ? 150 : 100, PORTRAIT ? 90 : 62), new THREE.Vector3(0, 0, 4));
  }
  return { order: selected, info: ordered[0].info };
}
function select(code, fly = true) { const r = plan([code], fly); return r && { code, row: r.info.row, col: r.info.col }; }

/* ---------- camera fly ---------- */
let fly = null;
function flyTo(pos, target, dur = 1.3) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, t: 0, dur }; }

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let hover = null, down = null;
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(productMeshes, false)[0]; return hit ? hit.object : null;
}
renderer.domElement.addEventListener('pointermove', e => {
  const m = pick(e);
  if (m !== hover) { hover = m; renderer.domElement.style.cursor = m ? 'pointer' : 'grab'; }
  cb.onHover?.(m ? m.userData.code : null, e.clientX, e.clientY);
});
renderer.domElement.addEventListener('pointerleave', () => cb.onHover?.(null));
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const m = pick(e); if (m) cb.onPick?.(m.userData.code);
});
new ResizeObserver(() => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); }).observe(container);

/* ---------- animate ---------- */
let last = performance.now(), time = 0, exitHold = 0, active = false;
const sp = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, (now - last) / 1000); last = now; if (!active) return; time += dt;
  if (fly) { fly.t += dt / fly.dur; const k = ease(Math.min(1, fly.t)); camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k); if (fly.t >= 1) fly = null; }
  controls.update();
  floatingSigns.forEach(s => { s.position.y = s.userData.baseY + Math.sin(time * 1.4 + s.userData.phase) * .25; });
  doorPanels.forEach(d => { const open = d.key === 'exit' && time < exitHold ? 1 : (Math.sin(time * .9 + d.phase) + 1) / 2; const k = ease(Math.min(1, open * 1.6)) * d.w * .36; d.L.position.x = d.cx - d.w / 4 - k; d.R.position.x = d.cx + d.w / 4 + k; });
  walkers.forEach(w => {
    w.d += w.speed * dt; placeOnPath(w.path, w.lens, w.total, w.d, sp);
    w.mesh.position.copy(sp.pos); w.mesh.position.y = Math.abs(Math.sin(w.d * 2.2)) * .08; w.mesh.rotation.y = Math.atan2(sp.dir.x, sp.dir.z);
  });
  if (route) {
    if (travelled < route.len && time >= pauseUntil) {
      travelled = Math.min(route.len, travelled + dt * 14 * (.35 + .65 * Math.min(1, (route.len - travelled) / 6)));
      if (nextStop < route.stops.length && travelled >= route.stops[nextStop] - .01 && route.stops.length > 1) { travelled = route.stops[nextStop]; nextStop++; pauseUntil = time + .9; }
      else if (nextStop < route.stops.length && travelled >= route.stops[nextStop]) nextStop++;
      pointAt(route.path, travelled, tmp); guide.position.set(tmp.pos.x, Math.abs(Math.sin(time * 9)) * .05, tmp.pos.z); guide.rotation.y = Math.atan2(tmp.dir.x, tmp.dir.z);
    }
    tag.position.y = 4 + Math.sin(time * 3) * .15;
    routeDots.children.forEach(d => { const k = (time * 6 - d.userData.d) % 12; d.material.opacity = d.userData.d < travelled ? .08 : .25 + .6 * Math.max(0, 1 - Math.abs(k - 1) / 3); });
    const rs = 1 + ((time * 1.2) % 1) * 1.6;
    markers.forEach(m => { m.pin.position.y = m.pinY + Math.sin(time * 4) * .3; m.ring.scale.setScalar(rs); m.ring.material.opacity = 1 - (rs - 1) / 1.6; });
    const pulse = 1 + Math.sin(time * 6) * .12; selected.forEach(c => { const info = productInfo.get(c); if (info) info.mesh.scale.copy(info.mesh.userData.base).multiplyScalar(pulse); });
  }
  renderer.render(scene, camera);
});

const HOME_VIEW = () => flyTo(HOME.pos.clone(), HOME.target.clone());
return {
  productInfo,
  setActive(v) { active = v; if (v) { last = performance.now(); camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); } },
  select, selectRoute: codes => plan(codes, true), clear: clearRoute, flyHome: HOME_VIEW,
  flyTop: () => flyTo(new THREE.Vector3(0, 125, 0.01), new THREE.Vector3(0, 0, 0)),
  flyToSection(id) { const s = secById[id]; const cx = px2x(s.rect.x + s.rect.w / 2), cz = px2z(s.rect.y + s.rect.h / 2); flyTo(new THREE.Vector3(cx * .8, 38, cz * .8 + 40), new THREE.Vector3(cx, 0, cz)); },
  flyToExit() { flyTo(new THREE.Vector3(30, 40, 70), new THREE.Vector3(px2x(layout.doors.exit.rect.x + 140), 0, 25)); },
  openExit(sec = 8) { exitHold = time + sec; },
  zoom(f) { const off = camera.position.clone().sub(controls.target), len = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance); flyTo(controls.target.clone().add(off.setLength(len)), controls.target.clone(), .3); },
  setAutoRotate(v) { controls.autoRotate = v; }, get autoRotate() { return controls.autoRotate; },
};
}
