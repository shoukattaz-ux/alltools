import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(80).max(160),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    topic: z.enum(['PDF', 'Images', 'Privacy', 'Calculators', 'Productivity']),
    tools: z.array(z.string()).min(1),
    readingMinutes: z.number().int().positive(),
  }),
});
export const collections = { blog };
