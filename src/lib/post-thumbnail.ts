import type { Post } from '@/lib/posts';
import { fetchProductsByAsins } from '@/lib/creators-api';
import { amazonProductImageUrl, upgradeAmazonImageUrl } from '@/lib/product-entries';

export type PostThumbnail =
  | { kind: 'hero'; imageUrl: string }
  | { kind: 'mosaic'; imageUrls: string[] }
  | {
      kind: 'brand';
      brand: 'prime-video';
      badge?: string;
    }
  | {
      kind: 'product';
      imageUrl: string;
      savings?: string;
      price?: string;
      referencePrice?: string;
      label?: string;
      category?: string;
    };

/** 記事に紐づくサムネイル用 ASIN（重複除去・大文字統一） */
export function getPostThumbnailAsins(post: Post): string[] {
  const asins: string[] = [];
  if (post.data.thumbnailAsins?.length) {
    asins.push(...post.data.thumbnailAsins);
  } else if (post.data.thumbnailAsin) {
    asins.push(post.data.thumbnailAsin);
  }
  return [...new Set(asins.map((asin) => asin.toUpperCase()))];
}

function collectThumbnailAsins(posts: Post[]): string[] {
  const asins = new Set<string>();
  for (const post of posts) {
    for (const asin of getPostThumbnailAsins(post)) {
      asins.add(asin);
    }
    for (const product of post.data.products ?? []) {
      asins.add(product.asin.toUpperCase());
    }
  }
  return [...asins];
}

function resolveAsinImageUrl(
  asin: string,
  imageByAsin?: Map<string, string>,
): string {
  const key = asin.toUpperCase();
  const mapped = imageByAsin?.get(key);
  if (mapped) return mapped;
  return amazonProductImageUrl(key, 500);
}

/** Amazon の商品画像URLが実画像か（1px GIF プレースホルダーを除外） */
async function isUsableAmazonImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') ?? '';
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentType.includes('gif') && contentLength < 200) return false;
    return contentLength > 500;
  } catch {
    return false;
  }
}

/** ASIN から使える画像URLを解決（API画像を優先、P/ 形式はフォールバック） */
async function resolveValidatedAsinImage(
  asin: string,
  apiUrl?: string,
): Promise<string | undefined> {
  const key = asin.toUpperCase();
  const candidates: string[] = [];

  if (apiUrl) {
    candidates.push(
      upgradeAmazonImageUrl(apiUrl, 800),
      upgradeAmazonImageUrl(apiUrl, 500),
    );
    if (
      !apiUrl.includes('._SL160_.') &&
      !apiUrl.includes('._SL200_.') &&
      !apiUrl.includes('._US40_.')
    ) {
      candidates.push(apiUrl);
    }
  }

  candidates.push(
    amazonProductImageUrl(key, 800),
    amazonProductImageUrl(key, 500),
  );

  const seen = new Set<string>();
  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    if (await isUsableAmazonImage(url)) return url;
  }
  return undefined;
}

/** サムネイルの代表画像（ランキング等のコンパクト表示用） */
export function getThumbnailCoverUrl(
  thumbnail?: PostThumbnail,
): string | undefined {
  if (!thumbnail) return undefined;
  if (thumbnail.kind === 'mosaic') return thumbnail.imageUrls[0];
  return thumbnail.imageUrl;
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
    map.set(key, apiByAsin.get(key) ?? amazonProductImageUrl(key, 400));
  }

  return map;
}

/** 記事一覧用：全商品の画像URLをまとめて取得（ダミー画像は除外） */
export async function buildProductImageMap(
  asins: string[],
): Promise<Map<string, string>> {
  if (asins.length === 0) return new Map();

  const products = await fetchProductsByAsins(asins);
  const apiByAsin = new Map(
    products.map((p) => [p.asin.toUpperCase(), p.imageUrl]),
  );
  const map = new Map<string, string>();

  await Promise.all(
    asins.map(async (asin) => {
      const key = asin.toUpperCase();
      const url = await resolveValidatedAsinImage(key, apiByAsin.get(key));
      if (url) map.set(key, url);
    }),
  );

  return map;
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

  if (post.data.thumbnailBrand === 'prime-video') {
    return {
      kind: 'brand',
      brand: 'prime-video',
      badge: post.data.thumbnailBrandBadge,
    };
  }

  const asins = getPostThumbnailAsins(post);
  const imageUrls = asins
    .map((asin) => imageByAsin?.get(asin.toUpperCase()))
    .filter((url): url is string => Boolean(url));

  if (imageUrls.length >= 2) {
    return {
      kind: 'mosaic',
      imageUrls: imageUrls.slice(0, 4),
    };
  }
  if (imageUrls.length === 1) {
    return {
      kind: 'hero',
      imageUrl: imageUrls[0],
    };
  }

  const primary = post.data.products?.[0];
  if (!primary?.price) return undefined;

  const asin = primary.asin.toUpperCase();
  const imageUrl =
    imageByAsin?.get(asin) ??
    primary.imageUrl ??
    amazonProductImageUrl(asin, 800);
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
  const imageByAsin = await buildProductImageMap(collectThumbnailAsins(posts));

  for (const post of posts) {
    for (const product of post.data.products ?? []) {
      const key = product.asin.toUpperCase();
      if (product.imageUrl && !imageByAsin.has(key)) {
        imageByAsin.set(key, product.imageUrl);
      }
    }
  }

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
  if (thumbnail?.kind === 'mosaic') return thumbnail.imageUrls[0];
  if (thumbnail?.kind === 'hero') return thumbnail.imageUrl;
  if (thumbnail?.kind === 'product') return thumbnail.imageUrl;
  return undefined;
}
