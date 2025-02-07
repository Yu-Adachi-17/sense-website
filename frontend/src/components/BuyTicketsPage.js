// src/components/BuyTicketsPage.js
import React, { useState } from "react";

export default function BuyTicketsPage() {
  const [loading, setLoading] = useState(false);

  // 商品購入処理（Stripe API を呼び出す）
  const handleBuyClick = async (productId) => {
    console.log("✅ 送信する productId:", productId);
    if (!productId) {
      console.error("❌ productId が undefined です！環境変数を確認してください。");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("https://sense-website-production.up.railway.app/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
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
    title: {
      fontSize: "48px",
      marginBottom: "40px",
      textAlign: "center",
    },
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
    },
    boxContainer: {
      width: "100%",
      maxWidth: "400px",
      padding: "20px",
      border: "4px solid transparent",
      borderImage:
        "linear-gradient(90deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76)) 1",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      boxSizing: "border-box",
      backgroundColor: "transparent",
    },
    button: {
      backgroundColor: "transparent",
      color: "#FFF",
      border: "2px solid #FFF",
      padding: "10px 20px",
      margin: "10px 0",
      fontSize: "18px",
      cursor: "pointer",
      fontFamily: "Impact, sans-serif",
      width: "100%",
      borderRadius: "4px",
      transition: "background-color 0.3s",
    },
    buttonHover: {
      backgroundColor: "rgba(255,255,255,0.1)",
    },
  };

  return (
    <div style={styles.container}>
      {/* 画面上部中央のタイトル */}
      <div style={styles.title}>Buy Tickets!!</div>

      {/* 左右に分割したレイアウト */}
      <div style={styles.columns}>
        {/* 左側：Buy Time */}
        <div style={styles.column}>
          <div style={styles.subTitle}>Buy Time</div>
          <div style={styles.boxContainer}>
            <button
              style={styles.button}
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_120MIN)}
              disabled={loading}
            >
              120分を買う
            </button>
            <button
              style={styles.button}
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_1200MIN)}
              disabled={loading}
            >
              1200分を買う
            </button>
          </div>
        </div>

        {/* 右側：Subscription */}
        <div style={styles.column}>
          <div style={styles.subTitle}>Subscription</div>
          <div style={styles.boxContainer}>
            <button
              style={styles.button}
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED)}
              disabled={loading}
            >
              サブスクリプションに登録
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
