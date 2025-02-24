import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ 各言語のインポート（デバッグ用に `console.log` を追加）
import en from './locales/en.json';
// import ja from './locales/ja.json';
import de from './locales/de.json';
import nl from './locales/nl.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import ptBR from './locales/pt-BR.json';
import ptPT from './locales/pt-BR.json'; // ✅ 修正！ポルトガルポルトガル語を独立
import esES from './locales/es-ES.json';
import esMX from './locales/es-ES.json'; // ✅ 修正！メキシコスペイン語を独立
import da from './locales/da.json';
import sv from './locales/sv.json';
import tr from './locales/tr.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import no from './locales/no.json';
import ar from './locales/ar.json';

console.log("📌 Checking language files...");
console.log("🇺🇸 en:", en);
// console.log("🇯🇵 ja:", ja);
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

i18n.use(initReactI18next).init({
  resources: {
    en: en ? { translation: en } : {}, // ✅ エラー回避: `undefined` なら空オブジェクト
    // ja: ja ? { translation: ja } : {},
    de: de ? { translation: de } : {},
    nl: nl ? { translation: nl } : {},
    ko: ko ? { translation: ko } : {},
    fr: fr ? { translation: fr } : {},
    'pt-BR': ptBR ? { translation: ptBR } : {},
    'pt-PT': ptPT ? { translation: ptPT } : {},
    'es-ES': esES ? { translation: esES } : {},
    'es-MX': esMX ? { translation: esMX } : {},
    da: da ? { translation: da } : {},
    sv: sv ? { translation: sv } : {},
    tr: tr ? { translation: tr } : {},
    'zh-CN': zhCN ? { translation: zhCN } : {},
    'zh-TW': zhTW ? { translation: zhTW } : {},
    no: no ? { translation: no } : {},
    ar: ar ? { translation: ar } : {},
  },
  lng: (()=>{
    const lang = navigator.language;
    if (i18n.options.resources[lang]) return lang;
    const shortLang = lang.split('-')[0];
    return i18n.options.resources[shortLang] ? shortLang : 'en';
  })(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
