import { amazonLinks } from './amazon-links';

export const site = {
  name: 'Be Prime',
  alternateName: 'Be Prime',
  tagline: 'Amazonセール・お得情報',
  description:
    'Amazonプライムセール、Prime Day、タイムセールの速報とおすすめ商品を解説するメディアです。',
  url: 'https://atohsaaa.github.io/be-prime',
  author: 'Be Prime編集部',
  locale: 'ja_JP',
  language: 'ja',
  email: 'contact@example.com',
  social: {
    x: '',
  },
} as const;

export const editor = {
  name: 'Be Prime編集部',
  role: '編集・運営',
  bio: 'Amazonのセール情報を日々チェックし、Prime Dayやタイムセールの攻略法・おすすめ商品を調べて発信しています。',
  aboutUrl: '/about/',
} as const;

export const affiliate = {
  tag: import.meta.env.PUBLIC_AMAZON_ASSOCIATE_TAG ?? 'be-prime-22',
  disclosure:
    '当サイトは、Amazon.co.jpを宣伝しリンクすることによってサイト運営者が紹介料を得られる仕組みを利用しています。',
} as const;

/** 記事カテゴリ */
export const categories = {
  deals: {
    id: 'deals' as const,
    name: 'お得情報',
    shortName: 'お得情報',
    description: 'タイムセール・Prime Dayの見方、セール攻略、プライム特典など',
  },
  gadget: {
    id: 'gadget' as const,
    name: 'ガジェット',
    shortName: 'ガジェット',
    description: 'Echo、Fire TV、KindleなどのAmazonデバイス・家電',
  },
  culture: {
    id: 'culture' as const,
    name: 'カルチャー',
    shortName: 'カルチャー',
    description: '書籍、音楽、映像、ゲームなど',
  },
  fashion: {
    id: 'fashion' as const,
    name: 'ファッション',
    shortName: 'ファッション',
    description: 'アパレル、バッグ、靴、アクセサリー',
  },
  'daily-goods': {
    id: 'daily-goods' as const,
    name: '日用品',
    shortName: '日用品',
    description: '食品、消耗品、キッチン・生活雑貨',
  },
} as const;

export type CategoryId = keyof typeof categories;

/** 記事末尾CTA */
export const ctas = {
  'prime-trial': {
    id: 'prime-trial' as const,
    name: 'Amazonプライム',
    shortName: 'Prime',
    description: 'Prime会員ならセール先行アクセスや送料無料などの特典が使えます',
    officialUrl: amazonLinks.amazonPrime,
  },
  'prime-day': {
    id: 'prime-day' as const,
    name: 'Prime Day 特集',
    shortName: 'Prime Day',
    description: 'Amazon.co.jpのPrime Day公式特集ページでセール商品をチェック',
    officialUrl: amazonLinks.primeDay,
  },
  'sale-page': {
    id: 'sale-page' as const,
    name: 'Amazonセール会場',
    shortName: 'セール',
    description: 'Amazon.co.jpのセール・特価商品を公式ページでチェック',
    officialUrl: amazonLinks.goldbox,
  },
} as const;

export type CtaId = keyof typeof ctas;
