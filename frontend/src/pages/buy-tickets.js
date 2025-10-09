// pages/buy-tickets.js
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { getAuth } from "firebase/auth";
import HomeIcon from "./homeIcon";

const SITE_URL = "https://www.sense-ai.world";

/** =========================
 *  コメット風ネオン円（/homeと同等）
 *  - SVGは pointer-events: none でクリック透過
 *  - スマホ時は自動縮小
 * ========================= */
function NeonCircle({
  size = 560,
  mobileSize = 420,
  children,
  ariaLabel,
}) {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsPhone(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const S = isPhone ? mobileSize : size;

  const W = S, H = S;
  const cx = W / 2, cy = H / 2;
  const r = S * 0.46;
  const strokeW = Math.max(4, Math.floor(S * 0.01));
  const headR = strokeW * 0.95;
  const toRad = (deg) => (Math.PI / 180) * (deg - 90);
  const pt = (deg, rad = r) => [cx + rad * Math.cos(toRad(deg)), cy + rad * Math.sin(toRad(deg))];
  const arc = (a0, a1) =>
    `M ${pt(a0)[0]} ${pt(a0)[1]} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(a1)[0]} ${pt(a1)[1]}`;

  const HEAD = 0;
  const TAIL_START = HEAD - 360;
  const SEGMENTS = 1000;
  const STEP = 360 / SEGMENTS;
  const ease = (t) => Math.pow(t, 2.0);
  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const a0 = TAIL_START + i * STEP;
    const a1 = a0 + STEP;
    const t = (i + 1) / SEGMENTS;
    const alpha = 0.04 + 0.82 * ease(t);
    const w = strokeW * (0.72 + 0.32 * ease(t));
    return { a0, a1, alpha, w };
  });

  return (
    <div className="neonCircle" style={{ "--sz": `${S}px` }} aria-label={ariaLabel}>
      <svg className="ringSvg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
        <defs>
          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
            <stop offset="74%" stopColor="rgba(120,210,255,0.00)" />
            <stop offset="92%" stopColor="rgba(120,210,255,0.55)" />
            <stop offset="100%" stopColor="rgba(120,210,255,0.00)" />
          </radialGradient>
          <radialGradient id="headGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(210,255,255,1)" />
            <stop offset="55%" stopColor="rgba(180,245,255,0.9)" />
            <stop offset="100%" stopColor="rgba(140,220,255,0)" />
          </radialGradient>
        </defs>
        <g filter="url(#softGlow)" stroke="rgba(175,240,255,1)" fill="none" strokeLinecap="round" style={{ pointerEvents: "none" }}>
          {segments.map((s, i) => (
            <path key={i} d={arc(s.a0, s.a1)} strokeOpacity={s.alpha} strokeWidth={s.w} />
          ))}
        </g>
        <circle cx={pt(HEAD)[0]} cy={pt(HEAD)[1]} r={headR} fill="url(#headGrad)" filter="url(#softGlow)" style={{ pointerEvents: "none" }} />
      </svg>

      <div className="neonInner">{children}</div>

      <style jsx>{`
        .neonCircle{
          position: relative;
          width: min(100%, var(--sz));
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          isolation: isolate;
          overflow: visible;
        }
        .ringSvg{
          position: absolute; inset: 0;
          overflow: visible;
          transform: translateZ(0);
          mix-blend-mode: screen;
          image-rendering: optimizeQuality;
        }
        .neonInner{ position: relative; z-index: 2; width: min(86%, calc(var(--sz) * 0.9)); text-align: left; }
        @media (max-width: 640px){
          .neonCircle{ overflow: hidden; border-radius: 20px; }
          .ringSvg{ overflow: hidden; }
        }
      `}</style>
    </div>
  );
}

/** =========================
 *  価格カード（NeonCircleの中身 / 1プラン＝1カード）
 * ========================= */
