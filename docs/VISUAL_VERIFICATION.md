# Visual verification standard

No architecture diagram, infographic or technical illustration is published unless it has been through this workflow. **Accuracy comes first, visual quality second.** A figure without enough evidence is not published. Details that cannot be verified are left out, or labelled as uncertain.

## Files for every published visual

```text
src/visuals/<visual-id>/
  draw.mjs          the editable source: a deterministic script that writes every figure-N.svg
  figure-N.svg      generated output, committed; re-running draw.mjs must reproduce it byte for byte
  spec.md           step B: what the figure claims, its components, flows, boundaries and assumptions
  sources.md        step A/G: sources (title, URL, version, access date), claim-to-source table, review notes
  figures.ts        caption, title, text description and status, as used by the site
  *_test.py         optional: an executable check of logic the figure or entry relies on
```

A visual is published only when its `figures.ts` entry has `status: 'verified'` and the architecture entry that uses it has `reviewStatus: 'verified'`. Two checks enforce this in the production build:
- the content schema: an entry with `draft: false` must be `verified`;
- `Figure.astro`: it stops the build if asked to render a figure whose status is not `verified`, however the figure is referenced. Draft and QA builds (`INCLUDE_DRAFTS=true`) may render it.

## Steps

### A. Research
- Read current, authoritative sources, in this order of preference:
  1. official documentation;
  2. official architecture references;
  3. specifications;
  4. maintainer documentation;
  5. engineering publications;
  6. independent sources, used to cross-check.
- Record the title, URL, documentation version and access date for each source.
- An AI-generated explanation is never a source.

### B. Define the claim (`spec.md`)
Before drawing, write down:
- what the figure explains;
- the pattern it represents;
- the components, relationships and direction of data flow;
- system boundaries and control-plane responsibilities;
- operating assumptions and limitations;
- the level of abstraction. A reference figure does not pretend to show every production detail.

### C. Check for missing elements
Go through the relevant checklist and include only what matters to this figure:
- ingestion, storage, processing, transformation, orchestration;
- error handling and recovery, data quality;
- security and identity, monitoring and observability, governance;
- scalability, consistency, cost, operational responsibility.

### D. Challenge in a separate pass
The figure is challenged in a separate review pass that is given only the spec, the sources and the rendered figure, not the reasoning behind them. The review answers:
- Is it technically possible? Are the components compatible?
- Are arrow directions right? Are data and control flows kept apart?
- Are the names accurate?
- Are the key assumptions visible?
- Does the figure imply a guarantee the architecture does not give, such as "exactly once" where only at-least-once applies?
- Are there material omissions or misrepresented limitations?

Every finding is fixed, or recorded with its reason, in `sources.md`.

### E. Produce the figure
- Use deterministic, editable vector formats only: SVG written by hand or by a deterministic script, or Mermaid or D2 rendered to SVG.
- Never rely on an image generator to spell component names or draw precise architecture.
- Follow the diagram style in `DESIGN_SYSTEM.md`.
- Give the SVG `role="img"`, a `<title>` and a `<desc>`, and refer to both with `aria-labelledby`.

### F. Verify the rendered result
Inspect the actual rendered output, on desktop and on mobile (the browser tests produce screenshots). Check:
- every component, label, arrow and connection against `spec.md`;
- legibility at the smallest size, and at 200% and 400% zoom;
- the contrast of every label against what is behind it (`tests/figures.spec.ts` measures this on each full-size figure page);
- that colour carries meaning only together with shape or text;
- the caption and the text description.

### G. Preserve the evidence
`sources.md` keeps:
- the sources;
- each claim mapped to its source;
- assumptions;
- review notes, with the reviewer's findings and how each was resolved;
- the verification status;
- the date verified.

The generator script (`draw.mjs`) is the editable source, and the SVG files are its committed output. The caption and the text description live in `figures.ts`.

## Claim classes used in figures and their entries

| Class | Meaning | How it is shown |
|---|---|---|
| Established fact | Stated by official documentation or a specification | Plain text, with the source in the entry's references |
| Technical analysis | Reasoned from documented facts | Signalled in the text ("this follows from…", "in practice…") |
| Reference design | A possible architecture under stated assumptions | Labelled "Reference blueprint", with an assumptions box |
| Opinion | A viewpoint | Written in the first person and identified as a view |
| Unverified | Not established | **Not published** |
