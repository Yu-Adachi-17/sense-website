import React, { useState } from "react";
import styled from "styled-components";
import { getAuth } from "firebase/auth";

// 画面全体のコンテナ
const Container = styled.div`
  background-color: #000;
  color: #fff;
  min-height: 100vh;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Helvetica Neue", Arial, sans-serif;
`;

// ページタイトル
const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 40px;
  text-align: center;
`;

// カードを横並びに配置するラッパー
const CardsWrapper = styled.div`
  display: flex;
  gap: 40px;
  width: 100%;
  max-width: 1200px;
  justify-content: center;
  flex-wrap: wrap;
`;

// 各カードのスタイル
const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// カード内のタイトル
const CardTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 20px;
`;

// ボタンのスタイル
const Button = styled.button`
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  font-size: 1.2rem;
  padding: 12px 24px;
  border-radius: 5px;
  width: 100%;
  margin: 10px 0;
  transition: background 0.3s, transform 0.2s;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default function BuyTicketsPage() {
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  // 購入処理（Stripe API 呼び出し）
  const handleBuyClick = async (productId) => {
    if (!productId) {
      console.error(
        "❌ productId が undefined です。環境変数を確認してください。"
      );
      return;
    }

    // ユーザーの認証状態を確認
    const user = auth.currentUser;
    if (!user) {
      alert("ログインが必要です。先にログインしてください。");
      return;
    }

    const userId = user.uid;
    console.log("送信する productId:", productId, "userId:", userId);

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
      console.log("Stripe Response:", data);
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout session URL not found", data);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Title>Buy Tickets</Title>
      <CardsWrapper>
        {/* 左側カード：Buy Time */}
        <Card>
          <CardTitle>Buy Time</CardTitle>
          <Button
            onClick={() =>
              handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_120MIN)
            }
            disabled={loading}
          >
            120分を買う
          </Button>
          <Button
            onClick={() =>
              handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_1200MIN)
            }
            disabled={loading}
          >
            1200分を買う
          </Button>
        </Card>

        {/* 右側カード：Subscription */}
        <Card>
          <CardTitle>UNLIMITED</CardTitle>
          <Button
            onClick={() =>
              handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED)
            }
            disabled={loading}
          >
            月額サブスクリプションに登録
          </Button>
          <Button
            onClick={() =>
              handleBuyClick(
                process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED
              )
            }
            disabled={loading}
          >
            年額サブスクリプションに登録
          </Button>
        </Card>
      </CardsWrapper>
    </Container>
  );
}
