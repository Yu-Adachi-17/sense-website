import React from 'react';
import HomeIcon from '../components/HomeIcon';

const TransactionsLaw = () => {
  const homeIconStyle = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    cursor: 'pointer',
  };

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
    <div>
      {/* HomeIcon を画面左上に配置（サイズを 30 に指定） */}
      <div style={homeIconStyle}>
        <HomeIcon size={30} />
      </div>
      
      <div style={containerStyle}>
        <h1 style={h1Style}>特定商取引法に基づく表記 - Japan Only</h1>

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
        <p style={paragraphStyle}>月額サブスクリプション: $17.99</p>
        <p style={paragraphStyle}>年間サブスクリプション: $149.99</p>

        <h2 style={h2Style}>追加手数料等の追加料金</h2>
        <p style={paragraphStyle}>追加の手数料は発生しません。</p>

        <h2 style={h2Style}>交換および返品（返金ポリシー）</h2>
        <p style={paragraphStyle}>
          デジタルサービスの性質上、購入後の返金は原則対応しておりません。ただし、技術的な不具合等が発生した場合には個別に対応いたします。
        </p>

        <h2 style={h2Style}>引渡時期</h2>
        <p style={paragraphStyle}>決済完了後、即時サービスを利用可能となります。</p>

        <h2 style={h2Style}>決済期間</h2>
        <p style={paragraphStyle}>クレジットカード決済は即時処理されます。</p>

        <h2 style={h2Style}>サポート受付時間</h2>
        <p style={paragraphStyle}>メール対応: 平日9:00 - 18:00（日本時間）</p>
      </div>
    </div>
  );
};

export default TransactionsLaw;
