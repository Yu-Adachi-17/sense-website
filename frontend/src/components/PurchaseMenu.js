// src/components/PurchaseMenu.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Firebase
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
// アイコン
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FaTicketAlt, FaCircle } from "react-icons/fa";

export function PurchaseMenu() {
  // 各種 state 定義
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  // Firestore のユーザードキュメントから取得する remainingSeconds
  const [profileRemainingSeconds, setProfileRemainingSeconds] = useState(null);
  // 購入用モーダル／プロフィール用モーダルの表示切替用 state
  const [showPurchaseOverlay, setShowPurchaseOverlay] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);

  const navigate = useNavigate();

  // ウィンドウサイズ変更時の処理
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Firebase の認証状態監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
        console.log("✅ Firebase ログインユーザーの UID:", user.uid);
      } else {
        setUserId(null);
        setUserEmail(null);
        console.log("❌ ユーザーはログアウトしています。");
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore からユーザーの remainingSeconds を取得
  useEffect(() => {
    if (userId) {
      const fetchUserData = async () => {
        try {
          const docRef = doc(db, "users", userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileRemainingSeconds(data.remainingSeconds);
          }
        } catch (error) {
          console.error("ユーザーデータ取得エラー:", error);
        }
      };
      fetchUserData();
    }
  }, [userId]);

  // 環境変数のチェック（デバッグ用）
  useEffect(() => {
    console.log("🔍 環境変数チェック:");
    console.log("REACT_APP_STRIPE_PRODUCT_120MIN:", process.env.REACT_APP_STRIPE_PRODUCT_120MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_1200MIN:", process.env.REACT_APP_STRIPE_PRODUCT_1200MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_UNLIMITED:", process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED);
  }, []);

  // 商品購入処理（既存の処理をそのまま利用）
  const handleBuyClick = async (productId) => {
    console.log("✅ 送信する productId:", productId);
    if (!productId) {
      console.error("❌ productId が undefined です！環境変数を確認してください。");
      return;
    }
    if (!userId) {
      console.error("❌ userId が取得できません。ログイン状態を確認してください。");
      alert("購入処理を行うにはログインが必要です。");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("https://sense-website-production.up.railway.app/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, userId }),
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

  // 各種スタイル定義
  const styles = {
    // トップ右のボタン
    hamburgerButton: {
      position: "fixed",
      top: "20px",
      right: "30px",
      fontSize: "30px",
      background: "none",
      border: "none",
      color: "#FFFFFF",
      cursor: "pointer",
      zIndex: 1300,
    },
    // サイドメニュー用のオーバーレイ（背景）
    sideMenuOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 1100,
      display: showSideMenu ? "block" : "none",
      transition: "opacity 0.5s ease",
      opacity: showSideMenu ? 1 : 0,
    },
    // サイドメニュー本体
    sideMenu: {
      position: "fixed",
      top: 0,
      right: 0,
      width: isMobile ? "66.66%" : "33%",
      height: "100%",
      background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(128, 128, 128, 0.2))",
      color: "#FFF",
      padding: "20px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      zIndex: 1200,
      transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.5s ease-out",
    },
    // ログインボタン（ログインしていない場合）
    loginButton: {
      backgroundColor: "#fff",
      color: "#000",
      padding: "10px 20px",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "bold",
      marginBottom: "20px",
    },
    // 購入ボタン（サイドメニュー内に表示する「アイテムを購入」ボタン）
    purchaseButton: {
      backgroundColor: "#fff",
      color: "#000",
      padding: "10px 20px",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "bold",
    },
    // 既存の購入ボタン用スタイル（購入オーバーレイ内のボタン）
    buyButton: {
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      fontSize: "16px",
      fontWeight: "bold",
      opacity: loading ? 0.7 : 1,
      marginTop: "10px",
    },
    ticketIcon: {
      color: "yellow",
      fontSize: "20px",
      marginRight: "8px",
      opacity: loading ? 0.7 : 1,
    },
    text: {
      color: "yellow",
      fontSize: "16px",
      fontWeight: "bold",
      opacity: loading ? 0.7 : 1,
    },
    loadingIcon: {
      color: "orange",
      fontSize: "7px",
      marginLeft: "8px",
    },
    // 購入オーバーレイ（「アイテムを購入」ボタンタップ時に表示するモーダルの背景）
    purchaseOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 1400,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    // 購入モーダル本体（縦4横3＝300px×400px の例）
    purchaseModal: {
      width: "300px",
      height: "400px",
      background: "#FFF",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      boxSizing: "border-box",
    },
    // プロフィールオーバーレイ（プロフィールアイコンタップ時）
    profileOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 1400,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    // プロフィールモーダル本体
    profileModal: {
      width: "300px",
      height: "400px",
      background: "#FFF",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      boxSizing: "border-box",
    },
    // 各オーバーレイ共通の「閉じる」ボタン
    closeButton: {
      background: "transparent",
      border: "none",
      fontSize: "16px",
      alignSelf: "flex-end",
      cursor: "pointer",
      marginBottom: "10px",
    },
    // プロフィール情報表示用
    profileInfo: {
      textAlign: "center",
      fontSize: "16px",
      color: "#000",
    },
  };

  // クリックイベントのバブリング防止用
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // トップ右のボタンタップ時の処理
  // ・サイドメニューが非表示なら表示、表示中なら（ログイン済みなら）プロフィールオーバーレイを表示
  const handleHamburgerClick = () => {
    if (!showSideMenu) {
      setShowSideMenu(true);
    } else {
      if (userId) {
        setShowProfileOverlay(true);
      } else {
        navigate("/login");
      }
      setShowSideMenu(false);
    }
  };

  return (
    <>
      {/* トップ右のハンバーガー／プロフィールボタン */}
      <button style={styles.hamburgerButton} onClick={handleHamburgerClick}>
        {showSideMenu ? (
          <IoPersonCircleOutline size={24} />
        ) : (
          <GiHamburgerMenu size={24} />
        )}
      </button>

      {/* サイドメニュー用オーバーレイ */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* ログインしていない場合はログインボタン、ログイン済みなら「アイテムを購入」ボタンを表示 */}
            {!userId ? (
              <button
                style={styles.loginButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/login");
                }}
              >
                ログイン
              </button>
            ) : (
              <button
                style={styles.purchaseButton}
                onClick={() => {
                  setShowPurchaseOverlay(true);
                  setShowSideMenu(false);
                }}
              >
                アイテムを購入
              </button>
            )}
          </div>
        </div>
      )}

      {/* 購入オーバーレイ（モーダル） */}
      {showPurchaseOverlay && (
        <div style={styles.purchaseOverlay} onClick={() => setShowPurchaseOverlay(false)}>
          <div style={styles.purchaseModal} onClick={stopPropagation}>
            <button style={styles.closeButton} onClick={() => setShowPurchaseOverlay(false)}>
              閉じる
            </button>
            <button
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_120MIN)}
              style={styles.buyButton}
              disabled={loading}
            >
              <FaTicketAlt style={styles.ticketIcon} />
              <span style={styles.text}>120分を買う</span>
              {loading && <FaCircle style={styles.loadingIcon} />}
            </button>
            <button
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_1200MIN)}
              style={styles.buyButton}
              disabled={loading}
            >
              <FaTicketAlt style={styles.ticketIcon} />
              <span style={styles.text}>1200分を買う</span>
              {loading && <FaCircle style={styles.loadingIcon} />}
            </button>
            <button
              onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED)}
              style={styles.buyButton}
              disabled={loading}
            >
              <FaTicketAlt style={styles.ticketIcon} />
              <span style={styles.text}>サブスクリプションに登録</span>
              {loading && <FaCircle style={styles.loadingIcon} />}
            </button>
          </div>
        </div>
      )}

      {/* プロフィールオーバーレイ */}
      {showProfileOverlay && (
        <div style={styles.profileOverlay} onClick={() => setShowProfileOverlay(false)}>
          <div style={styles.profileModal} onClick={stopPropagation}>
            <button style={styles.closeButton} onClick={() => setShowProfileOverlay(false)}>
              閉じる
            </button>
            <div style={styles.profileInfo}>
              <p>Email: {userEmail}</p>
              <p>Remaining Seconds: {profileRemainingSeconds}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PurchaseMenu;
