import React from 'react';
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfUse from "./components/TermsOfUse";
import TransactionsLaw from "./components/TransactionsLaw";

const SEOPage = () => {
  const containerStyle = {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '30px',
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '18px',
    lineHeight: 1.8,
    fontFamily: 'Arial, sans-serif',
    textAlign: 'left',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const centerTextStyle = {
    textAlign: 'center',
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '40px',
  };

  const headingStyle = {
    fontWeight: 'bold',
  };

  const h1Style = {
    fontSize: '40px',
    marginBottom: '20px',
    ...headingStyle,
  };

  const h2Style = {
    fontSize: '28px',
    marginTop: '30px',
    marginBottom: '10px',
    ...headingStyle,
  };

  const paragraphStyle = {
    marginBottom: '10px',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };

  const thStyle = {
    backgroundColor: '#000',
    color: '#fff',
    border: '1px solid #777',
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
  };

  const tdStyle = {
    border: '1px solid #777',
    padding: '10px',
    textAlign: 'center',
  };

  const linkStyle = {
    color: '#fff',
    textDecoration: 'underline',
    cursor: 'pointer',
    display: 'block',
    textAlign: 'left',
    marginTop: '10px',
  };

  // 3つのリンクボタン用のスタイル
  const footerLinksContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #777',
  };

  const footerLinkStyle = {
    color: '#fff',
    textDecoration: 'underline',
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      <div style={centerTextStyle}>サービスと料金表</div>
      <h1 style={h1Style}>議事録AI</h1>
      <p style={paragraphStyle}>人工知能を活用して、会議の議事録を自動作成。ワンタッチで高精度な議事録を生成するAIツール。</p>

      <h2 style={h2Style}>サービスの特長</h2>
      <h3>高精度なAIによる音声認識</h3>
      <p>最新のAI技術を活用し、会話の文脈を理解しながら高精度な音声認識を実現。</p>
      
      <h3>議事録フォーマットカスタマイズ</h3>
      <p>用途に応じたフォーマットで議事録を自動生成し、編集の手間を削減。</p>
      
      <h3>複数言語対応</h3>
      <p>多言語対応で、グローバルなチームや海外会議でも活用可能。</p>
      
      <h3>クラウド保存＆共有機能</h3>
      <p>議事録をクラウドに自動保存し、チームメンバーと簡単に共有。</p>

      <h2 style={h2Style}>料金プラン</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>プラン</th>
            <th style={thStyle}>価格</th>
            <th style={thStyle}>録音時間</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Trial</td>
            <td style={tdStyle}>$1.99</td>
            <td style={tdStyle}>120分</td>
          </tr>
          <tr>
            <td style={tdStyle}>Light</td>
            <td style={tdStyle}>$11.99</td>
            <td style={tdStyle}>1200分</td>
          </tr>
          <tr>
            <td style={tdStyle}>月額サブスクリプション</td>
            <td style={tdStyle}>$17.99</td>
            <td style={tdStyle}>無制限</td>
          </tr>
          <tr>
            <td style={tdStyle}>年間サブスクリプション</td>
            <td style={tdStyle}>$149.99</td>
            <td style={tdStyle}>無制限</td>
          </tr>
        </tbody>
      </table>
      <p style={paragraphStyle}>※ゲストユーザーでも1日あたり3分間の録音が可能です</p>

      <h2 style={h2Style}>導入実績</h2>
      <p style={paragraphStyle}>iOS版リリース6ヶ月で全世界15000DL突破</p>
      <a href="https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901" style={linkStyle}>▶︎製品を見てみる</a>

      {/* フッターリンクとコンポーネントの追加 */}
      <div style={footerLinksContainerStyle}>
        <PrivacyPolicy />
        <TermsOfUse />
        <TransactionsLaw />
      </div>
    </div>
  );
};

export default SEOPage;
