// Camera / photo barcode scanning. Native BarcodeDetector where available, ZXing (vendor/zxing.min.js) elsewhere.
import { inr } from './store.js';
const $ = id => document.getElementById(id);
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

export function initScanner({ resolve, onScan }) {
  let camOn = false, camStream = null, zxReader = null, lastScan = '', lastAt = 0, scanned = 0;
  const beep = () => { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 1100; g.gain.value = .08; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + .08); } catch {} };
  const status = html => { $('camstat').innerHTML = html; };

  function onCode(raw) {
    const now = performance.now(); if (raw === lastScan && now - lastAt < 2200) return; lastScan = raw; lastAt = now;
    const p = resolve(raw);
    if (!p) { status(`Unknown barcode <b>${raw}</b>`); return; }
    onScan(p); scanned++; beep(); navigator.vibrate?.(60);
    status(`<b>✓ ${p.name}</b> – ${inr(p.price)}<br>${scanned} item${scanned > 1 ? 's' : ''} scanned · keep scanning or tap Done`);
  }
  async function decodeImageFile(file) {
    const url = URL.createObjectURL(file), fail = () => status('No barcode found in that photo – try again, closer and steadier.');
    try {
      if ('BarcodeDetector' in window) { const r = await new BarcodeDetector({ formats: FORMATS }).detect(await createImageBitmap(file)); r[0] ? onCode(r[0].rawValue) : fail(); }
      else if (window.ZXing) onCode((await new ZXing.BrowserMultiFormatReader().decodeFromImageUrl(url)).getText());
      else fail();
    } catch { fail(); } finally { URL.revokeObjectURL(url); }
  }
  $('camfile').onchange = e => { const f = e.target.files[0]; if (f) decodeImageFile(f); e.target.value = ''; };

  async function open() {
    scanned = 0; lastScan = ''; $('cam').classList.add('show'); status('Point the camera at a product barcode');
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { $('camv').style.display = 'none'; status('Live camera needs a secure (https) connection. Use <b>Take / choose photo</b> to scan instead.'); return; }
    $('camv').style.display = '';
    try {
      if ('BarcodeDetector' in window) {
        const det = new BarcodeDetector({ formats: FORMATS });
        camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        $('camv').srcObject = camStream; await $('camv').play(); camOn = true;
        (async function loop() { while (camOn) { try { for (const b of await det.detect($('camv'))) onCode(b.rawValue); } catch {} await new Promise(r => setTimeout(r, 150)); } })();
      } else if (window.ZXing) {
        const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.CODE_128]]]);
        zxReader = new ZXing.BrowserMultiFormatReader(hints, 200); camOn = true;
        await zxReader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, $('camv'), r => { if (r) onCode(r.getText()); });
      } else { $('camv').style.display = 'none'; status('Live scanning is not available in this browser – use Take / choose photo.'); }
    } catch { $('camv').style.display = 'none'; status('Camera blocked or unavailable. Allow camera access, or use <b>Take / choose photo</b>.'); }
  }
  function close() { camOn = false; try { zxReader?.reset(); } catch {} zxReader = null; camStream?.getTracks().forEach(t => t.stop()); camStream = null; $('camv').srcObject = null; $('cam').classList.remove('show'); }
  $('camClose').onclick = close;
  return { open, close };
}
