import { getCollection, type CollectionEntry } from 'astro:content';

// Drafts never reach the production build. The QA build (INCLUDE_DRAFTS=true) renders them
// so layouts can be tested without publishing anything.
const buildEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
export const includeDrafts = import.meta.env.DEV || buildEnv.INCLUDE_DRAFTS === 'true';

export async function publishedArticles(): Promise<CollectionEntry<'articles'>[]> {
  const all = await getCollection('articles', ({ data }) => includeDrafts || !data.draft);
  return all.sort((a, b) => b.data.publicationDate.valueOf() - a.data.publicationDate.valueOf());
}

export async function publishedArchitecture(): Promise<CollectionEntry<'architecture'>[]> {
  const all = await getCollection('architecture', ({ data }) => includeDrafts || !data.draft);
  return all.sort((a, b) => b.data.publicationDate.valueOf() - a.data.publicationDate.valueOf());
}

export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^import .*$/gm, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
