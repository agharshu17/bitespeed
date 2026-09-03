// Local visual QA: walks the whole session and screenshots every level.
// Not part of the uploaded Bit.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(here, 'shots');
const url = 'file://' + path.join(here, 'harness.html') + (process.env.BUILT ? '?build' : '');
const names = ['rdl', 'legcurl', 'bss', 'sumo', 'mtn', 'tap', 'suitcase'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));

await page.goto(url);
await page.waitForFunction('window.__ready === true', null, { timeout: 15000 });
const err = await page.evaluate('window.__initError || null');
if (err) { console.log('INIT ERROR', err); await b.close(); process.exit(1); }

const shot = async (name) => {
  await page.waitForTimeout(140);
  await page.screenshot({ path: path.join(out, name + '.png') });
  console.log('  shot', name);
};
const click = async (act, v) => {
  const ok = await page.evaluate(([a, vv]) => window.__click(a, vv), [act, v]);
  await page.waitForTimeout(70);
  return ok;
};
const panel = () => page.evaluate('window.__screen()');
const levelOf = (t) => { const m = /Level (\d)\/7/.exec(t); return m ? +m[1] : 0; };

await shot('01-intro');
await click('help'); await shot('02-help'); await click('closesheet');
await click('tosetup'); await shot('03-setup');
await click('kit', 'barbell');
await click('toplan');
await shot('04-plan');
await click('begin');
await page.waitForTimeout(400);
await shot('05-howto');
await click('menu');
await shot('06-menu');
await click('closesheet');

const briefed = new Set(), setShot = new Set();
let level = 0;

for (let guard = 0; guard < 300; guard++) {
  const txt = await panel();
  const lvl = levelOf(txt);
  if (lvl) level = lvl;
  const tag = `${level}-${names[level - 1] || 'x'}`;

  if (txt.includes('Start set')) {
    if (!briefed.has(level)) {
      briefed.add(level);
      await shot(`10-${tag}-howto`);
      await click('tab', 'form');
      await shot(`10-${tag}-brief`);
    }
    await click('startset');
    await page.evaluate('window.__pump(900)');
    if (!setShot.has(level)) {
      setShot.add(level);
      await shot(`11-${tag}-set`);
      await click('fault'); await shot(`12-${tag}-set-fault`); await click('fault');
    }
    for (let i = 0; i < 80; i++) {
      await page.evaluate('window.__pump(1500)');
      const t = await panel();
      if (!t.includes('reps') && !t.includes('seconds left')) break;
      await page.evaluate('window.__click("rep")');
    }
    continue;
  }
  if (txt.includes('How did that set feel')) {
    if (level === 1) await shot('13-rpe');
    await click('rpe', 'right');
    continue;
  }
  if (txt.includes('seconds rest')) {
    if (level <= 2) await shot(`14-${tag}-rest`);
    await click('skiprest');
    await page.evaluate('window.__pump(200)');
    continue;
  }
  if (txt.includes('You did')) break;
  console.log('UNEXPECTED SCREEN:', txt.slice(0, 160));
  break;
}
await page.waitForTimeout(400);
await shot('20-finish');
console.log('progress', await page.evaluate('window.__progress'));
console.log('briefs', [...briefed].join(','), 'complete',
  (await page.evaluate('window.__log.map(x=>x[0])')).includes('complete'));
await b.close();
