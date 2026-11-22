# Publishing guide

Publishing is manual and reviewed. Nothing is scheduled, and nothing is cross-posted automatically. Substack has no documented publishing API, so Substack and LinkedIn are prepared by hand.

> **The repository is public.** Anything pushed to GitHub, on any branch, is publicly readable, drafts included. Keep unapproved drafts on your own machine (an unpushed local branch) until they are approved.

## 1. Create an article

Create `src/content/articles/<yyyy-mm>-<slug>.md`. Use `.mdx` only if the article needs a component such as a figure.

```md
---
title: "Question or claim the article answers"
subtitle: "Optional: the argument in one sentence"
description: "50–170 characters, used for search results and social previews."
summary: "Two or three sentences: what the piece explains or argues and why it matters now."
publicationDate: 2026-11-28
category: data-platform-architecture   # see ARTICLE_CATEGORIES in src/data/site.ts
tags: [cdc, warehouses]
draft: true                            # stays true until approved
sources: []
---
```

## 2. Add metadata
- **`updatedDate`:** add it when an article is revised. It must not be before `publicationDate`.
- **`canonicalUrl`:** set it **only** when another copy is the original. For example, an article first published on Substack before the site existed.
- **`relatedContent`:** a list of article ids, which appear first in the article's Related section.

## 3. Add references

Every factual claim needs a source. Add each one to `sources`. The build refuses an article with `draft: false` and an empty `sources` list:

```yaml
sources:
  - title: "Logical Decoding Concepts"
    url: "https://www.postgresql.org/docs/current/logicaldecoding-explanation.html"
    publisher: "PostgreSQL Global Development Group"
    version: "PostgreSQL 18"
    accessed: 2026-11-21
```

## 4. Add verified visuals

1. Follow `docs/VISUAL_VERIFICATION.md`: research, then the spec, a separate review pass, the SVG, the rendered check, and the evidence record.
2. Put the files in `src/visuals/<visual-id>/` and register the figure in `src/visuals/index.ts`.
3. In an `.mdx` article or entry, render it with `<Figure figure={...} entry="..." />`.

## 5. Preview locally

```sh
npm ci
npm run dev            # http://localhost:4321/Saad-Shaikh-Analytics-Portfolio/  (drafts visible)
```

## 6. Run the checks

```sh
npm run build          # type check + production build (drafts excluded)
npm run test:links     # every internal link resolves under the base path
npm run test:content   # no private names, placeholders or draft markers (repository and build)
npm run test:contrast  # palette contrast, including figure text
npx playwright test    # routes, WCAG 2.2 AA (axe), reflow at 6 widths, keyboard, legacy URLs
```

The private-name part of the content scan needs the local `.content-denylist` file (see `docs/DEPLOYMENT.md`). Without it, the scan prints a note and runs only the generic checks. Run it before every push: the repository is public, so CI only finds a problem after it is already published.

## 7. Submit for review

1. Set `draft: false` only after the text is approved.
2. Open a pull request against `main`. CI runs the same checks.
3. Check the screenshots in `test-results/screenshots/` locally before asking for review.

## 8. Publish to the site

Merge the pull request into `main`. The `Site` workflow builds, verifies and deploys to GitHub Pages. It also updates:
- the article page;
- the Writing index;
- the RSS feed;
- the sitemap;
- related links.

Check the live article after deployment.

## 9. Prepare the Substack version

The website copy is the original, published first.
1. In Substack, create a post with the same title and subtitle.
2. Paste the full text.
3. Put a short introduction above Substack's free subscriber line, so the web version shows the introduction and a link back to the site.
4. Add "Originally published at <site URL>" at the top.
5. Send by email to subscribers.

Substack documents no per-post canonical URL setting. Test how the web version and its preview appear on a draft before relying on it.

## 10. Prepare the LinkedIn post

- **Length:** 900–1,500 characters, well under LinkedIn's 3,000-character limit for posts.
- **Shape:**
  - an opening line that states the engineering question;
  - three short takeaways;
  - one line on what the full piece covers;
  - the link to the site.
- **Use a post, not a LinkedIn Article.** Articles have no canonical setting and would create a competing duplicate.
- **Check the preview card:** it is the site's Open Graph image, 1200 × 630.
