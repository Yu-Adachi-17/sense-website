import React, { useEffect } from 'react';

export function Success() {
  useEffect(() => {
    console.log("[DEBUG] Success component rendered");

    // 2秒後にリダイレクト
    const timer = setTimeout(() => {
      window.location.href = "https://sense-ai.world";
    }, 2000);

    return () => clearTimeout(timer); // クリーンアップ
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Impact, sans-serif',
      }}
    >
      <h1 style={{ fontWeight: 300, letterSpacing: '0.05em' }}>
        Payment Successful
      </h1>
    </div>
  );
}


export function Cancel() {
  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Impact, sans-serif',
      }}
    >
      <h1 style={{ fontWeight: 300, letterSpacing: '0.05em' }}>
        Payment Canceled
      </h1>
    </div>
  );
}
