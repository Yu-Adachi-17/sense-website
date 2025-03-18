import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";

// ----------------------
// Screen displayed upon successful payment
export function Success() {
  const { t } = useTranslation();
  
  useEffect(() => {
    console.log("[DEBUG] Success component rendered");
    const timer = setTimeout(() => {
      window.location.href = "https://sense-ai.world";
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      backgroundColor: '#000',
      color: '#fff',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      fontFamily: 'Impact, sans-serif'
    }}>
      <h1 style={{ fontWeight: 225, letterSpacing: '0.05em', fontSize: '3em' }}>
        {t("Payment Successful")}
      </h1>
      <p style={{ fontSize: '1.2em', marginTop: '10px' }}>
        {t("You will be redirected automatically in a few seconds...")}
      </p>
    </div>
  );
}

// ----------------------
// Screen displayed when payment is canceled
export function Cancel() {
  const { t } = useTranslation();
  const handleRetry = () => {
    window.location.href = "/create-checkout-session";
  };

  return (
    <div style={{
      backgroundColor: '#000',
      color: '#fff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Impact, sans-serif',
      textAlign: 'center'
    }}>
      <h1 style={{ fontWeight: 300, letterSpacing: '0.05em', fontSize: '4em' }}>
        {t("Payment Canceled")}
      </h1>
      <p style={{ fontSize: '1.6em', marginBottom: '20px' }}>
        {t("The payment was not completed. Please try again.")}
      </p>
      <div>
        <button onClick={handleRetry} style={{
          backgroundColor: '#ffcc00',
          color: '#000',
          padding: '10px 20px',
          fontSize: '32px',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginRight: '10px'
        }}>
          {t("Retry Payment")}
        </button>
        <a href="https://sense-ai.world" style={{
          backgroundColor: '#555',
          color: '#fff',
          padding: '10px 20px',
          fontSize: '32px',
          fontWeight: 'bold',
          textDecoration: 'none',
          borderRadius: '5px'
        }}>
          {t("Return to Home Page")}
        </a>
      </div>
    </div>
  );
}
