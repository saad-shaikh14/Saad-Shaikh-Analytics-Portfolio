import type { FigureMeta, Visual } from './types';
import { logBasedCdc } from './log-based-cdc/figures';
import { includeDrafts } from '../utils/content';

// Registry of published visuals, keyed by the id used in an architecture entry's `visual` field.
// A visual is added here only after it has passed docs/VISUAL_VERIFICATION.md.
export const VISUALS: Record<string, Visual> = {
  'log-based-cdc': logBasedCdc,
};

export function figuresFor(visualId: string): FigureMeta[] {
  const visual = VISUALS[visualId];
  if (!visual) return [];
  // Figures still in review render only in draft builds (dev, or INCLUDE_DRAFTS=true for QA).
  return visual.figures.filter((f) => f.status === 'verified' || includeDrafts);
}

export function figureFor(visualId: string, n: number): FigureMeta | undefined {
  return figuresFor(visualId).find((f) => f.number === n);
}
