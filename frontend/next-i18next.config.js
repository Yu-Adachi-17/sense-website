// next-i18next.config.js
const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en','ja','ar','de','es','fr','id','ko','ms','pt','sv','tr','zh-CN','zh-TW'],
    localeDetection: false
  },
  // 既存ファイルが public/locales/... にある場合は↓でOK
  localePath: path.resolve('./public/locales'),
  defaultNS: 'common',
  fallbackLng: 'en',
};
