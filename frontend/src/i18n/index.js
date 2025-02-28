import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ 各言語のインポート
import en from './locales/en.json';
import ja from './locales/ja.json';
import de from './locales/de.json';
import nl from './locales/nl.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import ptBR from './locales/pt-BR.json';
import ptPT from './locales/pt-PT.json';
import esES from './locales/es-ES.json';
import esMX from './locales/es-MX.json';
import da from './locales/da.json';
import sv from './locales/sv.json';
import tr from './locales/tr.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import no from './locales/no.json';
import ar from './locales/ar.json';
import ms from './locales/ms.json'; // ✅ 追加！マレー語（マレーシア）
import id from './locales/id.json'; // ✅ 追加！インドネシア語

console.log("📌 Checking language files...");
console.log("🇺🇸 en:", en);
console.log("🇯🇵 ja:", ja);
console.log("🇩🇪 de:", de);
console.log("🇳🇱 nl:", nl);
console.log("🇰🇷 ko:", ko);
console.log("🇫🇷 fr:", fr);
console.log("🇧🇷 pt-BR:", ptBR);
console.log("🇵🇹 pt-PT:", ptPT);
console.log("🇪🇸 es-ES:", esES);
console.log("🇲🇽 es-MX:", esMX);
console.log("🇩🇰 da:", da);
console.log("🇸🇪 sv:", sv);
console.log("🇹🇷 tr:", tr);
console.log("🇨🇳 zh-CN:", zhCN);
console.log("🇹🇼 zh-TW:", zhTW);
console.log("🇳🇴 no:", no);
console.log("🇸🇦 ar:", ar);
console.log("🇲🇾 ms:", ms);
console.log("🇮🇩 id:", id);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    de: { translation: de },
    nl: { translation: nl },
    ko: { translation: ko },
    fr: { translation: fr },
    'pt-BR': { translation: ptBR },
    'pt-PT': { translation: ptPT },
    'es-ES': { translation: esES },
    'es-MX': { translation: esMX },
    da: { translation: da },
    sv: { translation: sv },
    tr: { translation: tr },
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    no: { translation: no },
    ar: { translation: ar },
    ms: { translation: ms }, // ✅ 追加
    id: { translation: id }, // ✅ 追加
  },
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// ✅ `i18n.init()` の後に言語を決定
const getLang = () => {
  const lang = navigator.language;
  console.log("🌍 Detected language:", lang);

  if (i18n.hasResourceBundle(lang, 'translation')) {
    return lang;
  }

  const shortLang = lang.split('-')[0];
  return i18n.hasResourceBundle(shortLang, 'translation') ? shortLang : 'en';
};

i18n.changeLanguage(getLang());

export default i18n;
