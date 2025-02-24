import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ 既存言語
import en from './locales/en.json';
import ja from './locales/ja.json';

// ✅ 追加言語
import de from './locales/de.json';
import nl from './locales/nl.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import ptBR from './locales/pt-BR.json';
import ptPT from './locales/pt-BR.json'; // ✅ ブラジルポルトガル語を流用
import esES from './locales/es-ES.json';
import esMX from './locales/es-ES.json'; // ✅ スペイン語（メキシコ）はスペイン版を流用
import da from './locales/da.json';
import sv from './locales/sv.json'; // ✅ スウェーデン語を追加
import tr from './locales/tr.json'; // ✅ トルコ語を追加
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import no from './locales/no.json';
import ar from './locales/ar.json'; // ✅ アラビア語を追加

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
    sv: { translation: sv }, // ✅ スウェーデン語
    tr: { translation: tr }, // ✅ トルコ語
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    no: { translation: no },
    ar: { translation: ar }, // ✅ アラビア語追加！
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
