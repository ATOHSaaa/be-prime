/**
 * Amazon Creators API クライアント（ビルド時利用）
 *
 * @see https://affiliate.amazon.co.jp/creatorsapi
 */

import type { CreatorsProduct } from './amazon';
import { affiliateUrl, productUrl } from './amazon';

const TOKEN_URL = 'https://api.amazon.co.jp/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon/catalog/v1';
const MARKETPLACE = 'www.amazon.co.jp';

const GET_ITEMS_RESOURCES = [
  'itemInfo.title',
  'images.primary.medium',
  'offersV2.listings.price',
  'offersV2.listings.availability',
  'offersV2.listings.dealDetails',
  'offersV2.listings.loyaltyPoints',
] as const;

interface CreatorsApiConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
}

interface ApiListing {
  price?: { money?: { displayAmount?: string } };
  availability?: { type?: string; message?: string };
  dealDetails?: { badge?: string; accessType?: string };
  savings?: { money?: { displayAmount?: string } };
  loyaltyPoints?: { points?: number };
}

interface ApiItem {
  asin: string;
  detailPageURL?: string;
  itemInfo?: { title?: { displayValue?: string } };
  images?: { primary?: { medium?: { url?: string } } };
  offersV2?: {
    listings?: ApiListing[];
  };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function getConfig(): CreatorsApiConfig | null {
  const accessKey = import.meta.env.AMAZON_CREATORS_API_ACCESS_KEY;
  const secretKey = import.meta.env.AMAZON_CREATORS_API_SECRET_KEY;
  const partnerTag = import.meta.env.AMAZON_CREATORS_API_PARTNER_TAG;

  if (!accessKey || !secretKey || !partnerTag) {
    return null;
  }

  return { accessKey, secretKey, partnerTag };
}

async function getAccessToken(config: CreatorsApiConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.accessKey,
      client_secret: config.secretKey,
      scope: 'creatorsapi::default',
    }),
  });

  if (!response.ok) {
    throw new Error(`Creators API token error: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}

function mapItem(item: ApiItem, partnerTag: string): CreatorsProduct {
  const listing = item.offersV2?.listings?.[0];
  const detailPageUrl = item.detailPageURL
    ? affiliateUrl(item.detailPageURL, partnerTag)
    : productUrl(item.asin, partnerTag);

  const savings = listing?.savings?.money?.displayAmount;
  const dealBadge = listing?.dealDetails?.badge;
  const hasPrimePoints = (listing?.loyaltyPoints?.points ?? 0) > 0;

  return {
    asin: item.asin,
    title: item.itemInfo?.title?.displayValue ?? item.asin,
    detailPageUrl,
    imageUrl: item.images?.primary?.medium?.url,
    price: listing?.price?.money?.displayAmount,
    savings: savings ?? (dealBadge ? dealBadge : undefined),
    isPrime: hasPrimePoints || dealBadge?.toLowerCase().includes('prime'),
  };
}

async function postCreatorsApi<T>(
  config: CreatorsApiConfig,
  operation: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = await getAccessToken(config);
  const response = await fetch(`${API_BASE}/${operation}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-marketplace': MARKETPLACE,
    },
    body: JSON.stringify({
      partnerTag: config.partnerTag,
      partnerType: 'Associates',
      marketplace: MARKETPLACE,
      ...body,
    }),
  });

  if (!response.ok) {
    throw new Error(`Creators API ${operation} error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** ASIN から商品情報を取得（最大10件） */
export async function fetchProductsByAsins(
  asins: string[],
): Promise<CreatorsProduct[]> {
  const config = getConfig();
  if (!config || asins.length === 0) {
    if (import.meta.env.DEV && asins.length > 0) {
      console.warn(
        '[Creators API] 認証情報が未設定です。.env を参照してください。',
      );
    }
    return [];
  }

  const unique = [...new Set(asins)].slice(0, 10);

  try {
    const data = await postCreatorsApi<{
      itemsResult?: { items?: ApiItem[] };
    }>(config, 'getItems', {
      itemIds: unique,
      itemIdType: 'ASIN',
      resources: [...GET_ITEMS_RESOURCES],
    });

    const items = data.itemsResult?.items ?? [];
    const byAsin = new Map(
      items.map((item) => [item.asin, mapItem(item, config.partnerTag)]),
    );

    return unique
      .map((asin) => byAsin.get(asin))
      .filter((p): p is CreatorsProduct => p !== undefined);
  } catch (error) {
    console.error('[Creators API] fetchProductsByAsins failed:', error);
    return [];
  }
}

/** キーワード検索 */
export async function searchProducts(
  keywords: string,
  itemCount = 5,
): Promise<CreatorsProduct[]> {
  const config = getConfig();
  if (!config) return [];

  try {
    const data = await postCreatorsApi<{
      searchResult?: { items?: ApiItem[] };
    }>(config, 'searchItems', {
      keywords,
      searchIndex: 'All',
      itemCount: Math.min(itemCount, 10),
      resources: [...GET_ITEMS_RESOURCES],
    });

    return (data.searchResult?.items ?? []).map((item) =>
      mapItem(item, config.partnerTag),
    );
  } catch (error) {
    console.error('[Creators API] searchProducts failed:', error);
    return [];
  }
}

export function isCreatorsApiConfigured(): boolean {
  return getConfig() !== null;
}
