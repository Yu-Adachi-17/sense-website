// frontend/src/pages/home.js
import Head from "next/head";
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { FaApple } from "react-icons/fa";
import HomeIcon from "./homeIcon"; // 自前アイコン

function FixedHeaderPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** =========================
 *  言語別コールアウト・パイチャート
 *  - 背景ボックスなし（グラフのみ）
 *  - ラベルはパイ外周から棒線で表示
 *  - 青系の透け感、上位ほど濃く→下位ほど薄く（English が最も暗く不透明）
 * ========================= */
function CalloutPie({ data, size = 420 }) {
  const sorted = useMemo(() => {
    const isOther = (s) =>
      String(s.label).toLowerCase() === "other" || s.label === "その他";
    const main = data.filter((d) => !isOther(d)).sort((a, b) => b.value - a.value);
    const others = data.filter(isOther);
    return [...main, ...others];
  }, [data]);

  const total = useMemo(() => sorted.reduce((a, d) => a + d.value, 0), [sorted]);

  const W = size, H = size, cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.36;   // 外周リング半径
  const rInner = r * 0.82;           // 内側リング
  const rEnd = r - 4;                // コメット終点を外周より内側へ（はみ出し防止）

  const polar = (deg, rad) => {
    const a = (deg - 90) * (Math.PI / 180);
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const arcPath = (a0, a1, radius) => {
    const [x0, y0] = polar(a0, radius);
    const [x1, y1] = polar(a1, radius);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`;
  };

  // 角度・強度
  let acc = 0;
  const seams = sorted.map((d) => {
    const ang = (d.value / total) * 360;
    const start = acc; acc += ang;
    return { ...d, start, end: acc };
  });
  const maxVal = sorted[0].value;
  const scale = (v, a, b) => a + (b - a) * (v / maxVal);

  return (
    <figure className="calloutPie">
      <svg
        width="100%" height="100%"
        viewBox={`0 0 ${W} ${H}`} role="img" style={{ overflow: "visible" }}
        aria-label={"Language share: " + sorted.map((d) => `${d.label} ${d.value}%`).join(", ")}
      >
        <defs>
          {/* 外周リング */}
          <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="rgba(140,210,255,0.00)" />
            <stop offset="95%" stopColor="rgba(140,210,255,0.55)" />
            <stop offset="100%" stopColor="rgba(140,210,255,0.00)" />
          </radialGradient>

          {/* 扇フィル（ごく薄い発光） */}
          <radialGradient id="sectorGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgba(130,200,255,0.00)" />
            <stop offset="55%" stopColor="rgba(130,200,255,0.06)" />
            <stop offset="85%" stopColor="rgba(160,230,255,0.10)" />
            <stop offset="100%" stopColor="rgba(160,230,255,0.00)" />
          </radialGradient>

          {/* 継ぎ目ライン用 放射グラデ（中心→外周 = 透明→発光） */}
          {seams.map((s, i) => {
            const [x2, y2] = polar(s.start, rEnd);
            return (
              <linearGradient
                key={`lg-${i}`} id={`lg-${i}`} gradientUnits="userSpaceOnUse"
                x1={cx} y1={cy} x2={x2} y2={y2}
              >
                <stop offset="0%"  stopColor="rgba(130,200,255,0)" />
                <stop offset="70%" stopColor="rgba(130,200,255,0.22)" />
                <stop offset="100%" stopColor="rgba(170,240,255,0.95)" />
              </linearGradient>
            );
          })}

          {/* ネオン・グロー（値で強度可変） */}
          {seams.map((s, i) => (
            <filter id={`neon-${i}`} key={`f-${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={scale(s.value, 2.2, 4.0)} result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          ))}
        </defs>

        {/* 扇フィル（薄く光らせる） */}
        <g style={{ mixBlendMode: "screen" }}>
          {seams.map((s, i) => (
            <path
              key={`sector-${i}`} d={arcPath(s.start, s.end, r)}
              fill="url(#sectorGrad)" stroke="none" opacity={scale(s.value, 0.26, 0.42)}
              filter={`url(#neon-${i})`}
            />
          ))}
        </g>

        {/* 外周リング（骨格） */}
        <circle cx={cx} cy={cy} r={r}      fill="none" stroke="url(#ringGrad)" strokeWidth="8" opacity="0.55" />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="url(#ringGrad)" strokeWidth="5" opacity="0.30" />

        {/* 継ぎ目ライン＋先端キャップ（内側終点へ変更） */}
        {seams.map((s, i) => {
          const [x, y] = polar(s.start, rEnd);
          const strokeW = scale(s.value, 2.4, 4.8); // 前回より細め
          const capR = strokeW * 0.48;
          return (
            <g key={`seam-${i}`} style={{ mixBlendMode: "screen" }} filter={`url(#neon-${i})`}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={`url(#lg-${i})`} strokeWidth={strokeW} strokeLinecap="round" />
              <circle cx={x} cy={y} r={capR} fill="rgba(170,240,255,0.95)" />
            </g>
          );
        })}

        {/* 中心点：外周ポイントと“同一処理・同一見た目” */}
        {(() => {
          const v = maxVal;                         // 最大値＝English相当
          const strokeW = scale(v, 2.4, 4.8);
          const capR = strokeW * 0.48;
          return (
            <g style={{ mixBlendMode: "screen" }} filter={`url(#neon-0)`}>
              <circle cx={cx} cy={cy} r={capR} fill="rgba(170,240,255,0.95)" />
            </g>
          );
        })()}

        {/* ラベル＆ガイド（そのまま） */}
        {(() => {
          let acc2 = 0;
          const ro = r + 10, elbow = 20, rLabel = r + 78;
          return sorted.map((d, i) => {
            const ang = (d.value / total) * 360;
            const a0 = acc2, a1 = acc2 + ang; acc2 += ang;
            const amid = a0 + ang / 2;
            const right = Math.cos((amid - 90) * (Math.PI / 180)) >= 0;
            const [sx, sy] = polar(amid, ro);
            const [mx, my] = polar(amid, ro + elbow);
            const hx = right ? mx + 26 : mx - 26;
            const [lx, ly] = polar(amid, rLabel);

            return (
              <g key={`lbl-${i}`}>
                <g stroke="rgba(200,220,255,0.75)" fill="none">
                  <path d={`M ${sx} ${sy} L ${mx} ${my} L ${hx} ${my}`} strokeWidth="2" />
                  <circle cx={sx} cy={sy} r="2.6" fill="rgba(160,230,255,0.95)" />
                </g>
                <text
                  x={right ? Math.max(hx + 8, lx) : Math.min(hx - 8, lx)}
                  y={ly}
                  textAnchor={right ? "start" : "end"}
                  dominantBaseline="middle"
                  style={{
                    fontWeight: 800, fontSize: 18,
                    fill: "rgba(230,245,255,0.98)",
                    paintOrder: "stroke", stroke: "rgba(10,20,40,0.45)", strokeWidth: 1.2,
                  }}
                >
                  {d.label}
                </text>
                <text
                  x={right ? Math.max(hx + 8, lx) : Math.min(hx - 8, lx)}
                  y={ly + 18}
                  textAnchor={right ? "start" : "end"}
                  dominantBaseline="hanging"
                  style={{ fontWeight: 700, fontSize: 14, fill: "rgba(200,225,255,0.92)" }}
                >
                  {d.value}%
                </text>
              </g>
            );
          });
        })()}
      </svg>

      <style jsx>{`
        .calloutPie { margin: 0; width: 100%; max-width: 560px; aspect-ratio: 1 / 1; overflow: visible; }
        @media (max-width: 900px) { .calloutPie { max-width: 520px; } }
        @media (max-width: 640px) { .calloutPie { max-width: 100%; } }
      `}</style>
    </figure>
  );
}


