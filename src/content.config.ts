import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    repo: z.url().optional(),
    link: z.url().optional(),
    status: z.enum(['active', 'incubating', 'archived']).default('active'),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    image: z.string().optional(),
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional(),
    video: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().optional(),
    authorUrl: z.url().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    lang: z.enum(['en', 'si']).default('en'),
    // Slug of the same post in the other language, if one exists.
    translationOf: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional(),
    category: z.enum(['engineering', 'guide', 'studio']).default('engineering'),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    relatedProject: z.string().optional(),
  }),
});

export const collections = { projects, blog };
