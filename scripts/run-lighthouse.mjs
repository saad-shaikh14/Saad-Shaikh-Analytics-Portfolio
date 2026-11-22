// Lighthouse 12 (mobile defaults) against the local preview server, using Playwright's Chromium.
// Writes a summary (category scores, LCP, CLS, TBT) to docs/qa/lighthouse.json. Not part of CI.
// Usage: npm run build && npx astro preview --host 127.0.0.1 --port 4321 &  then  node scripts/run-lighthouse.mjs [paths...]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4321';
const BASE = '/Saad-Shaikh-Analytics-Portfolio';
const OUT = 'docs/qa/lighthouse.json';
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/architecture/log-based-cdc-into-a-warehouse/'];

const runs = [];
for (const p of paths) {
  const url = `${ORIGIN}${BASE}${p}`;
  const json = execFileSync(
    'npx',
    ['--yes', 'lighthouse@12.8.2', url, '--output=json', '--output-path=stdout', '--quiet', '--chrome-flags=--headless=new --no-sandbox'],
    { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, maxBuffer: 64 * 1024 * 1024 },
  ).toString();
  const lhr = JSON.parse(json);
  const score = (k) => Math.round(lhr.categories[k].score * 100);
  runs.push({
    path: p,
    lighthouseVersion: lhr.lighthouseVersion,
    formFactor: lhr.configSettings.formFactor,
    fetchTime: lhr.fetchTime,
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    lcp: lhr.audits['largest-contentful-paint'].displayValue,
    cls: lhr.audits['cumulative-layout-shift'].displayValue,
    tbt: lhr.audits['total-blocking-time'].displayValue,
  });
  const r = runs.at(-1);
  console.log(`${p}: ${r.performance} / ${r.accessibility} / ${r.bestPractices} / ${r.seo}  LCP ${r.lcp}, CLS ${r.cls}, TBT ${r.tbt}`);
}
writeFileSync(OUT, JSON.stringify({ server: 'astro preview (local)', runs }, null, 2) + '\n');
console.log(`Summary written to ${OUT}.`);
