#!/usr/bin/env node
/**
 * ビルド済み記事 HTML に未パースの `**` が残っていないか確認する。
 * 使い方: npm run build && npm run check:bold
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const POSTS_DIST = 'dist/posts';

function walkPostHtml(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkPostHtml(path, files);
    } else if (name === 'index.html') {
      files.push(path);
    }
  }

  return files;
}

function extractProse(html) {
  const match = html.match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>/);
  return match?.[1] ?? '';
}

function findUnparsedBoldLines(prose) {
  const lines = [];
  for (const line of prose.split('\n')) {
    if (line.includes('**')) lines.push(line.trim());
  }
  return lines;
}

if (!existsSync(POSTS_DIST)) {
  console.error('dist/posts が見つかりません。先に npm run build を実行してください。');
  process.exit(1);
}

const files = walkPostHtml(POSTS_DIST);
let failed = false;

for (const file of files) {
  const prose = extractProse(readFileSync(file, 'utf8'));
  const badLines = findUnparsedBoldLines(prose);

  if (badLines.length === 0) continue;

  failed = true;
  console.error(`\n✗ 未パースの太字: ${file}`);
  for (const line of badLines.slice(0, 3)) {
    console.error(`  ${line.slice(0, 160)}${line.length > 160 ? '…' : ''}`);
  }
  if (badLines.length > 3) {
    console.error(`  …他 ${badLines.length - 3} 行`);
  }
}

if (failed) {
  console.error('\n太字が正しくパースされていません。docs/seo-article-guide.md の太字確認フローを参照してください。');
  process.exit(1);
}

console.log(`✓ 全 ${files.length} 記事で太字パースを確認しました`);
