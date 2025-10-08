// frontend/next-i18next.config.js
const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en','ja','ar','de','es','fr','id','ko','ms','pt','sv','tr','zh-CN','zh-TW'],
    localeDetection: true,
  },
  // ← モノレポでの実行位置ブレを防ぐ
  localePath: path.resolve(__dirname, 'public/locales'),

  ns: ['common','home','seo'],
  defaultNS: 'common',

  // 文章キーをそのまま使うために必須
  keySeparator: false,

  interpolation: { escapeValue: false },
};
