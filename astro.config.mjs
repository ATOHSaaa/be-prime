import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { rehypeAffiliateFirstMention } from './src/plugins/rehype-affiliate-first-mention.ts';
import { rehypeAmazonAffiliateLinks } from './src/plugins/rehype-amazon-affiliate-links.ts';
import { rehypeFixUnparsedBold } from './src/plugins/rehype-fix-unparsed-bold.ts';
import { rehypeKvTable } from './src/plugins/rehype-kv-table.ts';
import { remarkFixMarkdownBold } from './src/plugins/remark-fix-markdown-bold.ts';
import { remarkKvTable } from './src/plugins/remark-kv-table.ts';
import { remarkProductEmbed } from './src/plugins/remark-product-embed.ts';

/** XMLサイトマップから除外するパス */
function isExcludedFromSitemap(pathname) {
  if (pathname.includes('404')) return true;
  if (pathname === '/rss.xml' || pathname === '/rss.xml/') return true;
  return false;
}

export default defineConfig({
  site: 'https://atohsaaa.github.io/be-prime',
  base: '/be-prime',
  trailingSlash: 'always',
  redirects: {
    '/search/': '/',
  },
  integrations: [
    sitemap({
      filter: (page) => !isExcludedFromSitemap(new URL(page).pathname),
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        if (pathname === '/') {
          return { ...item, changefreq: 'weekly', priority: 1 };
        }
        if (pathname === '/posts/') {
          return { ...item, changefreq: 'weekly', priority: 0.9 };
        }
        if (pathname.startsWith('/posts/') && pathname !== '/posts/') {
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
    remarkPlugins: [remarkFixMarkdownBold, remarkProductEmbed, remarkKvTable],
    rehypePlugins: [
      rehypeKvTable,
      rehypeAffiliateFirstMention,
      rehypeAmazonAffiliateLinks,
      rehypeFixUnparsedBold,
    ],
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      cssMinify: true,
    },
  },
});
