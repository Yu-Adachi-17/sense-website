// PurchaseMenu.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Firebase 関連
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
// アイコン類
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonCircleOutline } from "react-icons/io5"; // 残します
import { FaTicketAlt, FaCircle } from "react-icons/fa";
import { BsWrenchAdjustable } from "react-icons/bs";
import { PiGridFourFill } from "react-icons/pi";  // 追加：議事録リスト用アイコン
import { HiOutlineDotsCircleHorizontal } from "react-icons/hi"; // 右上アクションメニュー用アイコン

export function PurchaseMenu() {
  // 各種 state 定義
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  // Firestore のユーザードキュメントから取得する remainingSeconds
  const [profileRemainingSeconds, setProfileRemainingSeconds] = useState(null);
  // Firebase上の subscription 状態（true: unlimited, false: 有限時間）
  const [subscription, setSubscription] = useState(false);
  // プロフィールモーダル表示用
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  // アクションメニュー表示用
  const [showActionMenu, setShowActionMenu] = useState(false);

  const navigate = useNavigate();

  // ウィンドウリサイズ時の処理
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

  // Firestore からユーザーデータ（remainingSeconds, subscription）を取得
  useEffect(() => {
    if (userId) {
      const fetchUserData = async () => {
        try {
          const docRef = doc(db, "users", userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileRemainingSeconds(data.remainingSeconds);
            setSubscription(data.subscription === true);
          }
        } catch (error) {
          console.error("ユーザーデータ取得エラー:", error);
        }
      };
      fetchUserData();
    }
  }, [userId]);

  // 環境変数チェック（デバッグ用）
  useEffect(() => {
    console.log("🔍 環境変数チェック:");
    console.log("REACT_APP_STRIPE_PRODUCT_120MIN:", process.env.REACT_APP_STRIPE_PRODUCT_120MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_1200MIN:", process.env.REACT_APP_STRIPE_PRODUCT_1200MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_UNLIMITED:", process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED);
    console.log("REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED:", process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED);
  }, []);

  // 時間（秒）を mm:ss 形式に変換する関数
  const formatTime = (seconds) => {
    const sec = Math.floor(Number(seconds));
    const minutes = Math.floor(sec / 60);
    const remainingSeconds = sec % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // 各種スタイル定義
  const styles = {
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
      transition: "transform 0.5s ease-out",
      transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
    },
    // 「議事録リスト」ボタン（黄色表記・左詰め）
    minutesListButton: {
      background: "none",
      border: "none",
      color: "white",
      padding: "10px 0",
      fontSize: "16px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      textAlign: "left",
      marginBottom: "16px",
    },
    // 「アイテムを購入」ボタン（黄色表記・左詰め）
    purchaseButton: {
      background: "none",
      border: "none",
      color: "yellow",
      padding: "10px 0",
      fontSize: "16px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      textAlign: "left",
      marginBottom: "16px",
    },
    // 「議事録フォーマット」ボタン
    formatButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      padding: "10px 0",
      fontSize: "16px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      textAlign: "left",
    },
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
      width: "450px",
      height: "500px",
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
      // 今回はアイコンボタン用に背景・境界線を除去
      background: "none",
      border: "none",
      cursor: "pointer",
      fontFamily: "Impact, sans-serif",
    },
    // グラデーションリング用の外側の円
    profileCircle: {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: "80vw",
      height: "80vw",
      maxWidth: "320px",
      maxHeight: "320px",
      borderRadius: "50%",
      background: "linear-gradient(to bottom right, rgb(153, 184, 255), rgba(115, 115, 255, 1), rgba(102, 38, 153, 1), rgb(95, 13, 133), rgba(255, 38, 38, 1), rgb(199, 42, 76))",
      padding: "10px", // リングの太さ調整用
      boxSizing: "border-box",
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    // innerCircle：overLay背景色と同じ色で塗り潰し、リングに見せる
    innerCircle: {
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      background: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    profileInfo: {
      textAlign: "center",
      fontSize: "16px",
      color: "#FFF",
      fontFamily: "Impact, sans-serif",
    },
    // 右下に配置する Privacy Policy / Terms of Use 用コンテナ
    policyButtonContainer: {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
    },
    // 小さめのボタンスタイル
    policyButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      fontSize: "14px",
      cursor: "pointer",
      padding: "4px 8px",
    },
    // 新規：トップ行のコンテナ（上段ヘッダー）
    topRow: {
      position: "relative",
      width: "100%",
      height: "50px",
      marginBottom: "16px",
    },
    // 新規：アクションメニュー用スタイル
    actionMenu: {
      position: "absolute",
      top: "40px",
      right: "10px",
      backgroundColor: "#FFF",
      color: "#000",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      zIndex: 1500,
    },
    actionMenuItem: {
      padding: "8px 12px",
      cursor: "pointer",
      borderBottom: "1px solid #eee",
    },
  };

  // クリックイベントのバブリング防止用
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // ハンバーガーボタン押下時の処理
  const handleHamburgerClick = () => {
    setShowSideMenu(!showSideMenu);
  };

  // Edit Profile 処理（window.promptを利用してユーザー名更新）
  const handleEditProfile = async () => {
    setShowActionMenu(false);
    const newUserName = window.prompt("Enter new username:");
    if (newUserName) {
      try {
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, { userName: newUserName }, { merge: true });
        alert("Username updated successfully.");
      } catch (error) {
        console.error("Error updating username:", error);
        alert("Error updating username.");
      }
    }
  };

  // Logout 処理
  const handleLogout = async () => {
    setShowActionMenu(false);
    if (window.confirm("ログアウトしますか？")) {
      try {
        await auth.signOut();
        setShowProfileOverlay(false);
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
  };

  // Delete account 処理
  const handleDeleteAccount = async () => {
    setShowActionMenu(false);
    if (window.confirm("本当にアカウントを削除しますか？ この操作は元に戻せません。")) {
      try {
        // Firestoreからユーザーデータ削除
        await deleteDoc(doc(db, "users", userId));
        // Authenticationからユーザー削除
        if (auth.currentUser) {
          await auth.currentUser.delete();
        }
        setShowProfileOverlay(false);
        navigate("/");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("アカウント削除に失敗しました。");
      }
    }
  };

  return (
    <>
      {/* サイドメニューが閉じている場合のみハンバーガーアイコンを表示 */}
      { !showSideMenu && (
        <button style={styles.hamburgerButton} onClick={handleHamburgerClick}>
          <GiHamburgerMenu size={30} />
        </button>
      )}

      {/* サイドメニュー用オーバーレイ */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* 新規：上段ヘッダー（中央：サービスと料金表、右：人アイコン） */}
            <div style={styles.topRow}>
              <button
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/seo");
                }}
              >
                サービスと料金表
              </button>
              <button
                style={{
                  position: "absolute",
                  right: 0,
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "30px",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setShowSideMenu(false);
                  if (userId) {
                    setShowProfileOverlay(true);
                  } else {
                    navigate("/login");
                  }
                }}
              >
                <IoPersonCircleOutline size={30} />
              </button>
            </div>

            {/* 以下、縦並びのメニュー項目 */}
            <button
              style={styles.minutesListButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) {
                  navigate("/minutes-list");
                } else {
                  navigate("/login");
                }
              }}
            >
              <PiGridFourFill style={{ marginRight: "8px" }} />
              議事録リスト
            </button>

            <button
              style={styles.purchaseButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) {
                  navigate("/buy-tickets");
                } else {
                  navigate("/login");
                }
              }}
            >
              <FaTicketAlt style={{ marginRight: "8px" }} />
              アイテムを購入
            </button>

            <button
              style={styles.formatButton}
              onClick={() => {
                setShowSideMenu(false);
                navigate("/meeting-formats");
              }}
            >
              <BsWrenchAdjustable style={{ marginRight: "8px" }} />
              議事録フォーマット
            </button>

            {/* 右下に配置する小サイズのポリシーボタン群 */}
            <div style={styles.policyButtonContainer}>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/terms-of-use");
                }}
              >
                Terms of Use
              </button>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/privacy-policy");
                }}
              >
                Privacy Policy
              </button>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/transactions-law");
                }}
              >
                特定商取引法に基づく表記
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プロフィールオーバーレイ */}
      {showProfileOverlay && (
        <div
          style={styles.profileOverlay}
          onClick={() => {
            setShowProfileOverlay(false);
            setShowActionMenu(false);
          }}
        >
          <div style={styles.profileModal} onClick={stopPropagation}>
            {/* 右上のアイコンボタン */}
            <button
              style={styles.logoutButton}
              onClick={(e) => {
                e.stopPropagation();
                setShowActionMenu(!showActionMenu);
              }}
            >
              <HiOutlineDotsCircleHorizontal size={30} />
            </button>
            {/* アクション選択メニュー */}
            {showActionMenu && (
              <div style={styles.actionMenu}>
                <div style={styles.actionMenuItem} onClick={handleEditProfile}>
                  Edit Profile
                </div>
                <div style={styles.actionMenuItem} onClick={handleLogout}>
                  Logout
                </div>
                <div style={{ ...styles.actionMenuItem, borderBottom: "none" }} onClick={handleDeleteAccount}>
                  Delete account
                </div>
              </div>
            )}
            {/* グラデーションリングとしての外側の円と、内側の innerCircle */}
            <div style={styles.profileCircle}>
              <div style={styles.innerCircle}>
                <div style={styles.profileInfo}>
                  <p>Email: {userEmail}</p>
                  {subscription ? (
                    <p>unlimited</p>
                  ) : (
                    <p>Remaining Time: {profileRemainingSeconds !== null ? formatTime(profileRemainingSeconds) : "00:00"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PurchaseMenu;
