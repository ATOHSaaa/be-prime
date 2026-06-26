import type { Element, Root, Text } from 'hast';
import type { Plugin } from 'unified';
import { visitParents } from 'unist-util-visit-parents';

const SKIP_ANCESTOR_TAGS = new Set(['a', 'code', 'pre', 'script', 'style', 'strong']);

const UNPARSED_BOLD_RE = /\*\*([^*]+)\*\*/g;

function splitUnparsedBold(text: string): (Text | Element)[] {
  const parts: (Text | Element)[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(UNPARSED_BOLD_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    parts.push({
      type: 'element',
      tagName: 'strong',
      properties: {},
      children: [{ type: 'text', value: match[1] }],
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
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

/**
 * CommonMark がパースし損ねた `**太字**` を strong に変換する。
 * 全角括弧・末尾の + などを含むケース向け。
 */
export const rehypeFixUnparsedBold: Plugin<[], Root> = () => {
  return (tree) => {
    visitParents(tree, 'text', (node, ancestors) => {
      if (!node.value.includes('**')) return;
      if (isInsideSkippedAncestor(ancestors)) return;
      if (!UNPARSED_BOLD_RE.test(node.value)) return;
      UNPARSED_BOLD_RE.lastIndex = 0;

      const elementAncestors = ancestors.filter(
        (ancestor): ancestor is Element => ancestor.type === 'element',
      );
      const parent = elementAncestors.at(-1);
      if (!parent) return;

      const index = parent.children.indexOf(node);
      if (index === -1) return;

      const parts = splitUnparsedBold(node.value);
      if (parts.length === 1) return;

      parent.children.splice(index, 1, ...parts);
    });
  };
};
