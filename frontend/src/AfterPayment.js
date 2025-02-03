import React, { useEffect, useState } from 'react';
import { GiHamburgerMenu } from "react-icons/gi";

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




// ----------------------
// 右上のハンバーガーメニューをクリックするとサイドメニューが表示され、
// サイドメニュー内に「アイテムを購入」ボタンが配置される実装例
export function PurchaseMenu() {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(false);

  // 画面幅の変更に応じたサイドメニューの幅設定
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // アイテム購入ボタン押下時の処理（元のItemButtonの処理と同一）
  const handleBuyClick = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://sense-website-production.up.railway.app/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        credentials: 'include'
      });
      const data = await response.json();
      console.log("[DEBUG] Stripe Response:", data);
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('[ERROR] Checkout session URL not found', data);
      }
    } catch (error) {
      console.error('[ERROR] Error during checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  // FullScreenOverlay のサイドメニューと同様のスタイル
  const styles = {
    hamburgerButton: {
      position: 'fixed',
      top: '20px',
      right: '30px',
      fontSize: '30px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
      zIndex: 1300,
    },
    sideMenuOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1100,
      display: showSideMenu ? 'block' : 'none',
      transition: 'opacity 0.5s ease',
      opacity: showSideMenu ? 1 : 0,
    },
    sideMenu: {
      position: 'fixed',
      top: 0,
      right: 0,
      width: isMobile ? '66.66%' : '33%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: '#FFF',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      zIndex: 1200,
      transform: showSideMenu ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.5s ease-out',
    },
    // サイドメニュー内に配置する「アイテムを購入」ボタンのスタイル（既存と同様の配色）
    buyButton: {
      backgroundColor: '#fff',
      color: '#000',
      padding: '10px 20px',
      fontSize: '16px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '150px',
      marginTop: '20px'
    },
    sideMenuClose: {
      alignSelf: 'flex-end',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      fontSize: '30px',
      cursor: 'pointer',
    }
  };

  // サイドメニュー内のクリックイベントがオーバーレイ全体に伝播しないようにする
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* 右上のハンバーガーメニューアイコン */}
      <button style={styles.hamburgerButton} onClick={() => setShowSideMenu(true)}>
        <GiHamburgerMenu size={24} />
      </button>

      {/* サイドメニュー用オーバーレイ */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* サイドメニュー内の閉じるボタン */}
            <button style={styles.sideMenuClose} onClick={() => setShowSideMenu(false)}>
              &times;
            </button>
            {/* 既存の「アイテムを購入」ボタン（動作はそのまま） */}
            <button onClick={handleBuyClick} style={styles.buyButton} disabled={loading}>
              {loading ? '処理中...' : 'アイテムを購入'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
