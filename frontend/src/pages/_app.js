import '../App.css'; // ✅ グローバルCSSをここで読み込む
import '../News.css';
import '../i18n/index'; // ✅ i18next の初期化
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/globals.css';


function MyApp({ Component, pageProps }) {
  const { i18n } = useTranslation();

  // アラビア語対応
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  return <Component {...pageProps} />;
}

export default MyApp;
