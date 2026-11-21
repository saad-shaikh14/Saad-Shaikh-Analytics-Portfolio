# QA report: redesign release candidate

- **Branch:** `redesign/data-platform-publication`
- **Checks run:** 21 Nov 2026, 18:41 to 18:44 UTC, on the final source, after its last edit. macOS (arm64), Node 26.11.1 (CI uses Node 24 from `.nvmrc`), Chromium from Playwright 1.65.1.
- **Order:** the build and every check ran first, and this report was written afterwards. The safety scan and the internal link check were then run again over the finished report (end of `docs/qa/checks.txt`).
- **Rule:** every result below comes from a check that was actually run, and each is saved in the file named beside it. Nothing is estimated.

## Summary

| Area | Command | Result | Saved in |
|---|---|---|---|
| Type check | `astro check` (part of `npm run build`) | **0 errors, 0 warnings, 0 hints** | `docs/qa/checks.txt` |
| Production build | `npm run build` | **8 pages** (home, Architecture, the CDC entry, its 2 full-size figure pages, Writing, About, 404) **+ 13 legacy redirect pages + RSS + sitemap**; drafts excluded | `checks.txt` |
| Internal links | `npm run test:links` | **279 internal references across 25 files resolve** under the base path | `checks.txt` |
| Publication safety scan | `npm run test:content` | **133 files** (the whole repository and `dist/`, dependencies excluded; 27 binary files checked by path only), **12 private-name rules: no private names in contents or paths, no placeholders or draft markers** | `checks.txt` |
| Palette contrast | `npm run test:contrast` | **110 text/background pairs, lowest 5.03:1** (teal on the copper tint); step numerals 6.12:1 | `checks.txt` |
| Browser suite | `npx playwright test` | **39 of 39 passed, in each of two runs** | `docs/qa/playwright-run-1.txt`, `playwright-run-2.txt` |
| Accessibility, automated | axe-core 4.14 inside the browser suite, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` | **0 violations on each of the 7 content routes** | the same two files |
| Lighthouse 12.8.2, mobile defaults | `node scripts/run-lighthouse.mjs` | Home: **Performance 96, Accessibility 100, Best Practices 100, SEO 100** (LCP 2.3 s, CLS 0.002, TBT 0 ms). Architecture entry: **94 / 100 / 100 / 100** (LCP 2.4 s, CLS 0.072, TBT 0 ms) | `docs/qa/lighthouse.json` |
| External links | `node scripts/check-external-links.mjs` | **29 checked; 28 return 200.** LinkedIn returns 999, its standard response to automated clients | `docs/qa/external-links.json` |
| Layout | `node scripts/measure-layout.mjs` | The entry's table keeps native table display and fits its column at 320 px (272 px in 272 px) and 375 px. The figure scrolls at 1240 px and not at 1244 px; its scroll hint shows up to 1248 px | `docs/qa/measurements.json` |
| Figure merge logic | `python src/visuals/log-based-cdc/merge_logic_test.py` (DuckDB) | **All assertions pass** | `checks.txt` |
| Figure source | `node src/visuals/log-based-cdc/draw.mjs`, run twice | Both SVGs regenerate **byte for byte** (identical SHA-256) | `checks.txt` |

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
| Figure publication gate | Figure 2 set to `in-review`, production build | Build stops: "only verified figures can be published" |
| Figure publication gate | The same, with `INCLUDE_DRAFTS=true` | Draft build completes, as intended |

Every control was reverted, and the changed files were compared with their originals afterwards.

## What the browser suite covers (`tests/site.spec.ts`)

The 7 content routes are discovered from the build: `/`, `/architecture/`, the CDC entry, its two figure pages, `/writing/` and `/about/`.
1. Each route: status 200, exactly one `h1`, the correct canonical URL with the base path, a meta description over 50 characters, and `lang="en-GB"`.
2. Each route has no automatically detectable WCAG 2.2 AA violations (axe). axe checks HTML text. Text inside the SVG figures is covered by the contrast check instead, because axe reads CSS `color`, not SVG `fill`.
3. Each route at **320, 375, 768, 1024, 1440 and 1920 px**: no page-level horizontal scrolling. A full-page screenshot is saved for each width.
4. Keyboard: the first Tab stop is "Skip to content", and Enter moves focus to `<main>`.
5. Navigation: each main nav link reaches its page and sets `aria-current="page"`.
6. **All 14 legacy URLs:**
   - `index.html` serves the new homepage directly;
   - the other 13 land on their mapped pages.
7. The 404 page exists and links home.
8. With `prefers-reduced-motion: reduce`, no animation is running once the home page has loaded.

axe does not run on the 404 page or the 13 legacy redirect pages.

## Defects found during QA and fixed

| Found by | Defect | Fix |
|---|---|---|
| Internal link check | The 404 page declared a canonical URL; the RSS channel link pointed at the domain root | 404 has no canonical; RSS channel link points at the site home under the base path |
| Visual review | Astro 7 compresses HTML and dropped the spaces between figure-caption parts ("Figure 1.Reference…"); the brand name and subtitle, and each reference title and its publisher, ran together for screen readers | Explicit spaces added |
| Visual review | No sign on phones that figures scroll sideways; legend labels wrapped | A visible scroll hint; legend labels kept on one line |
| Browser suite (reduced motion) | The reduced-motion rule set every transition to 0.01 ms, which created tiny transitions when fonts loaded | Transitions and animations are now switched off entirely under reduced motion |
| axe | Syntax-highlighting keywords (`#d73a49`) were 4.49:1 on the code background, just under AA | Code theme changed to GitHub Light High Contrast; 0 violations |
| Separate figure review passes (two rounds) | 24 round-1 and 14 round-2 findings on the CDC figures and entry, including the example SQL's null handling, unqualified claims and missing caveats | All fixed. See `src/visuals/log-based-cdc/sources.md` |
| Rules review, round 1 | The private-name list sat in the public scan script | Moved to a gitignored local file and a repository secret; the scan reports rule numbers only. It was never committed |
| Rules review, round 1 | Writing, home and About copy described essays that do not exist, and About and home went beyond the agreed facts | Copy now describes only what is published; the Writing page says it has no articles at the moment |
| Rules review, round 1 | A figure's `in-review` status could be bypassed by rendering it directly | `Figure.astro` stops a production build for any unverified figure (controls above) |
| Rules reviews, rounds 1 and 2 | Entry accuracy: the DMS duplicate sentence had lost its `DO_NOTHING` condition; a TOAST "around 8 KB" figure; eight sentences and six sources unrecorded | Fixed and quoted in `sources.md` |
| Rules review, round 1 | Duplicate SVG marker ids when both figures are on one page | Marker ids prefixed per figure in `draw.mjs` |
| Rules review, round 1 | Tables used `display: block`, which can drop table semantics | Native table display; cells wrap with hyphenation (measured above) |
| Rules review, round 1 | `noindex` on redirect pages contradicted their `rel=canonical` | `noindex` removed |
| Rules review, round 1 | CI scanned only `src` and `public`; checkout persisted credentials; no job timeouts | CI scans the whole repository and the build, does not persist credentials, and has 20- and 10-minute timeouts |
| Rules review, round 2 | This report contained a phrase the safety scan forbids, so the scan failed | Reworded; the scan's own failure labels no longer contain the phrase, so saved logs pass |
| Rules review, round 2 | The scan read only some file types and never checked file paths | Every file's path is checked, and every non-binary file's contents; a matching path is withheld from the output |
| Rules review, round 2 | A CSS rule turned figure 2's copper batch notes graphite | The default applies only where the SVG sets no fill |
| Rules review, round 2 | The scroll hint stopped at 72rem, but the figure scrolls up to about 1242 px | Hint shown up to 78rem (measured above) |

