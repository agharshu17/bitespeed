// Minimal static file server for the BiteSpeed Mart app. Run: npm start  (reads PORT, default 8000)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
const PUBLIC = ['index.html', 'sw.js', 'manifest.webmanifest', 'icons', 'js', 'data', 'assets', 'vendor'];

http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !PUBLIC.includes(rel.split('/')[0]) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not found');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', ...(rel === 'sw.js' || rel === 'index.html' ? { 'cache-control': 'no-cache' } : {}) });
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 8000, () => console.log(`BiteSpeed Mart on http://localhost:${process.env.PORT || 8000}`));
