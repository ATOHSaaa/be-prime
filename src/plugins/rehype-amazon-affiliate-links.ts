import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { withAmazonAssociateTag } from '../lib/associate-tag.ts';

function isAmazonUrl(href: string): boolean {
  try {
    return new URL(href).hostname.toLowerCase().includes('amazon.co.jp');
  } catch {
    return href.includes('amazon.co.jp');
  }
}

/**
 * 記事本文の amazon.co.jp リンクすべてにアソシエイトタグを付与する。
 */
export const rehypeAmazonAffiliateLinks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (typeof href !== 'string' || !isAmazonUrl(href)) return;

      node.properties.href = withAmazonAssociateTag(href);

      const rel = node.properties.rel;
      const relParts = new Set(
        (typeof rel === 'string'
          ? rel.split(/\s+/)
          : Array.isArray(rel)
            ? rel.map(String)
            : []
        ).filter(Boolean),
      );
      relParts.add('nofollow');
      relParts.add('sponsored');
      relParts.add('noopener');
      node.properties.rel = [...relParts].join(' ');

      if (!node.properties.target) {
        node.properties.target = '_blank';
      }
    });
  };
};