## Manual checks

- **Screenshots reviewed** at desktop and phone widths for Home, Architecture, the CDC entry (top, both figures, code block, the trade-off table at 320 px), Writing and About. A curated set, taken from the final build, is in `docs/qa/screenshots/`.
- **Figure legibility.** The smallest figure label renders at 12 px or more at each figure's declared minimum width (1160 px). Narrower screens scroll the figure, with a hint, a full-size page and a numbered text description.

## Not done, or limits

- **No screen-reader session** (VoiceOver) and no 200% or 400% browser zoom pass. The semantics are covered by axe and the keyboard test, but a manual screen-reader pass is still recommended.
- **Lighthouse was run on a local static server.** GitHub Pages adds its own compression and caching (`max-age=600`), so live scores will differ. They will be re-read after deployment.
- **No field data (CrUX).** The site has no traffic history at this URL for the new pages.
- **The article layout has not been exercised by a published article,** because no article is published yet. It shares the figure, reference, code and prose components that the architecture entry exercises.
- **The MySQL 8.4 manual pages** cited by the entry were read during research, and their links return 200 (`external-links.json`), but their text was not re-read for the final review. The entry's other sources were re-read on 21 Nov 2026.
- **The base path is written out** in the legacy redirect pages, `scripts/check-links.mjs`, `tests/site.spec.ts`, `playwright.config.ts`, `scripts/run-lighthouse.mjs` and `scripts/measure-layout.mjs`, as well as in `astro.config.mjs`. Renaming the repository, which is not planned, would need all of them changed.

## Deployment readiness

Ready for review. Cutover needs Saad's approval of the preview, then:
1. Make sure the `CONTENT_DENYLIST` repository secret exists (it is created before the pull request is opened).
2. Switch the Pages source to GitHub Actions.
3. Merge.
4. Verify live, as described in `docs/DEPLOYMENT.md`.
