// src/pages/purchasemenu.js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

// Firebase（SSR安全化）
import { getClientAuth, getDb } from "../firebaseConfig";

// Icons
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FaTicketAlt } from "react-icons/fa";
import { BsWrenchAdjustable } from "react-icons/bs";
import { PiGridFourFill } from "react-icons/pi";

import HomeIcon from "./homeIcon";

/* ===== API base & JSON helper ===== */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const ct = res.headers.get("content-type") || "";
  if (res.ok) {
    if (ct.includes("application/json")) return res.json();
    const text = await res.text().catch(() => "");
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, text };
    }
  }
  let body = null;
  try {
    body = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {}
  const msg =
    (body && typeof body === "object" && (body.error || body.message)) ||
    (typeof body === "string" ? body.slice(0, 300) : `HTTP ${res.status}`);
  const err = new Error(msg);
  err.status = res.status;
  err.details = body;
  throw err;
}

/* ===== util: Firestore Timestamp/number/string -> Date, and YYYYMMDD ===== */
function toDateLoose(v) {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (typeof v === "number") return new Date(v); // ms epoch
  if (typeof v === "string") return new Date(v); // ISOなど
  return null;
}
function formatYYYYMMDD(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/* ===== prefers-color-scheme (Dark) 検出 ===== */
function usePrefersDark() {
  const [prefersDark, setPrefersDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setPrefersDark(!!e.matches);
    handler(mq);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return prefersDark;
}

export default function PurchaseMenu() {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [profileRemainingSeconds, setProfileRemainingSeconds] = useState(null);
  const [subscription, setSubscription] = useState(false);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState(null);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);

  const router = useRouter();
  const { t, i18n } = useTranslation();

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

  // auth
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

  // user doc 初回ロード
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
          setSubscriptionExpiresAt(toDateLoose(data.subscriptionExpiresAt));
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

  // SwiftUI基準：!isDarkMode（ライト）＝白基調／柔らかい影、isDark＝深いネイビー＋放射光
  const prefersDark = usePrefersDark();

  // スタイル定義（ダーク/ライト分岐）
  const ui = useMemo(() => {
    const isDark = !!prefersDark;

    const brandBlue = "#1565C0";
    const brandBlueDark = "#0D47A1";
    const chipBgLight = "#E3F2FD";

    const base = {
      z: { menu: 1200, overlay: 1100, trigger: 1300, profile: 1400 },
      radius: 16,
      ease: "cubic-bezier(.2,.7,.2,1)",
    };

    return {
      isDark,
      // ハンバーガー
      hamburgerButton: {
        position: "fixed",
        top: 20,
        right: 30,
        fontSize: 30,
        background: "none",
        border: "none",
        color: isDark ? "#FFF" : "#000",
        cursor: "pointer",
        zIndex: base.trigger,
        WebkitTapHighlightColor: "transparent",
      },
      // フルスクリーン半透明オーバーレイ
      sideMenuOverlay: {
        position: "fixed",
        inset: 0,
        background: isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.38)",
        zIndex: base.overlay,
        display: showSideMenu ? "block" : "none",
        transition: `opacity .35s ${base.ease}`,
        opacity: showSideMenu ? 1 : 0,
        backdropFilter: isDark ? "blur(2px)" : "blur(1.5px)",
      },
      // スライドメニュー本体
      sideMenu: {
        position: "fixed",
        top: 0,
        right: 0,
        width: isMobile ? "66.66%" : "36%",
        maxWidth: 560,
        minWidth: 320,
        height: "100%",
        color: isDark ? "#FFF" : "#0A0F1B",
        padding: "22px 18px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        zIndex: base.menu,
        transition: `transform .45s ${base.ease}`,
        transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
        // 背景（ダーク：深いグラデ＋放射、ライト：白の僅かなグラデ）
        background: isDark
          ? "linear-gradient(135deg, rgba(5,12,18,1) 0%, rgba(11,21,35,1) 65%)"
          : "linear-gradient(145deg, #FFFFFF 0%, rgba(255,255,255,0.98) 80%)",
        boxShadow: isDark
          ? "0 14px 28px rgba(0,0,0,0.45), 0 10px 10px rgba(0,0,0,0.25)"
          : "0 18px 42px rgba(0,0,0,0.06), 0 10px 20px rgba(0,0,0,0.04)",
      },
      // 放射光（視覚のみ）
      sideMenuRadial: {
        position: "absolute",
        inset: 0,
        background: isDark
          ? "radial-gradient(800px 500px at 95% 5%, rgba(56,137,255,0.22), transparent 60%)"
          : "linear-gradient(to right, rgba(0,0,0,0.02), transparent 35%)",
        pointerEvents: "none",
      },
      topRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
        marginBottom: 8,
      },
      topProfileButton: {
        background: "none",
        border: "none",
        color: isDark ? "#FFF" : "#111",
        fontSize: 20,
        cursor: "pointer",
        padding: "4px 0",
        display: "flex",
        alignItems: "center",
      },
      // 区切り線
      divider: {
        width: "100%",
        height: 1,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
        margin: "8px 0 14px",
      },
      // 行（カード）共通
      rowCard: {
        borderRadius: base.radius,
        background: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
        border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
        padding: "12px 10px",
        margin: "10px 6px 12px 6px",
        boxShadow: isDark
          ? "0 10px 22px rgba(0,0,0,0.35)"
          : "0 6px 16px rgba(0,0,0,0.05)",
        transform: "translateZ(0)",
        transition: "transform .2s ease, box-shadow .2s ease",
        cursor: "pointer",
      },
      rowCardHover: {
        transform: "translateY(-2px)",
        boxShadow: isDark
          ? "0 14px 28px rgba(0,0,0,0.45)"
          : "0 10px 24px rgba(0,0,0,0.08)",
      },
      // アイコンバッジ
      iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: isDark ? "rgba(255,255,255,0.06)" : chipBgLight,
        border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.04)",
        flex: "0 0 44px",
      },
      rowTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: isDark ? "#FFF" : "#0A0F1B",
      },
      row: {
        display: "flex",
        alignItems: "center",
        gap: 12,
      },
      rowTrailing: {
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      },
      // ポリシーリンク群
      policyButtonContainer: {
        marginTop: "auto",
        display: "grid",
        justifyContent: "end",
        gap: 6,
        padding: "14px 8px 8px 8px",
      },
      policyButton: {
        background: "none",
        border: "none",
        textAlign: "right",
        fontSize: 14,
        cursor: "pointer",
        padding: "4px 8px",
        color: isDark ? "rgba(255,255,255,0.9)" : "#0A0F1B",
        opacity: isDark ? 0.9 : 0.9,
      },
      // Profile Overlay
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
      profileModal: {
        width: 520,
        minHeight: 380,
        background: "transparent",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: 28,
        boxSizing: "border-box",
        position: "relative",
        zIndex: 1402,
        border: "1px solid #e5e5e5",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
        gap: 20,
      },
      profileHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontWeight: 700,
        fontSize: 18,
        color: "#111",
      },
      profileInfoCard: {
        background: "#fafafa",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: "16px 18px",
        display: "grid",
        gridTemplateColumns: "1fr",
        rowGap: 8,
        color: "#111",
        lineHeight: 1.6,
      },
      infoRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 15,
      },
      unlimitedText: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#000",
        letterSpacing: "0.2px",
      },
      actionsRow: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
        gap: 12,
      },
      actionButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 10,
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
      helpBadge: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 9999,
        border: "1px solid #c9c9c9",
        fontSize: 12,
        fontWeight: 700,
        userSelect: "none",
        cursor: "help",
        color: "#444",
        background: "#fff",
        marginLeft: 6,
        flex: "0 0 auto",
      },
      cancelStatusWrap: {
        marginTop: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      },
      cancelStatusLine: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: "#166534",
        fontWeight: 700,
      },
      cancelStatusSub: { fontSize: 12, color: "#166534", opacity: 0.9, fontWeight: 600 },
      checkIcon: { width: 18, height: 18, flex: "0 0 auto" },

      // ライト時の左エッジ薄グラ（視覚足し）
      lightEdge: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 16,
        background: "linear-gradient(90deg, rgba(0,0,0,0.02), transparent)",
        pointerEvents: "none",
      },

      // 色ユーティリティ
      brandBlue,
      brandBlueDark,
    };
  }, [prefersDark, isMobile, showSideMenu]);

  const stopPropagation = (e) => e.stopPropagation();

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
    if (
      !window.confirm(
        t("Are you sure you want to delete your account? This action cannot be undone.")
      )
    )
      return;
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
      const subData = await fetchJson(`${API_BASE}/api/get-subscription-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Log": "1" },
        body: JSON.stringify({ userId }),
      });
      if (!subData?.subscriptionId)
        throw new Error(subData?.error || "Failed to retrieve subscription ID.");

      const cancelRes = await fetchJson(`${API_BASE}/api/cancel-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Log": "1" },
        body: JSON.stringify({ subscriptionId: subData.subscriptionId }),
      });

      setSubscription(true);
      if (cancelRes?.current_period_end) {
        const d = toDateLoose(cancelRes.current_period_end);
        setSubscriptionExpiresAt(d);
      }
      setShowProfileOverlay(false);
      alert(t("Your subscription has been scheduled for cancellation."));
    } catch (err) {
      console.error("Subscription cancellation failed:", err);
      alert(
        err?.message ||
          t("An error occurred while canceling your subscription. Contact: info@sense-ai.world")
      );
    }
  };

  // 行カードの小コンポーネント（SwiftUI MenuRow 相当）
  const MenuRow = ({ icon, iconColor, title, onClick, trailing, disabled }) => {
    const [hover, setHover] = useState(false);
    return (
      <div
        role="button"
        tabIndex={0}
        aria-disabled={!!disabled}
        onClick={() => !disabled && onClick?.()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) onClick?.();
        }}
        style={{
          ...ui.rowCard,
          ...(hover && !disabled ? ui.rowCardHover : null),
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={ui.row}>
          <div style={ui.iconBadge}>
            {icon({ size: 22, color: iconColor })}
          </div>
          <div style={ui.rowTitle}>{title}</div>
          <div style={ui.rowTrailing}>{trailing}</div>
        </div>
      </div>
    );
  };

  const RecordingDot = () => (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: "orange",
        boxShadow: "0 0 8px rgba(255,165,0,0.6)",
        display: "inline-block",
      }}
    />
  );

  return (
    <>
      {!showSideMenu && (
        <button
          style={ui.hamburgerButton}
          onClick={() => setShowSideMenu((v) => !v)}
          aria-label="Open menu"
          title="Menu"
        >
          <GiHamburgerMenu
            size={30}
            color={ui.isDark ? "#FFF" : "#000"}
            style={{ transform: "scaleX(1.2)", transformOrigin: "center" }}
          />
        </button>
      )}

      {showSideMenu && (
        <div style={ui.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={ui.sideMenu} onClick={stopPropagation}>
            {/* 視覚オーバーレイ */}
            <div style={ui.sideMenuRadial} aria-hidden />

            {/* Top row（プロフィール） */}
            <div style={ui.topRow}>
              <button
                style={ui.topProfileButton}
                onClick={() => {
                  setShowSideMenu(false);
                  if (userId) setShowProfileOverlay(true);
                  else router.push("/login");
                }}
                aria-label="Profile"
                title="Profile"
              >
                {userId ? (
                  <span style={{ display: "inline-flex", width: 34, height: 34 }}>
                    <HomeIcon />
                  </span>
                ) : (
                  <IoPersonCircleOutline size={30} />
                )}
              </button>
            </div>

            <div style={ui.divider} />

            {/* 行カード：Minutes List */}
            <MenuRow
              icon={(props) => <PiGridFourFill {...props} />}
              iconColor={ui.isDark ? "rgba(0,255,255,0.9)" : ui.brandBlueDark}
              title={t("Minutes List")}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) router.push("/minutes-list");
                else router.push("/login");
              }}
            />

            {/* 行カード：Upgrade */}
            <MenuRow
              icon={(props) => <FaTicketAlt {...props} />}
              iconColor={"orange"}
              title={t("Upgrade")}
              trailing={null}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) router.push("/upgrade");
                else router.push("/login");
              }}
            />

            {/* 行カード：Minutes Formats */}
            <MenuRow
              icon={(props) => <BsWrenchAdjustable {...props} />}
              iconColor={ui.isDark ? "rgba(0,255,255,0.9)" : ui.brandBlueDark}
              title={t("Minutes Formats")}
              onClick={() => {
                setShowSideMenu(false);
                router.push("/meeting-formats");
              }}
            />

            {/* 例：録音中インジケータを trailing に出したい場合（必要なら）
            <MenuRow
              icon={(props) => <FaMicrophone {...props} />}
              iconColor={"crimson"}
              title={"Recording"}
              trailing={<RecordingDot />}
              disabled
              onClick={() => {}}
            />
            */}

            {/* 下部リンク群（Services… / Terms / Privacy / Company） */}
            {!ui.isDark && <div style={ui.lightEdge} aria-hidden />}
            <div style={ui.policyButtonContainer}>
              <button
                style={ui.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/home");
                }}
              >
                {t("Services and Pricing")}
              </button>
              <button
                style={ui.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/terms-of-use");
                }}
              >
                {t("Terms of Use")}
              </button>
              <button
                style={ui.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  router.push("/privacy-policy");
                }}
              >
                {t("Privacy Policy")}
              </button>
              <button
                style={ui.policyButton}
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

      {/* Profile overlay */}
      {showProfileOverlay && (
        <div
          style={ui.profileOverlay}
          onClick={() => {
            setShowProfileOverlay(false);
            router.push("/");
          }}
        >
          <div style={ui.overlayBgIcon} aria-hidden="true">
            <HomeIcon size={isMobile ? 520 : 1080} src="/images/home.png" alt="Home (bg)" />
          </div>

          <div style={ui.profileModal} onClick={stopPropagation}>
            <div style={ui.profileHeader}>
              <span>{t("Profile")}</span>
            </div>

            <div style={ui.profileInfoCard}>
              <div style={ui.infoRow}>
                <span>{t("Email")}</span>
                <span>{userEmail}</span>
              </div>
              <div style={ui.infoRow}>
                <span>{t("Plan")}</span>
                <span style={subscription ? ui.unlimitedText : {}}>
                  {subscription ? t("unlimited") : t("Free")}
                </span>
              </div>
              {!subscription && (
                <div style={ui.infoRow}>
                  <span>{t("Remaining Time:")}</span>
                  <span>
                    {profileRemainingSeconds != null
                      ? formatTime(profileRemainingSeconds)
                      : "00:00"}
                  </span>
                </div>
              )}
            </div>

            <div style={ui.actionsRow}>
              <button style={ui.actionButton} onClick={handleLogout}>
                {t("Logout")}
              </button>

              <button
                style={{ ...ui.actionButton, ...ui.actionButtonDanger }}
                onClick={handleDeleteAccount}
              >
                {t("Delete account")}
              </button>

              {/* Cancel Subscription */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button style={ui.actionButton} onClick={handleCancelSubscription}>
                  {t("Cancel Subscription")}
                  <span
                    style={ui.helpBadge}
                    title={IOS_SUBSCRIPTION_NOTE}
                    aria-label="iOS subscription cancellation info"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      alert(IOS_SUBSCRIPTION_NOTE);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        alert(IOS_SUBSCRIPTION_NOTE);
                      }
                    }}
                  >
                    ?
                  </span>
                </button>

                {subscriptionExpiresAt && (
                  <div style={ui.cancelStatusWrap}>
                    <div style={ui.cancelStatusLine}>
                      <svg viewBox="0 0 24 24" style={ui.checkIcon} aria-hidden="true">
                        <circle cx="12" cy="12" r="11" fill="#22c55e" />
                        <path
                          d="M7 12.5l3.2 3.2L17 8.9"
                          stroke="#fff"
                          strokeWidth="2.2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Cancellation scheduled</span>
                    </div>
                    <div style={ui.cancelStatusSub}>
                      {`Valid until ${formatYYYYMMDD(subscriptionExpiresAt)}`}
                    </div>
                  </div>
                )}
              </div>
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
