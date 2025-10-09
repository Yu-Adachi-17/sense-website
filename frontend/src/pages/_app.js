// src/pages/_app.js

// Tailwind v4 を含むグローバルCSS（最優先で読み込み）
import '../styles/globals.css';

// 既存CSS（Tailwindの上から被せたい場合は後ろでOK）
import '../App.css';
import '../News.css';

import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { appWithTranslation } from 'next-i18next';

// ★ 重要：firebaseConfig を “直接” import しない（SSRで評価されて落ちるため）
// import { initAuthPersistence } from '../firebaseConfig';

function MyApp({ Component, pageProps }) {
  const { locale } = useRouter();

  // Auth 永続化：クライアントで一度だけ。動的 import で SSR を回避
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await import('../firebaseConfig'); // ← クライアントでだけ読み込む
        if (!mounted) return;
        if (typeof window !== 'undefined' && typeof m.initAuthPersistence === 'function') {
          await m.initAuthPersistence();
        }
      } catch (e) {
        // ローカル開発でFirebase未設定でも落ちないように握りつぶす
        if (process.env.NODE_ENV !== 'production') {
          console.warn('initAuthPersistence skipped:', e?.message || e);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // HTML の dir / lang を現在のロケールに同期（RTL対応）
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const lang = locale || 'en';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [locale]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default appWithTranslation(MyApp);
