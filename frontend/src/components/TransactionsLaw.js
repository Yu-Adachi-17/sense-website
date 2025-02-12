import React from 'react';

const TransactionsLaw = () => {
  const containerStyle = {
    maxWidth: '800px',
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
      <h1 style={h1Style}>特定商取引法に基づく表記</h1>

      <h2 style={h2Style}>販売事業者の名称</h2>
      <p style={paragraphStyle}>安達 悠</p>

      <h2 style={h2Style}>所在地</h2>
      <p style={paragraphStyle}>請求があったら遅滞なく開示します。</p>

      <h2 style={h2Style}>電話番号</h2>
      <p style={paragraphStyle}>請求があったら遅滞なく開示します。</p>

      <h2 style={h2Style}>メールアドレス</h2>
      <p style={paragraphStyle}>info@sense-ai.world</p>

      <h2 style={h2Style}>運営統括責任者</h2>
      <p style={paragraphStyle}>安達 悠</p>

      <h2 style={h2Style}>受け付け可能な決済手段</h2>
      <p style={paragraphStyle}>クレジットカード</p>

      <h2 style={h2Style}>販売価格</h2>
      <p style={paragraphStyle}>Trial: $1.99</p>
      <p style={paragraphStyle}>Light: $11.99</p>
      <p style={paragraphStyle}>月額サブスク: $17.99</p>
      <p style={paragraphStyle}>年間サブスク: $149.99</p>

      <h2 style={h2Style}>関連リンク</h2>
      <p style={paragraphStyle}><a href="/transactions-law" style={{ color: '#fff', textDecoration: 'underline' }}>特定商取引法に基づく表記</a></p>
    </div>
  );
};

export default TransactionsLaw;
