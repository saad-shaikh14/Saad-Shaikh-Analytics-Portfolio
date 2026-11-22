// Renders the default social preview image (1200x630) from HTML using the site's own fonts,
// so the card is text we wrote, not a generated picture. Output: public/og/default.png
// Usage: node scripts/make-og.mjs   (needs `npx playwright install chromium` once)
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const font = (pkg, file) => readFileSync(require.resolve(`${pkg}/files/${file}`)).toString('base64');
const literata = font('@fontsource-variable/literata', 'literata-latin-opsz-normal.woff2');
const atkinson = font('@fontsource-variable/atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-wght-normal.woff2');

const html = `<!doctype html><html><head><style>
@font-face{font-family:L;src:url(data:font/woff2;base64,${literata}) format('woff2');font-weight:200 900}
@font-face{font-family:A;src:url(data:font/woff2;base64,${atkinson}) format('woff2');font-weight:200 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#faf7f0;color:#1c1b19;font-family:A,sans-serif;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;position:relative}
.rule{position:absolute;left:80px;right:80px;top:300px;height:0}
.eyebrow{font-size:24px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4f4a44}
h1{font-family:L,serif;font-weight:650;font-size:84px;line-height:1.02;letter-spacing:-.01em;margin-top:22px}
.sub{font-family:L,serif;font-size:40px;color:#9a4a1f;margin-top:14px}
.foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:26px;color:#4f4a44;border-top:2px solid #ddd3c2;padding-top:26px}
.mark{display:flex;gap:10px}.mark span{width:44px;height:10px;border-radius:2px;background:#1e3a5f}.mark span:nth-child(2){background:#9a4a1f}.mark span:nth-child(3){background:#2f6b66}
</style></head><body>
<div><p class="eyebrow">Data Engineering · Data Platform Architecture · AI</p>
<h1>Saad Shaikh</h1><p class="sub">Inside Modern Data Systems</p></div>
<div class="foot"><span>How modern data platforms are designed, built and operated</span><span class="mark"><span></span><span></span><span></span></span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
mkdirSync('public/og', { recursive: true });
await page.screenshot({ path: 'public/og/default.png', type: 'png' });
await browser.close();
console.log('wrote public/og/default.png');
