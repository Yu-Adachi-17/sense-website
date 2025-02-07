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
  // 購入用モーダル／プロフィール用モーダルの表示切替用 state（今回の遷移用では購入オーバーレイは使用しない）
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

  // （※既存の購入処理 handleBuyClick は、今回の画面遷移では不要なため省略可）

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
    // プロフィールオーバーレイ（プロフィールアイコンタップ時）
    profileOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.9)",
      zIndex: 1400,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    profileModal: {
      width: "300px",
      height: "400px",
      background: "rgba(20, 20, 20, 1)",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px",
      boxSizing: "border-box",
      position: "relative",
    },
    logoutButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "transparent",
      color: "red",
      fontWeight: "bold",
      padding: "8px 12px",
      borderRadius: "5px",
      border: "2px solid red",
      cursor: "pointer",
      fontFamily: "Impact, sans-serif",
    },
    profileIcon: {
      fontSize: "160px",
      color: "gray",
      marginBottom: "20px",
      marginTop: "5%",
    },
    profileInfo: {
      textAlign: "center",
      fontSize: "16px",
      color: "#FFF",
      fontFamily: "Impact, sans-serif",
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
          <IoPersonCircleOutline size={30} />
        ) : (
          <GiHamburgerMenu size={24} />
        )}
      </button>

      {/* サイドメニュー用オーバーレイ */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* ログインしていない場合はログインボタン */}
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
              // ユーザーがログインしている場合は、購入ページ（BuyTicketsPage）へ遷移
              <button
                style={styles.purchaseButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/buy-tickets");
                }}
              >
                アイテムを購入
              </button>
            )}
          </div>
        </div>
      )}

      {/* プロフィールオーバーレイ */}
      {showProfileOverlay && (
        <div style={styles.profileOverlay} onClick={() => setShowProfileOverlay(false)}>
          <div style={styles.profileModal} onClick={stopPropagation}>
            {/* ログアウトボタン（右上） */}
            <button
              style={styles.logoutButton}
              onClick={() => {
                const confirmLogout = window.confirm("ログアウトしますか？");
                if (confirmLogout) {
                  auth.signOut();
                  setShowProfileOverlay(false);
                }
              }}
            >
              ログアウト
            </button>
            {/* アイコン */}
            <IoPersonCircleOutline style={styles.profileIcon} />
            {/* ユーザー情報 */}
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
