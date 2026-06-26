import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

function getTableClasses(node: Element): string[] {
  const className = node.properties?.className;
  if (!className) return [];
  return Array.isArray(className) ? className.map(String) : [String(className)];
}

function getText(node: Element): string {
  const parts: string[] = [];
  const walk = (children: Element['children']) => {
    for (const child of children) {
      if (child.type === 'text') parts.push(child.value);
      else if (child.type === 'element') walk(child.children);
    }
  };
  walk(node.children);
  return parts.join('').trim();
}

function getRowCells(tr: Element): Element[] {
  return tr.children.filter(
    (child): child is Element =>
      child.type === 'element' &&
      (child.tagName === 'th' || child.tagName === 'td'),
  );
}

function getTheadRow(table: Element): Element | undefined {
  const thead = table.children.find(
    (child): child is Element =>
      child.type === 'element' && child.tagName === 'thead',
  );
  return thead?.children.find(
    (child): child is Element =>
      child.type === 'element' && child.tagName === 'tr',
  );
}

function isCompareTable(table: Element): boolean {
  if (getTableClasses(table).includes('table-compare')) return true;
  const row = getTheadRow(table);
  if (!row) return false;
  const cells = getRowCells(row);
  if (cells.length !== 2) return false;
  return (
    getText(cells[0]) === '向いている人' &&
    getText(cells[1]) === '向いていない人'
  );
}

/** 2列・見出し行なしの属性表（remark で項目行除去後は先頭データ行が thead に入る） */
function isKvTable(table: Element): boolean {
  if (getTableClasses(table).includes('table-kv')) return true;
  if (isCompareTable(table)) return false;

  const thead = table.children.find(
    (child): child is Element =>
      child.type === 'element' && child.tagName === 'thead',
  );
  const tbody = table.children.find(
    (child): child is Element =>
      child.type === 'element' && child.tagName === 'tbody',
  );
  if (!thead) return false;

  const row = getTheadRow(table);
  if (!row) return false;

  const cells = getRowCells(row);
  if (cells.length !== 2) return false;

  const left = getText(cells[0]);
  const right = getText(cells[1]);
  if (left === '項目' && (right === '内容' || right === 'スペック')) return false;
  if (left === '向いている人' && right === '向いていない人') return false;

  return Boolean(tbody?.children.length);
}

function normalizeKvRow(tr: Element): Element {
  const cells = getRowCells(tr);

  return {
    type: 'element',
    tagName: 'tr',
    properties: tr.properties,
    children: cells.map((cell, index) => ({
      type: 'element',
      tagName: index === 0 ? 'th' : 'td',
      properties:
        index === 0
          ? { ...(cell.properties ?? {}), scope: 'row' }
          : { ...(cell.properties ?? {}) },
      children: cell.children,
    })),
  };
}

function getOrCreateTbody(table: Element): Element {
  const tbody = table.children.find(
    (child): child is Element =>
      child.type === 'element' && child.tagName === 'tbody',
  );
  if (tbody) return tbody;

  const created: Element = {
    type: 'element',
    tagName: 'tbody',
    properties: {},
    children: [],
  };
  table.children.push(created);
  return created;
}

/**
 * 属性表の thead を tbody に統合し、左列 th・右列 td にする。
 */
export const rehypeKvTable: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'table') return;
      if (!isKvTable(node)) return;

      const classes = getTableClasses(node);
      if (!classes.includes('table-kv')) {
        node.properties = {
          ...(node.properties ?? {}),
          className: classes.length ? [...classes, 'table-kv'] : 'table-kv',
        };
      }

      const thead = node.children.find(
        (child): child is Element =>
          child.type === 'element' && child.tagName === 'thead',
      );
      const tbody = getOrCreateTbody(node);

      const theadRows =
        thead?.children.filter(
          (child): child is Element =>
            child.type === 'element' && child.tagName === 'tr',
        ) ?? [];

      if (theadRows.length > 0) {
        tbody.children = [...theadRows, ...tbody.children];
        node.children = node.children.filter((child) => child !== thead);
      }

      tbody.children = tbody.children.map((child) =>
        child.type === 'element' && child.tagName === 'tr'
          ? normalizeKvRow(child)
          : child,
      );
    });
  };
};
