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

Two further checks are run by hand before a release, because they depend on third parties or on the machine:
- `node scripts/check-external-links.mjs` writes `docs/qa/external-links.json`;
- `node scripts/run-lighthouse.mjs`, with `astro preview` running, writes `docs/qa/lighthouse.json`.

### The private-name list

The publication safety scan also checks for private names: employer, client and internal system names that must never appear on the site. That list is **not in the repository**, because a public list of private names would publish them.
- **Locally:** one regular expression per line in `.content-denylist` at the repository root. The file is gitignored.
- **In CI:** the same content in the repository secret `CONTENT_DENYLIST`. Update it with `gh secret set CONTENT_DENYLIST < .content-denylist`.
- The scan reports a match as `private-name rule #N`, never the pattern, so the Actions logs stay safe to publish.
- CI sets `REQUIRE_DENYLIST` for pushes and same-repository pull requests, so the scan fails if the secret is missing. Pull requests from forks cannot read secrets and run the generic checks only.
- **CI runs after a push, and the repository is public, so CI cannot stop a private name from being published.** Run `npm run test:content` locally, with `.content-denylist` present, before every push. That local run is the only gate before publication.

## Configuration that matters

- **`site` and `base`.** `astro.config.mjs` sets `site: 'https://saad-shaikh14.github.io'` and `base: '/Saad-Shaikh-Analytics-Portfolio'`. Every internal link goes through `src/utils/url.ts`. Never hard-code a leading `/`.
- **Trailing slashes.** `trailingSlash: 'always'` with `build.format: 'directory'`, so every page's canonical URL ends in `/`. A request without the slash, such as `/about`, still lands on `/about/`: GitHub Pages either redirects it to the directory, or serves `about.html`, which here is the legacy redirect page. Which of the two Pages does is read live after deployment.
- **The repository must not be renamed.** GitHub does not redirect Pages URLs after a rename. Project-site paths are also case-sensitive.
- **`robots.txt` and site name.** Crawlers only read `robots.txt` at a host's root, so a project site cannot use one. Indexing is controlled per page with `<meta name="robots">`. Google does not show site names for sub-directory sites. Both become possible with a custom domain, which is a future option and needs approval.

## Legacy URLs

The old site's 14 pages remain reachable:

| Old URL (under the base path) | Now |
|---|---|
| `index.html` | the new homepage, served directly |
| `about.html`, `contactingme.html`, `AnalyzingDatasets.html`, `VisualisingDatasets.html`, `CreatingReports.html`, `amazondataset.html`, `netflixdataset.html`, `bcd.html` | redirect page to `/about/` |
| `myprojects.html` | redirect page to `/architecture/` |
| `onecolumn.html`, `twocolumn1.html`, `twocolumn2.html`, `threecolumn.html` (template demo pages) | redirect page to `/` |

**Redirect pages are not HTTP 301 redirects.** GitHub Pages offers no server-side redirects. Each page in `public/*.html` does three things:
- an **instant HTML meta refresh**;
- a `rel=canonical` pointing at the new page, with no `noindex`, so the two signals agree;
- a visible link, so the page still works without the refresh.

The browser tests open every legacy URL and check where it lands.

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

0. **Before the first pull request:** create the `CONTENT_DENYLIST` secret (see "The private-name list"). Without it, the pull request's `verify` job fails by design.
1. **Approve.** Approve the pull request after reviewing the preview and the QA report.
2. **Switch the source.** Change the Pages source to **GitHub Actions**. Do this immediately before merging. While the source is still "Deploy from a branch", merging would publish the raw repository root.
3. **Merge.** Merge the pull request into `main`. The `Site` workflow runs `verify`, then `deploy`.
4. **Watch.** Follow the run in **Actions**. The deploy job prints the page URL.
5. **Verify live:**
   - the home page, Architecture, Writing and About pages;
   - one architecture entry and one figure page;
   - all 14 legacy URLs;
   - `rss.xml` and `sitemap-index.xml`;
   - a mobile check.

   Pages serves responses with `max-age=600`, so allow up to 10 minutes for caches to update.
6. **Record.** Record the deployed commit SHA and the workflow run.

## Rollback

Use these in order of preference:

1. **Re-run the previous successful deployment** (Actions → Site → the run → Re-run jobs). Pages artifacts are kept for 30 days.
2. **`git revert` the change on `main`.** The next workflow run deploys the reverted state.
3. **Restore the old site entirely:**
   - set the Pages source back to "Deploy from a branch";
   - choose branch `archive/halcyonic-2023`, folder `/`.

   That republishes the 2023 site unchanged.
