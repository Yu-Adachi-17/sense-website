// src/pages/upgrade.js（旧 buy-ticket.js）

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
// ❌ 直接 getAuth は使わない
// import { getAuth } from "firebase/auth";
import HomeIcon from "./homeIcon";
import { getClientAuth } from "../firebaseConfig";

const SITE_URL = "https://www.sense-ai.world";

/* ===== FixedHeaderPortal（/home と同じ） ===== */
function FixedHeaderPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* ===== NeonCircle（/home と同じ。サイズ・文字スケール込み） ===== */
function NeonCircle({ size = 560, mobileSize = 360, children, ariaLabel }) {
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
        /* ★ /home と同じ文字スケール */
        :global(.pCard){ place-items: start; justify-items: start; align-items: start; text-align: left; gap: 10px; width: 100%; }
        :global(.pKicker){ font-weight: 700; letter-spacing: 0.2px; opacity: 0.85; font-size: clamp(22px, calc(var(--sz) * 0.07), 42px); color: white; text-shadow: 0 2px 6px rgba(255,255,255,0.1); }
        :global(.pPrice .big){ font-size: clamp(28px, calc(var(--sz) * 0.10), 54px); }
        :global(.pPrice .unit){ font-size: clamp(14px, calc(var(--sz) * 0.038), 22px); }
        :global(.pBullets){ font-size: clamp(12px, calc(var(--sz) * 0.028), 16px); line-height: 1.5; }
        .neonInner{ position: relative; z-index: 2; width: min(86%, calc(var(--sz) * 0.9)); text-align: left; }
        @media (max-width: 640px){
          .neonCircle{ overflow: hidden; border-radius: 20px; }
          .ringSvg{ overflow: hidden; }
        }
      `}</style>
    </div>
  );
}

/* ===== OneArcCircle（プレーン枠線／線だけグラデーション） ===== */
function OneArcCircle({ size = 560, mobileSize = 360, children, ariaLabel }) {
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

  // 正方形ビューにそのまま描く
  const strokeW = Math.max(2, Math.floor(S * 0.012));
  const inset = strokeW / 2;                  // ストロークが切れないよう内側へ半分オフセット
  const rx = Math.max(12, Math.floor(S * 0.08)); // 角丸半径（お好みで）

  return (
    <div className="oacWrap" style={{ "--sz": `${S}px` }} aria-label={ariaLabel}>
      <svg
        className="oacSvg"
        width={S}
        height={S}
        viewBox={`0 0 ${S} ${S}`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          {/* 枠線カラーだけグラデーション */}
          <linearGradient id="oacGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#65e0c4" />
            <stop offset="60%"  stopColor="#8db4ff" />
            <stop offset="100%" stopColor="#7cc7ff" />
          </linearGradient>
        </defs>

        <rect
          x={inset}
          y={inset}
          width={S - strokeW}
          height={S - strokeW}
          rx={rx}
          ry={rx}
          fill="none"
          stroke="url(#oacGrad)"
          strokeWidth={strokeW}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="oacInner">{children}</div>

      <style jsx>{`
        .oacWrap{
          position: relative;
          width: min(100%, var(--sz));
          aspect-ratio: 1 / 1;     /* 正方形固定 */
          display: grid;
          place-items: center;
          isolation: isolate;
          overflow: visible;
        }
        .oacSvg{
          position: absolute; inset: 0;
          pointer-events: none;
        }
        .oacInner{
          position: relative; z-index: 1;
          width: min(78%, calc(var(--sz) * 0.78));  /* お好みで */
          text-align: left;
        }
        @media (max-width: 640px){
          .oacWrap { overflow: hidden; border-radius: 20px; } /* セクションに合わせた角丸 */
        }
      `}</style>
    </div>
  );
}


/* ===== 価格テキストをボタン化（hoverで“ふわっ”） ===== */
function PriceBtn({ onClick, disabled, children, ariaLabel }) {
  return (
    <button
      type="button"
      className="priceBtn"
      onClick={onClick}
      disabled={!!disabled}
      aria-label={ariaLabel}
    >
      {children}
      <style jsx>{`
        .priceBtn{
          display: inline-flex;
          align-items: baseline;
          gap: 8px;
          border: 0;
          background: rgba(0,0,0,0.0);
          color: inherit;
          padding: 6px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 180ms ease, text-shadow 180ms ease, box-shadow 180ms ease;
        }
        .priceBtn:hover,
        .priceBtn:focus-visible{
          transform: translateY(-3px);
          text-shadow: 0 6px 24px rgba(100,160,255,0.35);
          box-shadow: 0 0 0 2px rgba(255,255,255,0.06) inset;
          outline: none;
        }
        .priceBtn:disabled{
          opacity: .6;
          cursor: not-allowed;
          transform: none !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
        @media (prefers-reduced-motion: reduce){
          .priceBtn{ transition: none !important; }
        }
      `}</style>
    </button>
  );
}

export default function BuyTicketsPage() {
  const { t } = useTranslation();
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);

  // ✅ Firebase Auth を SSR 安全に初期化
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        const auth = await getClientAuth(); // initializeApp 済みの Auth を取得
        if (mounted) setAuthInstance(auth);
      } catch (e) {
        console.error("Failed to init Firebase Auth:", e);
      }
    })();
    return () => { mounted = false; };
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
      const res = await fetch(
        "https://sense-website-production.up.railway.app/api/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, userId }),
          credentials: "include",
        }
      );
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

  const plans = useMemo(
    () => ({
      prepaid: {
        kicker: t("prepaid"),
        bullets: [
          t("No expiry"),
          t("Perfect for occasional meetings"),
          t("Unlimited sessions"),
        ],
        items: [
          {
            label: t("Buy 120 minutes for $1.99"),
            price: "$1.99",
            unit: "/120min",
            pid: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_120MIN,
          },
          {
            label: t("Buy 1200 minutes for $11.99"),
            price: "$11.99",
            unit: "/1200min",
            pid: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_1200MIN,
          },
        ],
      },
      sub: {
        kicker: t("Subscription"),
        bullets: [
          t("Unlimited usage"),
          t("Best for teams with regular meetings"),
          t("Unlock all features on iOS"),
        ],
        items: [
          {
            label: t("Subscribe monthly $16.99"),
            price: "$16.99",
            unit: "/month",
            pid: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_UNLIMITED,
          },
          {
            label: t("Subscribe yearly $149.99"),
            price: "$149.99",
            unit: "/year",
            pid: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_YEARLY_UNLIMITED,
          },
        ],
      },
    }),
    [t]
  );

  return (
    <>
      <Head>
        <title>{t("Minutes.AI — Upgrade")}</title>
        <meta
          name="description"
          content={t("Purchase prepaid minutes or subscriptions for Minutes.AI.")}
        />
        <link rel="canonical" href={`${SITE_URL}/upgrade`} />
      </Head>

      {/* ===== /home と同じヘッダー（Fixed） ===== */}
      <FixedHeaderPortal>
        <header className="top" role="banner">
          <a href="/" className="brand" aria-label={t("Minutes.AI Home")}>
            <span className="brandIcon" aria-hidden="true">
              <HomeIcon size={26} color="currentColor" />
            </span>
            <span className="brandText">{t("Minutes.AI")}</span>
          </a>

        </header>
      </FixedHeaderPortal>

      {/* ===== Main：/home の Pricing セクションをそのまま ===== */}
      <main className="scene buyScene">
        <section className="pricingSection" aria-labelledby="pricingHead">
          <div className="pricingHeadWrap">
            <h2 id="pricingHead" className="pricingH2 gradText">
              {t("Upgrade")}
            </h2>

            <p className="pricingSub">
              {t(
                "Simple, predictable pricing. Flexible plans for any workflow."
              )}
            </p>
          </div>

          <div className="pricingGrid">
            {/* 左：プリペイド */}
            <NeonCircle
              size={560}
              mobileSize={360}
              ariaLabel={t("Prepaid minutes pricing")}
            >
              <div className="pCard">
                <div className="pKicker">{plans.prepaid.kicker}</div>

                {plans.prepaid.items.map((it) => (
                  <div className="pPrice" key={it.pid}>
                    <PriceBtn
                      ariaLabel={it.label}
                      onClick={() => handleBuyClick(it.pid)}
                      disabled={loadingProductId === it.pid}
                    >
                      <span className="big">{it.price}</span>
                      <span className="unit">{it.unit}</span>
                    </PriceBtn>
                  </div>
                ))}

                <ul className="pBullets">
                  {plans.prepaid.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </NeonCircle>

            {/* 右：サブスク */}
            <NeonCircle
              size={560}
              mobileSize={360}
              ariaLabel={t("Subscription pricing")}
            >
              <div className="pCard">
                <div className="pKicker">{plans.sub.kicker}</div>

                {plans.sub.items.map((it) => (
                  <div className="pPrice" key={it.pid}>
                    <PriceBtn
                      ariaLabel={it.label}
                      onClick={() => handleBuyClick(it.pid)}
                      disabled={loadingProductId === it.pid}
                    >
                      <span className="big">{it.price}</span>
                      <span className="unit">{it.unit}</span>
                    </PriceBtn>
                  </div>
                ))}

                <ul className="pBullets">
                  {plans.sub.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </NeonCircle>
          </div>

          <p className="pricingNote">
            {t(
              "Prices in USD. Taxes may apply by region. Auto-renew; cancel anytime."
            )}
          </p>
        </section>

        {/* ===== 追加：Custom / Tema セクション（見出しは Upgrade と同フォント） ===== */}
<section className="customSection" aria-labelledby="customHead">
  <h3 id="customHead" className="pricingH2 gradText">Custom / Team</h3>
  <p className="customLead">Available worldwide for teams and individuals of all sizes</p>

  <div className="customArcWrap">
    <OneArcCircle size={560} mobileSize={360} ariaLabel="Custom plan highlight">
      <div className="customCard">
<ul className="customBullets">
  <li>
    <span className="liMain">Customizable minutes output</span>
    <span className="liSub">Terminology, output formats, etc.</span>
  </li>
  <li>
    <span className="liMain">Unlimited plan for all members</span>
    <span className="liSub">Volume discounts by team size</span>
  </li>
  <li><span className="liMain">Centralized management of team minutes</span></li>
  <li><span className="liMain">Invoice billing available</span></li>
  <li><span className="liMain">We can accommodate other needs. Contact us to discuss.</span></li>
</ul>


        <a
          className="customBtn"
          href="mailto:info@sense-ai.world"
          aria-label="Contact Us by Email"
        >
          Contact Us (Email)
        </a>
      </div>
    </OneArcCircle>
  </div>

  {/* ← 枠（円弧）の“下”に改行して表示 */}

</section>

      </main>

      {/* ===== /home の Footer を移植 + company を追加 ===== */}
      <footer className="pageFooter" role="contentinfo">
        <div className="footInner">
          <div className="legal">
            <Link href="/terms-of-use" className="legalLink">
              {t("Terms of Use")}
            </Link>
            <span className="sep">·</span>
            <Link href="/privacy-policy" className="legalLink">
              {t("Privacy Policy")}
            </Link>
            <span className="sep">·</span>
            <Link href="/company" className="legalLink">
              {t("Company")}
            </Link>
          </div>
          <div className="copyright">© Sense LLC All Rights Reserved</div>
        </div>
      </footer>

      {/* ===== styles（/home から必要分をそのまま + Custom 追記） ===== */}
      <style jsx>{`
        .scene {
          --bg-1: #05060e;
          --bg-2: #0b1030;
          --halo: 255, 255, 255;
          position: relative;
          min-height: 100vh;
          padding-top: var(--header-offset);
          padding-bottom: 24vh;
          overflow: hidden;
          color: #fff;
          background: radial-gradient(
              130vmax 130vmax at 50% 120%,
              #10163a 0%,
              var(--bg-2) 50%,
              var(--bg-1) 100%
            ),
            radial-gradient(
              1px 1px at 20% 30%,
              rgba(var(--halo), 0.22) 99%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 80% 20%,
              rgba(var(--halo), 0.12) 99%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 30% 70%,
              rgba(var(--halo), 0.14) 99%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 60% 50%,
              rgba(var(--halo), 0.1) 99%,
              transparent 100%
            ),
            radial-gradient(
              1px 1px at 75% 80%,
              rgba(var(--halo), 0.1) 99%,
              transparent 100%
            );
        }
        .pricingSection {
          margin: clamp(26px, 9vh, 120px) auto;
          padding: 0 22px;
          max-width: 1200px;
          text-align: center;
          position: relative;
          isolation: isolate;
          overflow: visible;
          padding-bottom: clamp(48px, 10vh, 140px);
          margin-bottom: clamp(8px, 4vh, 40px);
        }
        @media (max-width: 640px) {
          .pricingSection {
            overflow: hidden;
            padding-bottom: max(20vh, 140px);
          }
          .pricingGrid {
            row-gap: 28px;
          }
        }
        .pricingH2 {
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.08;
          padding-bottom: 0.06em;
          font-size: clamp(36px, 6.3vw, 92px);
        }
        .pricingSub {
          margin: 8px 0 18px 0;
          opacity: 0.9;
          font-weight: 700;
          font-size: clamp(14px, 1.9vw, 18px);
        }
        .pricingGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(16px, 3vw, 40px);
          align-items: center;
          justify-items: center;
          margin-top: clamp(10px, 3vh, 20px);
        }
        @media (max-width: 1220px) {
          .pricingGrid {
            grid-template-columns: 1fr;
          }
        }

        .pCard {
          display: grid;
          gap: 8px;
          place-items: center;
          color: #eaf4f7;
        }
        .pKicker {
          font-weight: 800;
          letter-spacing: 0.2px;
          opacity: 0.9;
        }
        .pPrice {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
          line-height: 1;
        }
        .big {
          font-weight: 900;
          letter-spacing: -0.02em;
          background: linear-gradient(
            90deg,
            #65e0c4,
            #8db4ff 60%,
            #7cc7ff 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 4px 22px rgba(100, 160, 255, 0.25);
        }
        .unit {
          font-weight: 800;
          opacity: 0.9;
        }
        .pBullets {
          list-style: none;
          padding: 0;
          margin: 8px 0 0 0;
          font-weight: 700;
          line-height: 1.5;
          opacity: 0.95;
        }
        .pBullets li::before {
          content: "• ";
          opacity: 0.9;
        }

        /* ===== Custom / Tema ===== */
        .customSection{
          margin: clamp(12px, 6vh, 80px) auto 0;
          padding: 0 22px;
          max-width: 1200px;
          text-align: center;
          position: relative;
        }
        .customLead{
          margin: 6px 0 18px 0;
          opacity: 0.9;
          font-weight: 700;
          font-size: clamp(14px, 1.9vw, 18px);
        }
/* 余白を全体的にタイトに */
.customArcWrap{
  display: grid;
  place-items: center;
  margin-top: 8px;            /* 以前より小さく */
}

/* 箇条書き：結論を大きく、補足は小さく＆やや薄く */
.customBullets{
  list-style: none;
  padding: 0;
  margin: 0;
}
.customBullets li{
  margin: 10px 0;             /* 行間はキュッと */
}
.customBullets li::before{
  content: "• ";
  opacity: 0.9;
  margin-right: 4px;
}
.customBullets .liMain{
  display: inline;            /* ドットの横に結論 */
  font-weight: 900;
  font-size: clamp(16px, 2vw, 22px);
}
.customBullets .liSub{
  display: block;             /* 補足は改行して小さく */
  margin: 4px 0 0 20px;       /* ドット分のインデントを合わせる */
  font-weight: 700;
  font-size: clamp(12px, 1.5vw, 15px);
  opacity: 0.85;
}

        .customBtn{
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 900;
          letter-spacing: 0.2px;
          text-decoration: none;
          color: #eaf4f7;
          border: 2px solid rgba(255,255,255,0.35);
          box-shadow: 0 8px 30px rgba(80,140,220,0.22);
          width: fit-content;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
          margin: 12px auto 0;
        }
        .customBtn:hover, .customBtn:focus-visible{
          transform: translateY(-2px);
          box-shadow: 0 12px 42px rgba(100,160,255,0.36);
          border-color: rgba(255,255,255,0.6);
          outline: none;
        }

        .pageFooter {
          position: relative;
          z-index: 3;
          padding: 20px 22px 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: linear-gradient(
            0deg,
            rgba(10, 14, 28, 0.6) 0%,
            rgba(10, 14, 28, 0.3) 100%
          );
          color: #eaf4f7;
        }
        .footInner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .legal {
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 13px;
          opacity: 0.7;
          flex-wrap: wrap;
        }
        .legalLink {
          color: #ffffff;
          text-decoration: none;
        }
        .sep {
          opacity: 0.55;
        }
        .copyright {
          font-size: 13px;
          opacity: 0.7;
          white-space: nowrap;
        }
        .gradText{
          background: linear-gradient(90deg,#7cc7ff 0%,#8db4ff 35%,#65e0c4 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }
        .buyScene .pricingSection{
          margin-top: clamp(8px, 4vh, 60px);
        }
          /* ===== Custom / Team ===== */
.customSection{
  margin: clamp(8px, 3vh, 40px) auto 0;
  padding: 0 22px;
  max-width: 1200px;
  text-align: center;
  position: relative;
}
.customLead{
  margin: 6px 0 18px 0;
  opacity: 0.9;
  font-weight: 700;
  font-size: clamp(14px, 1.9vw, 18px);
}
.customArcWrap{
  display: grid;
  place-items: center;
  margin-top: clamp(8px, 2vh, 18px);
}
.customCard{
  margin: 0 auto;
  max-width: 820px;
  display: grid;
  gap: 14px;
  text-align: left;
}
.customBullets{
  list-style: none;
  padding: 0;
  margin: 0;
  font-weight: 700;
  line-height: 1.55;
  opacity: 0.95;
}
.customBullets li{ margin: 4px 0; }
.customBullets li::before{ content: "• "; opacity: 0.9; }
.customBtn{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 999px;
  font-weight: 900;
  letter-spacing: 0.2px;
  text-decoration: none;
  color: #eaf4f7;
  border: 2px solid rgba(255,255,255,0.35);
  box-shadow: 0 8px 30px rgba(80,140,220,0.22);
  width: fit-content;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.customBtn:hover, .customBtn:focus-visible{
  transform: translateY(-2px);
  box-shadow: 0 12px 42px rgba(100,160,255,0.36);
  border-color: rgba(255,255,255,0.6);
  outline: none;
}

        @media (max-width: 640px) {
          .footInner {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>

      {/* ===== 追加修正：リンクの紫・下線を強制的にオフ／注釈下の余白調整 ===== */}
      <style jsx global>{`
        .pageFooter .legalLink,
        .pageFooter .legalLink:visited,
        .pageFooter .legalLink:hover,
        .pageFooter .legalLink:active {
          color: #eaf4f7 !important;
          text-decoration: none !important;
          border-bottom: none !important;
        }
        .pageFooter .legalLink:focus-visible {
          outline: 2px solid rgba(234, 244, 247, 0.65);
          outline-offset: 2px;
          border-radius: 6px;
        }

        .buyScene {
          padding-bottom: clamp(28px, 7vh, 84px);
        }
        .buyScene .pricingSection {
          padding-bottom: clamp(18px, 5vh, 60px);
          margin-bottom: clamp(6px, 2vh, 18px);
        }
        .buyScene .pricingNote {
          margin-bottom: 0;
        }
      `}</style>

      {/* ===== /home と同じヘッダーの共通グローバル変数／装飾 ===== */}
      <style jsx global>{`
        :root {
          --header-h: clamp(56px, 7.2vh, 72px);
          --header-py: 10px;
          --header-offset: calc(
            var(--header-h) + env(safe-area-inset-top, 0px) + (var(--header-py) * 2)
          );
        }
        header.top {
          position: fixed;
          left: 0;
          right: 0;
          top: 0;
          z-index: 2147483647;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: calc(var(--header-h) + env(safe-area-inset-top, 0px));
          padding: calc(var(--header-py) + env(safe-area-inset-top, 0px)) 22px
            var(--header-py);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          background: linear-gradient(
            180deg,
            rgba(10, 14, 28, 0.75) 0%,
            rgba(10, 14, 28, 0.45) 100%
          );
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        header.top .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #b6eaff;
        }
        header.top .brandText {
          font-weight: 800;
          font-size: 24px;
          letter-spacing: 0.2px;
        }
        header.top .brand .brandIcon {
          width: 26px;
          height: 26px;
          display: inline-flex;
        }
        header.top .nav {
          background: rgba(20, 40, 60, 0.7);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          padding: 10px 18px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        header.top .navLink,
        header.top .navLink:visited,
        header.top .navLink:hover,
        header.top .navLink:active {
          color: #eaf4f7 !important;
          text-decoration: none !important;
          margin: 0 8px;
          opacity: 0.95;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        header.top .navText {
          font-weight: 800;
          font-size: clamp(14px, 1.6vw, 18px);
        }
        header.top .gradHeader {
          background: linear-gradient(
            90deg,
            #7cc7ff 0%,
            #8db4ff 35%,
            #65e0c4 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        @supports not (backdrop-filter: blur(12px)) {
          header.top {
            background: rgba(10, 14, 28, 0.92);
          }
          header.top .nav {
            background: rgba(20, 40, 60, 0.92);
          }
        }
      `}</style>
    </>
  );
}

/* i18n：/home と同じ辞書を読む（タイトルが消える問題の予防） */
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "home"])),
    },
  };
}
