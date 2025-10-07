import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
// Firebase-related
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
// Icon components
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FaTicketAlt, FaCircle } from "react-icons/fa";
import { BsWrenchAdjustable } from "react-icons/bs";
import { CiGlobe } from "react-icons/ci";
import { PiGridFourFill } from "react-icons/pi";
import { HiOutlineDotsCircleHorizontal } from "react-icons/hi";

export default function PurchaseMenu() {
  // 各種 state 定義
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [profileRemainingSeconds, setProfileRemainingSeconds] = useState(null);
  const [subscription, setSubscription] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const router = useRouter();
  const { t, i18n } = useTranslation();

  // アラビア語の場合に dir="rtl" を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // ウィンドウサイズ監視
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    // 初回レンダリング時に設定
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Firebase 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
        console.log("✅ Firebase logged-in user UID:", user.uid);
      } else {
        setUserId(null);
        setUserEmail(null);
        console.log("❌ User is logged out.");
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore からユーザーデータの取得
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
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [userId]);

  // 環境変数のチェック（デバッグ用）
  useEffect(() => {
    console.log("🔍 Environment Variable Check:");
    console.log("REACT_APP_STRIPE_PRODUCT_120MIN:", process.env.REACT_APP_STRIPE_PRODUCT_120MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_1200MIN:", process.env.REACT_APP_STRIPE_PRODUCT_1200MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_UNLIMITED:", process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED);
    console.log("REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED:", process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED);
  }, []);

  // 時間（秒）を mm:ss にフォーマットする関数
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
      color: "#000000",   // ← ここを白(#FFFFFF)から黒(#000000)へ
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
    purchaseButton: {
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
      marginBottom: "16px",
    },
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
    policyButtonContainer: {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
    },
    policyButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      fontSize: "14px",
      cursor: "pointer",
      padding: "4px 8px",
    },
    topRow: {
      position: "relative",
      width: "100%",
      height: "50px",
      marginBottom: "16px",
    },
    actionMenu: {
      position: "absolute",
      top: "40px",
      right: "10px",
      backgroundColor: "#000",
      color: "#FFF",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      zIndex: 1500,
    },
    actionMenuItem: {
      padding: "8px 12px",
      cursor: "pointer",
      borderBottom: "1px solid #333",
    },
    unlimitedText: {
      fontSize: "32px",
      fontWeight: "bold",
      background: "linear-gradient(90deg, rgb(153, 184, 255), rgba(115, 115, 255, 1), rgba(102, 38, 153, 1), rgb(95, 13, 133), rgba(255, 38, 38, 1), rgb(199, 42, 76))",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
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
      background: "none",
      border: "none",
      cursor: "pointer",
      fontFamily: "Impact, sans-serif",
      color: "#FFF"
    },
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
      padding: "10px",
      boxSizing: "border-box",
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
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
  };

  // イベントの伝播を防止
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // ハンバーガーメニューの切替処理
  const handleHamburgerClick = () => {
    setShowSideMenu(!showSideMenu);
  };

  // プロフィール編集（window.prompt を利用）
  const handleEditProfile = async () => {
    setShowActionMenu(false);
    const newUserName = window.prompt(t("Enter new username:"));
    if (newUserName) {
      try {
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, { userName: newUserName }, { merge: true });
        alert(t("Username updated successfully."));
      } catch (error) {
        console.error("Error updating username:", error);
        alert(t("Error updating username:"));
      }
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    setShowActionMenu(false);
    if (window.confirm(t("Are you sure you want to log out?"))) {
      try {
        await auth.signOut();
        localStorage.setItem("guestRemainingSeconds", "180");
        setShowProfileOverlay(false);
        window.location.reload();
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
  };

  // アカウント削除処理
  const handleDeleteAccount = async () => {
    setShowActionMenu(false);
    if (
      window.confirm(
        t("Are you sure you want to delete your account? This action cannot be undone.")
      )
    ) {
      try {
        await deleteDoc(doc(db, "users", userId));
        if (auth.currentUser) {
          await auth.currentUser.delete();
        }
        setShowProfileOverlay(false);
        router.push("/");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert(t("Failed to delete account."));
      }
    }
  };

  // サブスクリプション解約処理
const handleCancelSubscription = async () => {
  setShowActionMenu(false);
  if (!userId) {
    alert(t("You must be logged in."));
    return;
  }

  const confirm = window.confirm(t("Are you sure you want to cancel your subscription?"));
  if (!confirm) return;

  try {
    // ① subscriptionId を取得
    const subRes = await fetch("/api/get-subscription-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const subData = await subRes.json();

    if (!subRes.ok || !subData.subscriptionId) {
      throw new Error(subData.error || "Failed to retrieve subscription ID.");
    }

    // ② 解約リクエストを送信
    const cancelRes = await fetch("/api/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: subData.subscriptionId }),
    });
    const cancelData = await cancelRes.json();

    if (!cancelRes.ok) {
      throw new Error(cancelData.error || "Failed to cancel subscription.");
    }

    alert(t("Your subscription has been scheduled for cancellation."));
    setSubscription(true); // 解約予約中のままにする
    setShowProfileOverlay(false);
  } catch (err) {
    console.error("❌ Subscription cancellation failed:", err);
    alert(t("An error occurred while canceling your subscription. Contact: info@sense-ai.world"));
  }
};


  return (
    <>
      {/* ハンバーガーアイコン（サイドメニューが非表示の場合のみ） */}
      {!showSideMenu && (
        <button style={styles.hamburgerButton} onClick={handleHamburgerClick}>
  <GiHamburgerMenu
    size={30}
    color="#000000"
    style={{ transform: 'scaleX(1.2)', transformOrigin: 'center' }}
  />
</button>

      )}

      {/* サイドメニューオーバーレイ */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* トップ行（中央： "Services and Pricing"、右：プロフィールアイコン） */}
            <div style={styles.topRow}>
              <button
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/home");
                }}
              >
                {t("Services and Pricing")}
              </button>
              <button
                style={{
                  position: "absolute",
                  right: 0,
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "30px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setShowSideMenu(false);
                  if (userId) {
                    setShowProfileOverlay(true);
                  } else {
                    router.push("/login");
                  }
                }}
              >
                <IoPersonCircleOutline size={30} />
              </button>
            </div>

            {/* 縦並びメニュー */}
            <button
              style={styles.minutesListButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) {
                  router.push("/minutes-list");
                } else {
                  router.push("/login");
                }
              }}
            >
              <PiGridFourFill style={{ marginRight: "8px" }} />
              {t("Minutes List")}
            </button>

            <button
              style={styles.purchaseButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) {
                  router.push("/buy-tickets");
                } else {
                  router.push("/login");
                }
              }}
            >
              <FaTicketAlt style={{ marginRight: "8px" }} />
              {t("Purchase Items")}
            </button>

            {/* <button
              style={styles.formatButton}
              onClick={() => {
                setShowSideMenu(false);
                router.push("/meeting-formats");
              }}
            >
              <BsWrenchAdjustable style={{ marginRight: "8px" }} />
              {t("Minutes Formats")}
            </button> */}


            {/* <button
              style={styles.formatButton}
              onClick={() => {
                setShowSideMenu(false);
                router.push("/ai-news");
              }}
            >
              <CiGlobe style={{ marginRight: "8px" }} />
              {t("AI News")}
            </button> */}

            {/* Policy ボタン（右下） */}
            <div style={styles.policyButtonContainer}>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/terms-of-use");
                }}
              >
                {t("Terms of Use")}
              </button>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/privacy-policy");
                }}
              >
                {t("Privacy Policy")}
              </button>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/transactions-law");
                }}
              >
                {t("Legal Notice - Japan Only")}
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
            {/* 右上アイコンボタン */}
            <button
              style={styles.logoutButton}
              onClick={(e) => {
                e.stopPropagation();
                setShowActionMenu(!showActionMenu);
              }}
            >
              <HiOutlineDotsCircleHorizontal size={30} />
            </button>
            {/* アクションメニュー */}
            {showActionMenu && (
              <div style={styles.actionMenu}>
                <div style={styles.actionMenuItem} onClick={handleEditProfile}>
                  {t("Edit Profile")}
                </div>
                <div style={styles.actionMenuItem} onClick={handleLogout}>
                  {t("Logout")}
                </div>
                <div
                  style={{ ...styles.actionMenuItem, borderBottom: "none" }}
                  onClick={handleDeleteAccount}
                >
                  {t("Delete account")}
                </div>
                <div style={styles.actionMenuItem} onClick={handleCancelSubscription}>
  {t("Cancel Subscription")}
</div>

              </div>
            )}
            {/* 外側のグラデーションリングと内側の円 */}
            <div style={styles.profileCircle}>
              <div style={styles.innerCircle}>
                <div style={styles.profileInfo}>
                  <p>{t("Email")}: {userEmail}</p>
                  {subscription ? (
                    <p style={styles.unlimitedText}>{t("unlimited")}</p>
                  ) : (
                    <p>{t("Remaining Time:")}{" "}
                      {profileRemainingSeconds !== null ? formatTime(profileRemainingSeconds) : "00:00"}
                    </p>
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
