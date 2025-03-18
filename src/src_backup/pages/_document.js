// pages/_document.js を新規作成
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en"> {/* 言語設定は適宜動的に */}
        <Head>
          {/* react-helmet などとの連携を考慮 */}
        </Head>
        <body>
          <Main /> {/* 👈 ここでページの内容が正しくレンダリングされます */}
          <NextScript />
        </body>
      </Html>
    );
  }
}
