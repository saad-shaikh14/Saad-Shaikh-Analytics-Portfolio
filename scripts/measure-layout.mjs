// Layout measurements behind two QA statements, against the local preview server:
//   1. the entry's first table fits its column at 320 and 375 px;
//   2. the viewport width below which a figure scrolls sideways, compared with where the scroll hint shows.
// Writes docs/qa/measurements.json. Not part of CI.
// Usage: npm run build && npx astro preview --host 127.0.0.1 --port 4321 &  then  node scripts/measure-layout.mjs
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const ENTRY = 'http://127.0.0.1:4321/Saad-Shaikh-Analytics-Portfolio/architecture/log-based-cdc-into-a-warehouse/';
const browser = await chromium.launch();
const out = { measuredAt: new Date().toISOString(), table: [], figure: [] };

for (const width of [320, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto(ENTRY, { waitUntil: 'networkidle' });
  out.table.push({
    viewport: width,
    ...(await page.locator('.prose table').first().evaluate((t) => ({
      display: getComputedStyle(t).display,
      tableWidth: Math.round(t.getBoundingClientRect().width * 100) / 100,
      columnWidth: t.parentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    }))),
  });
  await page.close();
}

for (const width of [1200, 1236, 1240, 1244, 1248, 1250, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(ENTRY, { waitUntil: 'networkidle' });
  out.figure.push({
    viewport: width,
    ...(await page.locator('figure.fig').first().evaluate((f) => {
      const s = f.querySelector('.fig__scroll');
      return {
        scrolls: s.scrollWidth > s.clientWidth,
        hintVisible: getComputedStyle(f.querySelector('.fig__hint')).display !== 'none',
      };
    })),
  });
  await page.close();
}

await browser.close();
writeFileSync('docs/qa/measurements.json', JSON.stringify(out, null, 2) + '\n');
for (const t of out.table) console.log(`table at ${t.viewport}px: ${t.display}, ${t.tableWidth} px in a ${t.columnWidth} px column`);
for (const f of out.figure) console.log(`figure at ${f.viewport}px: scrolls=${f.scrolls} hint=${f.hintVisible}`);
