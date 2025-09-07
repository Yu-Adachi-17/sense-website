// pages/_document.js 
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en"> {/* 言語設定はそのまま */}
        <Head>
          {/* ▼ アイコン関連（追加） */}
          {/* ブラウザ用ファビコン（ICOに16/32/48を同梱） */}
          <link rel="icon" href="/favicon.ico" sizes="any" />

          {/* iOS「ホーム画面に追加」用（180x180） */}
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

          {/* PWA/Android 用（manifest.json 内で 192 / 512 と purpose:any maskable を指定） */}
          <link rel="manifest" href="/manifest.json" />

          {/* Safari ピン留め（SVG を用意したときに有効化） */}
          {/* <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0B1220" /> */}
        </Head>
        <body>
          <Main /> {/* ページ内容 */}
          <NextScript />
        </body>
      </Html>
    );
  }
}
