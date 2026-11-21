// Every published figure is an entry in a visual's figures.ts. A figure without a matching
// sources.md and a "verified" status must not be published (docs/VISUAL_VERIFICATION.md).
import type { SvgComponent } from 'astro/types';

export interface FigureMeta {
  number: number;
  title: string;
  /** One sentence shown under the figure. */
  caption: string;
  /** Ordered text walk-through of the figure, used as its long description. */
  description: string[];
  /** Short note on what the figure is (and is not) evidence of. */
  sourceNote: string;
  status: 'verified' | 'in-review';
  /** Width (CSS px) below which the figure scrolls instead of shrinking, chosen so the smallest label renders at >= 12px. */
  minWidth: number;
  /** Only the encodings this figure uses, shown as an HTML legend under it. */
  legend: { term: string; meaning: string; swatch: 'data' | 'control' | 'metadata' | 'highlight' | 'step' | 'trust' | 'system' }[];
  component: SvgComponent;
}

export interface Visual {
  /** Slug of the architecture entry that owns these figures. */
  entry: string;
  figures: FigureMeta[];
}
