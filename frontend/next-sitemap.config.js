/** @type {import('next-sitemap').IConfig} */
// next-sitemap.config.js
const siteUrl = 'https://www.sense-ai.world';

// next-i18next でも Next.js の i18n でも、いずれにせよ locales を取得
// どちらか一方しか無い場合は存在する方を require してください
const { i18n } = require('./next.config.js');              // ← Next.js 側
// const { i18n } = require('./next-i18next.config.js');   // ← もしこちらに定義しているなら差し替え

const { locales = ['en'], defaultLocale = 'en' } = i18n || {};
const localeHref = (path, l) =>
  `${siteUrl}${l === defaultLocale ? '' : `/${l}`}${path === '/' ? '' : path}`;

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  autoLastmod: true,

  // 各URLごとに hreflang を付与
  transform: async (config, path) => {
    const alt = locales.map((l) => ({ href: localeHref(path, l), hreflang: l }));
    // x-default は既定ロケールに向ける（運用方針に合わせて任意で英語へ）
    alt.push({ href: localeHref(path, defaultLocale), hreflang: 'x-default' });

    return {
      loc: `${siteUrl}${path}`,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date().toISOString(),
      alternateRefs: alt,
    };
  },

  // （必要なら）除外したいパス
  exclude: ['/api/*', '/_next/*'],
};
