# Editorial guide

## Philosophy

This is a knowledge-first publication about data engineering, data platform architecture and AI. It earns trust by explaining how systems work and how they fail, not by listing achievements.
- Every piece answers a real engineering question.
- Every factual claim can be traced to a source.
- Every opinion is identified as one.

## Voice

- First person, plain British English, short sentences where possible.
- Specific nouns and verbs. Name the mechanism, not the adjective.
- Explain trade-offs instead of declaring winners. Architecture choices depend on constraints, so state the constraints.
- No marketing language. Avoid: passionate, unlock, leverage, seamless, robust and scalable, cutting-edge, game-changing, end-to-end, future-proof, world-class, data-driven, transforming businesses.
- No generic AI-written patterns: no empty "In today's fast-paced world" openers, no closing "In conclusion" restatements, no lists of three adjectives.

## Accuracy rules

1. **Verify before writing.** Fast-moving products are checked against their current documentation, not old release notes. Record the version.
2. **Classify claims:**
   - established fact (sourced);
   - technical analysis (reasoned from facts);
   - reference design (assumptions stated);
   - opinion (identified);
   - unverified (**not published**).
3. **Separate announcements from evidence.** Mark what a vendor has announced, what is documented, what has been demonstrated publicly and what has been measured.
4. **Never invent numbers.** No invented benchmarks, costs or percentage improvements. Hypothetical examples are labelled as hypothetical and their assumptions stated.
5. **Experience claims are exact.**
   - Research-based knowledge is never presented as hands-on production experience.
   - When something comes from systems Saad has built, the text says so.
   - Employers' and clients' internal products, systems and figures are never named or shown.

## Research requirements

For each article or architecture entry:
- primary sources: official documentation, specifications, maintainers;
- engineering publications and talks where relevant;
- independent sources to cross-check;
- community discussion (issues, forums) only as a lead, never as the sole source.

Every source is recorded in the entry's `sources` front matter with its publisher, version and access date. The build enforces this: an article with `draft: false` and no sources fails the content schema (`src/content.config.ts`), and an architecture entry always needs at least one. Drafts may be incomplete.

## Article structure

1. A title that names the question or the claim, plus an optional subtitle that states the argument.
2. A short abstract: what the piece explains or argues, and why it matters now.
3. The body, organised by the reader's questions, with diagrams and code only where they add something.
4. Limitations and trade-offs, in their own section when they are substantial.
5. What engineers can take away.
6. References: numbered, titled and linked.

Architecture entries follow the fields in `src/content.config.ts`: summary, scope and assumptions, main figure, components, flows and boundaries, decisions, reliability and operations, trade-offs, alternatives and references. **Only the sections that add value are written.**

## References

- Link to the most specific official page, not a home page.
- Name the version of the documentation where it matters.
- Prefer stable URLs. If a page is likely to move, also name it in the text.

## Visual standards

See `VISUAL_VERIFICATION.md` and `DESIGN_SYSTEM.md`. A figure is published only once it is verified.
