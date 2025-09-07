// pages/_document.js 
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en"> {/* 言語設定はそのまま */}
        <Head>
          {/* Favicon（PNGを直接指定） */}
          <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />

          {/* iOS ホーム追加 */}
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

          {/* PWA */}
          <link rel="manifest" href="/manifest.json" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
