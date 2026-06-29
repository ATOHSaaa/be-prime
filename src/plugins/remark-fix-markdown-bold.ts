import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { fixMarkdownBold } from './markdown-bold.ts';

const parseMarkdown = unified().use(remarkParse).use(remarkGfm);

/**
 * 記事 Markdown をパース前相当の段階で `**太字**` を `<strong>` に変換し、
 * CommonMark のパース失敗を防ぐ。
 */
export const remarkFixMarkdownBold: Plugin<[], Root> = () => {
  return (tree, file) => {
    if (typeof file.value !== 'string' || !file.value.includes('**')) return;

    const fixed = fixMarkdownBold(file.value);
    if (fixed === file.value) return;

    file.value = fixed;
    const reparsed = parseMarkdown.parse(fixed) as Root;
    tree.children = reparsed.children;
  };
};
