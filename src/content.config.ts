import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ARTICLE_CATEGORIES } from './data/site';

// A reference cited by an article or architecture entry. Every published entry lists its sources.
const source = z.object({
  title: z.string(),
  url: z.url(),
  publisher: z.string(),
  version: z.string().optional(),
  accessed: z.coerce.date(),
});

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string().max(120),
      subtitle: z.string().max(220).optional(),
      description: z.string().min(50).max(170),
      summary: z.string().max(500),
      publicationDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      category: z.enum(ARTICLE_CATEGORIES),
      tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(8).default([]),
      author: z.string().default('Saad Shaikh'),
      // Safe default: nothing is published until it is explicitly marked draft: false.
      draft: z.boolean().default(true),
      heroVisual: z.string().optional(),
      sources: z.array(source).default([]),
      canonicalUrl: z.url().optional(),
      relatedContent: z.array(z.string()).default([]),
      toc: z.boolean().default(true),
    })
    .refine((d) => !d.updatedDate || d.updatedDate >= d.publicationDate, {
      message: 'updatedDate must not be before publicationDate',
      path: ['updatedDate'],
    }),
});

const architecture = defineCollection({
  loader: glob({ base: './src/content/architecture', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string().max(120),
      description: z.string().min(50).max(170),
      summary: z.string().max(600),
      architectureType: z.enum(['reference-blueprint', 'architecture-decision', 'engineering-pattern', 'visual-explainer']),
      assumptions: z.array(z.string()).min(1),
      technologies: z.array(z.string()).max(12).default([]),
      visual: z.string(),
      sources: z.array(source).min(1),
      reviewStatus: z.enum(['verified', 'in-review']),
      publicationDate: z.coerce.date(),
      lastReviewed: z.coerce.date(),
      tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(8).default([]),
      draft: z.boolean().default(true),
    })
    .refine((d) => d.draft || d.reviewStatus === 'verified', {
      message: 'Only entries whose review status is "verified" can be published',
      path: ['reviewStatus'],
    }),
});

export const collections = { articles, architecture };
