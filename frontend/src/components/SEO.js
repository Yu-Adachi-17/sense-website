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

  return (
    <div style={containerStyle}>
      <h1 style={h1Style}>議事録AI</h1>
      <p style={paragraphStyle}>人工知能を活用して、会議の議事録を自動作成。ワンタッチで高精度な議事録を生成するAIツール。</p>

      <h2 style={h2Style}>サービスの特長</h2>
      <p style={paragraphStyle}>■高精度なAIによる音声認識</p>
      <p style={paragraphStyle}>■議事録フォーマットカスタマイズ</p>
      <p style={paragraphStyle}>■複数言語対応</p>
      <p style={paragraphStyle}>■クラウド保存＆共有機能</p>

      <h2 style={h2Style}>料金プラン</h2>
      <p style={paragraphStyle}>Trial: $1.99（120分）</p>
      <p style={paragraphStyle}>Light: $11.99（1200分）</p>
      <p style={paragraphStyle}>月額サブスクリプション: $17.99（無制限）</p>
      <p style={paragraphStyle}>年間サブスクリプション: $149.99（無制限）</p>

      <h2 style={h2Style}>導入実績</h2>
      <p style={paragraphStyle}>iOS版リリース6ヶ月で全世界15000ダウンロード突破！</p>
    </div>
  );
};

export default SEOPage;
