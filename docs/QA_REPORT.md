# QA report: redesign release candidate

- **Branch:** `redesign/data-platform-publication`
- **Checks run:** 22 Nov 2026, 11:23 to 11:25 UTC, on the final source, after the changes requested in the pull-request review and the fix for the CI failure described below. macOS (arm64), Node 26.11.1 (CI uses Node 24 from `.nvmrc`), Chromium from Playwright 1.65.1.
- **Order:** the screenshots were taken first. The site was then rebuilt from a clean `dist/`, and the rebuilt output was byte-identical to the build the screenshots show. Every check then ran, then the controls, and this report was written last. The safety scan and the internal link check were run again over the finished report (end of `docs/qa/checks.txt`).
- **Rule:** every result below comes from a check that was actually run, and each is saved in the file named beside it. Nothing is estimated.

## Summary

| Area | Command | Result | Saved in |
|---|---|---|---|
| Type check | `astro check` (part of `npm run build`) | **0 errors, 0 warnings, 0 hints** | `docs/qa/checks.txt` |
| Production build | `npm run build` | **8 pages** (home, Architecture, the CDC entry, its 2 full-size figure pages, Writing, About, 404) **+ 3 legacy redirect pages + RSS + sitemap**; drafts excluded. Rebuilding gives byte-identical output | `checks.txt` |
| Internal links | `npm run test:links` | **260 internal references across 15 files resolve** under the base path | `checks.txt` |
| Publication safety scan | `npm run test:content` | **150 files** (the whole repository and `dist/`, dependencies excluded; 61 binary files, mostly screenshots, checked by path only), **12 private-name rules: no private names in contents or paths, no placeholders or draft markers** | `checks.txt` |
| Palette contrast | `npm run test:contrast` | **110 text/background pairs, lowest 5.03:1** (teal on the copper tint) | `checks.txt` |
| Figure label contrast | `tests/figures.spec.ts` (browser suite) | **Every rendered label against the colour behind it: 72 labels in figure 1 and 71 in figure 2, lowest 6.12:1** (the step numerals on copper) | `docs/qa/playwright-run-1.txt`, `playwright-run-2.txt` |
| Browser suite | `npx playwright test` | **49 of 49 passed, in each of two runs** | the same two files |
| Accessibility, automated | axe-core 4.14 inside the browser suite, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` | **0 violations on each of the 7 content routes** | the same two files |
| Lighthouse 12.8.2, mobile defaults | `node scripts/run-lighthouse.mjs` | Home: **Performance 96, Accessibility 100, Best Practices 100, SEO 100** (LCP 2.3 s, CLS 0.002, TBT 0 ms). Architecture entry: **94 / 100 / 100 / 100** (LCP 2.4 s, CLS 0.072, TBT 0 ms) | `docs/qa/lighthouse.json` |
| External links | `node scripts/check-external-links.mjs` | **32 checked; 31 return 200.** LinkedIn returns 999, its standard response to automated clients | `docs/qa/external-links.json` |
| Layout | `node scripts/measure-layout.mjs` | The entry's table keeps native table display and fits its column at 320 px (272 px in 272 px) and 375 px. The figure scrolls at 1240 px and not at 1244 px; its scroll hint shows up to 1248 px | `docs/qa/measurements.json` |
| CDC merge logic | `python src/visuals/log-based-cdc/merge_logic_test.py` (DuckDB) | **All assertions pass** across the figure 2 runs, a PostgreSQL commit after the snapshot point, a MySQL snapshot tie, exact and conflicting ties, and re-snapshots | `checks.txt` |
| Figure source | `node src/visuals/log-based-cdc/draw.mjs`, run twice | Both SVGs regenerate **byte for byte** (identical SHA-256) | `checks.txt` |
| Screenshots | `node scripts/take-screenshots.mjs` | **42 images**: every main page at 1440 and 375 px, the entry in full and in close-ups, both figure pages (including scrolled sideways on a phone), the 404 and a kept redirect, 200% and 400% zoom, and keyboard focus | `docs/qa/screenshots/`, described in `manifest.json` |

The build prints a warning that the `articles` collection is empty. That is expected: no article is published yet.

## Controls: each check was shown to fail when it should

Saved in `docs/qa/controls.txt`.

| Check | Control | Result |
|---|---|---|
| Publication safety scan | A file whose contents hold a private name | Fails with `private-name rule #1`; the pattern is never printed |
| Publication safety scan | A file whose path holds a private name | Fails; the path is withheld from the output |
| Publication safety scan | A file announcing unpublished content | Fails |
| Publication safety scan | `REQUIRE_DENYLIST=true` with no list | Fails, as CI does if the secret is missing |
| Publication safety scan | An invalid rule in the list | Fails, naming the rule number only |
| Palette contrast | Graphite lightened to `#a8a29a` | Fails: 9 pairs below 4.5:1 |
| Figure label contrast | The default figure label colour set to `#b5aea4` | Fails: lowest 1.85:1 in figure 1 and 1.8:1 in figure 2 |
| Figure publication gate | Figure 2 set to `in-review`, production build | Build stops: "only verified figures can be published" |
| Figure publication gate | The same, with `INCLUDE_DRAFTS=true` | Draft build completes, as intended |
| Source rule | A published article with no sources | Build stops: "A published article (draft: false) must list at least one source" |
| Source rule | The same article as a draft | Build completes, as intended |

