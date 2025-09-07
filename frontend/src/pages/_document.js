// pages/_document.js 
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en"> {/* 言語設定はそのまま */}
        <Head>
          {/* Favicon（PNGを直接指定） */}
          <link rel="icon" href="/favicon-48.png" type="image/png" />

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
