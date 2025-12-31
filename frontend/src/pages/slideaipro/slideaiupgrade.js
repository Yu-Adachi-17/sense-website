// src/pages/slideaiupgrade.js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import HomeIcon from "./homeIcon";
import { getClientAuth } from "../firebaseConfig";

const API_BASE = "https://sense-website-production.up.railway.app";

// テスト商品（本番は env 上書きできるようにしておく）
const PRODUCT_SLIDEAI_MONTHLY =
  process.env.NEXT_PUBLIC_STRIPE_PRODUCT_SLIDEAI || "prod_ThflbIcHUiOs5j";
const PRODUCT_SLIDEAI_YEARLY =
  process.env.NEXT_PUBLIC_STRIPE_PRODUCT_SLIDEAI_YEARLY || "prod_ThfmqAQAfG5Ac0";

function PriceButton({ onClick, disabled, title, price, unit, badge }) {
  return (
    <button type="button" className="planBtn" onClick={onClick} disabled={!!disabled} aria-label={title}>
      <div className="topRow">
        <div className="planTitle">{title}</div>
        {badge ? <div className="badge">{badge}</div> : <div />}
      </div>

      <div className="priceRow">
        <span className="price">{price}</span>
        <span className="unit">{unit}</span>
      </div>

      <div className="ctaRow">
        <span className="ctaText">{disabled ? "Opening..." : "Continue to Checkout"}</span>
      </div>

      <style jsx>{`
        .planBtn {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
          border-radius: 22px;
          padding: 18px 18px;
          text-align: left;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
          display: grid;
          gap: 10px;
        }
        .planBtn:hover {
          transform: translateY(-2px);
          border-color: rgba(140, 210, 255, 0.35);
          background: rgba(255, 255, 255, 0.075);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
        }
        .planBtn:active {
          transform: translateY(-1px);
        }
        .planBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none !important;
        }

        .topRow {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
        }
        .planTitle {
          font-weight: 900;
          letter-spacing: 0.2px;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.92);
        }
        .badge {
          font-size: 11px;
          font-weight: 900;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(220, 245, 255, 0.92);
          white-space: nowrap;
        }

        .priceRow {
          display: flex;
          align-items: baseline;
          gap: 10px;
          line-height: 1;
        }
        .price {
          font-weight: 950;
          letter-spacing: -0.02em;
          font-size: 40px;
          background: linear-gradient(90deg, #7cc7ff 0%, #8db4ff 35%, #65e0c4 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 10px 34px rgba(100, 160, 255, 0.20);
        }
        .unit {
          font-weight: 900;
          font-size: 14px;
          opacity: 0.85;
        }

        .ctaRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ctaText {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.15px;
          opacity: 0.88;
        }

        @media (max-width: 640px) {
          .price {
            font-size: 36px;
          }
        }
      `}</style>
    </button>
  );
}

