import type { Element, Root, Text } from 'hast';
import type { Plugin } from 'unified';
import { visitParents } from 'unist-util-visit-parents';
import { withAmazonAssociateTag } from '../lib/associate-tag.ts';
import { amazonLinks } from '../config/amazon-links.ts';

const SKIP_ANCESTOR_TAGS = new Set(['a', 'code', 'pre', 'script', 'style']);

type TermId = 'amazon-prime' | 'prime-day' | 'time-sale';

const TERMS: {
  id: TermId;
  label: string;
  officialUrl: string;
}[] = [
  {
    id: 'amazon-prime',
    label: 'Amazonプライム',
    officialUrl: amazonLinks.amazonPrime,
  },
  {
    id: 'prime-day',
    label: 'Prime Day',
    officialUrl: amazonLinks.primeDay,
  },
  {
    id: 'time-sale',
    label: 'タイムセール',
    officialUrl: amazonLinks.goldbox,
  },
];

function createAffiliateLink(label: string, href: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href,
      rel: 'nofollow sponsored noopener',
      target: '_blank',
      className: 'prose-affiliate-link',
    },
    children: [{ type: 'text', value: label }],
  };
}

function splitAtFirstOccurrence(
  text: string,
  term: (typeof TERMS)[number],
): (Text | Element)[] {
  const index = text.indexOf(term.label);
  if (index === -1) return [{ type: 'text', value: text }];

  const href = withAmazonAssociateTag(term.officialUrl);
  const parts: (Text | Element)[] = [];
  if (index > 0) {
    parts.push({ type: 'text', value: text.slice(0, index) });
  }
  parts.push(createAffiliateLink(term.label, href));
  const rest = text.slice(index + term.label.length);
  if (rest) {
    parts.push({ type: 'text', value: rest });
  }
  return parts;
}

function isInsideSkippedAncestor(ancestors: unknown[]): boolean {
  return ancestors.some(
    (ancestor) =>
      ancestor &&
      typeof ancestor === 'object' &&
      'type' in ancestor &&
      ancestor.type === 'element' &&
      SKIP_ANCESTOR_TAGS.has((ancestor as Element).tagName),
  );
}

function linkFirstMention(tree: Root, term: (typeof TERMS)[number]): void {
  let linked = false;

  visitParents(tree, 'text', (node, ancestors) => {
    if (linked) return;
    if (isInsideSkippedAncestor(ancestors)) return;
    if (!node.value.includes(term.label)) return;

    const elementAncestors = ancestors.filter(
      (ancestor): ancestor is Element => ancestor.type === 'element',
    );
    const parent = elementAncestors.at(-1);
    if (!parent) return;

    const index = parent.children.indexOf(node);
    if (index === -1) return;

    const parts = splitAtFirstOccurrence(node.value, term);
    if (parts.length === 1 && parts[0].type === 'text') return;

    parent.children.splice(index, 1, ...parts);
    linked = true;
  });
}

/**
 * 記事本文で Amazonプライム / Prime Day / タイムセール の
 * 各キーワードの初出（文書順）のみアソシエイトリンクにする。
 */
export const rehypeAffiliateFirstMention: Plugin<[], Root> = () => {
  return (tree) => {
    for (const term of TERMS) {
      linkFirstMention(tree, term);
    }
  };
};
