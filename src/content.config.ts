import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Be Prime編集部'),
    category: z.enum(['deals', 'gadget', 'culture', 'fashion', 'daily-goods']),
    tags: z.array(z.string()).default([]),
    saleEvent: z.string().optional(),
    saleEndDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    /** 記事サムネイル・OGP。未指定時はカテゴリ別プレースホルダー */
    heroImage: z.string().optional(),
    ogImage: z.string().optional(),
    cta: z.enum(['prime-trial', 'prime-day', 'sale-page', 'none']).optional(),
    products: z
      .array(
        z.object({
          asin: z.string().regex(/^[A-Z0-9]{10}$/i),
          label: z.string().optional(),
          note: z.string().optional(),
          price: z.string().optional(),
          savings: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

export const collections = { posts };
