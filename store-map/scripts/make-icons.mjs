// Generates the PWA icons in icons/ (run: node scripts/make-icons.mjs; needs sharp)
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../icons');
const svg = (pad, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="#12905a"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
<path d="M96 140h52l46 200h168l42-150H168"/><circle cx="214" cy="396" r="24" fill="#fff" stroke="none"/><circle cx="352" cy="396" r="24" fill="#fff" stroke="none"/></g></svg>`;
for (const [name, size, pad, r] of [['icon-192.png', 192, 70, 96], ['icon-512.png', 512, 70, 112], ['icon-maskable-512.png', 512, 120, 0], ['apple-touch-icon.png', 180, 70, 0]])
  await sharp(Buffer.from(svg(pad, r))).resize(size, size).png().toFile(path.join(out, name));
console.log('icons written');
