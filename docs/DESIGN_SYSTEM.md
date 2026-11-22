# Design system

**Direction:** an independent engineering publication crossed with a well-made technical reference book. The design is editorial and light-first. Writing sets the system, and the technical figures are the site's visual signature. Tokens live in `src/styles/tokens.css`. This document explains them.

## Principles

1. **Reading first.** Line length (68ch), type and rhythm come first. Everything else adapts to them.
2. **Figures are the identity.** Diagrams share one vocabulary, one palette and one caption format, so a reader can recognise them on sight.
3. **Calm page, precise figure.** Pages stay quiet. Technical precision belongs inside figures and code.
4. **One accent.** Copper marks links, focus and the single highlighted path in a figure. Nothing else competes with it.
5. **Nothing decorative that pretends to be data.** No stock imagery, no glowing databases, no fake dashboards, no logo walls, no gradients.
6. **Accessible by construction.** The target is WCAG 2.2 AA. That means visible focus everywhere, targets of at least 24 px (most are 44 px), reflow at 320 px, and reduced motion respected.
7. **Fast by default.** Static HTML, no client framework, self-hosted fonts, and no third-party scripts.

## Colour

| Role | Token | Hex | Use |
|---|---|---|---|
| Page | `--c-paper` | `#faf7f0` | Warm ivory background |
| Surface | `--c-surface` | `#fffdf8` | Figure panels, footer |
| Parchment | `--c-parchment` | `#f2ece0` | Assumption boxes, tables of contents, inline code |
| Ink | `--c-ink` | `#1c1b19` | Headings and body text |
| Graphite | `--c-graphite` | `#4f4a44` | Meta text, captions |
| Rule | `--c-rule` / `--c-rule-strong` | `#ddd3c2` / `#b9ab94` | Dividers, borders |
| Copper (accent) | `--c-copper` / `--c-copper-deep` | `#9a4a1f` / `#7a3915` | Links, focus ring, highlighted path in figures |
| Navy (figures) | `--c-navy` / `--c-navy-soft` | `#1e3a5f` / `#e7ecf2` | Figure strokes, labels and component fills; reference tags |
| Teal (secondary) | `--c-teal` / `--c-teal-soft` | `#2f6b66` / `#e3efec` | Secondary categorisation; storage in figures |

**Contrast.** Three checks run in CI:
- **HTML text:** axe-core runs the WCAG 2.2 AA rule set on every content route (`tests/site.spec.ts`). axe-core does not check text inside the SVG figures, because it reads CSS `color`, not SVG `fill`.
- **Every rendered figure label:** `tests/figures.spec.ts` opens each full-size figure page and measures each label's computed text colour against the colour actually behind it: the topmost filled shape under three points across the label, or the figure panel. It fails below 4.5:1. On 22 Nov 2026: 72 labels in figure 1 and 71 in figure 2, lowest 6.12:1 (the step numerals on copper).
- **The palette:** `npm run test:contrast` (`scripts/check-contrast.mjs`) computes the ratio of every dark text colour against every light background in `tokens.css` and in each figure's palette, plus the light-on-dark pairs (the skip link, and the step numerals on copper), and fails below 4.5:1. It guards colours a future figure might combine; the lowest pair was teal on the copper tint, 5.03:1.
- The navy and teal figure strokes meet the 3:1 non-text threshold on their own tints (9.68:1 and 5.22:1).

**What the checks do not cover:** a label that overlaps two shapes is sampled at three points, not at every pixel, and nothing automated judges legibility at high zoom. Those are covered by the rendered screenshots, including 200% and 400% zoom, in `docs/qa/screenshots/`.

**Dark mode** is not provided at launch. The site sets `color-scheme: light`.

## Typography

| Role | Family | Why |
|---|---|---|
| Editorial display: headings, titles, the name | **Literata** (variable, optical size) | A serif designed for long reading. At display sizes its optical-size axis gives the headlines their editorial character |
| Body and interface | **Atkinson Hyperlegible Next** (variable) | A sans-serif designed for legibility. It suits long technical explanations, with clear letterforms for `l`, `1` and `I` |
| Code and technical annotations | **JetBrains Mono** (variable) | Clear distinctions between characters such as `0`/`O` and `1`/`l` |

All three are under the SIL Open Font License, self-hosted through Fontsource packages with no third-party font requests, and served with `font-display: swap`.

**Scale.** The scale is fluid, `--step--1` to `--step-4`:
- body text is 17 to 19 px with a line height of 1.65 to 1.7;
- h1 is set at an optical size of 72.

## Layout

- **Containers:**
  - `--measure` (68ch) for reading;
  - `--wide` (84rem) for every page container (`.container-wide`): header, footer, page sections and figures.
