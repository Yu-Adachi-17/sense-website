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

  // 既定で読み込む名前空間（ページ側で追加読み込みも可）
  ns: [
    'common',
    'home',
    'seo',
    // ここからブログ9本
    'blog_aimodel',
    'blog_businessnegotiation',
    'blog_introduction',
    'blog_language',
    'blog_onlinemeeting',
    'blog_pricing',
    'blog_recommend',
    'blog_strategy',
    'blog_universal',
    'blog_android',
    'blog_maildelivery',
    'blog_notetaker',
    'blog_freeplan',
    'blog_comparison',
    'blog_summary',
    'blog_longrecording',
    'blog_productivitytools',
    'blog_transcription',
    'blog_voicerecording',
    'blog_flexible',
    'blog_cost',
    'blog_meetinganalysis',
    'blog_slideaipro',
    'blog_androidformat' ,
    'blog_bringinaudio' 
  ],
  defaultNS: 'common',

  reloadOnPrerender: process.env.NODE_ENV === 'development',
  interpolation: { escapeValue: false },
};
