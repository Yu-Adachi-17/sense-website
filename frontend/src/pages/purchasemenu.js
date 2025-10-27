// src/pages/purchasemenu.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

// ✅ Firebase（SSR安全化）
import { getClientAuth, getDb } from "../firebaseConfig";

// Icon components
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FaTicketAlt } from "react-icons/fa";
import { BsWrenchAdjustable } from "react-icons/bs";
import { CiGlobe } from "react-icons/ci";
import { PiGridFourFill } from "react-icons/pi";
// ※ HiOutlineDotsCircleHorizontal は廃止
import HomeIcon from "./homeIcon";

export default function PurchaseMenu() {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [profileRemainingSeconds, setProfileRemainingSeconds] = useState(null);
  const [subscription, setSubscription] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);

  const router = useRouter();
  const { t, i18n } = useTranslation();

  // ▼ 英語統一メッセージ（ホバー＆クリック時）
  const IOS_SUBSCRIPTION_NOTE =
    "If you subscribed via the iOS app, please cancel from your iOS device.";

  useEffect(() => {
    document.documentElement.setAttribute(
      "dir",
      i18n.language === "ar" ? "rtl" : "ltr"
    );
  }, [i18n.language]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let unsub;
    let mounted = true;
    (async () => {
      const auth = await getClientAuth();
      if (!mounted || !auth) return;
      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(auth, (user) => {
        if (!mounted) return;
        if (user) {
          setUserId(user.uid);
          setUserEmail(user.email);
        } else {
          setUserId(null);
          setUserEmail(null);
        }
      });
    })();
    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        if (!db || cancelled) return;
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", userId));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          setProfileRemainingSeconds(data.remainingSeconds);
          setSubscription(data.subscription === true);
        }
      } catch (e) {
        console.error("Error fetching user data:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // mm:ss
  const formatTime = (seconds) => {
    const sec = Math.floor(Number(seconds || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const styles = {
    hamburgerButton: {
      position: "fixed",
      top: "20px",
      right: "30px",
      fontSize: "30px",
      background: "none",
      border: "none",
      color: "#000",
      cursor: "pointer",
      zIndex: 1300,
    },
    sideMenuOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
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
      background:
        "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(128,128,128,0.2))",
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
    topPolicyRow: {
      position: "absolute",
      top: "16px",
      right: "16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    minutesListButton: {
      background: "none",
      border: "none",
      color: "white",
      padding: "35px 0",
      fontSize: "16px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      textAlign: "left",
      marginBottom: "0px",
    },
    purchaseButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      padding: "0px 0",
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
    topProfileButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      fontSize: "20px",
      cursor: "pointer",
      padding: "4px 0",
      display: "flex",
      alignItems: "center",
    },

    // ▼ Profile Overlay（白背景＋HomeIcon 背景＋黒文字）
    profileOverlay: {
      position: "fixed",
      inset: 0,
      background: "#fff",
      zIndex: 1400,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    // 背景 HomeIcon（クリック無効）
    overlayBgIcon: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: 1401,
      opacity: 0.08,
    },

    // モーダル本体（薄いグレー枠）
    profileModal: {
      width: "520px",
      minHeight: "380px",
      background: "transparent",
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      padding: "28px",
      boxSizing: "border-box",
      position: "relative",
      zIndex: 1402,
      border: "1px solid #e5e5e5",
      boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
      gap: "20px",
    },

    profileHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      fontWeight: 700,
      fontSize: "18px",
      color: "#111",
    },

    profileInfoCard: {
      background: "#fafafa",
      border: "1px solid #eee",
      borderRadius: "12px",
      padding: "16px 18px",
      display: "grid",
      gridTemplateColumns: "1fr",
      rowGap: "8px",
      color: "#111",
      lineHeight: 1.6,
    },

    infoRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "15px",
    },

    unlimitedText: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#000",
      letterSpacing: "0.2px",
    },

    actionsRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gap: "12px",
    },

    actionButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "12px 14px",
      borderRadius: "10px",
      border: "1px solid #e6e6e6",
      background: "#fff",
      color: "#111",
      fontWeight: 600,
      cursor: "pointer",
      boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
    },

    actionButtonDanger: {
      border: "1px solid #f2c6c6",
      background: "#fff",
      color: "#b00020",
      boxShadow: "0 2px 10px rgba(176,0,32,0.06)",
    },

    // ▼ 完全な正円＆誤操作防止（クリックは情報表示のみ）
    helpBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      borderRadius: "9999px", // 完全な正円
      border: "1px solid #c9c9c9",
      fontSize: "12px",
      fontWeight: 700,
      userSelect: "none",
      cursor: "help",
      color: "#444",
      background: "#fff",
      marginLeft: "6px",
      flex: "0 0 auto",
    },
  };

  const stopPropagation = (e) => e.stopPropagation();

  const handleHamburgerClick = () => setShowSideMenu((v) => !v);

  const handleLogout = async () => {
    if (!window.confirm(t("Are you sure you want to log out?"))) return;
    try {
      const auth = await getClientAuth();
      if (!auth) return;
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      localStorage.setItem("guestRemainingSeconds", "180");
      setShowProfileOverlay(false);
      window.location.reload();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t("Are you sure you want to delete your account? This action cannot be undone."))) return;
    try {
      const db = await getDb();
      const auth = await getClientAuth();
      if (!db || !auth || !userId) return;
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", userId));
      if (auth.currentUser) await auth.currentUser.delete();
      setShowProfileOverlay(false);
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert(t("Failed to delete account."));
    }
  };

  const handleCancelSubscription = async () => {
    if (!userId) return alert(t("You must be logged in."));
    if (!window.confirm(t("Are you sure you want to cancel your subscription?"))) return;
    try {
      const subRes = await fetch("/api/get-subscription-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const subData = await subRes.json();
      if (!subRes.ok || !subData.subscriptionId)
        throw new Error(subData.error || "Failed to retrieve subscription ID.");
      const cancelRes = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subData.subscriptionId }),
      });
      if (!cancelRes.ok) throw new Error((await cancelRes.json()).error || "Failed to cancel subscription.");
      alert(t("Your subscription has been scheduled for cancellation."));
      setSubscription(true);
      setShowProfileOverlay(false);
    } catch (err) {
      console.error("❌ Subscription cancellation failed:", err);
      alert(t("An error occurred while canceling your subscription. Contact: info@sense-ai.world"));
    }
  };

  // 「？」クリック時は Cancel を発火させず、英語メッセージのみ表示
  const handleHelpBadgeClick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // 親ボタン（Cancel）の onClick をブロック
    alert(IOS_SUBSCRIPTION_NOTE);
  };

  const handleHelpBadgeKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      alert(IOS_SUBSCRIPTION_NOTE);
    }
  };

  return (
    <>
      {!showSideMenu && (
        <button style={styles.hamburgerButton} onClick={handleHamburgerClick}>
          <GiHamburgerMenu
            size={30}
            color="#000"
            style={{ transform: "scaleX(1.2)", transformOrigin: "center" }}
          />
        </button>
      )}

      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            <div style={styles.topPolicyRow}>
              <button
                style={styles.topProfileButton}
                onClick={() => {
                  setShowSideMenu(false);
                  if (userId) setShowProfileOverlay(true);
                  else router.push("/login");
                }}
                aria-label="Profile"
                title="Profile"
              >
                {userId ? (
                  <span style={{ display: "inline-flex", width: 30, height: 30 }}>
                    <HomeIcon />
                  </span>
                ) : (
                  <IoPersonCircleOutline size={30} />
                )}
              </button>
            </div>

            <button
              style={styles.minutesListButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) router.push("/minutes-list");
                else router.push("/login");
              }}
            >
              <PiGridFourFill style={{ marginRight: "8px" }} />
              {t("Minutes List")}
            </button>

            <button
              style={styles.purchaseButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) router.push("/upgrade");
                else router.push("/login");
              }}
            >
              <FaTicketAlt style={{ marginRight: "8px" }} />
              {t("Upgrade")}
            </button>

            {/* 復活用メニュー（必要なら） */}
            <button
              style={styles.formatButton}
              onClick={() => {
                setShowSideMenu(false);
                router.push("/meeting-formats");
              }}
            >
              <BsWrenchAdjustable style={{ marginRight: "8px" }} />
              {t("Minutes Formats")}
            </button>
            <button
              style={styles.formatButton}
              onClick={() => {
                setShowSideMenu(false);
                router.push("/ai-news");
              }}
            >
              {/* <CiGlobe style={{ marginRight: "8px" }} />
              {t("AI News")} */}
            </button>

            <div style={styles.policyButtonContainer}>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/home");
                }}
              >
                {t("Services and Pricing")}
              </button>
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
                  router.push("/company");
                }}
              >
                {t("Company")}
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
            // 枠外タップでメインに戻る
            setShowProfileOverlay(false);
            router.push("/");
          }}
        >
          {/* 背景：巨大 HomeIcon（非インタラクティブ） */}
          <div style={styles.overlayBgIcon} aria-hidden="true">
            <HomeIcon size={isMobile ? 520 : 1080} src="/images/home.png" alt="Home (bg)" />
          </div>

          {/* モーダル（クリックを止める） */}
          <div style={styles.profileModal} onClick={stopPropagation}>
            {/* 見出し */}
            <div style={styles.profileHeader}>
              <span>{t("Profile")}</span>
            </div>

            {/* 情報カード */}
            <div style={styles.profileInfoCard}>
              <div style={styles.infoRow}>
                <span>{t("Email")}</span>
                <span>{userEmail}</span>
              </div>
              <div style={styles.infoRow}>
                <span>{t("Plan")}</span>
                <span style={subscription ? styles.unlimitedText : {}}>
                  {subscription ? t("unlimited") : t("Free")}
                </span>
              </div>
              {!subscription && (
                <div style={styles.infoRow}>
                  <span>{t("Remaining Time:")}</span>
                  <span>
                    {profileRemainingSeconds != null ? formatTime(profileRemainingSeconds) : "00:00"}
                  </span>
                </div>
              )}
            </div>

            {/* アクション（ドットメニュー内の項目を常設配置） */}
            <div style={styles.actionsRow}>
              <button style={styles.actionButton} onClick={handleLogout}>
                {t("Logout")}
              </button>

              <button
                style={{ ...styles.actionButton, ...styles.actionButtonDanger }}
                onClick={handleDeleteAccount}
              >
                {t("Delete account")}
              </button>

              <button style={styles.actionButton} onClick={handleCancelSubscription}>
                {t("Cancel Subscription")}
                <span
                  style={styles.helpBadge}
                  title={IOS_SUBSCRIPTION_NOTE}
                  aria-label="iOS subscription cancellation info"
                  role="button"
                  tabIndex={0}
                  onClick={handleHelpBadgeClick}
                  onKeyDown={handleHelpBadgeKey}
                >
                  ?
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: { ...(await serverSideTranslations(locale, ["common"])) },
    revalidate: 60,
  };
}
