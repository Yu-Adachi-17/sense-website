// pages/_app.js

import '../App.css';           // グローバルCSS
import '../News.css';
import '../styles/globals.css';

import { useEffect } from 'react';
import { appWithTranslation, useTranslation } from 'next-i18next'; // ← ここを 'next-i18next' に統一
import { initAuthPersistence } from '../firebaseConfig';

function MyApp({ Component, pageProps }) {
  const { i18n } = useTranslation();

  // Auth 永続化（クライアント一度だけ）
  useEffect(() => {
    initAuthPersistence();
  }, []);

  // HTMLの dir / lang を現在の言語に同期（RTL対応含む）
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const lang = i18n.language || 'en';
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [i18n.language]);

  return <Component {...pageProps} />;
}

export default appWithTranslation(MyApp);
