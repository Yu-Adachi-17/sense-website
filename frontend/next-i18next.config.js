// frontend/next-i18next.config.js
const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: [
      'ar',     // Arabic
      'da',     // Danish
      'de',     // German
      'en',     // English
      'es-ES',  // Spanish (Spain)
      'es-MX',  // Spanish (Mexico)
      'fr',     // French
      'id',     // Indonesian
      'ja',     // Japanese
      'ko',     // Korean
      'ms',     // Malay
      'nl',     // Dutch ← ✅追加済
      'no',     // Norwegian
      'pt-BR',  // Portuguese (Brazil)
      'pt-PT',  // Portuguese (Portugal)
      'sv',     // Swedish
      'tr',     // Turkish
      'zh-CN',  // Chinese (Simplified)
      'zh-TW'   // Chinese (Traditional)
    ],
    localeDetection: true,
  },

  // モノレポでの実行位置ブレを防ぐ
  localePath: path.resolve(__dirname, 'public/locales'),

  ns: ['common', 'home', 'seo'],
  defaultNS: 'common',

  // 文章キーをそのまま使うために必須
  keySeparator: false,

  interpolation: { escapeValue: false },
};