Every control was reverted, the changed files were compared with their originals afterwards, and the site was rebuilt. The rebuilt output had the same hash as before the controls.

## What the browser suite covers

`tests/site.spec.ts`, over the 7 content routes discovered from the build (`/`, `/architecture/`, the CDC entry, its two figure pages, `/writing/` and `/about/`):
1. Each route: status 200, exactly one `h1`, the correct canonical URL with the base path, a meta description over 50 characters, and `lang="en-GB"`.
2. Each route has no automatically detectable WCAG 2.2 AA violations (axe). axe checks HTML text, not SVG text.
3. Each route at **320, 375, 768, 1024, 1440 and 1920 px**: no page-level horizontal scrolling once the fonts have loaded, and none at 320 px with the web fonts blocked, when only the system's fallback font is shown.
4. Keyboard: the first Tab stop is "Skip to content", and Enter moves focus to `<main>`.
5. Navigation: each main nav link reaches its page and sets `aria-current="page"`.
6. **Legacy URLs:** `index.html` serves the new homepage; `about.html`, `contactingme.html` and `myprojects.html` land on their successors; the 10 retired URLs return 404.
7. The 404 page exists and links home.
8. With `prefers-reduced-motion: reduce`, no animation is running once the home page has loaded.

`tests/figures.spec.ts`:
9. Every label in each full-size figure page has at least 4.5:1 contrast against the colour behind it.
10. Each figure's "Open full size" link reaches its figure page, and "Back to the entry" returns to the figure.

axe does not run on the 404 page or the 3 legacy redirect pages.

## Changes from the pull-request review (22 Nov 2026)

| Review item | Change | Evidence |
|---|---|---|
| 1. CDC ordering | The entry defines `log_position` as a commit-ordered key, the same on redelivery and never shared by two changes to one key, and says how to build it for MySQL, PostgreSQL and DMS. A tie check runs before the MERGE. Figure 2's footnote and source-lane subtitle are relabelled | `merge_logic_test.py` output in `checks.txt`; sources quoted in `src/visuals/log-based-cdc/sources.md` |
| 2. First-cutover rollback | The first release's rollback is switching Pages back to the `archive/halcyonic-2023` branch; re-run and revert apply only to later releases | `docs/DEPLOYMENT.md` |
| 3. Legacy URLs | 10 URLs with no related page are retired (404); 4 keep their successors | browser suite; `retired-url-404.png`, `legacy-redirect-about.png` |
| 4. Source rule | A published article must list at least one source; drafts may not | controls 10 and 11 |
| 5. Figure contrast | Every rendered label is now checked against the colour behind it, alongside the palette check; zoom evidence added | browser suite; controls 6 and 7; `zoom-*.png` |
| 6. Writing | Launch with the honest empty Writing page; promote the site after the first article. Home now links the RSS feed | `home-*.png`, `writing-*.png` |
| CI on the first fix commit | CI failed on two pages at 320 px: Home and the CDC entry. The failure depends on whether the web fonts load before the reflow check runs; the CI runner's Linux fallback font is wider. A no-wrap link on Home and the entry's trade-off table could then widen the page. On narrow screens, links now wrap and tables use a fixed layout, and one long word gets a soft hyphen. A new test checks every page at 320 px with the web fonts blocked, and the main reflow test waits for the fonts | browser suite (7 new fallback-font tests); `entry-table-320.png` |

