// frontend/src/pages/home.js
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaApple } from "react-icons/fa";
import HomeIcon from "./homeIcon"; // 自前アイコン

function FixedHeaderPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default function Home() {
  const deviceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = deviceRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          wrap.classList.add("inview");
          io.disconnect();
        }
      },
      { threshold: 0.55 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ▼ グラフ用データ（整数%：あなたのリストから算出）
const COUNTRY_PIE = [
  { label: "United States", value: 15 },
  { label: "Germany", value: 7 },
  { label: "Malaysia", value: 7 },
  { label: "Netherlands", value: 6 },
  { label: "United Kingdom", value: 5 },
  { label: "Other", value: 60 },    // 端数調整ずみ（合計100%）
];

const LANGUAGE_PIE = [
  { label: "English", value: 40 },
  { label: "German", value: 9 },
  { label: "Arabic", value: 8 },
  { label: "Malay", value: 7 },
  { label: "Dutch", value: 6 },
  { label: "Other", value: 30 },    // 合計100%
];

// conic-gradient の color スキーム（6色）
const PIE_COLORS = [
  "hsl(200 90% 60%)",
  "hsl(160 70% 55%)",
  "hsl(260 70% 65%)",
  "hsl(20 85% 60%)",
  "hsl(45 90% 60%)",
  "hsl(0 0% 70%)",
];

// パーセント配列 → conic-gradient() 文字列に変換
function makeConic(data) {
  let acc = 0;
  return data
    .map((d, i) => {
      const start = acc;
      acc += d.value;
      return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${acc}%`;
    })
    .join(", ");
}


  // ▼ Simply ultimate. セクション用（小見出し sub を追加）
  const [active, setActive] = useState("tap");
  const radioGroupRef = useRef(null);
  const steps = [
    {
      key: "tap",
      label: "Tap",
      img: "/images/demo-tap.png",
      sub: "Tap to start recording.",
    },
    {
      key: "stop",
      label: "Stop",
      img: "/images/demo-stop.png",
      sub: "Stop when you’re done.",
    },
    {
      key: "wrap",
      label: "Wrap",
      img: "/images/demo-wrap.png",
      sub: "AI writes the minutes—automatically.",
    },
  ];
  const idx = steps.findIndex((s) => s.key === active);
  const move = (delta) => {
    const n = (idx + delta + steps.length) % steps.length;
    setActive(steps[n].key);
    requestAnimationFrame(() => {
      const nodes = radioGroupRef.current?.querySelectorAll('[role="radio"]');
      nodes?.[n]?.focus();
    });
  };
  const onRadioKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setActive(steps[idx].key);
    }
  };

  const LINK_MAIN = "https://www.sense-ai.world";
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";

  return (
    <>
      <Head>
        <title>Minutes.AI — Home</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* ▼ ここから追加（英語版） */}
        {/* Basics */}
        <meta
          name="description"
          content="Automatically create beautiful meeting minutes with AI. Record once, get accurate transcripts with clear decisions and action items. Works on iPhone and the web."
        />
        <link rel="canonical" href="https://www.sense-ai.world/" />

        {/* OGP / Twitter (kept concise; OG/Twitter meta must live in <head>) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.sense-ai.world/" />
        <meta property="og:title" content="Minutes.AI — AI Meeting Minutes" />
        <meta
          property="og:description"
          content="Record your meeting and let AI produce clean, human-ready minutes—decisions and to-dos at a glance."
        />
        <meta
          property="og:image"
          content="https://www.sense-ai.world/og-image.jpg"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@your_brand" />
        {/* ▲ OGP/Twitter: in <head> per Open Graph & X docs. */}

        {/* (Enable when i18n goes live)
        <link rel="alternate" hrefLang="en" href="https://www.sense-ai.world/" />
        <link rel="alternate" hrefLang="ja" href="https://www.sense-ai.world/ja" />
        <link rel="alternate" hrefLang="x-default" href="https://www.sense-ai.world/" />
        */}

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "name": "Sense LLC",
                  "url": "https://www.sense-ai.world/",
                  "logo": "https://www.sense-ai.world/logo.png"
                },
                {
                  "@type": "WebSite",
                  "url": "https://www.sense-ai.world/",
                  "name": "Minutes.AI"
                },
                {
                  "@type": "SoftwareApplication",
                  "name": "Minutes.AI",
                  "applicationCategory": "BusinessApplication",
                  "operatingSystem": "iOS, Web",
                  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
                  "downloadUrl":
                    "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901"
                }
              ]
            })
          }}
        />
        {/* ▲ ここまで追加 */}
      </Head>


      {/* ===== Fixed Header ===== */}
      <FixedHeaderPortal>
        <header className="top">
          <a href="/" className="brand" aria-label="Minutes.AI Home">
            <span className="brandIcon" aria-hidden="true">
              <HomeIcon size={26} color="currentColor" />
            </span>
            <span className="brandText">
              Minutes.<span className="ai">AI</span>
            </span>
          </a>

          <nav className="nav" aria-label="Primary">
            <a href="/" className="navLink">
              <span className="navText gradHeader">Home</span>
            </a>
            <a href={LINK_IOS} className="navLink" rel="noopener noreferrer">
              <FaApple className="apple" aria-hidden="true" />
              <span className="navText gradHeader">iOS</span>
            </a>
          </nav>
        </header>
      </FixedHeaderPortal>

      {/* ===== Main ===== */}
      <main className="scene">
        {/* ヒーロー */}
        <h1 className="heroTop">Just Record.</h1>

        {/* 背景 */}
        <div className="space" aria-hidden />

        {/* 球体 */}
        <div className="core" aria-hidden>
          <div className="coreGlow" />
          <div className="shine" />
          <div className="orbits" />
          <div className="starEmitter" aria-hidden>
            {Array.from({ length: 36 }).map((_, i) => {
              const spd = 2.4 + (i % 7) * 0.15;
              const delay = -((i * 173) % 900) / 300;
              const size = 1 + ((i * 37) % 3) * 0.4;
              const alpha = 0.55 + (((i * 29) % 40) / 100);
              const tail = 20 + ((i * 67) % 24);
              return (
                <i
                  key={i}
                  style={{
                    ["--i"]: i,
                    ["--N"]: 36,
                    ["--spd"]: `${spd}s`,
                    ["--delay"]: `${delay}s`,
                    ["--sz"]: `${size}px`,
                    ["--alpha"]: alpha,
                    ["--tail"]: `${tail}px`,
                  }}
                />
              );
            })}
          </div>
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />
          <div className="starsBelt" />
        </div>

        {/* ▼ 球体の下（通常フロー化：スクロールできるように） */}
        <section className="below">
          <div className="line1 sameSize">AI Makes</div>
          <div className="line2 gradText sameSize">Beautiful&nbsp;Minutes</div>

          {/* ガラス調デバイス */}
          <div className="deviceStage">
            <div
              className="deviceGlass"
              aria-label="Minutes preview surface"
              ref={deviceRef}
            >
              <article className="minutesWrap" ref={wrapRef}>
                <h2 className="mtitle gradDevice">
                  AI Minutes Meeting — Product Launch Planning
                </h2>
                <div className="mdate">
                  <time dateTime="2025-10-01">Oct 1, 2025 (JST)</time>
                </div>
                <div className="mhr" />
                <div className="minutesFlow">
                  <h3 className="mhead gradDevice">Meeting Objective</h3>
                  <p className="fline">
                    We agreed to create overwhelmingly beautiful minutes by using
                    cutting-edge AI. Every voice is captured, distilled, and structured so
                    decisions, intent, and ownership are obvious at a glance, while the
                    wording stays natural and search-friendly for wider discovery.
                  </p>

                  <h3 className="mhead gradDevice">Decisions</h3>
                  <p className="fline">
                    We decided to rely on advanced transcription and summarization to
                    deliver clean, human-ready minutes. Headings and highlights are
                    formatted for SEO without losing nuance, ensuring effortless reading,
                    sharing, and trust across mobile and desktop.
                  </p>

                  <h3 className="mhead gradDevice">Next Steps</h3>
                  <p className="fline">
                    We will record real meetings, refine prompts and layout, and publish a
                    live showcase. The priority is speed to value: frictionless capture,
                    instant clarity, and a polished look that proves AI makes minutes
                    people actually enjoy reading.
                  </p>
                </div>
              </article>
            </div>

            {/* CTA */}
            <a href={LINK_MAIN} className="ctaBig" rel="noopener noreferrer">
              Get Started
            </a>
          </div>

          {/* ====== Simply ultimate.（Get Started の直下） ====== */}
          <section className="simply" aria-labelledby="simplyTitle">
            <div className="simplyGrid">
              {/* 左：タイトル＋3アクション */}
              <div className="simplyLeft">
                <h2 id="simplyTitle" className="simplyH2">Simply ultimate.</h2>

                <div
                  className="stepList"
                  role="radiogroup"
                  aria-label="Actions"
                  ref={radioGroupRef}
                >
                  {steps.map((s, i) => {
                    const checked = active === s.key;
                    return (
                      <button
                        key={s.key}
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        className={`stepBtn${checked ? " isActive" : ""}`}
                        onMouseEnter={() => setActive(s.key)}
                        onFocus={() => setActive(s.key)}
                        onKeyDown={onRadioKey}
                        onClick={() => setActive(s.key)}
                        type="button"
                      >
                        <span className="row">
                          <span className="dot" aria-hidden="true" />
                          <span className="lbl">{s.label}</span>
                        </span>
                        <span className="sub">{s.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 右：モック画面（フェード切替 / 画像は仮） */}
              <div className="simplyRight" aria-live="polite">
  {steps.map((s) => (
    <figure
      key={s.key}
      className={`shot${active === s.key ? " isOn" : ""}`}
      aria-hidden={active !== s.key}
      style={{ margin: 0 }}
    >
      {/* 意味のあるビジュアルは <img> で */}
      <img
        src={s.img}
        alt={
          s.key === "tap"
            ? "Tap to start recording"
            : s.key === "stop"
            ? "Stop the recording"
            : "AI creates minutes automatically"
        }
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      {/* 説明テキスト（ここが検索にも効く） */}
      <figcaption className="shotCaption">
        {s.key === "tap" && (
          <p>Press the button to start recording.</p>
        )}
        {s.key === "stop" && (
          <p>Press to finish; AI transcribes and drafts minutes automatically.</p>
        )}
        {s.key === "wrap" && (
          <p>Get beautifully formatted minutes, a To-Do list, and the full transcript.</p>
        )}
      </figcaption>
    </figure>
  ))}
  {/* ===== Global footprint ===== */}
<section className="reach" aria-labelledby="reachTitle">
  <div className="reachInner">
    <h2 id="reachTitle" className="reachH2">
      30,000 iOS downloads worldwide
    </h2>
    <p className="reachNote">
      * App Store cumulative downloads. Percentages are computed from the
      country list you provided (n=26,100). Language shares are aggregated by each territory’s primary language.
    </p>

    <div className="reachGrid">
      {/* 左：国別（トップ5＋その他） */}
      <figure className="pieCard">
        <div
          className="pie"
          role="img"
          aria-label="Top countries share of installs: United States 15%, Germany 7%, Malaysia 7%, Netherlands 6%, United Kingdom 5%, Other 60%"
          style={{ background: `conic-gradient(${makeConic(COUNTRY_PIE)})` }}
        />
        <figcaption className="pieCap">Top countries (share of installs)</figcaption>
        <ul className="legend">
          {COUNTRY_PIE.map((d, i) => (
            <li key={d.label}>
              <i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="lgName">{d.label}</span>
              <span className="lgVal">{d.value}%</span>
            </li>
          ))}
        </ul>
      </figure>

      {/* 右：言語別（トップ5＋その他） */}
      <figure className="pieCard">
        <div
          className="pie"
          role="img"
          aria-label="Languages coverage: English 40%, German 9%, Arabic 8%, Malay 7%, Dutch 6%, Other 30%"
          style={{ background: `conic-gradient(${makeConic(LANGUAGE_PIE)})` }}
        />
        <figcaption className="pieCap">Languages (approx.)</figcaption>
        <ul className="legend">
          {LANGUAGE_PIE.map((d, i) => (
            <li key={d.label}>
              <i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="lgName">{d.label}</span>
              <span className="lgVal">{d.value}%</span>
            </li>
          ))}
        </ul>
      </figure>
    </div>
  </div>
</section>

</div>

            </div>
          </section>

          {/* iPhoneアプリ訴求 */}
          <section className="appPromo" aria-labelledby="appPromoHead">
            <div className="promoGrid">
              <div className="promoCopy">
                <h2 id="appPromoHead" className="promoH2">
                  iPhone App is <span className="gradText">Available</span>
                </h2>
                <p className="promoSub">
                  Record on iPhone and get Beautiful Minutes instantly.
                </p>
                <a
                  href={LINK_IOS}
                  className="promoCta"
                  rel="noopener noreferrer"
                >
                  <FaApple aria-hidden="true" />
                  <span>Download on iOS</span>
                </a>
              </div>

              <div className="promoVisual">
                <img
                  src="/images/hero-phone.png"
                  alt="Minutes.AI iPhone App"
                  loading="lazy"
                />
              </div>
            </div>
          </section>
        </section>

        {/* 反射の霞 */}
        <div className="reflection" aria-hidden />
      </main>

      {/* ===== Page Footer ===== */}
      <footer className="pageFooter" role="contentinfo">
        <div className="footInner">
          <div className="legal">
            <a href="/terms-of-use" className="legalLink">Terms of Use</a>
            <span className="sep">·</span>
            <a href="/privacy-policy" className="legalLink">Privacy Policy</a>
          </div>
          <div className="copyright">
            &copy; Sense LLC All Rights Reserved
          </div>
        </div>
      </footer>

      {/* ===== styles ===== */}
      <style jsx>{`
        .scene {
          --bg-1: #05060e;
          --bg-2: #0b1030;
          --halo: 255, 255, 255;

          --mint: 98, 232, 203;
          --sky: 152, 209, 255;
          --ice: 204, 244, 255;

          --core-size: clamp(420px, 70vmin, 80vh);
          --ring-start-scale: 0.78;
          --ring-end-scale: 1.75;
          --ripple-period: 6s;

          position: relative;
          min-height: 100vh;

          padding-top: var(--header-offset);
          padding-bottom: 24vh;

          overflow: hidden;
          color: #fff;

          background:
            radial-gradient(130vmax 130vmax at 50% 120%, #10163a 0%, var(--bg-2) 50%, var(--bg-1) 100%),
            radial-gradient(1px 1px at 20% 30%, rgba(var(--halo),0.22) 99%, transparent 100%),
            radial-gradient(1px 1px at 80% 20%, rgba(var(--halo),0.12) 99%, transparent 100%),
            radial-gradient(1px 1px at 30% 70%, rgba(var(--halo),0.14) 99%, transparent 100%),
            radial-gradient(1px 1px at 60% 50%, rgba(var(--halo),0.10) 99%, transparent 100%),
            radial-gradient(1px 1px at 75% 80%, rgba(var(--halo),0.10) 99%, transparent 100%);
        }

        .heroTop {
          position: relative;
          z-index: 3;
          text-align: center;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.02;
          font-weight: 800;
          color: #fff;
          font-size: clamp(33.6px, 7.44vw, 103.2px);
          filter: drop-shadow(0 0 10px rgba(160,145,255,0.35))
                  drop-shadow(0 0 2px rgba(130,150,255,0.2));
          pointer-events: none;
        }

        .below {
          position: relative;
          z-index: 3;
          text-align: center;
          pointer-events: auto;
          width: 100%;
          margin: 0 auto;
          margin-top: calc(60vh + (var(--core-size) / 2) + 6vh);
        }

        .sameSize { font-weight: 800; letter-spacing: -0.02em; line-height: 1.06;
          font-size: clamp(33.6px, 7.44vw, 103.2px); margin: 0; }
        .line1 { color: #fff; }
        .line2 { margin-top: 8px; }

        .gradText, .gradDevice {
          background: linear-gradient(90deg, #65e0c4 0%, #8db4ff 65%, #7cc7ff 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          -webkit-text-fill-color: transparent;
        }

        .deviceStage { pointer-events: auto; margin: clamp(16px, 5vh, 44px) auto 0;
          width: min(calc(94vw * 0.8), 1024px); }

        .deviceGlass {
          --glassA: 36, 48, 72; --glassB: 56, 78, 96;
          position: relative; width: 100%; aspect-ratio: 4 / 3;
          border-radius: clamp(22px, 3.2vmax, 44px); overflow: hidden;
          background: linear-gradient(180deg, rgba(var(--glassA),0.55) 0%, rgba(var(--glassB),0.50) 100%);
          -webkit-backdrop-filter: blur(18px) saturate(120%); backdrop-filter: blur(18px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 30px 90px rgba(10,20,60,0.35), 0 12px 26px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.20);
        }
        .deviceGlass::before { content:""; position:absolute; inset:0; border-radius:inherit;
          background: radial-gradient(140% 100% at 12% -10%, rgba(255,255,255,0.10) 0%,
            rgba(255,255,255,0.04) 36%, rgba(255,255,255,0.00) 60%),
            linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.00) 40%);
          mix-blend-mode: screen; pointer-events: none; }
        .deviceGlass::after { content:""; position:absolute; inset:0; border-radius:inherit;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 60px rgba(0,0,0,0.24);
          pointer-events:none; }

        .minutesWrap{ position:absolute; inset:0; box-sizing:border-box;
          padding: clamp(14px, 3vw, 28px); color: rgba(255,255,255,0.92);
          line-height: 1.55; text-align: left !important; overflow: hidden; pointer-events: none;
          clip-path: inset(100% 0 0 0); transform: translateY(8%); opacity: 0.001;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%);
        }
        .minutesWrap.inview{ animation: fullReveal 900ms cubic-bezier(0.16,0.66,0.38,1) forwards; }
        @keyframes fullReveal{
          0% { clip-path: inset(100% 0 0 0); transform: translateY(12%); opacity: 0.001; }
          60%{ clip-path: inset(0 0 0 0);    transform: translateY(0%);   opacity: 1; }
          100%{clip-path: inset(0 0 0 0);    transform: translateY(0%);   opacity: 1; }
        }

        .mtitle{ font-weight: 800; letter-spacing: -0.01em; font-size: clamp(36px, 4.2vw, 56px); margin: 0 0 6px 0; }
        .mdate{ font-weight: 600; opacity: 0.85; font-size: clamp(26px, 2.7vw, 32px); margin-bottom: clamp(12px, 1.6vw, 16px); }
        .mhr{ height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08));
          margin: clamp(10px, 1.8vw, 18px) 0; }
        .mhead{ font-weight: 800; font-size: clamp(28px, 3vw, 36px); margin: clamp(10px, 1.6vw, 16px) 0 8px 0; }

        .minutesFlow > * { opacity: 0; transform: translateY(18px); }
        .minutesWrap.inview .minutesFlow > * { animation: rise 700ms cubic-bezier(0.16,0.66,0.38,1) forwards; }
        .minutesWrap.inview .minutesFlow > *:nth-child(1) { animation-delay: 80ms; }
        .minutesWrap.inview .minutesFlow > *:nth-child(2) { animation-delay: 150ms; }
        .minutesWrap.inview .minutesFlow > *:nth-child(3) { animation-delay: 220ms; }
        .minutesWrap.inview .minutesFlow > *:nth-child(4) { animation-delay: 290ms; }
        .minutesWrap.inview .minutesFlow > *:nth-child(5) { animation-delay: 360ms; }
        .minutesWrap.inview .minutesFlow > *:nth-child(6) { animation-delay: 430ms; }
        .minutesWrap.inview .minutesFlow > *:nth-child(7) { animation-delay: 500ms; }
        @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

        .fline{ font-weight: 700; font-size: clamp(24px, 2.5vw, 30px); margin: 0 0 clamp(16px, 2.4vw, 22px) 0; }

        .space { position:absolute; inset:-20vmin;
          background: radial-gradient(closest-side, transparent 56%, rgba(var(--halo),0.05) 57%, transparent 58%) center/120vmin 120vmin no-repeat;
          filter: blur(0.4px); opacity: 0.35; }

        .core { position:absolute; left:50%; top:60vh; transform: translate(-50%, -50%);
          width: var(--core-size); height: var(--core-size); border-radius: 50%; pointer-events: none; z-index: 1; }

        .coreGlow { position:absolute; inset:0; border-radius:50%;
          background: radial-gradient(circle at 50% 50%, rgba(var(--halo),1) 0%,
            rgba(242,238,255,0.98) 8%, rgba(206,196,255,0.92) 18%, rgba(178,164,255,0.80) 32%,
            rgba(131,146,255,0.58) 48%, rgba(92,118,255,0.38) 62%, rgba(55,88,255,0.22) 72%, rgba(0,0,0,0) 78%);
          filter: blur(10px) saturate(125%) contrast(105%); animation: breathe 6s ease-in-out infinite; }

        .shine { position:absolute; inset:0; border-radius:50%;
          background: radial-gradient(60% 18% at 50% 50%, rgba(var(--halo),0.95) 0%, rgba(var(--halo),0) 100%),
                      radial-gradient(28% 10% at 50% 50%, rgba(var(--halo),0.85) 0%, rgba(var(--halo),0) 100%);
          mix-blend-mode: screen; filter: blur(6px); opacity: 0.7; animation: breathe 6s ease-in-out infinite reverse; }

        .orbits { position:absolute; inset:-3%; border-radius:50%;
          background: radial-gradient(closest-side, rgba(255,255,255,0.04) 55%, transparent 56%) center/100% 100% no-repeat;
          mix-blend-mode: screen; filter: blur(0.5px); opacity: 0.45; }

        .starEmitter { position:absolute; inset:0; border-radius:50%; pointer-events:none; z-index:2; --N:36; --emit-radius: calc(var(--core-size) * 0.96); }
        .starEmitter i { position:absolute; left:50%; top:50%; width:var(--sz,1.4px); height:var(--sz,1.4px); border-radius:50%;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.65) 60%, rgba(255,255,255,0) 70%);
          box-shadow: 0 0 6px rgba(180,200,255,0.55); opacity:0; mix-blend-mode: screen; backface-visibility:hidden;
          will-change: transform, opacity; --a: calc(360deg * (var(--i) / var(--N)));
          transform: rotate(var(--a)) translateX(0) scale(1); animation: shoot var(--spd,2.8s) linear infinite;
          animation-delay: var(--delay,0s); }
        .starEmitter i::after { content:""; position:absolute; left: calc(-1 * var(--tail,28px)); top:50%;
          transform: translateY(-50%); width: var(--tail,28px); height:1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0));
          filter: blur(0.6px); opacity: calc(var(--alpha,0.8) * 0.7); pointer-events:none; }
        @keyframes shoot {
          0%   { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 0; }
          8%   { opacity: var(--alpha, 0.9); }
          60%  { transform: rotate(var(--a)) translateX(calc(var(--emit-radius) * 0.66)) scale(0.9); opacity: calc(var(--alpha, 0.9) * 0.5); }
          100% { transform: rotate(var(--a)) translateX(var(--emit-radius)) scale(0.82); opacity: 0; }
        }

        .ring { --size: calc(var(--core-size) * 0.82); position:absolute; left:50%; top:50%;
          transform: translate(-50%, -50%) scale(var(--ring-start-scale)); width:var(--size); height:var(--size); border-radius:50%;
          box-shadow: 0 0 42px rgba(188,166,255,0.45), inset 0 0 38px rgba(107,134,255,0.28);
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(188,166,255,0.55) 30%, rgba(120,140,255,0.22) 52%, rgba(0,0,0,0) 62%);
          filter: blur(0.25px); opacity: 0.9;
          animation: ripple var(--ripple-period) cubic-bezier(0.16,0.66,0.38,1) infinite; animation-delay: var(--d); }

        .starsBelt { position:absolute; left:50%; top:50%; transform: translate(-50%, -50%);
          width: calc(var(--core-size) * 1.06); height: calc(var(--core-size) * 1.06); border-radius:50%; pointer-events:none;
          mix-blend-mode: screen; opacity: 0.55;
          background:
            radial-gradient(1.2px 1.2px at 12% 18%, rgba(255,255,255,0.95) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 22% 36%, rgba(255,255,255,0.85) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 32% 64%, rgba(255,255,255,0.9) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 44% 26%, rgba(255,255,255,0.8) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 58% 72%, rgba(255,255,255,0.75) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 66% 40%, rgba(255,255,255,0.85) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 74% 58%, rgba(255,255,255,0.9) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 82% 30%, rgba(255,255,255,0.8) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 16% 76%, rgba(255,255,255,0.85) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 88% 64%, rgba(255,255,255,0.75) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 38% 86%, rgba(255,255,255,0.9) 99%, transparent 100%),
            radial-gradient(1.2px 1.2px at 70% 86%, rgba(255,255,255,0.8) 99%, transparent 100%);
          -webkit-mask: radial-gradient(circle at 50% 50%, transparent 0 62%, #fff 64% 70%, transparent 72% 100%);
          mask: radial-gradient(circle at 50% 50%, transparent 0 62%, #fff 64% 70%, transparent 72% 100%);
          animation: twinkle 4s ease-in-out infinite alternate; }

        .reflection { position:absolute; left:50%; bottom:0; transform: translateX(-50%);
          width: 200vmax; height: 40vh;
          background: radial-gradient(120vmin 60% at 50% 0%, rgba(140,150,255,0.28) 0%, rgba(140,150,255,0.10) 40%, transparent 75%);
          filter: blur(14px); opacity: 0.7; }

        /* CTA */
        .ctaBig {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 28px;
          border-radius: 999px;
          background: #0b2b3a;
          color: #eaf4f7;
          text-decoration: none;
          font-weight: 700;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset,
                      0 8px 24px rgba(0, 0, 0, 0.25);
          margin: clamp(16px, 3.5vh, 28px) auto 0;
        }

        /* ===== Simply ultimate. ===== */
        .simply { margin: clamp(28px, 8vh, 80px) auto; padding: 0 22px; max-width: 1200px; }
        .simplyGrid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          align-items: center;
          gap: clamp(16px, 3.5vw, 36px);
        }
        .simplyLeft { text-align: left; }
        /* ① 「Simply ultimate.」を最大に */
        .simplyH2 {
          margin: 0 0 12px 0;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.02;
          font-size: clamp(48px, 9vw, 128px);
          color: #fff;
        }
        .stepList { display: flex; flex-direction: column; gap: clamp(4px, 1vh, 8px); }
        .stepBtn {
          display: flex; flex-direction: column; align-items: flex-start;
          background: transparent; border: 0; padding: 12px 10px;
          cursor: pointer; text-align: left; border-radius: 14px;
          transition: background 200ms ease, transform 200ms ease;
        }
        .stepBtn:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }
        .stepBtn:focus-visible { outline: 2px solid rgba(140,170,255,0.8); outline-offset: 2px; }
        .stepBtn .row { display: inline-flex; align-items: center; gap: 12px; }
        .stepBtn .dot {
          width: 10px; height: 10px; border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.2) inset;
          background: rgba(255,255,255,0.35);
          transform: scale(0.9);
        }
        .stepBtn.isActive .dot { background: linear-gradient(90deg,#65e0c4,#8db4ff); transform: scale(1); }
        /* ① Tap/Stop/Wrap は一段下げたサイズに */
        .stepBtn .lbl {
          font-weight: 900; letter-spacing: -0.02em; line-height: 1.02;
          font-size: clamp(28px, 6vw, 64px); color: #eaf4f7;
          -webkit-text-fill-color: currentColor;
        }
        .stepBtn.isActive .lbl,
        .stepBtn:hover .lbl {
          background: linear-gradient(90deg, #65e0c4, #8db4ff 65%, #7cc7ff);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          -webkit-text-fill-color: transparent;
        }
        /* ② 小見出し */
        .stepBtn .sub {
          margin-left: 22px;
          margin-top: 4px;
          font-weight: 700;
          line-height: 1.35;
          color: #cfe7ff;
          opacity: 0.92;
          font-size: clamp(14px, 1.8vw, 18px);
        }
        .stepBtn.isActive .sub,
        .stepBtn:hover .sub { color: #eaf6ff; }

        .simplyRight {
          position: relative;
          border-radius: clamp(18px, 2.2vmax, 28px);
          min-height: 340px;
          aspect-ratio: 16 / 11;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(36,48,72,0.55) 0%, rgba(56,78,96,0.50) 100%);
          -webkit-backdrop-filter: blur(14px) saturate(120%); backdrop-filter: blur(14px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .shot {
          position: absolute; inset: 0; opacity: 0; transition: opacity 320ms ease;
          background-image:
            var(--img),
            radial-gradient(140% 100% at 12% -10%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.00) 60%);
          background-size: cover; background-position: center;
        }
.shot { position: absolute; inset: 0; opacity: 0; transition: opacity .28s ease; }
.shot.isOn { opacity: 1; }
.shotCaption {
  position: absolute;
  left: 50%;
  bottom: 16px;            /* ここはお好みで */
  transform: translateX(-50%);
  max-width: 86%;
  text-align: center;       /* テキストも中央寄せ */
  font-weight: 700;
  line-height: 1.35;
  background: rgba(0,0,0,.45);
  backdrop-filter: blur(6px);
  border-radius: 12px;
  padding: 10px 12px;
}
.reach { margin: clamp(28px, 10vh, 120px) auto; padding: 0 22px; max-width: 1200px; }
.reachInner { display: grid; gap: 12px; }
.reachH2 {
  margin: 0; font-weight: 900; letter-spacing: -0.02em; line-height: 1.05;
  font-size: clamp(28px, 6vw, 56px); color: #fff;
}
.reachNote { margin: 2px 0 10px; opacity: .7; font-size: 13px; }

.reachGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(16px, 3vw, 28px);
}

.pieCard {
  margin: 0; padding: 16px; border-radius: 18px;
  background: linear-gradient(180deg, rgba(36,48,72,0.55), rgba(56,78,96,0.50));
  backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.10);
  box-shadow: 0 18px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.18);
}

.pie {
  width: min(320px, 66vw);
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  margin: 10px auto 12px;
  box-shadow: inset 0 0 0 8px rgba(0,0,0,.25);
}

.pieCap { text-align: center; font-weight: 800; margin: 0 0 10px; }

.legend {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px;
}
.legend li { display: grid; grid-template-columns: 16px 1fr auto; align-items: center; gap: 8px; }
.legend i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.legend .lgName { opacity: .92; }
.legend .lgVal { opacity: .8; font-weight: 800; }

@media (max-width: 900px) {
  .reachGrid { grid-template-columns: 1fr; }
}

        /* ===== iPhone App 訴求 ===== */
        .appPromo {
          pointer-events: auto;
          margin: clamp(18px, 4vh, 36px) auto clamp(64px, 10vh, 120px);
          padding: 0 22px;
          max-width: 1200px;
          text-align: left;
        }
        .promoGrid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: clamp(16px, 3vw, 32px);
        }
        .promoH2 {
          margin: 0 0 10px 0;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.05;
          font-size: clamp(36px, 7vw, 84px);
          color: #eaf4f7;
        }
        .promoSub {
          margin: 0 0 18px 0;
          opacity: 0.85;
          font-weight: 700;
          font-size: clamp(16px, 2.2vw, 20px);
        }
        .promoCta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 999px;
          background: rgba(20,40,60,0.8);
          color: #eaf4f7;
          text-decoration: none;
          font-weight: 800;
          border: 1px solid rgba(255,255,255,0.08);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
        }
        .promoCta:hover { background: rgba(20,40,60,0.92); }
        .promoVisual { display: flex; justify-content: center; }
        .promoVisual img {
          width: 100%;
          max-width: 560px;
          height: auto;
          display: block;
          border-radius: 22px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }

        @keyframes breathe { 0%,100%{ transform: scale(1); filter: blur(10px) saturate(125%) contrast(105%);}
                             50%{ transform: scale(1.02); filter: blur(12px) saturate(140%) contrast(110%);} }
        @keyframes ripple { 0%{ transform: translate(-50%,-50%) scale(var(--ring-start-scale)); opacity:0.9;}
                            70%{ opacity:0.22;} 100%{ transform: translate(-50%,-50%) scale(var(--ring-end-scale)); opacity:0;} }
        @keyframes twinkle { from{opacity:0.45;} to{opacity:0.85;} }

        @media (prefers-reduced-motion: reduce) {
          .minutesWrap, .minutesWrap.inview, .minutesFlow > *, .minutesWrap.inview .minutesFlow > * {
            animation: none !important; transition: none !important; clip-path: inset(0 0 0 0) !important;
            transform: none !important; opacity: 1 !important;
          }
        }

        @media (max-width: 1024px) {
          .simplyGrid { grid-template-columns: 1fr; }
          .simplyRight { order: -1; margin-bottom: 10px; }
        }
        @media (max-width: 900px) {
          .promoGrid { grid-template-columns: 1fr; gap: 18px; }
          .promoVisual { order: -1; }
        }
        @media (max-width: 640px) {
          .scene { --core-size: clamp(320px, 86vmin, 80vh);
            padding-bottom: 28vh; }
          .heroTop  { font-size: clamp(26.4px, 8.88vw, 72px); }
          .sameSize { font-size: clamp(26.4px, 8.88vw, 72px); }
          .deviceStage { width: min(calc(92vw * 0.8), 416px); }
          .deviceGlass { aspect-ratio: 9 / 19.5; border-radius: clamp(26px, 7.5vw, 40px); }
          .mtitle { font-size: clamp(32px, 10.4vw, 44px); }
          .mdate  { font-size: clamp(24px, 7.6vw, 30px); }
          .mhead  { font-size: clamp(26px, 8.4vw, 34px); }
          .fline  { font-size: clamp(24px, 7.6vw, 30px); }
          .stepBtn .lbl { font-size: clamp(26px, 10.5vw, 52px); }
          .stepBtn .sub { font-size: clamp(13px, 3.7vw, 16px); }
        }
      `}</style>

      <style jsx global>{`
        :root {
          --header-h: clamp(56px, 7.2vh, 72px);
          --header-py: 10px;
          --header-offset: calc(
            var(--header-h)
            + env(safe-area-inset-top, 0px)
            + (var(--header-py) * 2)
          );
        }

        header.top {
          position: fixed;
          left: 0; right: 0; top: 0;
          z-index: 2147483647;
          display: flex; justify-content: space-between; align-items: center;

          height: calc(var(--header-h) + env(safe-area-inset-top, 0px));
          padding: calc(var(--header-py) + env(safe-area-inset-top, 0px)) 22px var(--header-py);

          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          background: linear-gradient(180deg, rgba(10,14,28,0.75) 0%, rgba(10,14,28,0.45) 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        header.top .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #b6eaff;
        }
        header.top .brandText {
          font-weight: 800; font-size: 24px; letter-spacing: 0.2px;
        }
        header.top .brand .ai {
          background: linear-gradient(90deg, #7cc7ff, #65e0c4);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        header.top .brand .brandIcon { width: 26px; height: 26px; display: inline-flex; }

        header.top .nav {
          background: rgba(20,40,60,0.7);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          padding: 10px 18px; border-radius: 999px; display: flex; align-items: center;
          border: 1px solid rgba(255,255,255,0.08);
        }
        header.top .navLink,
        header.top .navLink:visited,
        header.top .navLink:hover,
        header.top .navLink:active {
          color: #eaf4f7 !important;
          text-decoration: none !important;
          margin: 0 8px; opacity: 0.95;
          display: inline-flex; align-items: center; gap: 6px; line-height: 1;
        }
        header.top .navLink:hover { opacity: 1; }
        header.top .navText { font-weight: 800; font-size: clamp(14px,1.6vw,18px); line-height: 1; display: inline-block; }
        header.top .gradHeader {
          background: linear-gradient(90deg,#7cc7ff 0%,#8db4ff 35%,#65e0c4 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        header.top .apple { font-size: clamp(14px,1.55vw,17px); line-height: 1; transform: translateY(1px); color: #eaf4f7; }

        @supports not (backdrop-filter: blur(12px)) {
          header.top { background: rgba(10,14,28,0.92); }
          header.top .nav { background: rgba(20,40,60,0.92); }
        }
      `}</style>

      <style jsx>{`
        .pageFooter {
          position: relative;
          z-index: 3;
          padding: 20px 22px 28px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(0deg, rgba(10,14,28,0.60) 0%, rgba(10,14,28,0.30) 100%);
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
        }
        .legalLink { color: #ffffff; text-decoration: none; }
        .sep { opacity: 0.55; }
        .copyright {
          font-size: 13px;
          opacity: 0.7;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .footInner { flex-direction: column; gap: 8px; }
        }
      `}</style>
    </>
  );
}
