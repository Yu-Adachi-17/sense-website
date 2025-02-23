import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ 翻訳ファイルをインポート
import en from './locales/en.json';
import ja from './locales/ja.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja }
  },
  lng: navigator.language.startsWith('ja') ? 'ja' : 'en', // ✅ ユーザーのブラウザ設定を優先
  fallbackLng: 'en', // ✅ 言語が不明な場合は英語にフォールバック
  interpolation: { escapeValue: false }
});

export default i18n;
