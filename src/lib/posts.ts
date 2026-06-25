import { statSync } from 'node:fs';
import path from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

/** 一覧・RSS用の並び順（新しい順） */
export function getPostSortTime(post: Post): number {
  const pub = post.data.pubDate.valueOf();
  const updated = post.data.updatedDate?.valueOf();
  if (updated != null && updated > pub) return updated;
  return pub;
}

function getPostMtimeMs(post: Post): number {
  try {
    return statSync(path.join(POSTS_DIR, `${post.id}.md`)).mtimeMs;
  } catch {
    return 0;
  }
}

export function comparePostsNewestFirst(a: Post, b: Post): number {
  const byDate = getPostSortTime(b) - getPostSortTime(a);
  if (byDate !== 0) return byDate;
  return getPostMtimeMs(b) - getPostMtimeMs(a);
}

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort(comparePostsNewestFirst);
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const posts = await getPublishedPosts();
  return posts.find((p) => p.id === slug);
}

/** 開催中セール記事（saleEndDate が未来） */
export async function getActiveSalePosts(): Promise<Post[]> {
  const now = Date.now();
  const posts = await getPublishedPosts();
  return posts.filter(
    (post) =>
      post.data.saleEndDate != null && post.data.saleEndDate.valueOf() > now,
  );
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });
}

export function formatDateISO(date: Date): string {
  return date.toISOString();
}

/** Gizmodo風の短い日付表示 */
export function formatDateCompact(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });
}

export function getPostsWithProducts(posts: Post[]): Post[] {
  return posts.filter((post) => (post.data.products?.length ?? 0) > 0);
}

export function getPostsByCategory(
  posts: Post[],
  category: Post['data']['category'],
  limit?: number,
): Post[] {
  const filtered = posts.filter((post) => post.data.category === category);
  return limit != null ? filtered.slice(0, limit) : filtered;
}

export function excludePosts(posts: Post[], ids: Set<string>): Post[] {
  return posts.filter((post) => !ids.has(post.id));
}

/** category / tags / saleEvent で関連記事をスコアリング */
export function getRelatedPosts(
  current: Post,
  allPosts: Post[],
  limit = 4,
): Post[] {
  const others = allPosts.filter((p) => p.id !== current.id);

  const scored = others.map((post) => {
    let score = 0;
    if (post.data.category === current.data.category) score += 3;
    if (
      current.data.saleEvent &&
      post.data.saleEvent === current.data.saleEvent
    ) {
      score += 5;
    }
    for (const t of current.data.tags) {
      if (post.data.tags.includes(t)) score += 2;
    }
    return { post, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || comparePostsNewestFirst(a.post, b.post),
    )
    .slice(0, limit)
    .map((s) => s.post);
}
