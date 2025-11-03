// frontend/next-i18next.config.js 〔置き換え〕
const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: [
      'ar','cs','da','de','el','en','es-ES','es-MX','fi','fr','he','hi','hr','hu','id','it','ja',
      'ko','ms','nb','nl','no','pl','pt-BR','pt-PT','ro','ru','sk','sv','th','tr','uk','vi','zh-CN','zh-TW'
    ],
    localeDetection: false,
  },

  // 絶対パス指定（CWD 基準）
  localePath: path.resolve(process.cwd(), 'public/locales'),

  // 使用するデフォルトの名前空間（ページ側で追加読み込み可）
  ns: ['common', 'home', 'seo', 'blog_introduction'],
  defaultNS: 'common',

  reloadOnPrerender: process.env.NODE_ENV === 'development',

  interpolation: { escapeValue: false },
};
