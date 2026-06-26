import type { Post } from '@/lib/posts';
import { fetchProductsByAsins } from '@/lib/creators-api';
import { amazonProductImageUrl } from '@/lib/product-entries';

export type PostThumbnail =
  | { kind: 'hero'; imageUrl: string }
  | {
      kind: 'product';
      imageUrl: string;
      savings?: string;
      price?: string;
      referencePrice?: string;
      label?: string;
      category?: string;
    };

function collectProductAsins(posts: Post[]): string[] {
  const asins = new Set<string>();
  for (const post of posts) {
    for (const product of post.data.products ?? []) {
      asins.add(product.asin.toUpperCase());
    }
  }
  return [...asins];
}

/** API 結果から ASIN → 画像URL のマップを組み立てる */
export function productImageMapFromApi(
  asins: string[],
  apiProducts: { asin: string; imageUrl?: string }[],
): Map<string, string> {
  const apiByAsin = new Map(
    apiProducts.map((p) => [p.asin.toUpperCase(), p.imageUrl]),
  );
  const map = new Map<string, string>();

  for (const asin of asins) {
    const key = asin.toUpperCase();
    map.set(key, apiByAsin.get(key) ?? amazonProductImageUrl(key, 800));
  }

  return map;
}

/** 記事一覧用：全商品の画像URLをまとめて取得 */
export async function buildProductImageMap(
  asins: string[],
): Promise<Map<string, string>> {
  if (asins.length === 0) return new Map();

  const products = await fetchProductsByAsins(asins);
  return productImageMapFromApi(asins, products);
}

/** note から参考価格・定価・過去価格を抽出（例: 参考価格36,000円→…） */
export function parseReferencePriceFromNote(note?: string): string | undefined {
  if (!note) return undefined;
  const match = note.match(
    /(?:参考価格|定価|過去価格)\s*(\d{1,3}(?:,\d{3})*円)/,
  );
  return match?.[1];
}

/** 1記事分のサムネイル情報を解決（heroImage / ogImage 優先） */
export function resolvePostThumbnail(
  post: Post,
  imageByAsin?: Map<string, string>,
): PostThumbnail | undefined {
  if (post.data.heroImage) {
    return { kind: 'hero', imageUrl: post.data.heroImage };
  }
  if (post.data.ogImage) {
    return { kind: 'hero', imageUrl: post.data.ogImage };
  }

  const primary = post.data.products?.[0];
  if (!primary?.price) return undefined;

  const asin = primary.asin.toUpperCase();
  const imageUrl =
    imageByAsin?.get(asin) ?? amazonProductImageUrl(asin, 800);
  const referencePrice =
    primary.referencePrice ?? parseReferencePriceFromNote(primary.note);

  return {
    kind: 'product',
    imageUrl,
    savings: primary.savings,
    price: primary.price,
    referencePrice,
    label: primary.label,
    category: post.data.category,
  };
}

/** 記事ID → サムネイルのマップ（一覧・トップ用） */
export async function buildPostThumbnailMap(
  posts: Post[],
): Promise<Map<string, PostThumbnail>> {
  const imageByAsin = await buildProductImageMap(collectProductAsins(posts));
  const map = new Map<string, PostThumbnail>();

  for (const post of posts) {
    const thumbnail = resolvePostThumbnail(post, imageByAsin);
    if (thumbnail) map.set(post.id, thumbnail);
  }

  return map;
}

/** OGP用：商品サムネイルの絶対URL（未設定時は undefined） */
export function getPostOgImage(
  post: Post,
  thumbnail?: PostThumbnail,
): string | undefined {
  if (post.data.ogImage) return post.data.ogImage;
  if (post.data.heroImage) return post.data.heroImage;
  if (thumbnail?.kind === 'product') return thumbnail.imageUrl;
  return undefined;
}
