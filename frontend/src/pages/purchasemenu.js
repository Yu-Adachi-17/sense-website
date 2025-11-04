// src/pages/purchasemenu.js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getClientAuth, getDb } from "../firebaseConfig";

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
    try { return JSON.parse(text); } catch { return { ok: true, text }; }
  }
  let body = null;
  try { body = ct.includes("application/json") ? await res.json() : await res.text(); } catch {}
  const msg =
    (body && typeof body === "object" && (body.error || body.message)) ||
    (typeof body === "string" ? body.slice(0, 300) : `HTTP ${res.status}`);
  const err = new Error(msg);
  err.status = res.status;
  err.details = body;
  throw err;
}

/* ===== util ===== */
function toDateLoose(v) {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") return new Date(v);
  return null;
}
function formatYYYYMMDD(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// 親への通知は廃止（SideMenu 内で完結して薄い影のみ敷く）
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

  // dir 切替のみ維持
  useEffect(() => {
    try {
      document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
    } catch {}
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

  // user doc
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
    return () => { cancelled = true; };
  }, [userId]);

  const ui = useMemo(() => {
    const chipBgLight = "#E3F2FD";
    const base = { z: { menu: 1200, overlay: 1100, trigger: 1300 }, radius: 16, ease: "cubic-bezier(.2,.7,.2,1)" };

    return {
      hamburgerButton: {
        position: "fixed", top: 20, right: 30, fontSize: 30,
        background: "none", border: "none", color: "#000",
        cursor: "pointer", zIndex: base.trigger, WebkitTapHighlightColor: "transparent",
      },
      // “薄い影”だけ：半透明の黒。演出最小、互換性最優先。クリックで閉じられるよう pointer-events を有効化。
      sideMenuOverlay: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.12)", // ← 薄い影
        zIndex: base.overlay,
        display: showSideMenu ? "block" : "none",
        transition: `opacity .25s ${base.ease}`,
        opacity: showSideMenu ? 1 : 0,
      },
      sideMenu: {
        position: "fixed", top: 0, right: 0,
        width: isMobile ? "66.66%" : "36%", maxWidth: 560, minWidth: 320,
        height: "100%",
        color: "#0A0F1B",
        padding: "22px 18px", boxSizing: "border-box",
        display: "flex", flexDirection: "column", alignItems: "stretch",
        zIndex: base.menu, transition: `transform .30s ${base.ease}`,
        transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
        background: "#FFFFFF",
        boxShadow: "0 18px 42px rgba(0,0,0,0.08), 0 10px 20px rgba(0,0,0,0.06)",
      },
      topRow: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 8 },
      topProfileButton: { background: "none", border: "none", color: "#111", fontSize: 20, cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center" },
      divider: { width: "100%", height: 1, background: "rgba(0,0,0,0.08)", margin: "8px 0 14px" },

      rowCard: {
        borderRadius: base.radius, background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.04)", padding: "12px 10px",
        margin: "10px 6px 12px 6px",
        boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
        transform: "translateZ(0)", transition: "transform .2s ease, box-shadow .2s ease",
        cursor: "pointer",
      },
      rowCardHover: { transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(0,0,0,0.08)" },
      iconBadge: { width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: chipBgLight, border: "1px solid rgba(0,0,0,0.04)", flex: "0 0 44px" },
      rowTitle: { fontSize: 14, fontWeight: 600, color: "#0A0F1B" },
      row: { display: "flex", alignItems: "center", gap: 12 },
      rowTrailing: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 },

      policyButtonContainer: { marginTop: "auto", display: "grid", justifyContent: "end", gap: 6, padding: "14px 8px 8px 8px" },
      policyButton: { background: "none", border: "none", textAlign: "right", fontSize: 14, cursor: "pointer", padding: "4px 8px", color: "#0A0F1B", opacity: 0.9 },

      profileOverlay: { position: "fixed", inset: 0, background: "#fff", zIndex: 1400, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" },
      overlayBgIcon: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1401, opacity: 0.08 },
      profileModal: {
        width: 520, minHeight: 380, background: "transparent", borderRadius: 12, display: "flex",
        flexDirection: "column", alignItems: "stretch", padding: 28, boxSizing: "border-box",
        position: "relative", zIndex: 1402, border: "1px solid #e5e5e5",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)", gap: 20,
      },
      profileHeader: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 700, fontSize: 18, color: "#111" },
      profileInfoCard: { background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr", rowGap: 8, color: "#111", lineHeight: 1.6 },
      infoRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15 },
      unlimitedText: { fontSize: 28, fontWeight: "bold", color: "#000", letterSpacing: "0.2px" },
      actionsRow: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 },
      actionButton: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 10, border: "1px solid #e6e6e6", background: "#fff", color: "#111", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" },
      actionButtonDanger: { border: "1px solid #f2c6c6", background: "#fff", color: "#b00020", boxShadow: "0 2px 10px rgba(176,0,32,0.06)" },
      helpBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 9999, border: "1px solid #c9c9c9", fontSize: 12, fontWeight: 700, userSelect: "none", cursor: "help", color: "#444", background: "#fff", marginLeft: 6, flex: "0 0 auto" },
      cancelStatusWrap: { marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
      cancelStatusLine: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#166534", fontWeight: 700 },
      cancelStatusSub: { fontSize: 12, color: "#166534", opacity: 0.9, fontWeight: 600 },
      checkIcon: { width: 18, height: 18, flex: "0 0 auto" },
    };
  }, [isMobile, showSideMenu]);

  const stopPropagation = (e) => e.stopPropagation();

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    try {
      const auth = await getClientAuth();
      if (!auth) return;
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      localStorage.setItem("guestRemainingSeconds", "180");
      setShowProfileOverlay(false);
      window.location.reload();
    } catch (error) { console.error("Error during logout:", error); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
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
      alert("Failed to delete account.");
    }
  };

  const handleCancelSubscription = async () => {
    if (!userId) return alert("You must be logged in.");
    if (!window.confirm("Are you sure you want to cancel your subscription?")) return;
    try {
      const subData = await fetchJson(`${API_BASE}/api/get-subscription-id`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Log": "1" },
        body: JSON.stringify({ userId }),
      });
      if (!subData?.subscriptionId) throw new Error(subData?.error || "Failed to retrieve subscription ID.");

      const cancelRes = await fetchJson(`${API_BASE}/api/cancel-subscription`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Log": "1" },
        body: JSON.stringify({ subscriptionId: subData.subscriptionId }),
      });

      setSubscription(true);
      if (cancelRes?.current_period_end) {
        const d = toDateLoose(cancelRes.current_period_end);
        setSubscriptionExpiresAt(d);
      }
      setShowProfileOverlay(false);
      alert("Your subscription has been scheduled for cancellation.");
    } catch (err) {
      console.error("Subscription cancellation failed:", err);
      alert(err?.message || "An error occurred while canceling your subscription. Contact: info@sense-ai.world");
    }
  };

  // 行カード（MenuRow 相当）
  const MenuRow = ({ icon, iconColor, title, onClick, trailing, disabled }) => {
    const [hover, setHover] = useState(false);
    return (
      <div
        role="button"
        tabIndex={0}
        aria-disabled={!!disabled}
        onClick={() => !disabled && onClick?.()}
        onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) onClick?.(); }}
        style={{
          ...ui.rowCard,
          ...(hover && !disabled ? ui.rowCardHover : null),
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={ui.iconBadge}>{icon({ size: 22, color: iconColor })}</div>
          <div style={ui.rowTitle}>{title}</div>
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>{trailing}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      {!showSideMenu && (
        <button
          style={ui.hamburgerButton}
          onClick={() => setShowSideMenu(true)}
          aria-label="Open menu" title="Menu"
        >
          <GiHamburgerMenu size={30} color="#000" style={{ transform: "scaleX(1.2)", transformOrigin: "center" }} />
        </button>
      )}

      {showSideMenu && (
        <div style={ui.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={ui.sideMenu} onClick={stopPropagation}>
            <div style={ui.topRow}>
              <button
                style={ui.topProfileButton}
                onClick={() => {
                  setShowSideMenu(false);
                  if (userId) setShowProfileOverlay(true);
                  else router.push("/login");
                }}
                aria-label="Profile" title="Profile"
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

            <MenuRow
              icon={(p) => <PiGridFourFill {...p} />}
              iconColor={"#0D47A1"}
              title={t("Minutes List")}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) router.push("/minutes-list");
                else router.push("/login");
              }}
            />

            <MenuRow
              icon={(p) => <FaTicketAlt {...p} />}
              iconColor={"orange"}
              title={t("Upgrade")}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) router.push("/upgrade");
                else router.push("/login");
              }}
            />

            <MenuRow
              icon={(p) => <BsWrenchAdjustable {...p} />}
              iconColor={"#0D47A1"}
              title={t("Minutes Formats")}
              onClick={() => {
                setShowSideMenu(false);
                router.push("/meeting-formats");
              }}
            />

            <div style={{ marginTop: "auto", display: "grid", justifyContent: "end", gap: 6, padding: "14px 8px 8px 8px" }}>
              <button
                style={ui.policyButton}
                onClick={() => { setShowSideMenu(false); router.push("/home"); }}>
                {t("Services and Pricing")}
              </button>
              <button
                style={ui.policyButton}
                onClick={() => { setShowSideMenu(false); router.push("/terms-of-use"); }}>
                {t("Terms of Use")}
              </button>
              <button
                style={ui.policyButton}
                onClick={() => { setShowSideMenu(false); router.push("/privacy-policy"); }}>
                {t("Privacy Policy")}
              </button>
              <button
                style={ui.policyButton}
                onClick={() => { setShowSideMenu(false); router.push("/company"); }}>
                {t("Company")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile overlay（既存） */}
      {showProfileOverlay && (
        <div
          style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1400, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}
          onClick={() => { setShowProfileOverlay(false); router.push("/"); }}
        >
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1401, opacity: 0.08 }} aria-hidden="true">
            <HomeIcon size={isMobile ? 520 : 1080} src="/images/home.png" alt="Home (bg)" />
          </div>

          <div
            style={{
              width: 520, minHeight: 380, background: "transparent", borderRadius: 12, display: "flex",
              flexDirection: "column", alignItems: "stretch", padding: 28, boxSizing: "border-box",
              position: "relative", zIndex: 1402, border: "1px solid #e5e5e5",
              boxShadow: "0 8px 32px rgba(0,0,0,0.06)", gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 700, fontSize: 18, color: "#111" }}>
              <span>{t("Profile")}</span>
            </div>

            <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr", rowGap: 8, color: "#111", lineHeight: 1.6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15 }}>
                <span>{t("Email")}</span><span>{userEmail}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15 }}>
                <span>{t("Plan")}</span>
                <span style={subscription ? { fontSize: 28, fontWeight: "bold", color: "#000", letterSpacing: "0.2px" } : {}}>
                  {subscription ? t("unlimited") : t("Free")}
                </span>
              </div>
              {!subscription && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15 }}>
                  <span>{t("Remaining Time:")}</span>
                  <span>{profileRemainingSeconds != null ? `${Math.floor((profileRemainingSeconds||0)/60).toString().padStart(2,"0")}:${((profileRemainingSeconds||0)%60).toString().padStart(2,"0")}` : "00:00"}</span>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 10, border: "1px solid #e6e6e6", background: "#fff", color: "#111", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }} onClick={handleLogout}>{t("Logout")}</button>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 10, border: "1px solid #f2c6c6", background: "#fff", color: "#b00020", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(176,0,32,0.06)" }} onClick={handleDeleteAccount}>
                {t("Delete account")}
              </button>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 10, border: "1px solid #e6e6e6", background: "#fff", color: "#111", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
                  onClick={handleCancelSubscription}
                >
                  {t("Cancel Subscription")}
                  <span
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 9999, border: "1px solid #c9c9c9", fontSize: 12, fontWeight: 700, userSelect: "none", cursor: "help", color: "#444", background: "#fff", marginLeft: 6, flex: "0 0 auto" }}
                    title={IOS_SUBSCRIPTION_NOTE}
                    aria-label="iOS subscription cancellation info"
                    role="button" tabIndex={0}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); alert(IOS_SUBSCRIPTION_NOTE); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault(); e.stopPropagation(); alert(IOS_SUBSCRIPTION_NOTE);
                      }
                    }}
                  >
                    ?
                  </span>
                </button>

                {subscriptionExpiresAt && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#166534", fontWeight: 700 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flex: "0 0 auto" }} aria-hidden="true">
                        <circle cx="12" cy="12" r="11" fill="#22c55e" />
                        <path d="M7 12.5l3.2 3.2L17 8.9" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Cancellation scheduled</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#166534", opacity: 0.9, fontWeight: 600 }}>
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
