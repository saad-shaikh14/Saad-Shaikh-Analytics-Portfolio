// Contrast check for the palette, including text inside the SVG figures. axe-core checks HTML text in the browser
// tests, but not SVG text, because it reads CSS `color` and not the SVG `fill`. This script computes WCAG 2.x
// contrast ratios from the hex values in src/styles/tokens.css and in each figure generator's palette
// (src/visuals/*/draw.mjs), and fails if any text colour is below 4.5:1 on any background.
// Usage: node scripts/check-contrast.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIN = 4.5;

const tokens = Object.fromEntries(
  [...readFileSync('src/styles/tokens.css', 'utf8').matchAll(/--c-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]),
);
const TEXT = new Map(['ink', 'graphite', 'navy', 'teal', 'copper', 'copper-deep'].map((k) => [`token ${k}`, tokens[k]]));
const BACKGROUND = new Map(['paper', 'surface', 'parchment', 'navy-soft', 'teal-soft'].map((k) => [`token ${k}`, tokens[k]]));
// Extra [label, text, background] pairs where a light colour is the text.
const PAIRS = [['token paper on token ink (skip link)', tokens.paper, tokens.ink]];

for (const d of readdirSync('src/visuals', { withFileTypes: true })) {
  const file = join('src/visuals', d.name, 'draw.mjs');
  if (!d.isDirectory() || !existsSync(file)) continue;
  const palette = Object.fromEntries(
    [...readFileSync(file, 'utf8').matchAll(/^\s*(\w+):\s*'(#[0-9a-f]{6})'/gim)].map((m) => [m[1], m[2].toLowerCase()]),
  );
  for (const k of ['ink', 'graphite', 'navy', 'teal', 'copper', 'copperText']) if (palette[k]) TEXT.set(`${d.name} ${k}`, palette[k]);
  for (const k of ['surface', 'navySoft', 'tealSoft', 'copperSoft']) if (palette[k]) BACKGROUND.set(`${d.name} ${k}`, palette[k]);
  // Step numerals: surface-coloured text on a copper square.
  if (palette.surface && palette.copper) PAIRS.push([`${d.name} step numeral (surface on copper)`, palette.surface, palette.copper]);
}

const channel = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const results = [];
for (const [t, tv] of TEXT) for (const [b, bv] of BACKGROUND) results.push({ pair: `${t} on ${b}`, ratio: ratio(tv, bv) });
for (const [label, tv, bv] of PAIRS) results.push({ pair: label, ratio: ratio(tv, bv) });
results.sort((a, b) => a.ratio - b.ratio);

const failing = results.filter((r) => r.ratio < MIN);
const lowest = results[0];
console.log(`Contrast: ${results.length} text/background pairs checked; lowest ${lowest.ratio.toFixed(2)}:1 (${lowest.pair}).`);
for (const r of results.filter((r) => r.pair.includes('step numeral'))) console.log(`  ${r.pair}: ${r.ratio.toFixed(2)}:1`);
if (failing.length) {
  console.error(`Contrast check FAILED: ${failing.length} pair(s) below ${MIN}:1`);
  for (const r of failing) console.error(`  - ${r.pair}: ${r.ratio.toFixed(2)}:1`);
  process.exit(1);
}
