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
      <h1 style={h1Style}>AI議事録ツール | Sense AI</h1>
      <p style={paragraphStyle}>AIを活用して、会議の議事録を自動作成。手間ゼロで高精度な議事録を生成する革新的ツール。</p>

      <h2 style={h2Style}>サービスの特長</h2>
      <p style={paragraphStyle}>✅ 高精度なAIによる音声認識</p>
      <p style={paragraphStyle}>✅ 複数言語対応</p>
      <p style={paragraphStyle}>✅ リアルタイム文字起こし</p>
      <p style={paragraphStyle}>✅ クラウド保存＆共有機能</p>

      <h2 style={h2Style}>料金プラン</h2>
      <p style={paragraphStyle}>Trial: $1.99（試用版）</p>
      <p style={paragraphStyle}>Light: $11.99（基本機能）</p>
      <p style={paragraphStyle}>月額サブスクリプション: $17.99（フル機能）</p>
      <p style={paragraphStyle}>年間サブスクリプション: $149.99（お得な年額プラン）</p>

      <h2 style={h2Style}>導入事例</h2>
      <p style={paragraphStyle}>多くの企業が導入し、業務の効率化に成功！</p>
      <p style={paragraphStyle}>「会議後の議事録作成が90%短縮！」</p>
      <p style={paragraphStyle}>「AI精度が高く、手直し不要！」</p>

      <h2 style={h2Style}>よくある質問</h2>
      <p style={paragraphStyle}><strong>Q: 無料トライアルはありますか？</strong></p>
      <p style={paragraphStyle}>A: はい、$1.99のトライアルプランをご用意しています。</p>
      <p style={paragraphStyle}><strong>Q: サポート対応時間は？</strong></p>
      <p style={paragraphStyle}>A: メール対応: 平日9:00 - 18:00（日本時間）</p>
    </div>
  );
};

export default SEOPage;
