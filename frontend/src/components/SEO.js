import React from 'react';

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

  const thTdStyle = {
    border: '1px solid #fff',
    padding: '10px',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <div style={centerTextStyle}>サービスと料金表</div>
      <h1 style={h1Style}>議事録AI</h1>
      <p style={paragraphStyle}>人工知能を活用して、会議の議事録を自動作成。ワンタッチで高精度な議事録を生成するAIツール。</p>

      <h2 style={h2Style}>サービスの特長</h2>
      <p style={paragraphStyle}>■高精度なAIによる音声認識</p>
      <p style={paragraphStyle}>■議事録フォーマットカスタマイズ</p>
      <p style={paragraphStyle}>■複数言語対応</p>
      <p style={paragraphStyle}>■クラウド保存＆共有機能</p>

      <h2 style={h2Style}>料金プラン</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>プラン</th>
            <th style={thTdStyle}>価格</th>
            <th style={thTdStyle}>録音時間</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={thTdStyle}>Trial</td>
            <td style={thTdStyle}>$1.99</td>
            <td style={thTdStyle}>120分</td>
          </tr>
          <tr>
            <td style={thTdStyle}>Light</td>
            <td style={thTdStyle}>$11.99</td>
            <td style={thTdStyle}>1200分</td>
          </tr>
          <tr>
            <td style={thTdStyle}>月額サブスクリプション</td>
            <td style={thTdStyle}>$17.99</td>
            <td style={thTdStyle}>無制限</td>
          </tr>
          <tr>
            <td style={thTdStyle}>年間サブスクリプション</td>
            <td style={thTdStyle}>$149.99</td>
            <td style={thTdStyle}>無制限</td>
          </tr>
        </tbody>
      </table>

      <h2 style={h2Style}>導入実績</h2>
      <p style={paragraphStyle}>iOS版リリース6ヶ月で全世界15000ダウンロード突破！</p>
    </div>
  );
};

export default SEOPage;
