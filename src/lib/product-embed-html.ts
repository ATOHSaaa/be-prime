import type { ProductEntry } from './product-entry.ts';
import { formatPriceYen } from './format-price.ts';
import { withAmazonAssociateTag } from './associate-tag.ts';

const AMAZON_IMAGE_BASE =
  'https://images-fe.ssl-images-amazon.com/images/P';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function productUrl(asin: string): string {
  return withAmazonAssociateTag(`https://www.amazon.co.jp/dp/${asin}`);
}

function amazonProductImageUrl(asin: string): string {
  return `${AMAZON_IMAGE_BASE}/${asin}.09._SL500_.jpg`;
}

/** 記事本文に挿入する購入カード（remark プラグイン用の静的 HTML） */
export function renderProductEmbedHtml(entry: ProductEntry): string {
  const title = entry.label ?? entry.asin;
  const href = productUrl(entry.asin);
  const imageUrl = amazonProductImageUrl(entry.asin);
  const label = entry.label
    ? `<p class="amazon-product-card__label">${escapeHtml(entry.label)}</p>`
    : '';
  const badges = entry.savings
    ? `<div class="amazon-product-card__badges"><span class="sale-badge sale-badge--sale">${escapeHtml(entry.savings)}</span></div>`
    : '';
  const price = entry.price
    ? `<p class="amazon-product-card__price">${escapeHtml(formatPriceYen(entry.price) ?? entry.price)}</p>`
    : `<p class="amazon-product-card__price amazon-product-card__price--muted">価格は商品ページでご確認ください</p>`;
  const note = entry.note
    ? `<p class="amazon-product-card__note">${escapeHtml(entry.note)}</p>`
    : '';

  return `<aside class="amazon-product-embed" aria-label="Amazon購入リンク">
<article class="amazon-product-card">
<a class="amazon-product-card__link" href="${escapeHtml(href)}" rel="nofollow sponsored noopener" target="_blank">
<div class="amazon-product-card__image-wrap"><img src="${escapeHtml(imageUrl)}" alt="" width="160" height="160" loading="lazy" decoding="async" /></div>
<div class="amazon-product-card__body">
${badges}
${label}
<h3 class="amazon-product-card__title">${escapeHtml(title)}</h3>
${price}
${note}
<p class="amazon-product-card__cta">Amazon.co.jpで見る</p>
</div>
</a>
</article>
</aside>`;
}
