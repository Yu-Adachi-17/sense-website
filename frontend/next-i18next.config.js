// next-i18next.config.js
module.exports = {
    i18n: {
      defaultLocale: 'en',
      locales: ['en','ja','ar','da','de','es','fr','id','ko','ms','pt','sv','tr','zh-CN','zh-TW'],
      localeDetection: true,
    },
    reloadOnPrerender: process.env.NODE_ENV === 'development',
  };
  