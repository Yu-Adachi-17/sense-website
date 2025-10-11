// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    // Next.js が保持している現在のロケール（fallback は 'en'）
    const locale = this.props.__NEXT_DATA__?.locale || 'en';

    return (
      <Html lang={locale}>
        <Head>
          {/* 検索結果用：安定URLの 96×96 PNG（1本だけ） */}
          <link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96" />

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
