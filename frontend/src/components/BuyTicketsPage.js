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

    // ユーザーの認証情報を取得
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
          userId, // userId を含める
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

  // グラデーションテキスト用の共通スタイル（既存のグラデーションカラー）
  const gradientTextStyle = {
    background: "linear-gradient(90deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: "bold",
  };

  // 各種スタイル定義
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
    // トップタイトルは削除（もともと "Buy Tickets!!" でした）
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
    // サブタイトルはグラデーションテキストにする
    subTitle: {
      fontSize: "32px",
      marginBottom: "20px",
      textAlign: "center",
      ...gradientTextStyle,
    },
    // ボックスの枠は白
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
    // ボタンは白背景、枠はなし
    button: {
      backgroundColor: "#FFF",
      border: "none",
      padding: "10px 20px",
      margin: "10px 0",
      fontSize: "18px",
      cursor: "pointer",
      fontFamily: "Impact, sans-serif",
      width: "100%",
      borderRadius: "4px",
    },
    // ボタン内のテキストにグラデーション（太字）を適用
    buttonText: {
      ...gradientTextStyle,
    },
    // 価格表示用のスタイル（白、太字）
    priceText: {
      marginTop: "5px",
      color: "#FFF",
      fontWeight: "bold",
    },
  };

  return (
    <div style={styles.container}>
      {/* トップタイトル "Buy Tickets!!" は削除しました */}

      <div style={styles.columns}>
        {/* 左側：Buy Ticket */}
        <div style={styles.column}>
          <div style={styles.subTitle}>Buy Ticket</div>
          <div style={styles.boxContainer}>
            <div style={{ width: "100%", textAlign: "center" }}>
              <button
                style={styles.button}
                onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_120MIN)}
                disabled={loading}
              >
                <span style={styles.buttonText}>120分を買う</span>
              </button>
              <div style={styles.priceText}>120min: 1.99$</div>
            </div>
            <div style={{ width: "100%", textAlign: "center" }}>
              <button
                style={styles.button}
                onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_1200MIN)}
                disabled={loading}
              >
                <span style={styles.buttonText}>1200分を買う</span>
              </button>
              <div style={styles.priceText}>1200min: 11.99$</div>
            </div>
          </div>
        </div>

        {/* 右側：UNLIMITED */}
        <div style={styles.column}>
          <div style={styles.subTitle}>UNLIMITED</div>
          <div style={styles.boxContainer}>
            <div style={{ width: "100%", textAlign: "center" }}>
              <button
                style={styles.button}
                onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED)}
                disabled={loading}
              >
                <span style={styles.buttonText}>月額サブスクリプションに登録</span>
              </button>
              <div style={styles.priceText}>subs: 17.99$</div>
            </div>
            <div style={{ width: "100%", textAlign: "center" }}>
              <button
                style={styles.button}
                onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED)}
                disabled={loading}
              >
                <span style={styles.buttonText}>年額サブスクリプションに登録</span>
              </button>
              <div style={styles.priceText}>年間subs: 149.99$</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
