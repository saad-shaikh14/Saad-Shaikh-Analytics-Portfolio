# Deployment

The site is a GitHub Pages **project site** served at `https://saad-shaikh14.github.io/Saad-Shaikh-Analytics-Portfolio/`. Astro builds it statically. The `Site` workflow (`.github/workflows/site.yml`) verifies every change and deploys only from `main`.

## Local development

```sh
nvm use                 # Node 24 (see .nvmrc; Astro 7 needs >= 22.23.4)
npm ci
npm run dev             # http://localhost:4321/Saad-Shaikh-Analytics-Portfolio/
```

Versions are pinned exactly in `package.json`, and `package-lock.json` is committed. TypeScript stays on 6.x, because `@astrojs/check` 0.9.12 supports TypeScript 5 and 6 only.

## Build and test

```sh
npm run build                           # astro check + astro build → dist/
npm run test:links                      # internal links, base path included
npm run test:content                    # publication safety scan: the whole repository and dist/
npm run test:contrast                   # palette contrast, including figure text
npx playwright install chromium         # once
npx playwright test                     # serves dist/ with `astro preview` under the real base path
```

Four further steps are run by hand before a release, because they depend on third parties or on the machine:
- `node scripts/check-external-links.mjs` writes `docs/qa/external-links.json`;
- with `astro preview --host 127.0.0.1 --port 4321` running:
  - `node scripts/run-lighthouse.mjs` writes `docs/qa/lighthouse.json`;
  - `node scripts/measure-layout.mjs` writes `docs/qa/measurements.json`;
  - `node scripts/take-screenshots.mjs` replaces the review screenshots in `docs/qa/screenshots/` and their `manifest.json`.

### The private-name list

The publication safety scan also checks for private names: employer, client and internal system names that must never appear on the site. That list is **not in the repository**, because a public list of private names would publish them.
- **Locally:** one regular expression per line in `.content-denylist` at the repository root. The file is gitignored.
- **In CI:** the same content in the repository secret `CONTENT_DENYLIST`. Update it with `gh secret set CONTENT_DENYLIST < .content-denylist`.
- The scan reports a match as `private-name rule #N`, never the pattern, so the Actions logs stay safe to publish.
- CI sets `REQUIRE_DENYLIST` for pushes and same-repository pull requests, so the scan fails if the secret is missing. Pull requests from forks cannot read secrets and run the generic checks only.
- **CI runs after a push, and the repository is public, so CI cannot stop a private name from being published.** Run `npm run test:content` locally, with `.content-denylist` present, before every push. That local run is the only gate before publication.

## Configuration that matters

- **`site` and `base`.** `astro.config.mjs` sets `site: 'https://saad-shaikh14.github.io'` and `base: '/Saad-Shaikh-Analytics-Portfolio'`. Every internal link goes through `src/utils/url.ts`. Never hard-code a leading `/`.
- **Trailing slashes.** `trailingSlash: 'always'` with `build.format: 'directory'`, so every page's canonical URL ends in `/`. A request without the slash still lands on the page. Read live on 22 Nov 2026: GitHub Pages answers `/writing` and `/architecture` with a 301 to the trailing-slash URL, and answers `/about` with `about.html` (200), the legacy redirect page, which forwards to `/about/`.
- **The repository must not be renamed.** GitHub does not redirect Pages URLs after a rename. Project-site paths are also case-sensitive.
- **`robots.txt` and site name.** Crawlers only read `robots.txt` at a host's root, so a project site cannot use one. Indexing is controlled per page with `<meta name="robots">`. Google does not show site names for sub-directory sites. Both become possible with a custom domain, which is a future option and needs approval.

## Legacy URLs

The old site had 14 pages. The four with a real successor still resolve; the other ten are retired.

| Old URL (under the base path) | Now |
|---|---|
| `index.html` | the new homepage, served directly |
| `about.html`, `contactingme.html` | redirect page to `/about/` |
| `myprojects.html` | redirect page to `/architecture/` |
| `AnalyzingDatasets.html`, `VisualisingDatasets.html`, `CreatingReports.html`, `amazondataset.html`, `netflixdataset.html`, `bcd.html` (2023 project pages); `onecolumn.html`, `twocolumn1.html`, `twocolumn2.html`, `threecolumn.html` (template demo pages) | **retired**: no file, so the request gets the site's 404 page |

