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
    /** サムネイル・OGP用ASIN（1件）。複数ある場合は thumbnailAsins を使う */
    thumbnailAsin: z
      .string()
      .regex(/^[A-Z0-9]{10}$/i)
      .optional(),
    /** サムネイル用ASIN（2件以上で大きい表示はモザイクになる） */
    thumbnailAsins: z
      .array(z.string().regex(/^[A-Z0-9]{10}$/i))
      .optional(),
    /** ブランドサムネイル（配信記事など。ASIN不要） */
    thumbnailBrand: z.enum(['prime-video']).optional(),
    /** ブランドサムネイル左上の小バッジ（例: TBSドラマ） */
    thumbnailBrandBadge: z.string().optional(),
    cta: z.enum(['prime-trial', 'prime-day', 'sale-page', 'none']).optional(),
    /** true のとき目次直上の商品カード一覧を出さない（本文中の ::product:: のみ表示） */
    hideHeaderProductCards: z.boolean().optional(),
    products: z
      .array(
        z.object({
          asin: z.string().regex(/^[A-Z0-9]{10}$/i),
          label: z.string().optional(),
          note: z.string().optional(),
          price: z.string().optional(),
          referencePrice: z.string().optional(),
          savings: z.string().optional(),
          imageUrl: z.string().url().optional(),
        }),
      )
      .optional(),
  }),
});

export const collections = { posts };