function PriceCard({ kicker, price, unit, bullets = [], onClick, ariaLabel, disabled }) {
  return (
    <button type="button" className="priceCard" onClick={onClick} aria-label={ariaLabel} disabled={!!disabled}>
      <NeonCircle size={560} mobileSize={360} ariaLabel={ariaLabel}>
        <div className="pCard">
          <div className="pKicker">{kicker}</div>
          <div className="pPrice">
            <span className="big">{price}</span>
            <span className="unit">{unit}</span>
          </div>
          {bullets?.length > 0 && (
            <ul className="pBullets">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          )}
        </div>
      </NeonCircle>

      <style jsx>{`
        .priceCard{
          all: unset;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: transform 220ms cubic-bezier(.2,.7,.2,1), box-shadow 220ms ease, filter 220ms ease;
          will-change: transform, filter;
          border-radius: 28px; /* hoverの影を柔らかく */
        }
        .priceCard:hover,
        .priceCard:focus-visible{
          transform: translateY(-6px);
          filter: drop-shadow(0 16px 28px rgba(50,90,180,.35)) drop-shadow(0 6px 10px rgba(0,0,0,.25));
        }
        .priceCard:disabled{ opacity:.6; cursor: not-allowed; transform:none !important; filter:none !important; }

        :global(.pCard){ place-items: start; gap: 10px; width: 100%; color:#eaf4f7; }
        :global(.pKicker){ font-weight: 800; letter-spacing: .2px; opacity: .9; }
        :global(.pPrice){ display:flex; align-items:baseline; gap:8px; line-height:1; }
        :global(.pPrice .big){
          font-weight:900; letter-spacing:-.02em;
          font-size: clamp(28px, 5.2vw, 54px);
          background: linear-gradient(90deg, #65e0c4, #8db4ff 60%, #7cc7ff 100%);
          -webkit-background-clip:text; background-clip:text; color:transparent; -webkit-text-fill-color:transparent;
          text-shadow: 0 4px 22px rgba(100,160,255,.25);
        }
        :global(.pPrice .unit){ font-weight:800; opacity:.9; font-size: clamp(16px, 2.2vw, 22px); }
        :global(.pBullets){ list-style:none; padding:0; margin:8px 0 0 0; font-weight:700; font-size: clamp(12px, 1.7vw, 16px); line-height:1.5; opacity:.95; }
        :global(.pBullets li::before){ content:"• "; opacity:.9; }

        @media (prefers-reduced-motion: reduce){
          .priceCard{ transition: none !important; }
        }
      `}</style>
    </button>
  );
}