export default function SlideAIUpgrade({ siteUrl }) {
  const [authInstance, setAuthInstance] = useState(null);
  const [loadingProductId, setLoadingProductId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        const auth = await getClientAuth();
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
      console.error("productId is undefined");
      return;
    }
    if (!authInstance || !authInstance.currentUser) {
      alert("Login required. Please log in first.");
      return;
    }

    const userId = authInstance.currentUser.uid;
    setLoadingProductId(productId);

    try {
      const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
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
        alert("Checkout URL not found. Please check server logs.");
      }
    } catch (e) {
      console.error("Error during checkout:", e);
      alert("Checkout failed. Please check server logs.");
    } finally {
      setLoadingProductId(null);
    }
  };

  const plans = useMemo(
    () => [
      {
        key: "monthly",
        title: "SlideAI Monthly",
        price: "$9.99",
        unit: "/month",
        pid: PRODUCT_SLIDEAI_MONTHLY,
        badge: "Most flexible",
        bullets: ["Unlimited slide generations", "Faster rendering pipeline", "Priority improvements"],
      },
      {
        key: "yearly",
        title: "SlideAI Yearly",
        price: "$89.99",
        unit: "/year",
        pid: PRODUCT_SLIDEAI_YEARLY,
        badge: "Best value",
        bullets: ["Everything in Monthly", "Lower effective monthly cost", "Stable access for long projects"],
      },
    ],
    []
  );

  const canonical = `${siteUrl || "https://www.sense-ai.world"}/slideaiupgrade`;

  return (
    <>
      <Head>
        <title>SlideAI Pro — Upgrade</title>
        <meta name="description" content="Upgrade SlideAI Pro: Monthly or Yearly plan." />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SlideAI Pro — Upgrade" />
        <meta property="og:description" content="Upgrade SlideAI Pro: Monthly or Yearly plan." />
        <meta property="og:url" content={canonical} />
      </Head>

      <div className="page">
        <div className="bg" />

        {/* Top-left back (to SlideAI Pro) */}
        <div className="homeBtnWrap">
          <Link href="/slideaipro" aria-label="Back to SlideAI Pro" className="homeBtn">
            <HomeIcon size={26} color="currentColor" />
          </Link>
        </div>

        <main className="main">
          <header className="head">
            <div className="kicker">Upgrade</div>
            <h1 className="h1">SlideAI Pro</h1>
            <p className="sub">Two plans. Same UI balance. Click to proceed to Stripe Checkout.</p>
          </header>

          <section className="grid" aria-label="Pricing plans">
            {plans.map((p) => (
              <div key={p.key} className="card">
                <PriceButton
                  title={p.title}
                  price={p.price}
                  unit={p.unit}
                  badge={p.badge}
                  disabled={loadingProductId === p.pid}
                  onClick={() => handleBuyClick(p.pid)}
                />
                <ul className="bullets">
                  {p.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <p className="note">Prices are shown in USD. Taxes may apply by region. Auto-renew; cancel anytime.</p>
        </main>

        {/* Footer (company / legal) */}
        <footer className="footer" role="contentinfo">
          <div className="footInner">
            <div className="legal">
              <Link href="/terms-of-use" className="legalLink">
                Terms of Use
              </Link>
              <span className="sep">·</span>
              <Link href="/privacy-policy" className="legalLink">
                Privacy Policy
              </Link>
              <span className="sep">·</span>
              <Link href="/company" className="legalLink">
                Company
              </Link>
            </div>
            <div className="copy">© {new Date().getFullYear()} Sense G.K. All rights reserved.</div>
          </div>
        </footer>

        <style jsx>{`
          .page {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
            color: rgba(255, 255, 255, 0.92);
          }
          .bg {
            position: absolute;
            inset: 0;
            background: radial-gradient(1200px 800px at 10% -20%, rgba(70, 69, 255, 0.25), transparent),
              radial-gradient(800px 600px at 100% 0%, rgba(192, 132, 252, 0.18), transparent),
              radial-gradient(1200px 900px at 50% 120%, rgba(20, 35, 60, 0.85), rgba(5, 6, 14, 1));
          }

          .homeBtnWrap {
            position: fixed;
            left: 18px;
            top: 18px;
            z-index: 50;
          }
          .homeBtn {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(10px);
            color: rgba(255, 255, 255, 0.9);
            text-decoration: none;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
            transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
          }
          .homeBtn:hover {
            transform: translateY(-1px);
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(140, 210, 255, 0.28);
          }

          .main {
            position: relative;
            z-index: 2;
            max-width: 1100px;
            margin: 0 auto;
            padding: 86px 22px 70px;
            display: grid;
            gap: 18px;
          }

          .head {
            text-align: center;
            display: grid;
            gap: 8px;
            padding-top: 10px;
          }
          .kicker {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.22em;
            opacity: 0.8;
            text-transform: uppercase;
          }
          .h1 {
            margin: 0;
            font-size: clamp(40px, 6.3vw, 78px);
            line-height: 1.05;
            letter-spacing: -0.02em;
            font-weight: 950;
            background: linear-gradient(90deg, #7cc7ff 0%, #8db4ff 35%, #65e0c4 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }
          .sub {
            margin: 0;
            font-weight: 800;
            opacity: 0.9;
            font-size: clamp(14px, 1.8vw, 18px);
          }

          .grid {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: clamp(14px, 2.8vw, 28px);
            align-items: start;
          }
          @media (max-width: 980px) {
            .grid {
              grid-template-columns: 1fr;
            }
          }

          .card {
            display: grid;
            gap: 12px;
          }

          .bullets {
            list-style: none;
            margin: 0;
            padding: 0 6px;
            display: grid;
            gap: 8px;
            font-weight: 800;
            opacity: 0.92;
          }
          .bullets li::before {
            content: "• ";
            opacity: 0.85;
          }

          .note {
            text-align: center;
            font-size: 12px;
            font-weight: 800;
            opacity: 0.72;
            margin: 4px 0 0;
          }

          .footer {
            position: relative;
            z-index: 2;
            padding: 18px 22px 26px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            background: linear-gradient(0deg, rgba(10, 14, 28, 0.65) 0%, rgba(10, 14, 28, 0.30) 100%);
          }
          .footInner {
            max-width: 1100px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .legal {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            opacity: 0.78;
            flex-wrap: wrap;
          }
          .legalLink {
            color: rgba(234, 244, 247, 0.92);
            text-decoration: none;
          }
          .sep {
            opacity: 0.55;
          }
          .copy {
            font-size: 13px;
            opacity: 0.75;
            white-space: nowrap;
          }
          @media (max-width: 640px) {
            .footInner {
              flex-direction: column;
              gap: 8px;
            }
          }
        `}</style>

        <style jsx global>{`
          html,
          body,
          #__next {
            height: 100%;
          }
          body {
            margin: 0;
            overflow-x: hidden;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          }
        `}</style>
      </div>
    </>
  );
}

export async function getStaticProps() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  return { props: { siteUrl }, revalidate: 600 };
}
