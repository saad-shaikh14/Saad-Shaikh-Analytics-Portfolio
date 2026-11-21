import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../data/site';
import { publishedArchitecture, publishedArticles } from '../utils/content';
import { url } from '../utils/url';

export async function GET(context: APIContext) {
  const [articles, architecture] = await Promise.all([publishedArticles(), publishedArchitecture()]);
  const items = [
    ...articles
      .filter((a) => !a.data.draft)
      .map((a) => ({
        title: a.data.title,
        description: a.data.summary,
        pubDate: a.data.publicationDate,
        link: url(`/writing/${a.id}/`),
        categories: [a.data.category, ...a.data.tags],
      })),
    ...architecture
      .filter((e) => !e.data.draft)
      .map((e) => ({
        title: e.data.title,
        description: e.data.summary,
        pubDate: e.data.publicationDate,
        link: url(`/architecture/${e.id}/`),
        categories: ['architecture', ...e.data.tags],
      })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: `${SITE.name}: ${SITE.subtitle}`,
    description: SITE.description,
    // Channel link is the site home under the GitHub Pages base path.
    site: new URL(import.meta.env.BASE_URL, context.site ?? 'https://saad-shaikh14.github.io').toString(),
    items,
    customData: `<language>${SITE.lang.toLowerCase()}</language>`,
  });
}
