// src/pages/_app.js

import '../App.css';           // グローバルCSS
import '../News.css';
import '../styles/globals.css';

import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { appWithTranslation } from 'next-i18next';
import { initAuthPersistence } from '../firebaseConfig';

function MyApp({ Component, pageProps }) {
  const { locale } = useRouter();

  // Auth 永続化（クライアント一度だけ）
  useEffect(() => {
    initAuthPersistence();
  }, []);

  // HTML の dir / lang を現在のロケールに同期（RTL対応含む）
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const lang = locale || 'en';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [locale]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default appWithTranslation(MyApp);
