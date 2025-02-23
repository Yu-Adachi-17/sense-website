import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ locales のパスを修正（ `./locales/en.json` にする）
import en from './locales/en.json';
import ja from './locales/ja.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja }
  },
  lng: 'ja', // ✅ デフォルト言語を日本語に設定
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
