import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { getAuth } from "firebase/auth";
import HomeIcon from "./homeIcon";
import { useRouter } from "next/router";
import Link from "next/link";

const Container = styled.div`
  background-color: #000;
  color: #fff;
  min-height: 100vh;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Helvetica Neue", Arial, sans-serif;
  position: relative;
`;

const HomeIconWrapper = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  width: 70px;
`;

const Title = styled.h1`
  font-family: Impact, sans-serif;
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
  background: ${(props) =>
    props.$blue
      ? "linear-gradient(315deg, rgba(0, 0, 128, 0.2), rgba(0, 0, 255, 0.01))"
      : "linear-gradient(315deg, rgba(0, 128, 0, 0.2), rgba(0, 255, 0, 0.01))"};
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
`;

const CardTitle = styled.h2`
  font-family: Impact, sans-serif;
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
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Divider = styled.hr`
  width: 100%;
  max-width: 1200px;
  border: none;
  border-top: 1px solid #fff;
  margin: 40px 0;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  position: absolute;
  bottom: 20px;
`;

const Spacer = styled.div`
  width: 20px;
`;

export default function BuyTicketsPage() {
  const { t } = useTranslation();
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const router = useRouter();

  // クライアントサイドで Firebase Auth を初期化
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthInstance(getAuth());
    }
  }, []);

  const handleBuyClick = async (productId) => {
    if (!productId) {
      console.error("❌ productId is undefined. Please check your environment variables.");
      return;
    }

    if (!authInstance || !authInstance.currentUser) {
      alert("Login required. Please log in first.");
      return;
    }

    const userId = authInstance.currentUser.uid;
    console.log("Sending productId:", productId, "userId:", userId);

    setLoadingProductId(productId);
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
      if (data.url && typeof window !== "undefined") {
        window.location.href = data.url;
      } else {
        console.error("Checkout session URL not found", data);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
    } finally {
      setLoadingProductId(null);
    }
  };

  return (
    <Container>
      <HomeIconWrapper>
        <HomeIcon size="30px" color="white" />
      </HomeIconWrapper>

      <Title>{t("Buy Time")}</Title>
      <CardsWrapper>
        <Card>
          <CardTitle>Trial</CardTitle>
          <Button
            onClick={() =>
              handleBuyClick(process.env.NEXT_PUBLIC_STRIPE_PRODUCT_120MIN)
            }
            disabled={loadingProductId !== null}
          >
            120 min / $1.99
          </Button>
        </Card>

        <Card>
          <CardTitle>Light</CardTitle>
          <Button
            onClick={() =>
              handleBuyClick(process.env.NEXT_PUBLIC_STRIPE_PRODUCT_1200MIN)
            }
            disabled={loadingProductId !== null}
          >
            1200 min / $11.99
          </Button>
        </Card>
      </CardsWrapper>

      <Title>Unlimited</Title>
      <CardsWrapper>
        <Card $blue>
          <CardTitle>Monthly Subscription</CardTitle>
          <Button
            onClick={() =>
              handleBuyClick(process.env.NEXT_PUBLIC_STRIPE_PRODUCT_UNLIMITED)
            }
            disabled={loadingProductId !== null}
          >
            $16.99/mo
          </Button>
        </Card>

        <Card $blue>
          <CardTitle>Yearly Subscription</CardTitle>
          <Button
            onClick={() =>
              handleBuyClick(process.env.NEXT_PUBLIC_STRIPE_PRODUCT_YEARLY_UNLIMITED)
            }
            disabled={loadingProductId !== null}
          >
            $149.99/yr
          </Button>
        </Card>
      </CardsWrapper>

      <Divider />

      <Footer>
        <Spacer />
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Spacer />
        <Link href="/terms-of-use">Terms of Use</Link>
        <Spacer />
      </Footer>
    </Container>
  );
}
