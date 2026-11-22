// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// GitHub Pages project site: https://saad-shaikh14.github.io/Saad-Shaikh-Analytics-Portfolio/
// Every internal link goes through src/utils/url.ts so the base path is never hard-coded.
export default defineConfig({
  site: 'https://saad-shaikh14.github.io',
  base: '/Saad-Shaikh-Analytics-Portfolio',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
  integrations: [
    mdx(),
    sitemap({
      // Figure pages and the 404 are utility pages, not content.
      filter: (page) => !page.includes('/figures/') && !page.endsWith('/404/') && !page.includes('/concepts/'),
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light-high-contrast' },
  },
});