**Why ten are retired.** None of them has a related page on the new site, so sending them to Home or About would be a "soft 404": a page that answers 200 for content that is gone. Saad chose to remove them entirely (pull-request review, 22 Nov 2026). Their 2023 content stays in the archive below.

**Redirect pages are not HTTP 301 redirects.** GitHub Pages offers no server-side redirects. Each of the three pages in `public/*.html` does three things:
- an **instant HTML meta refresh**;
- a `rel=canonical` pointing at the new page, with no `noindex`, so the two signals agree;
- a visible link, so the page still works without the refresh.

The browser tests open the four kept URLs and check where they land, and request the ten retired ones and check that each gets a 404.

The previous site is preserved:
- at the tag `legacy-halcyonic-2023`;
- on the branch `archive/halcyonic-2023`, at commit `432f7ef`.

## The workflow

`.github/workflows/site.yml` is the only workflow:
- **`verify`** runs on every pull request and on pushes to `main`: install from the lockfile, type check and build, internal links, the publication safety scan, the contrast check, and the browser tests. On `main` it uploads the Pages artifact (kept for 30 days).
- **`deploy`** runs only on `main`, after `verify`, in the `github-pages` environment.
- **Hardening:** the workflow token is read-only except `pages: write` and `id-token: write` on `deploy`; checkout does not persist credentials; each job has a timeout (20 and 10 minutes); every action is pinned to a commit SHA.

## GitHub Pages configuration

The setting is **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- Before the redesign, Pages published the `main` branch root (the "Deploy from a branch" source). The source has to change at cutover.
- The `github-pages` environment should allow deployments from `main` only: **Settings → Environments → github-pages → Deployment branches**.

## Cutover (first deployment)

Steps marked **manual** are done by hand in GitHub; the rest happen on their own.

0. **Manual, before the first pull request:** create the `CONTENT_DENYLIST` secret (see "The private-name list"). Without it, the pull request's `verify` job fails by design. Done on 21 Nov 2026.
1. **Manual: approve.** Approve the pull request after reviewing the preview and the QA report.
2. **Manual: switch the source.** Settings → Pages → Build and deployment → Source: **GitHub Actions**. Do this immediately before merging: while the source is still "Deploy from a branch" on `main`, merging would publish the raw repository root.
3. **Manual: merge** the pull request into `main`.
4. **Automatic:** the push to `main` runs the `Site` workflow: `verify`, then `deploy`. Follow it in **Actions**; the deploy job prints the page URL.
5. **Verify live:**
   - the home page, Architecture, Writing and About pages;
   - one architecture entry and one figure page;
   - the four kept legacy URLs, and one retired URL returning the 404 page;
   - `rss.xml` and `sitemap-index.xml`;
   - a mobile check.

   Pages serves responses with `max-age=600`, so allow up to 10 minutes for caches to update.
6. **Record** the deployed commit SHA and the workflow run.

## Rollback

### The first cutover

For the first release there is **no previous `Site` deployment to re-run**, and **reverting the merge would also remove the workflow** that deploys. So the rollback is to publish the old site again from its branch. All steps are manual:
1. Settings → Pages → Build and deployment → Source: **Deploy from a branch**.
2. Branch **`archive/halcyonic-2023`**, folder **`/ (root)`**, then **Save**. GitHub's documentation: "The source branch can be any branch in your repository."
3. Wait for the Pages build, then check the home page and one old page. Allow up to 10 minutes for caches.

`archive/halcyonic-2023` is commit `432f7ef`, the same commit `main` holds before this pull request is merged, so this republishes the site exactly as it was. `main` keeps the new source, and nothing deploys from it until the source is switched back to GitHub Actions.

### Later releases

Once a `Site` deployment from `main` has succeeded, use these in order of preference:
1. **Re-run the previous successful deployment** (Actions → Site → that run → Re-run jobs). Pages artifacts are kept for 30 days.
2. **`git revert` the change on `main`.** The next workflow run deploys the reverted state.
3. **Restore the old site entirely**, as for the first cutover.