export default function Home() {
  const deviceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = deviceRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { wrap.classList.add("inview"); io.disconnect(); } },
      { threshold: 0.55 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 言語別のみ（国別は排除）
  const LANGUAGE_PIE = [
    { label: "English", value: 40 },
    { label: "German", value: 9 },
    { label: "Arabic", value: 8 },
    { label: "Malay", value: 7 },
    { label: "Dutch", value: 6 },
    { label: "Chinese", value: 5 },
    { label: "Portuguese", value: 4 },
    { label: "Other", value: 21 }
  ];

  // Simply セクション（既存）
  const [active, setActive] = useState("tap");
  const radioGroupRef = useRef(null);
  const steps = [
    { key: "tap",  label: "Tap",  img: "/images/demo-tap.png",  sub: "Tap to start recording." },
    { key: "stop", label: "Stop", img: "/images/demo-stop.png", sub: "Stop when you’re done." },
    { key: "wrap", label: "Wrap", img: "/images/demo-wrap.png", sub: "AI writes the minutes—automatically." },
  ];
  const idx = steps.findIndex((s) => s.key === active);
  const move = (d) => {
    const n = (idx + d + steps.length) % steps.length;
    setActive(steps[n].key);
    requestAnimationFrame(() => {
      const nodes = radioGroupRef.current?.querySelectorAll('[role="radio"]');
      nodes?.[n]?.focus();
    });
  };
  const onRadioKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setActive(steps[idx].key); }
  };

  const LINK_MAIN = "https://www.sense-ai.world";
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";

  return (
    <>
      <Head>
        <title>Minutes.AI — Home</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Automatically create beautiful meeting minutes with AI. Record once, get accurate transcripts with clear decisions and action items. Works on iPhone and the web."
        />
        <link rel="canonical" href="https://www.sense-ai.world/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.sense-ai.world/" />
        <meta property="og:title" content="Minutes.AI — AI Meeting Minutes" />
        <meta
          property="og:description"
          content="Record your meeting and let AI produce clean, human-ready minutes—decisions and to-dos at a glance."
        />
        <meta property="og:image" content="https://www.sense-ai.world/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@your_brand" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "Organization", "name": "Sense LLC", "url": "https://www.sense-ai.world/", "logo": "https://www.sense-ai.world/logo.png" },
                { "@type": "WebSite", "url": "https://www.sense-ai.world/", "name": "Minutes.AI" },
                { "@type": "SoftwareApplication", "name": "Minutes.AI", "applicationCategory": "BusinessApplication", "operatingSystem": "iOS, Web",
                  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
                  "downloadUrl": "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901" }
              ]
            })
          }}
        />
      </Head>

      {/* ===== Fixed Header ===== */}
      <FixedHeaderPortal>
        <header className="top">
          <a href="/" className="brand" aria-label="Minutes.AI Home">
            <span className="brandIcon" aria-hidden="true">
              <HomeIcon size={26} color="currentColor" />
            </span>
            <span className="brandText">Minutes.<span className="ai">AI</span></span>
          </a>
          <nav className="nav" aria-label="Primary">
            <a href="/" className="navLink"><span className="navText gradHeader">Home</span></a>
            <a href={LINK_IOS} className="navLink" rel="noopener noreferrer">
              <FaApple className="apple" aria-hidden="true" /><span className="navText gradHeader">iOS</span>
            </a>
          </nav>
        </header>
      </FixedHeaderPortal>

      {/* ===== Main ===== */}
      <main className="scene">
        <h1 className="heroTop">Just Record.</h1>
        <div className="space" aria-hidden />
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
                <i key={i} style={{
                  ["--i"]: i, ["--N"]: 36, ["--spd"]: `${spd}s`, ["--delay"]: `${delay}s`,
                  ["--sz"]: `${size}px`, ["--alpha"]: alpha, ["--tail"]: `${tail}px`,
                }} />
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

        {/* ▼ 球体の下 */}
        <section className="below">
          <div className="line1 sameSize">AI Makes</div>
          <div className="line2 gradText sameSize">Beautiful&nbsp;Minutes</div>

          {/* ガラス調デバイス */}
          <div className="deviceStage">
            <div className="deviceGlass" aria-label="Minutes preview surface" ref={deviceRef}>
              <article className="minutesWrap" ref={wrapRef}>
                <h2 className="mtitle gradDevice">AI Minutes Meeting — Product Launch Planning</h2>
                <div className="mdate"><time dateTime="2025-10-01">Oct 1, 2025 (JST)</time></div>
                <div className="mhr" />
                <div className="minutesFlow">
                  <h3 className="mhead gradDevice">Meeting Objective</h3>
                  <p className="fline">We agreed to create overwhelmingly beautiful minutes by using cutting-edge AI...</p>
                  <h3 className="mhead gradDevice">Decisions</h3>
                  <p className="fline">We decided to rely on advanced transcription and summarization to deliver clean, human-ready minutes...</p>
                  <h3 className="mhead gradDevice">Next Steps</h3>
                  <p className="fline">We will record real meetings, refine prompts and layout, and publish a live showcase...</p>
                </div>
              </article>
            </div>
            <a href={LINK_MAIN} className="ctaBig" rel="noopener noreferrer">Get Started</a>
          </div>

          {/* ====== Simply ====== */}
          <section className="simply" aria-labelledby="simplyTitle">
            <div className="simplyGrid">
              <div className="simplyLeft">
                <h2 id="simplyTitle" className="simplyH2">Simply ultimate.</h2>
                <div className="stepList" role="radiogroup" aria-label="Actions" ref={radioGroupRef}>
                  {/* 省略なし */}
                  {steps.map((s) => {
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
                        <span className="row"><span className="dot" aria-hidden="true" /><span className="lbl">{s.label}</span></span>
                        <span className="sub">{s.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="simplyRight" aria-live="polite">
                {steps.map((s) => (
                  <figure key={s.key} className={`shot${active === s.key ? " isOn" : ""}`} aria-hidden={active !== s.key} style={{ margin: 0 }}>
                    <img src={s.img} alt={s.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    <figcaption className="shotCaption">
                      {s.key === "tap" && <p>Press the button to start recording.</p>}
                      {s.key === "stop" && <p>Press to finish; AI transcribes and drafts minutes automatically.</p>}
                      {s.key === "wrap" && <p>Get beautifully formatted minutes, a To-Do list, and the full transcript.</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>

          {/* ===== World map background セクション（新レイアウト） ===== */}
          <section className="reachMap" aria-labelledby="reachTitle">
            <div className="reachMapInner">
              <div className="mapCopy">
                <h2 id="reachTitle" className="mapHeadline">
                  <span>
                    <span className="gradText onlyNum">30,000</span> iOS downloads
                  </span>
                  <br />
                  <span>worldwide</span>
                </h2>
              </div>
              <div className="mapChart">
                <CalloutPie data={LANGUAGE_PIE} size={380} />
              </div>
            </div>
          </section>

          {/* iPhoneアプリ訴求 */}
          <section className="appPromo" aria-labelledby="appPromoHead">
            <div className="promoGrid">
              <div className="promoCopy">
                <h2 id="appPromoHead" className="promoH2">iPhone App is <span className="gradText">Available</span></h2>
                <p className="promoSub">Record on iPhone and get Beautiful Minutes instantly.</p>
                <a href={LINK_IOS} className="promoCta" rel="noopener noreferrer">
                  <FaApple aria-hidden="true" /><span>Download on iOS</span>
                </a>
              </div>
              <div className="promoVisual">
                <img src="/images/hero-phone.png" alt="Minutes.AI iPhone App" loading="lazy" />
              </div>
            </div>
          </section>
        </section>

        <div className="reflection" aria-hidden />
      </main>

      {/* ===== Footer ===== */}
      <footer className="pageFooter" role="contentinfo">
        <div className="footInner">
          <div className="legal">
            <a href="/terms-of-use" className="legalLink">Terms of Use</a>
            <span className="sep">·</span>
            <a href="/privacy-policy" className="legalLink">Privacy Policy</a>
          </div>
          <div className="copyright">&copy; Sense LLC All Rights Reserved</div>
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
        .heroTop { position: relative; z-index: 3; text-align: center; margin: 0; letter-spacing: -0.02em; line-height: 1.02;
          font-weight: 800; color: #fff; font-size: clamp(33.6px, 7.44vw, 103.2px);
          filter: drop-shadow(0 0 10px rgba(160,145,255,0.35)) drop-shadow(0 0 2px rgba(130,150,255,0.2)); pointer-events: none; }
        .below { position: relative; z-index: 3; text-align: center; pointer-events: auto; width: 100%; margin: 0 auto;
          margin-top: calc(60vh + (var(--core-size) / 2) + 6vh); }
        .sameSize { font-weight: 800; letter-spacing: -0.02em; line-height: 1.06; font-size: clamp(33.6px, 7.44vw, 103.2px); margin: 0; }
        .line1 { color: #fff; } .line2 { margin-top: 8px; }
        .gradText, .gradDevice { background: linear-gradient(90deg, #65e0c4 0%, #8db4ff 65%, #7cc7ff 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }

        .onlyNum { display: inline-block; }

        .deviceStage { margin: clamp(16px, 5vh, 44px) auto 0; width: min(calc(94vw * 0.8), 1024px); }
        .deviceGlass { --glassA: 36, 48, 72; --glassB: 56, 78, 96; position: relative; width: 100%; aspect-ratio: 4 / 3;
          border-radius: clamp(22px, 3.2vmax, 44px); overflow: hidden;
          background: linear-gradient(180deg, rgba(var(--glassA),0.55) 0%, rgba(var(--glassB),0.50) 100%);
          -webkit-backdrop-filter: blur(18px) saturate(120%); backdrop-filter: blur(18px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 30px 90px rgba(10,20,60,0.35), 0 12px 26px rgba(0,0,0,0.30),
                      inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.20); }
        .minutesWrap{ position:absolute; inset:0; box-sizing:border-box; padding: clamp(14px, 3vw, 28px); color: rgba(255,255,255,0.92);
          line-height: 1.55; text-align: left !important; overflow: hidden; pointer-events: none;
          clip-path: inset(100% 0 0 0); transform: translateY(8%); opacity: 0.001;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%); }
        .minutesWrap.inview{ animation: fullReveal 900ms cubic-bezier(0.16,0.66,0.38,1) forwards; }
        @keyframes fullReveal{ 0%{clip-path:inset(100% 0 0 0); transform:translateY(12%); opacity:0.001;}
                               60%{clip-path:inset(0 0 0 0); transform:translateY(0%); opacity:1;} 100%{clip-path:inset(0 0 0 0);} }

        .ctaBig { display:inline-flex; align-items:center; justify-content:center; padding:14px 28px; border-radius:999px;
          background:#0b2b3a; color:#eaf4f7; text-decoration:none; font-weight:700;
          box-shadow:0 0 0 1px rgba(255,255,255,0.08) inset, 0 8px 24px rgba(0,0,0,0.25);
          margin: clamp(16px, 3.5vh, 28px) auto 0; }

        /* ===== Simply ===== */
        .simply { margin: clamp(28px, 8vh, 80px) auto; padding: 0 22px; max-width: 1200px; }
        .simplyGrid { display:grid; grid-template-columns: 0.9fr 1.1fr; align-items:center; gap: clamp(16px, 3.5vw, 36px); }
        .simplyLeft { text-align:left; }
        .simplyH2 { margin:0 0 12px 0; font-weight:900; letter-spacing:-0.02em; line-height:1.02; font-size: clamp(48px, 9vw, 128px); color:#fff; }
        .stepList { display:flex; flex-direction:column; gap: clamp(4px, 1vh, 8px); }
        .stepBtn { display:flex; flex-direction:column; align-items:flex-start; background:transparent; border:0; padding:12px 10px;
          cursor:pointer; text-align:left; border-radius:14px; transition: background 200ms ease, transform 200ms ease; }
        .stepBtn:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }
        .stepBtn .row { display:inline-flex; align-items:center; gap:12px; }
        .stepBtn .dot { width:10px; height:10px; border-radius:50%; box-shadow:0 0 0 2px rgba(255,255,255,0.2) inset; background:rgba(255,255,255,0.35); }
        .stepBtn.isActive .dot { background: linear-gradient(90deg,#65e0c4,#8db4ff); }
        .stepBtn .lbl { font-weight:900; letter-spacing:-0.02em; line-height:1.02; font-size: clamp(28px, 6vw, 64px); color:#eaf4f7; }
        .stepBtn.isActive .lbl, .stepBtn:hover .lbl {
          background: linear-gradient(90deg, #65e0c4, #8db4ff 65%, #7cc7ff);
          -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
        .stepBtn .sub { margin-left:22px; margin-top:4px; font-weight:700; line-height:1.35; color:#cfe7ff; opacity:.92; font-size: clamp(14px, 1.8vw, 18px); }

        .simplyRight { position:relative; border-radius: clamp(18px, 2.2vmax, 28px); min-height:340px; aspect-ratio:16 / 11; overflow:hidden;
          background: linear-gradient(180deg, rgba(36,48,72,0.55) 0%, rgba(56,78,96,0.50) 100%);
          -webkit-backdrop-filter: blur(14px) saturate(120%); backdrop-filter: blur(14px) saturate(120%);
          border:1px solid rgba(255,255,255,0.10); box-shadow:0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18); }
        .shot { position:absolute; inset:0; opacity:0; transition: opacity .28s ease; }
        .shot.isOn { opacity:1; }
        .shotCaption { position:absolute; left:50%; bottom:16px; transform: translateX(-50%); max-width:86%; text-align:center;
          font-weight:700; line-height:1.35; background: rgba(0,0,0,.45); backdrop-filter: blur(6px); border-radius:12px; padding:10px 12px; }

        /* ===== World map background layout ===== */
        .reachMap { position: relative; margin: clamp(24px, 10vh, 120px) 0; }
        .reachMap::before {
          content: "";
          position: absolute; inset: 0;
          background: url('/images/worldmap.png') center / contain no-repeat;
          opacity: 0.5;   /* 50% */
          filter: saturate(110%) contrast(105%);
        }
        .reachMap::after {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(90vmax 90vmax at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 100%);
        }
        .reachMapInner {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto; padding: 0 22px;
          display: grid; grid-template-columns: 1.1fr 0.9fr; align-items: center;
          gap: clamp(16px, 3vw, 32px);
          min-height: clamp(360px, 40vw, 520px);
          overflow: visible;
          transform: scale(0.9);      /* 全体縮小（mapに収める） */
          transform-origin: center;
        }
        .mapCopy { display: flex; align-items: center; }
        .mapHeadline {
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.02;
          font-size: clamp(32px, 6vw, 80px);
          color: #ffffff;
          /* 背景・ボックス完全撤去 */
          background: transparent;
          padding: 0;
          border-radius: 0;
          box-shadow: none;
          text-shadow: 0 2px 10px rgba(0,0,0,0.35); /* 読みやすさだけ薄く保持 */
        }
        .mapChart { display: flex; justify-content: center; align-items: center; overflow: visible; }

        /* ===== App promo ===== */
        .appPromo { margin: clamp(18px, 4vh, 36px) auto clamp(64px, 10vh, 120px); padding: 0 22px; max-width: 1200px; text-align: left; }
        .promoGrid { display: grid; grid-template-columns: 1.1fr 0.9fr; align-items: center; gap: clamp(16px, 3vw, 32px); }
        .promoH2 { margin: 0 0 10px 0; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; font-size: clamp(36px, 7vw, 84px); color: #eaf4f7; }
        .promoSub { margin: 0 0 18px 0; opacity: 0.85; font-weight: 700; font-size: clamp(16px, 2.2vw, 20px); }
        .promoCta { display:inline-flex; align-items:center; gap:8px; padding:12px 20px; border-radius:999px;
          background: rgba(20,40,60,0.8); color:#eaf4f7; text-decoration:none; font-weight:800; border:1px solid rgba(255,255,255,0.08);
          -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
        .promoCta:hover { background: rgba(20,40,60,0.92); }
        .promoVisual { display:flex; justify-content:center; }
        .promoVisual img { width:100%; max-width:560px; height:auto; display:block; border-radius:22px; box-shadow:0 10px 40px rgba(0,0,0,0.5); }

        @keyframes breathe { 0%,100%{ transform: scale(1); filter: blur(10px) saturate(125%) contrast(105%);} 50%{ transform: scale(1.02); filter: blur(12px) saturate(140%) contrast(110%);} }
        @keyframes ripple { 0%{ transform: translate(-50%,-50%) scale(var(--ring-start-scale)); opacity:0.9;} 70%{ opacity:0.22;} 100%{ transform: translate(-50%,-50%) scale(var(--ring-end-scale)); opacity:0;} }

        @media (prefers-reduced-motion: reduce) {
          .minutesWrap, .minutesWrap.inview, .minutesFlow > *, .minutesWrap.inview .minutesFlow > * {
            animation: none !important; transition: none !important; clip-path: inset(0 0 0 0) !important;
            transform: none !important; opacity: 1 !important;
          }
        }
        @media (max-width: 1024px) { .simplyGrid { grid-template-columns: 1fr; } .simplyRight { order: -1; margin-bottom: 10px; } }
        @media (max-width: 900px)  { .promoGrid { grid-template-columns: 1fr; gap: 18px; } .promoVisual { order: -1; } }
        @media (max-width: 820px) {
          .reachMapInner { grid-template-columns: 1fr; transform: scale(0.95); }
        }
        @media (max-width: 640px)  {
          .scene { --core-size: clamp(320px, 86vmin, 80vh); padding-bottom: 28vh; }
          .heroTop  { font-size: clamp(26.4px, 8.88vw, 72px); }
          .sameSize { font-size: clamp(26.4px, 8.88vw, 72px); }
          .deviceStage { width: min(calc(92vw * 0.8), 416px); }
          .deviceGlass { aspect-ratio: 9 / 19.5; border-radius: clamp(26px, 7.5vw, 40px); }
        }
      `}</style>

      <style jsx global>{`
        :root {
          --header-h: clamp(56px, 7.2vh, 72px);
          --header-py: 10px;
          --header-offset: calc(var(--header-h) + env(safe-area-inset-top, 0px) + (var(--header-py) * 2));
        }
        header.top {
          position: fixed; left: 0; right: 0; top: 0; z-index: 2147483647;
          display: flex; justify-content: space-between; align-items: center;
          height: calc(var(--header-h) + env(safe-area-inset-top, 0px));
          padding: calc(var(--header-py) + env(safe-area-inset-top, 0px)) 22px var(--header-py);
          -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
          background: linear-gradient(180deg, rgba(10,14,28,0.75) 0%, rgba(10,14,28,0.45) 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        header.top .brand { display:inline-flex; align-items:center; gap:10px; text-decoration:none; color:#b6eaff; }
        header.top .brandText { font-weight:800; font-size:24px; letter-spacing:0.2px; }
        header.top .brand .ai { background: linear-gradient(90deg, #7cc7ff, #65e0c4);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
        header.top .brand .brandIcon { width: 26px; height: 26px; display: inline-flex; }
        header.top .nav { background: rgba(20,40,60,0.7); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
          padding:10px 18px; border-radius:999px; display:flex; align-items:center; border:1px solid rgba(255,255,255,0.08); }
        header.top .navLink, header.top .navLink:visited, header.top .navLink:hover, header.top .navLink:active {
          color:#eaf4f7 !important; text-decoration:none !important; margin:0 8px; opacity:0.95; display:inline-flex; align-items:center; gap:6px; }
        header.top .navText { font-weight:800; font-size: clamp(14px,1.6vw,18px); }
        header.top .gradHeader { background: linear-gradient(90deg,#7cc7ff 0%,#8db4ff 35%,#65e0c4 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
        header.top .apple { font-size: clamp(14px,1.55vw,17px); line-height: 1; transform: translateY(1px); color: #eaf4f7; }
        @supports not (backdrop-filter: blur(12px)) {
          header.top { background: rgba(10,14,28,0.92); }
          header.top .nav { background: rgba(20,40,60,0.92); }
        }
      `}</style>

      <style jsx>{`
        .pageFooter { position: relative; z-index: 3; padding: 20px 22px 28px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(0deg, rgba(10,14,28,0.60) 0%, rgba(10,14,28,0.30) 100%); color: #eaf4f7; }
        .footInner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .legal { display: flex; gap: 12px; align-items: center; font-size: 13px; opacity: 0.7; }
        .legalLink { color: #ffffff; text-decoration: none; }
        .sep { opacity: 0.55; }
        .copyright { font-size: 13px; opacity: 0.7; white-space: nowrap; }
        @media (max-width: 640px) { .footInner { flex-direction: column; gap: 8px; } }
      `}</style>
    </>
  );
}
