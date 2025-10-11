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
      'nl',     // Dutch
      'no',     // Norwegian
      'pt-BR',  // Portuguese (Brazil)
      'pt-PT',  // Portuguese (Portugal)
      'sv',     // Swedish
      'tr',     // Turkish
      'zh-CN',  // Chinese (Simplified)
      'zh-TW'   // Chinese (Traditional)
    ],
    localeDetection: false, // ★ Next 側と揃える
  },

  // モノレポでの実行位置ブレを防ぐ
  localePath: path.resolve(__dirname, 'public/locales'),

  // 使用する名前空間
  ns: ['common', 'home', 'seo', 'blog_introduction'], // ★ 追加
  defaultNS: 'common',

  // ドット区切りで入れ子を解釈（デフォルト挙動を使用）
  // ★ keySeparator は指定しない（falseだと "hero.h1" を1キーとして扱ってしまう）

  // dev時はホットリロード
  reloadOnPrerender: process.env.NODE_ENV === 'development',

  interpolation: { escapeValue: false },
};
