import { test, expect } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = '/Saad-Shaikh-Analytics-Portfolio';
const MIN_RATIO = 4.5; // WCAG 2.2 AA, normal-size text: every figure label is 12 to 15 px

// Every full-size figure page in the build.
function figurePages(): string[] {
  const out: string[] = [];
  const arch = 'dist/architecture';
  if (!existsSync(arch)) return out;
  for (const entry of readdirSync(arch, { withFileTypes: true })) {
    const figs = join(arch, entry.name, 'figures');
    if (!entry.isDirectory() || !existsSync(figs)) continue;
    for (const n of readdirSync(figs)) out.push(`/architecture/${entry.name}/figures/${n}/`);
  }
  return out;
}

// For each rendered label in a figure, measure the contrast between its computed text colour and the colour actually
// behind it: the topmost filled SVG shape under three points across the label, or the figure panel if there is none.
// This complements scripts/check-contrast.mjs, which checks palette pairs, and axe, which does not read SVG fills.
for (const route of figurePages()) {
  test(`every label in ${route} has at least ${MIN_RATIO}:1 contrast against what is behind it`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1600 }); // the whole figure in view, so every point can be hit-tested
    await page.goto(`${BASE}${route}`);
    await page.evaluate(() => document.fonts.ready);
    const labels = await page.evaluate(() => {
      type RGB = { r: number; g: number; b: number; a: number };
      const parse = (c: string): RGB | null => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a = 1] = m[1].split(',').map((v) => Number(v.trim()));
        return { r, g, b, a };
      };
      const channel = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const lum = (c: RGB) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
      const ratio = (x: RGB, y: RGB) => {
        const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
        return (hi + 0.05) / (lo + 0.05);
      };
      const svg = document.querySelector('.fig svg') as SVGSVGElement;
      const panel = parse(getComputedStyle(document.querySelector('.fig__scroll')!).backgroundColor)!;
      const texts = [...svg.querySelectorAll('text')];
      const colours = texts.map((t) => parse(getComputedStyle(t).fill));
      const boxes = texts.map((t) => t.getBoundingClientRect());
      texts.forEach((t) => (t.style.visibility = 'hidden')); // hit-test the shapes underneath, not the text itself
      const out = texts.map((t, i) => {
        const fill = colours[i]!;
        const box = boxes[i];
        let worst = Infinity;
        for (const fx of [0.1, 0.5, 0.9]) {
          let behind = panel;
          for (const el of document.elementsFromPoint(box.left + box.width * fx, box.top + box.height * 0.55)) {
            if (el === svg) break;
            if (!(el instanceof SVGGeometryElement)) continue;
            const f = parse(getComputedStyle(el).fill);
            if (f && f.a > 0) {
              behind = f;
              break;
            }
          }
          worst = Math.min(worst, ratio(fill, behind));
        }
        return { text: t.textContent ?? '', ratio: Math.round(worst * 100) / 100 };
      });
      texts.forEach((t) => (t.style.visibility = ''));
      return out;
    });
    expect(labels.length).toBeGreaterThan(20);
    const lowest = labels.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    console.log(`${route}: ${labels.length} labels, lowest ${lowest.ratio}:1 ("${lowest.text}")`);
    expect(labels.filter((l) => l.ratio < MIN_RATIO)).toEqual([]);
  });
}

test('each figure links to its full-size page, and the full-size page links back to it', async ({ page }) => {
  const entry = `${BASE}/architecture/log-based-cdc-into-a-warehouse/`;
  for (const n of [1, 2]) {
    await page.goto(entry);
    // The browser computes the name as "Open full size : figure N" (a space before the visually hidden part).
    await page.getByRole('link', { name: new RegExp(`^Open full size\\s*: figure ${n}$`) }).click();
    await expect(page).toHaveURL(`${entry}figures/${n}/`);
    await expect(page.locator('h1')).toContainText(`Figure ${n}:`);
    await page.getByRole('link', { name: 'Back to the entry' }).click();
    await expect(page).toHaveURL(`${entry}#figure-${n}`);
  }
});
