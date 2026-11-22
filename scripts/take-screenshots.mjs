// The review screenshot set, taken from the local preview server, with a manifest describing each image.
// Writes docs/qa/screenshots/*.png and docs/qa/screenshots/manifest.json. Not part of CI.
// Zoom is simulated the way a browser applies it: 200% of a 1280 x 800 window is a 640 x 400 CSS viewport at 2x
// pixel density, and 400% is 320 x 200 at 4x.
// Usage: npm run build && npx astro preview --host 127.0.0.1 --port 4321 &  then  node scripts/take-screenshots.mjs
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4321';
const BASE = '/Saad-Shaikh-Analytics-Portfolio';
const OUT = 'docs/qa/screenshots';
const ENTRY = '/architecture/log-based-cdc-into-a-warehouse/';
const PART = 7000; // CSS px per part for very long pages

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(join(OUT, f));

const browser = await chromium.launch();
const manifest = [];

async function open(route, { width, height = 900, dpr = 1 }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  const res = await page.goto(`${ORIGIN}${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { page, status: res?.status() ?? null, finalUrl: page.url().replace(ORIGIN, '') };
}

function record(file, route, opts, mode, note, extra = {}) {
  manifest.push({
    file,
    route,
    viewport: `${opts.width} x ${opts.height ?? 900} CSS px`,
    pixelDensity: opts.dpr ?? 1,
    zoom: opts.zoom ?? '100%',
    mode,
    note,
    ...extra,
  });
}

// Full page; very long pages are split into numbered parts.
async function fullPage(name, route, opts, note) {
  const { page } = await open(route, opts);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const parts = Math.ceil(height / PART);
  for (let i = 0; i < parts; i++) {
    const file = parts === 1 ? `${name}.png` : `${name}-part-${i + 1}-of-${parts}.png`;
    const y = i * PART;
    await page.screenshot({ path: join(OUT, file), fullPage: true, clip: { x: 0, y, width: opts.width, height: Math.min(PART, height - y) } });
    record(file, route, opts, parts === 1 ? 'full page' : `full page, part ${i + 1} of ${parts}`, note);
  }
  await page.close();
}

async function element(name, route, opts, selector, note, nth = 0) {
  const { page } = await open(route, opts);
  const el = page.locator(selector).nth(nth);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: join(OUT, `${name}.png`) });
  record(`${name}.png`, route, opts, `element: ${selector}${nth ? ` (#${nth + 1})` : ''}`, note);
  await page.close();
}

async function viewport(name, route, opts, note, prepare) {
  const { page, status, finalUrl } = await open(route, opts);
  if (prepare) await prepare(page);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  record(`${name}.png`, route, opts, 'viewport', note, { status, landedOn: finalUrl });
  await page.close();
}

const DESKTOP = { width: 1440 };
const MOBILE = { width: 375, height: 812 };
const Z200 = { width: 640, height: 400, dpr: 2, zoom: '200% of a 1280 x 800 window' };
const Z400 = { width: 320, height: 200, dpr: 4, zoom: '400% of a 1280 x 800 window' };

// 1. Main pages, desktop and mobile.
for (const [name, route] of [['home', '/'], ['architecture', '/architecture/'], ['writing', '/writing/'], ['about', '/about/']]) {
  await fullPage(`${name}-desktop`, route, DESKTOP, 'Header and footer included.');
  await fullPage(`${name}-mobile`, route, MOBILE, 'Header and footer included.');
}

// 2. The CDC entry: full page, then close-ups.
await fullPage('entry-desktop', ENTRY, DESKTOP, 'The whole entry.');
await fullPage('entry-mobile', ENTRY, MOBILE, 'The whole entry; figures scroll sideways inside their frames.');
await element('entry-figure-1', ENTRY, DESKTOP, 'figure.fig', 'Figure 1 with its legend, caption and text-description toggle.', 0);
await element('entry-figure-2', ENTRY, DESKTOP, 'figure.fig', 'Figure 2 with its legend, caption and text-description toggle.', 1);
await element('entry-sql-merge', ENTRY, DESKTOP, '.prose pre', 'The example MERGE.', 0);
await element('entry-sql-tie-check', ENTRY, DESKTOP, '.prose pre', 'The tie check that runs before the MERGE.', 1);
await element('entry-table-320', ENTRY, { width: 320, height: 800 }, '.prose table', 'Trade-off table at 320 px.');
await element('entry-table-375', ENTRY, { width: 375, height: 812 }, '.prose table', 'Trade-off table at 375 px.');
await element('entry-references', ENTRY, DESKTOP, 'section.sources', 'The numbered reference list.');

// 3. Full-size figure pages, with the mobile figure scrolled sideways to its right edge.
for (const n of [1, 2]) {
  const route = `${ENTRY}figures/${n}/`;
  await fullPage(`figure-${n}-desktop`, route, DESKTOP, 'Full-size figure page, with the link back to the entry.');
  await fullPage(`figure-${n}-mobile`, route, MOBILE, 'Full-size figure page on a phone, scrolled to the left edge.');
  await viewport(`figure-${n}-mobile-scrolled`, route, MOBILE, 'The same figure scrolled sideways to its right edge.', async (page) => {
    const frame = page.locator('.fig__scroll');
    await frame.scrollIntoViewIfNeeded();
    await frame.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  });
}

// 4. A retired URL and a kept legacy redirect.
await viewport('retired-url-404', '/netflixdataset.html', DESKTOP, 'A retired 2023 URL gets the 404 page.');
await viewport('legacy-redirect-about', '/about.html', DESKTOP, 'The old about.html lands on the new About page.', async (page) => {
  await page.waitForURL(`**${BASE}/about/`);
  await page.evaluate(() => document.fonts.ready);
});

// 5. Zoom: the entry and figure 2 at 200% and 400%.
for (const [label, z] of [['zoom-200', Z200], ['zoom-400', Z400]]) {
  await viewport(`${label}-entry-top`, ENTRY, z, 'Entry header at this zoom.');
  for (const [part, selector, nth] of [['figure-1', 'figure.fig', 0], ['sql', '.prose pre', 0], ['table', '.prose table', 0]]) {
    await viewport(`${label}-entry-${part}`, ENTRY, z, `Entry scrolled to ${part} at this zoom.`, async (page) => {
      await page.locator(selector).nth(nth).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    });
  }
  await viewport(`${label}-figure-2-page`, `${ENTRY}figures/2/`, z, 'Full-size figure 2 page at this zoom.', async (page) => {
    await page.locator('figure.fig').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  });
}

// 6. Keyboard: the skip link on the first Tab, and focus on the first nav link.
await viewport('keyboard-skip-link', '/', DESKTOP, 'First Tab: the "Skip to content" link appears with the focus ring.', async (page) => {
  await page.keyboard.press('Tab');
});
await viewport('keyboard-focus-nav', '/', DESKTOP, 'Third Tab: focus ring on the first navigation link.', async (page) => {
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
});

await browser.close();
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ takenAt: new Date().toISOString(), images: manifest }, null, 2) + '\n');
console.log(`${manifest.length} screenshots written to ${OUT}, described in ${OUT}/manifest.json.`);
