/**
 * Markdown 本文の `**太字**` を `<strong>` に変換する。
 * CommonMark が全角括弧・連続太字などでパースに失敗するのを防ぐ。
 */
export function fixMarkdownBold(source: string): string {
  const frontmatterMatch = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const frontmatterEnd = frontmatterMatch ? frontmatterMatch[0].length : 0;
  const frontmatter = source.slice(0, frontmatterEnd);
  const body = source.slice(frontmatterEnd);

  return frontmatter + transformBodyBold(body);
}

const BOLD_RE = /\*\*([^*\n]+)\*\*/g;

function transformBodyBold(body: string): string {
  const segments = body.split(/(```[\s\S]*?```)/g);

  return segments
    .map((segment) => {
      if (segment.startsWith('```')) return segment;
      return segment.replace(BOLD_RE, '<strong>$1</strong>');
    })
    .join('');
}
