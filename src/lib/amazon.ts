import { affiliate } from '@/config/site';
import { withAmazonAssociateTag } from './associate-tag';
import { amazonLinks } from '@/config/amazon-links';

const AMAZON_BASE = 'https://www.amazon.co.jp';

/**
 * Amazonアソシエイト付きURLを生成する。
 */
export function affiliateUrl(url: string, tag?: string): string {
  return withAmazonAssociateTag(url, tag ?? affiliate.tag);
}

/** ASIN から商品ページのアフィリエイトURL */
export function productUrl(asin: string, tag?: string): string {
  return affiliateUrl(`${AMAZON_BASE}/dp/${asin}`, tag);
}

/** キーワード検索URL */
export function searchUrl(keywords: string, tag?: string): string {
  const q = encodeURIComponent(keywords);
  return affiliateUrl(`${AMAZON_BASE}/s?k=${q}`, tag);
}

/** セール会場URL */
export function goldboxUrl(tag?: string): string {
  return affiliateUrl(amazonLinks.goldbox, tag);
}

/** Prime Day 特集ページURL */
export function primeDayUrl(tag?: string): string {
  return affiliateUrl(amazonLinks.primeDay, tag);
}

/**
 * Creators API レスポンスの型。
 * 実際の API 呼び出しは src/lib/creators-api.ts を参照。
 */
export interface CreatorsProduct {
  asin: string;
  title: string;
  detailPageUrl: string;
  imageUrl?: string;
  price?: string;
  savings?: string;
  isPrime?: boolean;
}
