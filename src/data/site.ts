// One place for the identity used across pages, metadata and structured data.
// Every link in LINKS is rendered. Add a link here only after Saad has confirmed it is current
// (GitHub and LinkedIn confirmed 21 Nov 2026); `confirmed` records that check and is not read by code.
export const SITE = {
  name: 'Saad Shaikh',
  subtitle: 'Inside Modern Data Systems',
  areas: ['Data Engineering', 'Systems Architecture', 'Software Engineering', 'AI'],
  description:
    'Independent writing, source-backed architecture and reproducible research on data-intensive software systems by Saad Shaikh.',
  locale: 'en_GB',
  lang: 'en-GB',
  author: 'Saad Shaikh',
} as const;

export const LINKS = {
  github: { label: 'GitHub', href: 'https://github.com/saad-shaikh14', confirmed: true },
  linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/saad--shaikh/', confirmed: true },
} as const;

export const NAV = [
  { label: 'Home', path: '/' },
  { label: 'Architecture', path: '/architecture/' },
  { label: 'Writing', path: '/writing/' },
  { label: 'Research', path: '/research/' },
  { label: 'Friday Digest', path: '/digest/' },
  { label: 'About', path: '/about/' },
] as const;

export const ARCHITECTURE_TYPES = {
  'reference-blueprint': {
    label: 'Reference blueprint',
    blurb: 'A source-backed diagram of a possible system design, with its assumptions stated. Not a description of a specific deployment.',
  },
  'architecture-decision': {
    label: 'Architecture decision',
    blurb: 'A comparison of approaches under stated constraints, with the criteria that would tip the choice.',
  },
  'engineering-pattern': {
    label: 'Engineering pattern',
    blurb: 'A recurring problem and the approaches that hold up in practice, with their failure modes.',
  },
  'visual-explainer': {
    label: 'Visual explainer',
    blurb: 'One difficult idea, broken down figure by figure.',
  },
} as const;

export const ARTICLE_CATEGORIES = [
  'data-engineering',
  'data-platform-architecture',
  'ai-and-emerging-systems',
  'reliability-and-operations',
  'performance-and-cost',
  'industry-developments',
] as const;

export const CATEGORY_LABELS: Record<(typeof ARTICLE_CATEGORIES)[number], string> = {
  'data-engineering': 'Data engineering',
  'data-platform-architecture': 'Data platform architecture',
  'ai-and-emerging-systems': 'AI and emerging systems',
  'reliability-and-operations': 'Reliability and operations',
  'performance-and-cost': 'Performance and cost',
  'industry-developments': 'Industry developments',
};
