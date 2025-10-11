// next-sitemap.config.js 〔フル置換版〕
/** @type {import('next-sitemap').IConfig} */
const siteUrl = 'https://www.sense-ai.world';

// Next.js 側の i18n 設定から locales / defaultLocale を取得
const { i18n } = require('./next.config.js');
const { locales = ['en'], defaultLocale = 'en' } = i18n || {};

const localeHref = (path, l) =>
  `${siteUrl}${l === defaultLocale ? '' : `/${l}`}${path === '/' ? '' : path}`;

const buildAlternateRefs = (path) => {
  const alt = locales.map((l) => ({ href: localeHref(path, l), hreflang: l }));
  // 検索エンジン用の x-default は既定ロケールへ
  alt.push({ href: localeHref(path, defaultLocale), hreflang: 'x-default' });
  return alt;
};

const priorityFor = (path) => {
  if (path === '/home' || path === '/blog/introduction') return 0.9;
  if (path.startsWith('/blog')) return 0.8;
  return 0.7;
};

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  autoLastmod: true,
  sitemapSize: 50000,

  // Next が検出した各 path（既定ロケールの <loc>）+ hreflang
  transform: async (config, path) => ({
    loc: `${siteUrl}${path}`,
    changefreq: 'weekly',
    priority: priorityFor(path),
    lastmod: new Date().toISOString(),
    alternateRefs: buildAlternateRefs(path),
  }),

  // 既定ロケール以外の <loc> を明示出力するページを追加
  // 必要に応じて配列へ追加してください
  additionalPaths: async () => {
    const i18nPaths = [
      '/home',
      '/blog',
      '/blog/introduction', // ★ 追加：このページを各ロケールで <loc> 出力
    ];

    const extra = [];
    const lastmod = new Date().toISOString();

    for (const p of i18nPaths) {
      for (const l of locales) {
        if (l === defaultLocale) continue; // 既定ロケールは transform 側で出力済み
        extra.push({
          loc: localeHref(p, l),
          changefreq: 'weekly',
          priority: priorityFor(p),
          lastmod,
          alternateRefs: buildAlternateRefs(p),
        });
      }
    }
    return extra;
  },

  // 除外ルール
  exclude: ['/api/*', '/_next/*'],
};
