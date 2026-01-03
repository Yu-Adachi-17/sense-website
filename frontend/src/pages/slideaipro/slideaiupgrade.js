// src/pages/slideaipro/slideaiupgrade.js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { getClientAuth } from "../../firebaseConfig";

export default function SlideAIUpgrade({ siteUrl }) {
  const router = useRouter();
  const year = useMemo(() => new Date().getFullYear(), []);
  const pageTitle = "SlideAI Pro — Upgrade";
  const canonical = `${siteUrl}/slideaipro/slideaiupgrade`;

  const [isChecking, setIsChecking] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SlideAI Pro — Upgrade",
    url: canonical,
    isPartOf: {
      "@type": "Organization",
      name: "Sense G.K.",
      url: siteUrl,
      email: "info@sense-ai.world",
    },
  };

  const buildLoginUrl = (nextPath) => {
    const next = encodeURIComponent(nextPath);
    return `/login?next=${next}&src=slideaipro`;
  };

  const getSignedInUserOnce = async () => {
    const auth = await getClientAuth();
    if (!auth) return null;
    const { onAuthStateChanged } = await import("firebase/auth");
    return await new Promise((resolve) => {
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        try {
          unsub();
        } catch {}
        resolve(null);
      }, 1800);

      const unsub = onAuthStateChanged(auth, (u) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        try {
          unsub();
        } catch {}
        resolve(u || null);
      });
    });
  };

  useEffect(() => {
    if (!router.isReady) return;

    const src = String(router.query?.src || "");
    if (src !== "slideaipro") {
      router.replace("/slideaipro");
      return;
    }

    (async () => {
      try {
        const user = await getSignedInUserOnce();
        const nextPath = "/slideaipro/slideaiupgrade?src=slideaipro";
        if (!user) {
          router.replace(buildLoginUrl(nextPath));
          return;
        }
      } finally {
        setIsChecking(false);
      }
    })();
  }, [router.isReady, router.query?.src]);

