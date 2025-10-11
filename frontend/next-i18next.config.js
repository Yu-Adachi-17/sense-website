// frontend/next-i18next.config.js 〔置き換え〕
const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: [
      'ar','da','de','en','es-ES','es-MX','fr','id','ja',
      'ko','ms','nl','no','pt-BR','pt-PT','sv','tr','zh-CN','zh-TW'
    ],
    localeDetection: false,
  },

  // ★ 重要：必ず “絶対パス” にする（__dirname ではなく process.cwd を使用）
  localePath: path.resolve(process.cwd(), 'public/locales'),

  // 使用する名前空間
  ns: ['common', 'home', 'seo', 'blog_introduction'],
  defaultNS: 'common',

  // dev 中はホットリロード
  reloadOnPrerender: process.env.NODE_ENV === 'development',

  interpolation: { escapeValue: false },
};