export default function BuyTicketsPage() {
  const { t } = useTranslation();
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthInstance(getAuth());
    }
  }, []);

  const handleBuyClick = async (productId) => {
    if (!productId) {
      console.error("❌ productId is undefined. Please check your environment variables.");
      return;
    }
    if (!authInstance || !authInstance.currentUser) {
      alert("Login required. Please log in first.");
      return;
    }
    const userId = authInstance.currentUser.uid;
    setLoadingProductId(productId);
    try {
      const res = await fetch("https://sense-website-production.up.railway.app/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, userId }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.url && typeof window !== "undefined") {
        window.location.href = data.url;
      } else {
        console.error("Checkout session URL not found", data);
      }
    } catch (e) {
      console.error("Error during checkout:", e);
    } finally {
      setLoadingProductId(null);
    }
  };

  const plans = useMemo(() => ([
    {
      key: "trial",
      kicker: t("prepaid"),
      price: "$1.99",
      unit: "/120min",
      bullets: [t("No expiry"), t("Perfect for occasional meetings"), t("Unlimited sessions")],
      productId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_120MIN,
      aria: t("Buy 120 minutes for $1.99"),
    },
    {
      key: "light",
      kicker: t("prepaid"),
      price: "$11.99",
      unit: "/1200min",
      bullets: [t("No expiry"), t("Perfect for occasional meetings"), t("Unlimited sessions")],
      productId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_1200MIN,
      aria: t("Buy 1200 minutes for $11.99"),
    },
    {
      key: "monthly",
      kicker: t("Subscription"),
      price: "$16.99",
      unit: "/month",
      bullets: [t("Unlimited usage"), t("Best for teams with regular meetings"), t("Unlock all features on iOS")],
      productId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_UNLIMITED,
      aria: t("Subscribe monthly $16.99"),
    },
    {
      key: "yearly",
      kicker: t("Subscription"),
      price: "$149.99",
      unit: "/year",
      bullets: [t("Unlimited usage"), t("Best for teams with regular meetings"), t("Unlock all features on iOS")],
      productId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_YEARLY_UNLIMITED,
      aria: t("Subscribe yearly $149.99"),
    },
  ]), [t]);

  return (
    <>
      <Head>
        <title>{t("Minutes.AI — Buy Time")}</title>
        <meta name="description" content={t("Purchase prepaid minutes or subscriptions for Minutes.AI.")} />
        <link rel="canonical" href={`${SITE_URL}/buy-tickets`} />
      </Head>

      {/* ===== Header（簡易） ===== */}
      <header className="top" role="banner" aria-label="header">
        <a href="/" className="brand" aria-label={t("Minutes.AI Home")}>
          <span className="brandIcon" aria-hidden="true"><HomeIcon size={26} color="currentColor" /></span>
          <span className="brandText">{t("Minutes.AI")}</span>
        </a>
      </header>

      {/* ===== Main ===== */}
      <main className="scene">
        <h1 className="pricingH2">{t("Minutes.AI Pricing")}</h1>
        <p className="pricingSub">{t("Simple, predictable pricing. Flexible plans for any workflow.")}</p>

        <section className="pricingGrid" aria-label={t("Pricing options")}>
          {plans.map((p) => (
            <PriceCard
              key={p.key}
              kicker={p.kicker}
              price={p.price}
              unit={p.unit}
              bullets={p.bullets}
              ariaLabel={p.aria}
              onClick={() => handleBuyClick(p.productId)}
              disabled={loadingProductId === p.productId}
            />
          ))}
        </section>

        <p className="pricingNote">{t("Prices in USD. Taxes may apply by region. Auto-renew; cancel anytime.")}</p>
      </main>

      {/* ===== Footer（/homeのものを移植） ===== */}
      <footer className="pageFooter" role="contentinfo">
        <div className="footInner">
          <div className="legal">
            <Link href="/terms-of-use" className="legalLink">{t("Terms of Use")}</Link>
            <span className="sep">·</span>
            <Link href="/privacy-policy" className="legalLink">{t("Privacy Policy")}</Link>
          </div>
          <div className="copyright">© Sense LLC All Rights Reserved</div>
        </div>
      </footer>

      {/* ===== Styles ===== */}
      <style jsx>{`
        .scene {
          --bg-1:#05060e; --bg-2:#0b1030; --halo:255,255,255;
          min-height: 100vh;
          padding: calc(56px + 20px) 22px 18vh;
          color:#fff;
          background:
            radial-gradient(130vmax 130vmax at 50% 120%, #10163a 0%, var(--bg-2) 50%, var(--bg-1) 100%),
            radial-gradient(1px 1px at 20% 30%, rgba(var(--halo), 0.22) 99%, transparent 100%),
            radial-gradient(1px 1px at 80% 20%, rgba(var(--halo), 0.12) 99%, transparent 100%),
            radial-gradient(1px 1px at 30% 70%, rgba(var(--halo), 0.14) 99%, transparent 100%),
            radial-gradient(1px 1px at 60% 50%, rgba(var(--halo), 0.1) 99%, transparent 100%),
            radial-gradient(1px 1px at 75% 80%, rgba(var(--halo), 0.1) 99%, transparent 100%);
        }
        .pricingH2{ margin:0; text-align:center; font-weight:900; letter-spacing:-.02em; line-height:1.02; font-size: clamp(36px, 6.3vw, 92px); }
        .pricingSub{ margin:8px auto 18px; text-align:center; opacity:.9; font-weight:700; font-size: clamp(14px, 1.9vw, 18px); max-width: 960px; }
        .pricingGrid{
          display:grid; grid-template-columns:1fr 1fr;
          gap: clamp(16px, 3vw, 40px); align-items:center; justify-items:center;
          max-width: 1240px; margin: clamp(10px, 3vh, 20px) auto 0;
        }
        .pricingNote{ margin: 12px auto 0; text-align:center; opacity:.72; font-size:12px; max-width: 960px; }
        @media (max-width: 1220px){ .pricingGrid{ grid-template-columns:1fr; } }
      `}</style>

      {/* Header & Footer shared styles */}
      <style jsx global>{`
        :root { --header-h: 56px; --header-py: 10px; }
        header.top{
          position:fixed; left:0; right:0; top:0; z-index:9999;
          display:flex; justify-content:space-between; align-items:center;
          height: calc(var(--header-h)); padding: var(--header-py) 22px;
          -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
          background: linear-gradient(180deg, rgba(10,14,28,0.75) 0%, rgba(10,14,28,0.45) 100%);
          border-bottom:1px solid rgba(255,255,255,0.06);
        }
        header.top .brand{ display:inline-flex; align-items:center; gap:10px; text-decoration:none; color:#b6eaff; }
        header.top .brandText{ font-weight:800; font-size:24px; letter-spacing:.2px; }
        header.top .brand .ai{ background: linear-gradient(90deg, #7cc7ff, #65e0c4); -webkit-background-clip:text; background-clip:text; color:transparent; }
        header.top .brand .brandIcon{ width:26px; height:26px; display:inline-flex; }

        .pageFooter { position:relative; z-index:3; padding:20px 22px 28px; border-top:1px solid rgba(255,255,255,0.06);
          background: linear-gradient(0deg, rgba(10,14,28,0.6) 0%, rgba(10,14,28,0.3) 100%); color:#eaf4f7; }
        .footInner { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .legal { display:flex; gap:12px; align-items:center; font-size:13px; opacity:0.7; }
        .legalLink { color:#ffffff; text-decoration:none; }
        .sep { opacity:0.55; }
        .copyright { font-size:13px; opacity:0.7; white-space:nowrap; }
        @media (max-width: 640px) { .footInner { flex-direction:column; gap:8px; } }

        @media (prefers-reduced-motion: reduce){
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </>
  );
}

// i18n（SSR）
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
}
