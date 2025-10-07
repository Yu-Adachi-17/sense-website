// pages/_app.js

import '../App.css';               // ✅ グローバルCSS
import '../News.css';
import '../styles/globals.css';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // ※ next-i18next でも使用OK（re-exportあり）
import { appWithTranslation } from 'next-i18next'; // ✅ 追加：i18n HOC
import { initAuthPersistence } from '../firebaseConfig'; // ★ 既存：Auth永続化

function MyApp({ Component, pageProps }) {
  const { i18n } = useTranslation();

  // ★ Auth 永続化（クライアントで一度だけ）
  useEffect(() => {
    initAuthPersistence();
  }, []);

  // ★ RTL（アラビア語）対応：dir 属性を自動切替
  useEffect(() => {
    document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr');
  }, [i18n.language]);

  return <Component {...pageProps} />;
}

// ✅ next-i18next を適用（SSR で翻訳注入）
export default appWithTranslation(MyApp);