- **Spacing scale:** `--s-1` (0.25rem) to `--s-9` (6rem). Sections are separated by about 4rem on desktop and 3rem on mobile, with hairline rules between them.
- **Breakpoints:** 40rem, 48rem, 56rem, 64rem and 78rem (up to 78rem the figure shows its "scroll sideways" hint, because below about 1242 px a 1160 px figure scrolls). These are chosen per component (where the layout actually breaks), not as one global grid.
- **Architecture entries:** below the header, an intro row holds the scope and assumptions box (3fr) beside the table of contents (2fr). It is not sticky, and below 56rem the two stack. The content below runs at full container width: text is capped at the 68ch measure, code blocks at 96ch, and figures use the full width.

## Editorial components

| Component | File | Notes |
|---|---|---|
| Header and navigation | `SiteHeader.astro` | The name links Home. Four items stay visible at every width (they wrap rather than collapse), so no JavaScript menu is needed. `aria-current` marks the current page, with an underline as well as colour |
| Footer | `SiteFooter.astro` | The same links, in the same order, appear on every page (WCAG 3.2.3, Consistent Navigation) |
| Entry card | `EntryCard.astro` | Kicker (type or category), title, summary and date. The whole card is clickable, and focus is shown around the card |
| Figure | `Figure.astro` | Numbered caption, title, horizontal-scroll region on small screens, "Open full size" view, and a text description in `<details>` with a source note |
| References | `SourceList.astro` | Numbered list of title, publisher, version and access date |
| Scope and assumptions | entry layout | Parchment box. Every architecture entry must have one |
| Tags | `.tag--reference`, `.tag--status` | Text plus colour, never colour alone |

## Diagram style

Every figure is an SVG written by a small deterministic script, which is the editable source; see `src/visuals/log-based-cdc/draw.mjs`. The generated SVG files are committed, and re-running the script reproduces them byte for byte. Labels are live `<text>` in the page's fonts, never outlines. The rules for verifying a figure's content are in `VISUAL_VERIFICATION.md`.

**Principle.** Shape says *what kind of thing* a component is, line style says *what moves*, and copper says *where to look*. There are no vendor icons; product names appear only as examples in brackets.

### Shapes
Each shape carries a small mono kicker word naming its type.

| Kicker | Shape | Meaning |
|---|---|---|
| `SOURCE` | Rectangle with a double left edge | An external source, outside the platform's ownership |
| `JOB` | Rounded rectangle, navy tint | A process |
| `LOG` | Segmented bar with an open right end | A log or stream, with an append direction |
| `FILES` | Stacked sheets | Files in object storage |
| `TABLE` | Cylinder, teal | A table |
| `CONTROL` | Chamfered rectangle, no fill | An orchestrator or scheduler |
| `MONITOR` | Rectangle with a teal top rule | Monitoring |
| `CONSUMER` | Rectangle with a top rule | A consumer of the data |
| — | Small diamond | A check, such as reconciliation |

### Lines
- **Data:** solid navy, 2 px, filled arrowhead.
- **Control:** dashed graphite with an open chevron head.
- **Metadata:** dotted teal with round ends. Used for positions, metrics and reconciliation reads.
- **Highlighted path:** at most one per figure, drawn in copper.
- **Edge labels:** mono 12 px, naming what moves or the verb.

### Numbered steps
- Copper rounded squares with an ivory numeral.
- Placed beside the line they describe, never on it.
- Mirrored one to one by a numbered list in the text.

### Boundaries and legend
- **Boundaries:** a solid graphite outline with a mono tab label in the top-left corner, for a system or ownership boundary.
- **Legend:** an HTML legend sits under each figure and lists only the encodings that figure uses.
- **Titles and captions:** these live in HTML, not inside the SVG.

### Size and mobile
- Labels are 12 to 15 units on a 1160-unit-wide viewBox.
- Each figure declares a minimum width at which its smallest label renders at 12 CSS px or more.
- Narrower screens scroll the figure sideways inside its frame, with a visible hint, a full-size page and a numbered text description.

### Never
- Vendor logos.
- 3D icons.
- Decorative imagery that misrepresents a technology.
- A label that implies a guarantee the design does not give, such as "exactly-once".

## Responsive behaviour

The layout is checked at 320, 375, 768, 1024, 1440 and 1920 px by the browser tests in `tests/site.spec.ts`:
- there is no page-level horizontal scrolling;
- screenshots at every width are produced for review;
- tables keep native table display and wrap cell text on narrow screens;
- code blocks keep their lines and scroll sideways inside their frame;
- figures scroll sideways within their frame.
