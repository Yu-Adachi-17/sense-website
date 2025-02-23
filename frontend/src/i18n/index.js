import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ locales のパスを修正（ `./locales/en.json` にする）
import en from './locales/en.json';
import ja from './locales/ja.json';

i18n
  .use(initReactI18next) // React 用に i18next を初期化
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
    },
    lng: 'en', // デフォルトの言語
    fallbackLng: 'en', // 言語が見つからない場合のフォールバック
    interpolation: { escapeValue: false }, // React の XSS 対策は React 自体がやってくれるので false
  });

export default i18n;
