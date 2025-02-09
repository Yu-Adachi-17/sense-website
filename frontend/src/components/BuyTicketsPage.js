import React, { useState } from "react";
import { getAuth } from "firebase/auth";

export default function BuyTicketsPage() {
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  // 商品購入処理（Stripe API を呼び出す）
  const handleBuyClick = async (productId) => {
    console.log("✅ 送信する productId:", productId);
    if (!productId) {
      console.error("❌ productId が undefined です！環境変数を確認してください。");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert("ログインが必要です。先にログインしてください。");
      return;
    }
    const userId = user.uid;
    console.log("✅ 送信する userId:", userId);

    setLoading(true);
    try {
      const response = await fetch("https://sense-website-production.up.railway.app/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          userId,
        }),
        credentials: "include",
      });
      const data = await response.json();
      console.log("[DEBUG] Stripe Response:", data);
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("[ERROR] Checkout session URL not found", data);
      }
    } catch (error) {
      console.error("[ERROR] Error during checkout:", error);
    } finally {
      setLoading(false);
    }
  };

  // グラデーションテキスト用の共通スタイル
  const gradientTextStyle = {
    background: "linear-gradient(90deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: "bold",
  };

  const styles = {
    container: {
      backgroundColor: "#000",
      color: "#FFF",
      minHeight: "100vh",
      fontFamily: "Impact, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
      boxSizing: "border-box",
    },
    // 左右のカラムレイアウト（外枠などは変更せずそのまま）
    columns: {
      display: "flex",
      width: "100%",
      maxWidth: "1000px",
      justifyContent: "space-between",
      gap: "20px",
    },
    column: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    subTitle: {
      fontSize: "32px",
      marginBottom: "20px",
      textAlign: "center",
      ...gradientTextStyle,
    },
    // 外側の白い四角い枠（グループ用）はそのまま
    boxContainer: {
      width: "100%",
      maxWidth: "400px",
      padding: "20px",
      border: "4px solid #FFF",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      boxSizing: "border-box",
      backgroundColor: "transparent",
    },
    // 各購入オプション部分を円形にするスタイル
    circleButton: {
      backgroundColor: "#FFF",
      border: "none",
      width: "150px",
      height: "150px",
      borderRadius: "50%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontFamily: "Impact, sans-serif",
      margin: "10px auto",
      padding: "10px",
      textAlign: "center",
    },
    // 円内の上段・下段のテキストはグラデーション（太字）
    gradientText: {
      ...gradientTextStyle,
    },
    // 円内の中央の価格部分は黒（太字）
    blackText: {
      fontWeight: "bold",
      color: "#000",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.columns}>
        {/* 左側：Buy Ticket */}
        <div style={styles.column}>
          <div style={styles.subTitle}>Buy Ticket</div>
          <div style={styles.boxContainer}>
            {/* 上段（左上）: Trial / $1.99 / 120min */}
            <button
              style={styles.circleButton}
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_120MIN)}
              disabled={loading}
            >
              <div style={styles.gradientText}>Trial</div>
              <div style={styles.blackText}>$1.99</div>
              <div style={styles.gradientText}>120min</div>
            </button>
            {/* 下段（左下）: Light / $11.99 / 1200min */}
            <button
              style={styles.circleButton}
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_1200MIN)}
              disabled={loading}
            >
              <div style={styles.gradientText}>Light</div>
              <div style={styles.blackText}>$11.99</div>
              <div style={styles.gradientText}>1200min</div>
            </button>
          </div>
        </div>

        {/* 右側：UNLIMITED */}
        <div style={styles.column}>
          <div style={styles.subTitle}>UNLIMITED</div>
          <div style={styles.boxContainer}>
            {/* 上段（右上）: Monthly Subscription / $16.99 / Unlimited usage */}
            <button
              style={styles.circleButton}
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED)}
              disabled={loading}
            >
              <div style={styles.gradientText}>Monthly Subscription</div>
              <div style={styles.blackText}>$16.99</div>
              <div style={styles.gradientText}>Unlimited usage</div>
            </button>
            {/* 下段（右下）: Yearly Subscription / $149.99 / Unlimited usage */}
            <button
              style={styles.circleButton}
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED)}
              disabled={loading}
            >
              <div style={styles.gradientText}>Yearly Subscription</div>
              <div style={styles.blackText}>$149.99</div>
              <div style={styles.gradientText}>Unlimited usage</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