const startCheckout = async (plan) => {
  if (isStarting) return;
  setIsStarting(true);

  try {
    const auth = await getClientAuth();
    const u = auth?.currentUser;
    if (!u) throw new Error("Not signed in");

    const idToken = await u.getIdToken(true);

    const resp = await fetch("/api/slideaipro/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        plan,
        successPath: "/slideaipro?upgraded=1",
        cancelPath: "/slideaipro/slideaiupgrade?src=slideaipro",
      }),
    });

    if (!resp.ok) {
      let j = null;
      try {
        j = await resp.json();
      } catch {}

      if (resp.status === 409) {
        const planName = String(j?.subscriptionPlan || "").trim();
        alert(planName ? `すでに有効なサブスクがあります: ${planName}` : "すでに有効なサブスクがあります。購入は不要です。");
        setIsStarting(false);
        return;
      }

      const txt = j ? JSON.stringify(j) : await resp.text().catch(() => "");
      throw new Error(`create-checkout-session HTTP ${resp.status} ${txt}`);
    }

    const j = await resp.json();
    const url = String(j?.url || "");
    if (!url.startsWith("http")) throw new Error("Invalid checkout url");

    window.location.assign(url);
  } catch (e) {
    console.error(e);
    alert("決済の開始に失敗しました。時間をおいて再度お試しください。");
    setIsStarting(false);
  }
};


  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content="Upgrade page for SlideAI Pro." />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content="Upgrade page for SlideAI Pro." />
        <meta property="og:url" content={canonical} />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page">
        <div className="bg" />

        <div className="topBar">
          <Link href="/slideaipro" className="backBtn" aria-label="Back to SlideAI Pro">
            <span className="backIcon" aria-hidden="true" />
            <span className="backText">Back</span>
          </Link>
        </div>

        <main className="main">
          <section className="card">
            <header className="header">
              <div className="kicker">Upgrade</div>
              <h1 className="h1">SlideAI Pro Plans</h1>
              <p className="lead">プランを選択してStripe Checkoutへ移動します。</p>
            </header>

            {isChecking ? (
              <div className="loadingBox" role="status" aria-busy="true">
                Checking your session...
              </div>
            ) : (
              <div className="grid">
                <div className="plan">
                  <div className="planName">Monthly</div>
                  <div className="planPrice">$9.99</div>
                  <div className="planUnit">per month</div>
                  <ul className="list">
                    <li>Unlimited slides</li>
                    <li>PNG / PDF export</li>
                    <li>Pro rendering</li>
                  </ul>
                  <button className="cta" type="button" disabled={isStarting} onClick={() => startCheckout("monthly")}>
                    {isStarting ? "Opening..." : "Continue"}
                  </button>
                </div>

                <div className="plan planPrimary">
                  <div className="badge">Recommended</div>
                  <div className="planName">Yearly</div>
                  <div className="planPrice">$89.99</div>
                  <div className="planUnit">per year</div>
                  <ul className="list">
                    <li>Everything in Monthly</li>
                    <li>Best value</li>
                    <li>Priority improvements</li>
                  </ul>
                  <button
                    className="cta ctaPrimary"
                    type="button"
                    disabled={isStarting}
                    onClick={() => startCheckout("yearly")}
                  >
                    {isStarting ? "Opening..." : "Continue"}
                  </button>
                </div>
              </div>
            )}

            <div className="note">
              <div className="noteTitle">Note</div>
              <div className="noteBody">支払いはStripeのテスト環境を想定しています。</div>
            </div>
          </section>

          <footer className="footer">
            <div className="footerCard">
              <div className="footerTitle">Company Information</div>

              <div className="footerGrid">
                <div className="row">
                  <div className="dt">Business Name</div>
                  <div className="dd">Sense G.K.</div>
                </div>

                <div className="row">
                  <div className="dt">Email</div>
                  <div className="dd">
                    <a className="link" href="mailto:info@sense-ai.world">
                      info@sense-ai.world
                    </a>
                  </div>
                </div>

                <div className="row">
                  <div className="dt">Responsible Officer</div>
                  <div className="dd">Yu Adachi</div>
                </div>

                <div className="row">
                  <div className="dt">Website</div>
                  <div className="dd">
                    <a className="link" href={siteUrl} target="_blank" rel="noreferrer">
                      {siteUrl}
                    </a>
                  </div>
                </div>

                <div className="row">
                  <div className="dt">Notes</div>
                  <div className="dd">Disclosed without delay upon request.</div>
                </div>
              </div>

              <div className="copyright">© {year} Sense G.K. All rights reserved.</div>
            </div>
          </footer>
        </main>

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
            background: radial-gradient(1200px 800px at 10% -20%, rgba(70, 69, 255, 0.26), transparent),
              radial-gradient(900px 700px at 100% 0%, rgba(192, 132, 252, 0.18), transparent),
              linear-gradient(180deg, #070a1f 0%, #0b1220 60%, #060816 100%);
          }

          .topBar {
            position: relative;
            z-index: 2;
            padding: 18px 18px 0;
            display: flex;
            justify-content: flex-start;
          }

          .backBtn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.06);
            text-decoration: none;
            color: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(10px);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
          }

          .backBtn:active {
            transform: scale(0.99);
          }

          .backIcon {
            width: 10px;
            height: 10px;
            border-left: 2px solid rgba(255, 255, 255, 0.9);
            border-bottom: 2px solid rgba(255, 255, 255, 0.9);
            transform: rotate(45deg);
            margin-left: 2px;
          }

          .backText {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.2px;
          }

          .main {
            position: relative;
            z-index: 2;
            max-width: 980px;
            margin: 0 auto;
            padding: 26px 18px 40px;
          }

          .card {
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.38);
            padding: 26px;
          }

          .header {
            margin-bottom: 18px;
          }

          .kicker {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 2.4px;
            text-transform: uppercase;
            color: rgba(199, 210, 254, 0.8);
          }

          .h1 {
            margin: 8px 0 0;
            font-size: 34px;
            line-height: 1.12;
            font-weight: 950;
            letter-spacing: -0.3px;
          }

          .lead {
            margin: 10px 0 0;
            color: rgba(255, 255, 255, 0.78);
            line-height: 1.55;
            font-size: 14px;
            max-width: 760px;
          }

          .loadingBox {
            margin-top: 18px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.05);
            padding: 16px;
            color: rgba(255, 255, 255, 0.78);
            font-weight: 800;
            letter-spacing: 0.2px;
          }

          .grid {
            margin-top: 18px;
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          @media (min-width: 900px) {
            .grid {
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
          }

          .plan {
            position: relative;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.10);
            padding: 18px 16px;
            box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26);
            min-height: 248px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .planPrimary {
            border-color: rgba(99, 102, 241, 0.55);
            box-shadow: 0 18px 46px rgba(99, 102, 241, 0.12), 0 14px 34px rgba(0, 0, 0, 0.26);
          }

          .badge {
            position: absolute;
            right: 14px;
            top: 14px;
            font-size: 11px;
            font-weight: 900;
            padding: 6px 10px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(99, 102, 241, 0.18);
          }

          .planName {
            font-weight: 950;
            font-size: 15px;
            letter-spacing: 0.2px;
          }

          .planPrice {
            font-size: 28px;
            font-weight: 950;
            letter-spacing: -0.3px;
          }

          .planUnit {
            margin-top: -6px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.66);
            font-weight: 800;
          }

          .list {
            margin: 6px 0 0;
            padding-left: 18px;
            color: rgba(255, 255, 255, 0.78);
            line-height: 1.6;
            font-size: 13px;
            flex: 1;
          }

          .cta {
            margin-top: 8px;
            height: 42px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.92);
            font-weight: 900;
            cursor: pointer;
          }

          .cta:disabled {
            opacity: 0.55;
            cursor: default;
          }

          .ctaPrimary {
            border-color: rgba(99, 102, 241, 0.55);
            background: rgba(99, 102, 241, 0.22);
          }

          .note {
            margin-top: 18px;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            background: rgba(255, 255, 255, 0.04);
            padding: 16px;
          }

          .noteTitle {
            font-weight: 950;
            font-size: 13px;
            letter-spacing: 0.2px;
          }

          .noteBody {
            margin-top: 6px;
            color: rgba(255, 255, 255, 0.76);
            font-size: 13px;
            line-height: 1.6;
          }

          .footer {
            margin-top: 16px;
            padding: 0 2px;
          }

          .footerCard {
            border-radius: 22px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(12px);
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
            padding: 18px 18px 14px;
          }

          .footerTitle {
            font-size: 12px;
            font-weight: 950;
            letter-spacing: 2.0px;
            text-transform: uppercase;
            color: rgba(199, 210, 254, 0.8);
            margin-bottom: 10px;
          }

          .footerGrid {
            display: grid;
            gap: 10px;
          }

          .row {
            display: grid;
            grid-template-columns: 160px 1fr;
            gap: 12px;
            align-items: start;
          }

          @media (max-width: 520px) {
            .row {
              grid-template-columns: 1fr;
              gap: 4px;
            }
          }

          .dt {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.64);
            font-weight: 800;
            letter-spacing: 0.15px;
          }

          .dd {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.86);
            line-height: 1.55;
            font-weight: 650;
          }

          .link {
            color: rgba(165, 180, 252, 0.95);
            text-decoration: underline;
            text-underline-offset: 4px;
            text-decoration-color: rgba(165, 180, 252, 0.55);
          }

          .link:hover {
            color: rgba(255, 255, 255, 0.92);
            text-decoration-color: rgba(255, 255, 255, 0.45);
          }

          .copyright {
            margin-top: 12px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.62);
            text-align: center;
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
