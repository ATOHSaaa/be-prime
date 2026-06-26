import type { PhrasingContent, Root, Table, TableCell } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/** 見出し行を付けない「属性表」。左列ラベル・右列説明。 */
const KV_HEADER_PAIRS: [string, string][] = [
  ['項目', '内容'],
  ['項目', 'スペック'],
  ['使い方', '回収のイメージ'],
  ['シーン', 'ASINの使い方'],
  ['シーン', 'Keepaの使い方'],
  ['種類', '特徴'],
  ['パターン', '対策'],
];

const COMPARE_HEADER_PAIR: [string, string] = ['向いている人', '向いていない人'];

function getCellText(cell: TableCell): string {
  const walk = (nodes: PhrasingContent[]): string =>
    nodes
      .map((node) => {
        if (node.type === 'text') return node.value;
        if ('children' in node && Array.isArray(node.children)) {
          return walk(node.children as PhrasingContent[]);
        }
        return '';
      })
      .join('');

  return walk(cell.children).trim();
}

function isHeaderPair(
  row: Table['children'][number],
  pair: [string, string],
): boolean {
  if (row.type !== 'tableRow' || row.children.length !== 2) return false;
  const left = getCellText(row.children[0]);
  const right = getCellText(row.children[1]);
  return left === pair[0] && right === pair[1];
}

function markTable(node: Table, className: string): void {
  const data = (node.data ??= {});
  const props = (data.hProperties ??= {});
  const existing = props.className;
  props.className = existing
    ? [...(Array.isArray(existing) ? existing : [existing]), className]
    : className;
  (data as { kvTable?: boolean; compareTable?: boolean }).kvTable =
    className === 'table-kv';
  (data as { kvTable?: boolean; compareTable?: boolean }).compareTable =
    className === 'table-compare';
}

/**
 * 属性表（項目|内容 等）から見出し行を除去し table-kv を付与。
 * 対比表（向いている人|向いていない人）には table-compare を付与。
 */
export const remarkKvTable: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'table', (node) => {
      const headerRow = node.children[0];
      if (!headerRow || headerRow.type !== 'tableRow') return;

      if (isHeaderPair(headerRow, COMPARE_HEADER_PAIR)) {
        markTable(node, 'table-compare');
        return;
      }

      const isKv = KV_HEADER_PAIRS.some((pair) => isHeaderPair(headerRow, pair));
      if (!isKv) return;

      node.children = node.children.slice(1);
      markTable(node, 'table-kv');
    });
  };
};
