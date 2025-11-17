// src/pages/upgrade.js
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
import { FaAppStore } from "react-icons/fa";
import { BsGooglePlay } from "react-icons/bs";
const SITE_URL = "https://www.sense-ai.world";
const LINK_IOS =
  "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";
const LINK_ANDROID =
  "https://play.google.com/store/apps/details?id=world.senseai.minutes";
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
  const W = S,
    H = S;
  const cx = W / 2,
    cy = H / 2;
  const r = S * 0.46;
  const strokeW = Math.max(4, Math.floor(S * 0.01));
  const headR = strokeW * 0.95;
  const toRad = (deg) => (Math.PI / 180) * (deg - 90);
  const pt = (deg, rad = r) => [
    cx + rad * Math.cos(toRad(deg)),
    cy + rad * Math.sin(toRad(deg)),
  ];
  const arc = (a0, a1) =>
    `M ${pt(a0)[0]} ${pt(a0)[1]} A ${r} ${r} 0 ${
      a1 - a0 > 180 ? 1 : 0
    } 1 ${pt(a1)[0]} ${pt(a1)[1]}`;
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
      <svg
        className="ringSvg"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-hidden="true"
      >
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
        <g
          filter="url(#softGlow)"
          stroke="rgba(175,240,255,1)"
          fill="none"
          strokeLinecap="round"
          style={{ pointerEvents: "none" }}
        >
          {segments.map((s, i) => (
            <path
              key={i}
              d={arc(s.a0, s.a1)}
              strokeOpacity={s.alpha}
              strokeWidth={s.w}
            />
          ))}
        </g>
        <circle
          cx={pt(HEAD)[0]}
          cy={pt(HEAD)[1]}
          r={headR}
          fill="url(#headGrad)"
          filter="url(#softGlow)"
          style={{ pointerEvents: "none" }}
        />
      </svg>
      <div className="neonInner">{children}</div>
      <style jsx>{`
        .neonCircle {
          position: relative;
          width: min(100%, var(--sz));
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          isolation: isolate;
          overflow: visible;
        }
        .ringSvg {
          position: absolute;
          inset: 0;
          overflow: visible;
          transform: translateZ(0);
          mix-blend-mode: screen;
          image-rendering: optimizeQuality;
        }
        /* ★ /home と同じ文字スケール */
        :global(.pCard) {
          place-items: start;
          /* ▼ 修正 ▼ アイテム（ボタンなど）を左揃え(start)から幅いっぱいに(stretch)変更 */
          justify-items: stretch;
          align-items: start;
          text-align: left;
          gap: 10px;
          width: 100%;
        }
        :global(.pKicker) {
          font-weight: 700;
          letter-spacing: 0.2px;
          opacity: 0.85;
          font-size: clamp(22px, calc(var(--sz) * 0.07), 42px);
          color: white;
          text-shadow: 0 2px 6px rgba(255, 255, 255, 0.1);
        }
        :global(.pPrice .big) {
          font-size: clamp(28px, calc(var(--sz) * 0.1), 54px);
        }
        :global(.pPrice .unit) {
          font-size: clamp(14px, calc(var(--sz) * 0.038), 22px);
        }
        :global(.pBullets) {
          font-size: clamp(12px, calc(var(--sz) * 0.028), 16px);
          line-height: 1.5;
        }
        .neonInner {
          position: relative;
          z-index: 2;
          width: min(86%, calc(var(--sz) * 0.9));
          text-align: left;
        }
        @media (max-width: 640px) {
          .neonCircle {
            overflow: hidden;
            border-radius: 20px;
          }
          .ringSvg {
            overflow: hidden;
          }
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
  const inset = strokeW / 2; // ストロークが切れないよう内側へ半分オフセット
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
            <stop offset="0%" stopColor="#65e0c4" />
            <stop offset="60%" stopColor="#8db4ff" />
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
        .oacWrap {
          position: relative;
          width: min(100%, var(--sz));
          aspect-ratio: 1 / 1; /* 正方形固定 */
          display: grid;
          place-items: center;
          isolation: isolate;
          overflow: visible;
        }
        .oacSvg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .oacInner {
          position: relative;
          z-index: 1;
          width: min(78%, calc(var(--sz) * 0.78)); /* お好みで */
          text-align: left;
        }
        @media (max-width: 640px) {
          .oacWrap {
            overflow: hidden;
            border-radius: 20px;
          } /* セクションに合わせた角丸 */
        }
      `}</style>
    </div>
  );
}
/* ===== 価格テキストを「ボタンっぽく」（薄い背景＋枠付き） ===== */
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
        .priceBtn {
          /* ▼ 修正 ▼ inline-flex から flex に変更 */
          display: flex;
          /* ▼ 追加 ▼ 幅を100%にし、justify-items: stretch に追従 */
          width: 100%;
          /* ▼ 追加 ▼ ボタン内コンテンツを中央揃え */
          justify-content: center;
          align-items: baseline;
          gap: 8px;
          border-radius: 999px;
          padding: 8px 14px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: radial-gradient(
              140% 140% at 50% 0%,
              /* ▼ 修正 ▼ 0.16 -> 0.12 にし、少し暗く */
              rgba(120, 180, 255, 0.12),
              transparent 65%
            ),
            rgba(8, 18, 36, 0.82);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset;
          color: inherit;
          cursor: pointer;
          transition:
            transform 180ms ease,
            text-shadow 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease,
            border-color 180ms ease;
        }
        .priceBtn:hover,
        .priceBtn:focus-visible {
          transform: translateY(-3px);
          text-shadow: 0 6px 24px rgba(100, 160, 255, 0.35);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.08) inset;
          background: radial-gradient(
              140% 140% at 50% 0%,
              /* ▼ 修正 ▼ 0.22 -> 0.18 にし、少し暗く */
              rgba(140, 210, 255, 0.18),
              transparent 70%
            ),
            rgba(10, 26, 50, 0.95);
          border-color: rgba(255, 255, 255, 0.32);
          outline: none;
        }
        .priceBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .priceBtn {
            transition: none !important;
          }
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
    return () => {
      mounted = false;
    };
  }, []);
  const handleBuyClick = async (productId) => {
    if (!productId) {
      console.error(
        "❌ productId is undefined. Please check your environment variables."
      );
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
          content={t(
            "Purchase prepaid minutes or subscriptions for Minutes.AI."
          )}
        />
        <link rel="canonical" href={`${SITE_URL}/upgrade`} />
      </Head>
      {/* ===== /home と同じヘッダー ===== */}
      <FixedHeaderPortal>
        <header className="top" role="banner">
          <div className="topInner">
            {/* 左：ブランド */}
            <Link
              href="/"
              className="brand"
              aria-label={t("Minutes.AI Home")}
            >
              <span className="brandIcon" aria-hidden="true">
                <HomeIcon size={26} color="currentColor" />
              </span>
              <span className="brandText">{t("Minutes.AI")}</span>
            </Link>
            {/* 右：Blog / Company / iOS / Android → 1つの枠内に4つ */}
            <nav
              className="navGroup"
              aria-label={t("Primary") || "Primary"}
            >
              <Link href="/blog" className="navItem">
                {t("Blog")}
              </Link>
              <Link href="/company" className="navItem">
                {t("Company")}
              </Link>
              <a
                href={LINK_IOS}
                className="navItem"
                rel="noopener noreferrer"
                aria-label={t("Download on iOS")}
              >
                <FaAppStore className="navIcon" aria-hidden="true" />
                {t("iOS")}
              </a>
              <a
                href={LINK_ANDROID}
                className="navItem"
                rel="noopener noreferrer"
                aria-label={t("Download on Android")}
              >
                <BsGooglePlay className="navIcon" aria-hidden="true" />
                {t("Android")}
              </a>
            </nav>
          </div>
        </header>
      </FixedHeaderPortal>
      {/* ===== Main：/home の Pricing セクションをベースにした Upgrade ===== */}
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

                {/* ▼ 追加 ▼ PriceBtn を .pPriceGroup で囲む */}
                <div className="pPriceGroup">
                  {plans.prepaid.items.map((it) => (
                    // {/* ▼ 削除 ▼ .pPrice ラッパーを削除 */}
                    // <div className="pPrice" key={it.pid}>
                    <PriceBtn
                      key={it.pid} // key を PriceBtn に移動
                      ariaLabel={it.label}
                      onClick={() => handleBuyClick(it.pid)}
                      disabled={loadingProductId === it.pid}
                    >
                      <span className="big">{it.price}</span>
                      <span className="unit">{it.unit}</span>
                    </PriceBtn>
                    // </div>
                  ))}
                </div>

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

                {/* ▼ 追加 ▼ PriceBtn を .pPriceGroup で囲む */}
                <div className="pPriceGroup">
                  {plans.sub.items.map((it) => (
                    // {/* ▼ 削除 ▼ .pPrice ラッパーを削除 */}
                    // <div className="pPrice" key={it.pid}>
                    <PriceBtn
                      key={it.pid} // key を PriceBtn に移動
                      ariaLabel={it.label}
                      onClick={() => handleBuyClick(it.pid)}
                      disabled={loadingProductId === it.pid}
                    >
                      <span className="big">{it.price}</span>
                      <span className="unit">{it.unit}</span>
                    </PriceBtn>
                    // </div>
                  ))}
                </div>

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
        {/* ===== Custom / Team セクション ===== */}
        <section className="customSection" aria-labelledby="customHead">
          <h3 id="customHead" className="pricingH2 gradText">
            Custom / Team
          </h3>
          <p className="customLead">
            Available worldwide for teams and individuals of all sizes
          </p>
          <div className="customArcWrap">
            <OneArcCircle
              size={560}
              mobileSize={360}
              ariaLabel="Custom plan highlight"
            >
              <div className="customCard">
                <ul className="customBullets">
                  <li>
                    <span className="liMain">Customizable minutes output</span>
                    <span className="liSub">
                      Terminology, output formats, etc.
                    </span>
                  </li>
                  <li>
                    <span className="liMain">
                      Unlimited plan for all members
                    </span>
                    <span className="liSub">
                      Volume discounts by team size
                    </span>
                  </li>
                  <li>
                    <span className="liMain">
                      Centralized management of team minutes
                    </span>
                  </li>
                  <li>
                    <span className="liMain">Invoice billing available</span>
                  </li>
                  <li>
                    <span className="liMain">
                      We can accommodate other needs. Contact us to discuss.
                    </span>
                  </li>
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
      {/* ===== styles（背景などは既存のまま） ===== */}
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
          background:
            radial-gradient(
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
        /* ▼ 追加 ▼ pCard 内のボタンラッパー */
        .pPriceGroup {
          display: grid;
          /* .pCard の gap: 8px と合わせる */
          gap: 8px;
          /* このラッパー内のアイテム（PriceBtn）を幅いっぱいに伸ばす */
          justify-items: stretch;
          /* pCard 自体の justify-items: stretch と連動 */
          width: 100%;
        }

        /* ▼ 削除 ▼ .pPrice ラッパーは削除されたため不要 */
        /*
        .pPrice {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
          line-height: 1;
        }
        */

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
        /* ===== Custom / Team ===== */
        .customSection {
          margin: clamp(8px, 3vh, 40px) auto 0;
          padding: 0 22px;
          max-width: 1200px;
          text-align: center;
          position: relative;
        }
        .customLead {
          margin: 6px 0 18px 0;
          opacity: 0.9;
          font-weight: 700;
          font-size: clamp(14px, 1.9vw, 18px);
        }
        .customArcWrap {
          display: grid;
          place-items: center;
          margin-top: clamp(8px, 2vh, 18px);
        }
        .customCard {
          margin: 0 auto;
          max-width: 820px;
          display: grid;
          gap: 14px;
          text-align: left;
        }
        .customBullets {
          list-style: none;
          padding: 0;
          margin: 0;
          font-weight: 700;
          line-height: 1.55;
          opacity: 0.95;
        }
        .customBullets li {
          margin: 4px 0;
        }
        .customBullets li::before {
          content: "• ";
          opacity: 0.9;
        }
        .customBullets .liMain {
          display: inline;
          font-weight: 900;
          font-size: clamp(16px, 2vw, 22px);
        }
        .customBullets .liSub {
          display: block;
          margin: 4px 0 0 0;
          font-weight: 600;
          opacity: 0.9;
          font-size: clamp(13px, 1.7vw, 17px);
        }
        .customBtn {
          align-self: start;
          justify-self: start;
          margin-top: 10px;
          border-radius: 999px;
          padding: 10px 20px;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          font-size: 13px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          background: rgba(8, 18, 36, 0.9);
          color: #f5f9ff;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset;
          text-decoration: none;
          transition:
            background 160ms ease,
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }
        .customBtn:hover,
        .customBtn:focus-visible {
          background: rgba(16, 38, 82, 0.98);
          border-color: rgba(255, 255, 255, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.6);
          outline: none;
        }
        .pricingNote {
          margin-top: clamp(14px, 3vh, 26px);
          opacity: 0.8;
          font-size: 13px;
        }
        /* ===== Fixed header (ほぼ /home と同じ) ===== */
        :root {
          --header-offset: 72px;
        }
        .top {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 40;
          backdrop-filter: blur(20px);
          background: linear-gradient(
            to bottom,
            rgba(5, 8, 24, 0.94),
            rgba(5, 8, 24, 0.72),
            transparent
          );
        }
        .topInner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 14px 22px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          /* ▼ 修正 ▼ 10px -> 8px に */
          gap: 8px;
          font-weight: 800;
          font-size: 18px;
          text-decoration: none;
          color: #f8fbff;
        }
        .brandIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .brandText {
          letter-spacing: -0.03em;
        }
        .navGroup {
          display: inline-flex;
          align-items: center;
          /* ▼ 修正 ▼ 8px -> 4px に */
          gap: 4px;
          /* ▼ 修正 ▼ 4px -> 4px 8px に（左右パディング追加） */
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(5, 10, 28, 0.85);
        }
        .navItem {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          color: #f5f8ff;
          opacity: 0.9;
          border: 1px solid transparent;
          transition:
            background 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }
        .navItem:hover,
        .navItem:focus-visible {
          background: rgba(15, 32, 70, 0.96);
          border-color: rgba(255, 255, 255, 0.22);
          transform: translateY(-1px);
          outline: none;
        }
        .navIcon {
          /* ▼ 修正 ▼ 16px -> 14px に（テキストとのバランス調整） */
          font-size: 14px;
        }
        @media (max-width: 640px) {
          .topInner {
            padding-inline: 14px;
          }
          .navGroup {
            gap: 2px;
            /* ▼ 修正 ▼ 左右パディングを 3px 8px に */
            padding: 3px 8px;
          }
          .navItem {
            padding-inline: 10px;
            font-size: 12px;
          }
          .brandText {
            font-size: 16px;
          }
        }
        /* ===== Footer ===== */
        .pageFooter {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 18px 22px 26px;
          margin-top: auto;
          background: radial-gradient(
              160% 160% at 50% -40%,
              rgba(44, 76, 130, 0.76),
              transparent
            ),
            rgba(2, 4, 12, 0.96);
        }
        .footInner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
          color: rgba(235, 244, 255, 0.86);
        }
        .legal {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .legalLink {
          color: inherit;
          text-decoration: none;
          font-weight: 600;
        }
        .legalLink:hover,
        .legalLink:focus-visible {
          text-decoration: underline;
          outline: none;
        }
        .sep {
          opacity: 0.5;
        }
        .copyright {
          opacity: 0.75;
        }
      `}</style>
    </>
  );
}
export async function getServerSideProps({ locale }) {
  const currentLocale = locale || "en";
  return {
    props: {
      ...(await serverSideTranslations(currentLocale, ["common"])),
    },
  };
}