## Defects found earlier and fixed

| Found by | Defect | Fix |
|---|---|---|
| Internal link check | The 404 page declared a canonical URL; the RSS channel link pointed at the domain root | 404 has no canonical; RSS channel link points at the site home under the base path |
| Visual review | Astro 7 compresses HTML and dropped spaces between caption parts, the brand name and subtitle, and reference titles and publishers | Explicit spaces added |
| Visual review | No sign on phones that figures scroll sideways; legend labels wrapped | A visible scroll hint; legend labels kept on one line |
| Browser suite | The reduced-motion rule created tiny transitions when fonts loaded | Transitions and animations switched off entirely under reduced motion |
| axe | Syntax-highlighting keywords were 4.49:1 on the code background | Code theme changed to GitHub Light High Contrast |
| Separate figure review passes (two rounds) | 24 and 14 findings on the CDC figures and entry | All fixed; see `src/visuals/log-based-cdc/sources.md` |
| Rules reviews (two rounds) | Among others: the private-name list in the public script, copy describing essays that do not exist, a bypassable figure gate, unrecorded claims, duplicate SVG ids, table semantics, a scan that missed file paths, figure 2's notes losing their colour, the scroll-hint breakpoint | All fixed; the private-name list was never committed |

## Manual checks

- **Screenshots reviewed:** the 42 images in `docs/qa/screenshots/`. At 200% and 400% zoom:
  - the page reflows into one column, and prose and tables wrap;
  - code blocks keep their line length and scroll sideways inside their own frame, so at 400% a long line runs past the visible edge until it is scrolled;
  - figures keep their size and scroll sideways inside their frame, with the hint and the full-size link;
  - the browser suite confirms there is no page-level horizontal scrolling at 320 px, the width 400% zoom produces.
- **Figure legibility:** the smallest figure label renders at 12 px or more at each figure's declared minimum width (1160 px).

## Not done, or limits

- **Zoom is simulated,** as a smaller viewport at a higher pixel density: 640 x 400 at 2x for 200%, and 320 x 200 at 4x for 400%, of a 1280 x 800 window. That is how browser zoom changes the layout viewport, but it is not a session in a real browser's zoom control.
- **No screen-reader session** (VoiceOver). The semantics are covered by axe and the keyboard tests.
- **The per-label contrast check samples three points across each label,** not every pixel.
- **Lighthouse was run on a local static server.** GitHub Pages adds its own compression and caching (`max-age=600`), so live scores will differ.
- **No field data (CrUX).** The new pages have no traffic history.
- **The article layout has not been exercised by a published article,** because none is published yet.
- **The MySQL 8.4 manual pages** cited by the entry were read during research, and their links return 200 (`external-links.json`), but their text was not re-read for the final review. The entry's other sources were re-read on 21 or 22 Nov 2026.
- **The base path is written out** in the legacy redirect pages, `scripts/check-links.mjs`, `tests/site.spec.ts`, `tests/figures.spec.ts`, `playwright.config.ts`, `scripts/run-lighthouse.mjs`, `scripts/measure-layout.mjs` and `scripts/take-screenshots.mjs`, as well as in `astro.config.mjs`. Renaming the repository, which is not planned, would need all of them changed.

## Deployment readiness

Ready for review. The cutover and rollback steps, with the manual ones marked, are in `docs/DEPLOYMENT.md`. In short:
1. The `CONTENT_DENYLIST` repository secret exists (created 21 Nov 2026).
2. Manual: switch the Pages source to GitHub Actions, immediately before merging.
3. Manual: merge. The workflow verifies and deploys.
4. Verify live.
5. If the first release must be rolled back: switch Pages back to "Deploy from a branch", `archive/halcyonic-2023`, folder `/`.
