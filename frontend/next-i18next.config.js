// next-i18next.config.js
const path = require('path');

/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en','ja','ar','de','es','fr','id','ko','ms','pt','sv','tr','zh-CN','zh-TW'],
    // ← ブラウザ言語で自動切替したいなら true
    localeDetection: true,
  },

  // 翻訳ファイル配置
  localePath: path.resolve('./public/locales'),

  // 名前空間（今回のページが読み込んでいる3つを固定）
  ns: ['common', 'home', 'seo'],
  defaultNS: 'common',

  // フォールバック
  fallbackLng: 'en',

  // i18next 本体オプション（重要）
  keySeparator: false,            // ★ 文章キーや "Minutes.AI" をそのままキーとして扱う
  nsSeparator: ':',               // ns指定が必要なとき用（デフォルトでOK）
  returnNull: false,
  lowerCaseLng: false,            // 'zh-CN' 等の大文字を保持
  interpolation: { escapeValue: false },

  // 開発時のホットリロード
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
