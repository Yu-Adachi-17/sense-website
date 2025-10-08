// next-i18next.config.js
const path = require('path');

/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en','ja','ar','de','es','fr','id','ko','ms','pt','sv','tr','zh-CN','zh-TW'],
    // 自動切替したい場合は true（今は /ja に来れているのでどちらでもOK）
    localeDetection: true,
  },
  localePath: path.resolve('./public/locales'),
  ns: ['common', 'home', 'seo'],
  defaultNS: 'common',
  // ★ これが重要
  keySeparator: false,          // ピリオドを「区切り」にしない（文章キーをそのまま扱う）
  // お好みで: 他NSを後ろからも探したい場合
  // fallbackNS: ['common'],
  interpolation: { escapeValue: false },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
