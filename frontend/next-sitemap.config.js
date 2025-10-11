/** @type {import('next-sitemap').IConfig} */
const siteUrl = 'https://www.sense-ai.world';

// Next.js 側の i18n 設定から locales と defaultLocale を取得
const { i18n } = require('./next.config.js');
const { locales = ['en'], defaultLocale = 'en' } = i18n || {};

const localeHref = (path, l) =>
  `${siteUrl}${l === defaultLocale ? '' : `/${l}`}${path === '/' ? '' : path}`;

const buildAlternateRefs = (path) => {
  const alt = locales.map((l) => ({ href: localeHref(path, l), hreflang: l }));
  // x-default は既定ロケールへ（運用に合わせて変更可）
  alt.push({ href: localeHref(path, defaultLocale), hreflang: 'x-default' });
  return alt;
};

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  autoLastmod: true,
  sitemapSize: 50000,

  // Next.js が検出した各 path（例: /home）に対する基本出力（既定ロケールの <loc>）
  transform: async (config, path) => {
    return {
      loc: `${siteUrl}${path}`,              // 例: https://www.sense-ai.world/home
      changefreq: 'weekly',
      priority: path === '/home' ? 0.9 : 0.7,
      lastmod: new Date().toISOString(),
      alternateRefs: buildAlternateRefs(path) // hreflang を全言語分
    };
  },

  // ここで “各ロケールの /home” を明示的に <loc> として追加する
  // 必要なページがあれば配列に追加して運用してください
  additionalPaths: async (config) => {
    const i18nPaths = ['/home']; // 例: 他にも '/pricing', '/blog' 等を追加可
    const extra = [];

    for (const p of i18nPaths) {
      for (const l of locales) {
        if (l === defaultLocale) continue;       // 既定ロケール分は transform で出力済み
        extra.push({
          loc: localeHref(p, l),                 // 例: https://www.sense-ai.world/ja/home
          changefreq: 'weekly',
          priority: 0.9,
          lastmod: new Date().toISOString(),
          alternateRefs: buildAlternateRefs(p)   // 全言語の相互参照を同梱
        });
      }
    }
    return extra;
  },

  // 除外ルール
  exclude: ['/api/*', '/_next/*'],
};
