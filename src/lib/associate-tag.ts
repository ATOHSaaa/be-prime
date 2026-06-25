/** サイト共通のアソシエイトタグ（環境変数未設定時のフォールバック） */
export const DEFAULT_ASSOCIATE_TAG = 'be-prime-22';

export function getAssociateTag(): string {
  return import.meta.env.PUBLIC_AMAZON_ASSOCIATE_TAG ?? DEFAULT_ASSOCIATE_TAG;
}

/** amazon.co.jp への URL にアソシエイトタグを付与（既存 tag は上書き） */
export function withAmazonAssociateTag(url: string, tag?: string): string {
  const associateTag = tag ?? getAssociateTag();
  if (!associateTag) return url;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes('amazon.co.jp')) {
      return url;
    }
    parsed.searchParams.set('tag', associateTag);
    return parsed.toString();
  } catch {
    return url;
  }
}
