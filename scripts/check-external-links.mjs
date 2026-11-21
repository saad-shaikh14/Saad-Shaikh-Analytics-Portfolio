// External link check over the built site. Not part of CI, because third-party sites change and rate-limit.
// Collects every http(s) link in dist/ that points outside this site, requests each once, and writes the
// results to docs/qa/external-links.json so the QA report's numbers can be traced to a file.
// Usage: npm run build && node scripts/check-external-links.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OWN_ORIGIN = 'https://saad-shaikh14.github.io';
const OUT = 'docs/qa/external-links.json';

const walk = (p) => (statSync(p).isFile() ? [p] : readdirSync(p).flatMap((n) => walk(join(p, n))));
const urls = new Set();
for (const f of walk('dist').filter((f) => f.endsWith('.html'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/<a\s[^>]*href="(https?:\/\/[^"#]+)(#[^"]*)?"/gi)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (!u.startsWith(OWN_ORIGIN)) urls.add(u);
  }
}

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; site-link-check)' },
      });
      if (method === 'HEAD' && res.status >= 400) continue; // some servers refuse HEAD; retry with GET
      return { url, status: res.status, method };
    } catch (e) {
      if (method === 'GET') return { url, status: null, method, error: String(e.cause?.code ?? e.name) };
    }
  }
  return { url, status: null, method: 'GET', error: 'no response' };
}

const results = [];
for (const u of [...urls].sort()) results.push(await check(u));
const ok = results.filter((r) => r.status === 200).length;
writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, ok200: ok, results }, null, 2) + '\n');
console.log(`External links: ${results.length} checked, ${ok} returned 200. Results in ${OUT}.`);
for (const r of results.filter((r) => r.status !== 200)) console.log(`  - ${r.status ?? r.error}  ${r.url}`);
