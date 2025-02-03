import React, { useEffect, useState } from 'react';


// ----------------------
// 決済成功時の画面
export function Success() {
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
      <h1 style={{ fontWeight: 300, letterSpacing: '0.05em' }}>
        Payment Successful
      </h1>
      <p style={{ fontSize: '0.8em', marginTop: '10px' }}>
        You will be redirected automatically in a few seconds...
      </p>
    </div>
  );
}

// ----------------------
// 決済キャンセル時の画面
export function Cancel() {
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
      <h1 style={{ fontWeight: 300, letterSpacing: '0.05em' }}>
        Payment Canceled
      </h1>
      <p style={{ marginBottom: '20px' }}>
        お支払いが完了しませんでした。再度お試しください。
      </p>
      <div>
        <button onClick={handleRetry} style={{
          backgroundColor: '#ffcc00',
          color: '#000',
          padding: '10px 20px',
          fontSize: '16px',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginRight: '10px'
        }}>
          決済を再試行する
        </button>
        <a href="https://sense-ai.world" style={{
          backgroundColor: '#555',
          color: '#fff',
          padding: '10px 20px',
          fontSize: '16px',
          fontWeight: 'bold',
          textDecoration: 'none',
          borderRadius: '5px'
        }}>
          トップページに戻る
        </a>
      </div>
    </div>
  );
}


