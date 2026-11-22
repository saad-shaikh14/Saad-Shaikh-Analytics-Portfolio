import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = '/Saad-Shaikh-Analytics-Portfolio';
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screenshots';

// Every content route in the build, discovered from dist so new entries are tested automatically.
function routes(): string[] {
  const out = new Set<string>(['/', '/architecture/', '/writing/', '/about/']);
  const walk = (dir: string, prefix: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const route = `${prefix}${name.name}/`;
      if (existsSync(join(dir, name.name, 'index.html'))) out.add(route);
      walk(join(dir, name.name), route);
    }
  };
  walk('dist/architecture', '/architecture/');
  walk('dist/writing', '/writing/');
  return [...out];
}

// The four old URLs with a real successor (docs/DEPLOYMENT.md, "Legacy URLs").
const LEGACY: Record<string, string> = {
  'index.html': '/',
  'about.html': '/about/',
  'contactingme.html': '/about/',
  'myprojects.html': '/architecture/',
};

// The ten old URLs retired on 22 Nov 2026: no related page exists, so they must return a 404, not a soft redirect.
const RETIRED = [
  'AnalyzingDatasets.html',
  'VisualisingDatasets.html',
  'CreatingReports.html',
  'amazondataset.html',
  'netflixdataset.html',
  'bcd.html',
  'onecolumn.html',
  'twocolumn1.html',
  'twocolumn2.html',
  'threecolumn.html',
];

const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

async function noPageLevelOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

for (const route of routes()) {
  test.describe(`route ${route}`, () => {
    test('loads with one h1, the canonical URL, a description and the page language', async ({ page }) => {
      const res = await page.goto(`${BASE}${route}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(`https://saad-shaikh14.github.io${BASE}${route}`);
      expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(50);
      expect(await page.locator('html').getAttribute('lang')).toBe('en-GB');
    });

    test('has no automatically detectable WCAG 2.2 AA violations', async ({ page }) => {
      await page.goto(`${BASE}${route}`);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
    });

    test('reflows without page-level horizontal scrolling at every width', async ({ page }) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${BASE}${route}`);
        await page.evaluate(() => document.fonts.ready); // measure the page as readers see it once fonts load
        expect(await noPageLevelOverflow(page), `overflow at ${width}px`).toBe(true);
        mkdirSync(SHOTS, { recursive: true });
        const name = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '__');
        await page.screenshot({ path: `${SHOTS}/${name}--${width}.png`, fullPage: true });
      }
    });

    // Fonts load with font-display: swap, so a slow connection first shows the system fallback font, which is wider on
    // some systems (the CI runner's Linux fallback is). The page must not widen in that state either.
    test('reflows at 320 px with the web fonts blocked (fallback fonts only)', async ({ page }) => {
      await page.route(/\.woff2?$/, (r) => r.abort());
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(`${BASE}${route}`);
      expect(await noPageLevelOverflow(page), 'overflow at 320px with fallback fonts').toBe(true);
    });
  });
}

test('keyboard: the first Tab stop is the skip link, and it moves focus to main content', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText('Skip to content');
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('navigation links reach every top-level page and mark the current one', async ({ page }) => {
  await page.goto(`${BASE}/`);
  for (const [label, path] of [
    ['Architecture', '/architecture/'],
    ['Writing', '/writing/'],
    ['About', '/about/'],
    ['Home', '/'],
  ]) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${BASE}${path}`);
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  }
});

for (const [old, target] of Object.entries(LEGACY)) {
  test(`legacy URL /${old} resolves to ${target}`, async ({ page }) => {
    const res = await page.goto(`${BASE}/${old}`);
    expect(res?.status()).toBe(200);
    if (old === 'index.html') {
      // The old homepage URL serves the new homepage directly, with no redirect.
      await expect(page.locator('h1')).toHaveText('How modern data platforms are designed, built and operated.');
      return;
    }
    await page.waitForURL(`**${BASE}${target}`, { timeout: 5000 });
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

for (const old of RETIRED) {
  test(`retired URL /${old} returns 404`, async ({ page }) => {
    const res = await page.goto(`${BASE}/${old}`);
    expect(res?.status()).toBe(404);
  });
}

test('the 404 page exists and links home', async ({ page }) => {
  const res = await page.goto(`${BASE}/404.html`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
});

test('reduced-motion preference is respected (no running animations)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}/`);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
});
