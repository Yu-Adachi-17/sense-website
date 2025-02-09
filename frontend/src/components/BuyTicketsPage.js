import React, { useState } from "react";
import styled from "styled-components";
import { getAuth } from "firebase/auth";

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

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 40px;
  text-align: center;
  font-weight: bold;
`;

const CardsWrapper = styled.div`
  display: flex;
  gap: 40px;
  width: 100%;
  max-width: 1200px;
  justify-content: center;
  flex-wrap: wrap;
`;

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
  font-weight: bold;
  ${(props) => props.blue && "background: rgba(0, 0, 255, 0.1);"}
`;

const CardTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 20px;
  font-weight: bold;
`;

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
  font-weight: bold;

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

  const handleBuyClick = async (productId) => {
    if (!productId) {
      console.error("❌ productId が undefined です。環境変数を確認してください。");
      return;
    }

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
          body: JSON.stringify({ productId, userId }),
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
        <Card>
          <CardTitle>Trial</CardTitle>
          <Button onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_120MIN)} disabled={loading}>
            120 min / $1.99
          </Button>
        </Card>
        
        <Card>
          <CardTitle>Light</CardTitle>
          <Button onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_1200MIN)} disabled={loading}>
            1200 min / $11.99
          </Button>
        </Card>
      </CardsWrapper>
      
      <Title>Unlimited</Title>
      <CardsWrapper>
        <Card blue>
          <CardTitle>Monthly Subscription</CardTitle>
          <Button onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED)} disabled={loading}>
            $16.99/mo
          </Button>
        </Card>
        
        <Card blue>
          <CardTitle>Yearly Subscription</CardTitle>
          <Button onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED)} disabled={loading}>
            $149.99/yr
          </Button>
        </Card>
      </CardsWrapper>
    </Container>
  );
}
