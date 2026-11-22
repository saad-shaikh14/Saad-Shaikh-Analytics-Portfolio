# Launch report: first deployment

- **Live site:** https://saad-shaikh14.github.io/Saad-Shaikh-Analytics-Portfolio/
- **Launched:** 22 Nov 2026. The home page's `last-modified` header reads 11:41:08 GMT.
- **What was deployed:** the merge of pull request #1 into `main`, merge commit `a3c4335258584b134ee74f32ab03af4fdd5f60b5` (reviewed head `aed5b72`).
- **Workflow run:** `Site` run 45018436347 on `main`. `Build and verify` and `Deploy to GitHub Pages` both succeeded.
- **Every result below comes from `docs/qa/live-checks.txt`,** read against the live site after the deployment.

## Cutover, as done

1. **Pre-checks:**
   - pull request #1 at `aed5b72`, mergeable, with CI passing on that commit;
   - the old site still live;
   - Pages source "Deploy from a branch" (`main`, `/`);
   - the `github-pages` environment allowing deployments from `main` only.
2. **Pages source switched to GitHub Actions** (`build_type: workflow`). The old site stayed live until the first deployment.
3. **Pull request #1 merged** with a merge commit, pinned to the reviewed head `aed5b72`.
4. **The `Site` workflow on `main`** ran `verify`, then `deploy`. Both succeeded.

## Live checks

| Check | Result |
|---|---|
| Main pages, the entry, both figure pages | All 7 return **200** with the expected title |
| Browser checks at 375 px | Each of the 7 pages: one `h1`, the correct canonical URL, main navigation visible, **axe 0 violations** (WCAG 2.2 AA tags) |
| Reflow | **No page-level horizontal scrolling at 375 or 320 px** on any of the 7 pages |
| Figure links | "Open full size" reaches the figure page; "Back to the entry" returns to the figure |
| Kept legacy URLs | `index.html` serves the home page; `about.html`, `contactingme.html` and `myprojects.html` return 200 and forward to their successors; `about.html` was followed to `/about/` in the browser |
| Retired legacy URLs | All 10 return **404** with the site's own "Page not found" page |
| URLs without a trailing slash | `/writing` and `/architecture` return a 301 to the trailing-slash URL; `/about` returns `about.html`, which forwards to `/about/` |
| RSS and sitemap | `rss.xml` 200 with 1 item; `sitemap-index.xml` 200; `sitemap-0.xml` lists 5 URLs (figure pages and the 404 are excluded by design) |
| Caching | `cache-control: max-age=600` |
| Lighthouse 12.8.2, mobile, live | Home **100 / 100 / 100 / 100** (LCP 0.9 s, CLS 0, TBT 0 ms). CDC entry **100 / 100 / 100 / 100** (LCP 1.1 s, CLS 0.032, TBT 20 ms). Order: performance, accessibility, best practices, SEO |

## Rollback

- **This launch:** Settings → Pages → Source: Deploy from a branch → `archive/halcyonic-2023`, folder `/`. That republishes the 2023 site at commit `432f7ef`.
- **Later releases:** a successful `Site` deployment from `main` now exists (run 45018436347), so re-running a previous deployment or reverting on `main` also works (`docs/DEPLOYMENT.md`).

## Not done, and follow-ups

- **Promotion:** the site is not promoted until the first approved article is live (decision on pull request #1).
- **Open follow-ups, from the pull-request review:**
  - a stacked layout for wide tables on very narrow screens (issue #2);
  - a stronger visual identity as more is published (#3);
  - a real screen-reader session and native browser zoom (#4);
  - checking the article page with the first real article (#5).
