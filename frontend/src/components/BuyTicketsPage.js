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
      const response = await fetch(
        "https://sense-website-production.up.railway.app/api/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            userId,
          }),
          credentials: "include",
        }
      );
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

  // 共通のグラデーションテキストスタイル
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
    // 4つの円をグリッド表示するコンテナ
    grid: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "20px",
      maxWidth: "1000px",
    },
    // 円形のボタン（クリック可能）
    circle: {
      width: "200px",
      height: "200px",
      backgroundColor: "#FFF",
      borderRadius: "50%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
      padding: "10px",
      boxSizing: "border-box",
      textAlign: "center",
    },
    // 円内上段のテキスト（商品名）
    nameText: {
      ...gradientTextStyle,
      fontSize: "18px",
      margin: "5px 0",
      lineHeight: "1.2",
    },
    // 円内中段のテキスト（価格・黒）
    priceText: {
      color: "#000",
      fontWeight: "bold",
      fontSize: "16px",
      margin: "5px 0",
      lineHeight: "1.2",
    },
    // 円内下段のテキスト（説明）
    descText: {
      ...gradientTextStyle,
      fontSize: "16px",
      margin: "5px 0",
      lineHeight: "1.2",
    },
  };

  // 4つの商品の定義
  const products = [
    {
      id: process.env.REACT_APP_STRIPE_PRODUCT_120MIN,
      name: "Trial",
      price: "$1.99",
      desc: "120min",
    },
    {
      id: process.env.REACT_APP_STRIPE_PRODUCT_1200MIN,
      name: "Light",
      price: "$11.99",
      desc: "1200min",
    },
    {
      id: process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED,
      name: "Monthly Subscription",
      price: "$16.99",
      desc: "Unlimited usage",
    },
    {
      id: process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED,
      name: "Yearly Subscription",
      price: "$149.99",
      desc: "Unlimited usage",
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {products.map((product, index) => (
          <div
            key={index}
            style={styles.circle}
            onClick={() => {
              if (!loading) handleBuyClick(product.id);
            }}
          >
            <div style={styles.nameText}>{product.name}</div>
            <div style={styles.priceText}>{product.price}</div>
            <div style={styles.descText}>{product.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
