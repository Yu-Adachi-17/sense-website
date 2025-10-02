// frontend/src/pages/home.js
import Head from "next/head";
import { useEffect, useRef } from "react";
import { FaApple } from "react-icons/fa";

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

  const LINK_MAIN = "https://www.sense-ai.world";
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";

  return (
    <>
      <Head>
        <title>Minutes.AI — Home</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* ===== Header（servicesの見た目を移植・固定） ===== */}
      <header className="top">
        <a href="/" className="brand">
          Minutes.<span className="ai">AI</span>
        </a>
        <nav className="nav">
          <a href="/" className="navLink">
            <span className="navText gradHeader">Home</span>
          </a>
          <a href={LINK_IOS} className="navLink" rel="noopener noreferrer">
            <FaApple className="apple" aria-hidden="true" />
            <span className="navText gradHeader">iOS</span>
          </a>
        </nav>
      </header>

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

          {/* 放射エミッタ */}
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

          {/* 波紋 */}
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />

          <div className="starsBelt" />
        </div>

        {/* 球体の下セクション */}
        <section className="below">
          <div className="line1 sameSize">AI Makes</div>
          <div className="line2 gradText sameSize">Beautiful&nbsp;Minutes</div>

          {/* ▼ ガラス調デバイス */}
          <div className="deviceStage">
            <div
              className="deviceGlass"
              aria-label="Minutes preview surface"
              ref={deviceRef}
            >
              {/* ▼ デバイス内レンダリング */}
              <article className="minutesWrap" ref={wrapRef}>
                <h2 className="mtitle gradDevice">
                  AI Minutes Meeting — Product Launch Planning
                </h2>
                <div className="mdate">
                  <time dateTime="2025-10-02">Oct 2, 2025 (JST)</time>
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
              {/* ▲ デバイス内レンダリング */}
            </div>
          </div>
          {/* ▲ ガラス調デバイス */}
        </section>

        {/* 反射の霞 */}
        <div className="reflection" aria-hidden />

        {/* ===== Scoped styles ===== */}
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
            padding-bottom: calc((var(--core-size) / 2) + 110vh);
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
            padding-top: clamp(64px, 11vh, 132px); /* ヘッダーかぶり回避 */
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
            position: absolute;
            left: 50%;
            top: calc(60vh + (var(--core-size) / 2) + 6vh);
            transform: translateX(-50%);
            z-index: 3;
            text-align: center;
            pointer-events: none;
            width: 100%;
          }

          .sameSize {
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.06;
            font-size: clamp(33.6px, 7.44vw, 103.2px);
            margin: 0;
          }
          .line1 { color: #fff; }
          .line2 { margin-top: 8px; }

          .gradText,
          .gradDevice {
            background: linear-gradient(90deg, #65e0c4 0%, #8db4ff 65%, #7cc7ff 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }

          /* ===== デバイス風ガラスパネル ===== */
          .deviceStage {
            pointer-events: auto;
            margin: clamp(16px, 5vh, 44px) auto 0;
            width: min(calc(94vw * 0.8), 1024px);
          }

          .deviceGlass {
            --glassA: 36, 48, 72;
            --glassB: 56, 78, 96;

            position: relative;
            width: 100%;
            aspect-ratio: 4 / 3;
            border-radius: clamp(22px, 3.2vmax, 44px);
            overflow: hidden;

            background:
              linear-gradient(180deg,
                rgba(var(--glassA), 0.55) 0%,
                rgba(var(--glassB), 0.50) 100%);

            -webkit-backdrop-filter: blur(18px) saturate(120%);
            backdrop-filter: blur(18px) saturate(120%);

            border: 1px solid rgba(255,255,255,0.12);
            box-shadow:
              0 30px 90px rgba(10,20,60,0.35),
              0 12px 26px rgba(0,0,0,0.30),
              inset 0 1px 0 rgba(255,255,255,0.18),
              inset 0 -1px 0 rgba(0,0,0,0.20);
          }
          .deviceGlass::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background:
              radial-gradient(140% 100% at 12% -10%,
                rgba(255,255,255,0.10) 0%,
                rgba(255,255,255,0.04) 36%,
                rgba(255,255,255,0.00) 60%),
              linear-gradient(180deg,
                rgba(255,255,255,0.06) 0%,
                rgba(255,255,255,0.00) 40%);
            mix-blend-mode: screen;
            pointer-events: none;
          }
          .deviceGlass::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow:
              inset 0 0 0 1px rgba(255,255,255,0.05),
              inset 0 0 60px rgba(0,0,0,0.24);
            pointer-events: none;
          }

          /* ▼ デバイス内テキスト（フェード&リビール） */
          .minutesWrap{
            position: absolute;
            inset: 0;
            box-sizing: border-box;
            padding: clamp(14px, 3vw, 28px);
            color: rgba(255,255,255,0.92);
            line-height: 1.55;
            text-align: left !important;
            overflow: hidden;
            pointer-events: none;

            /* 初期は下→上で覆い隠す（inviewで開く） */
            clip-path: inset(100% 0 0 0);
            transform: translateY(8%);
            opacity: 0.001;

            /* 上位20%は不透明=1を維持 → 100%で0へ */
            -webkit-mask-image: linear-gradient(
              to bottom,
              rgba(0,0,0,1) 0%,
              rgba(0,0,0,1) 20%,
              rgba(0,0,0,0) 100%
            );
            mask-image: linear-gradient(
              to bottom,
              rgba(0,0,0,1) 0%,
              rgba(0,0,0,1) 20%,
              rgba(0,0,0,0) 100%
            );
          }
          .minutesWrap.inview{
            animation: fullReveal 900ms cubic-bezier(0.16, 0.66, 0.38, 1) forwards;
          }
          @keyframes fullReveal{
            0%   { clip-path: inset(100% 0 0 0); transform: translateY(12%); opacity: 0.001; }
            60%  { clip-path: inset(0 0 0 0);    transform: translateY(0%);  opacity: 1; }
            100% { clip-path: inset(0 0 0 0);    transform: translateY(0%);  opacity: 1; }
          }

          .mtitle{
            font-weight: 800;
            letter-spacing: -0.01em;
            font-size: clamp(36px, 4.2vw, 56px);
            margin: 0 0 6px 0;
          }
          .mdate{
            font-weight: 600;
            opacity: 0.85;
            font-size: clamp(26px, 2.7vw, 32px);
            margin-bottom: clamp(12px, 1.6vw, 16px);
          }
          .mhr{
            height: 1px;
            background: linear-gradient(90deg,
              rgba(255,255,255,0.22),
              rgba(255,255,255,0.08));
            margin: clamp(10px, 1.8vw, 18px) 0;
          }
          .mhead{
            font-weight: 800;
            font-size: clamp(28px, 3vw, 36px);
            margin: clamp(10px, 1.6vw, 16px) 0 8px 0;
          }

          /* 子要素の順次立ち上がり（下→上の錯覚を強調） */
          .minutesFlow > * { opacity: 0; transform: translateY(18px); }
          .minutesWrap.inview .minutesFlow > * {
            animation: rise 700ms cubic-bezier(0.16, 0.66, 0.38, 1) forwards;
          }
          .minutesWrap.inview .minutesFlow > *:nth-child(1) { animation-delay: 80ms; }
          .minutesWrap.inview .minutesFlow > *:nth-child(2) { animation-delay: 150ms; }
          .minutesWrap.inview .minutesFlow > *:nth-child(3) { animation-delay: 220ms; }
          .minutesWrap.inview .minutesFlow > *:nth-child(4) { animation-delay: 290ms; }
          .minutesWrap.inview .minutesFlow > *:nth-child(5) { animation-delay: 360ms; }
          .minutesWrap.inview .minutesFlow > *:nth-child(6) { animation-delay: 430ms; }
          .minutesWrap.inview .minutesFlow > *:nth-child(7) { animation-delay: 500ms; }
          @keyframes rise {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          .fline{
            font-weight: 700;
            font-size: clamp(24px, 2.5vw, 30px);
            margin: 0 0 clamp(16px, 2.4vw, 22px) 0;
          }

          /* 背景の薄い装飾 */
          .space {
            position: absolute;
            inset: -20vmin;
            background:
              radial-gradient(closest-side, transparent 56%, rgba(var(--halo),0.05) 57%, transparent 58%)
                center/120vmin 120vmin no-repeat;
            filter: blur(0.4px);
            opacity: 0.35;
          }

          .core {
            position: absolute;
            left: 50%;
            top: 60vh;
            transform: translate(-50%, -50%);
            width: var(--core-size);
            height: var(--core-size);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
          }

          .coreGlow {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background:
              radial-gradient(circle at 50% 50%,
                rgba(var(--halo),1) 0%,
                rgba(242,238,255,0.98) 8%,
                rgba(206,196,255,0.92) 18%,
                rgba(178,164,255,0.80) 32%,
                rgba(131,146,255,0.58) 48%,
                rgba(92,118,255,0.38) 62%,
                rgba(55,88,255,0.22) 72%,
                rgba(0,0,0,0) 78%);
            filter: blur(10px) saturate(125%) contrast(105%);
            animation: breathe 6s ease-in-out infinite;
          }

          .shine {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background:
              radial-gradient(60% 18% at 50% 50%, rgba(var(--halo),0.95) 0%, rgba(var(--halo),0) 100%),
              radial-gradient(28% 10% at 50% 50%, rgba(var(--halo),0.85) 0%, rgba(var(--halo),0) 100%);
            mix-blend-mode: screen;
            filter: blur(6px);
            opacity: 0.7;
            animation: breathe 6s ease-in-out infinite reverse;
          }

          .orbits {
            position: absolute;
            inset: -3%;
            border-radius: 50%;
            background:
              radial-gradient(closest-side, rgba(255,255,255,0.04) 55%, transparent 56%) center/100% 100% no-repeat;
            mix-blend-mode: screen;
            filter: blur(0.5px);
            opacity: 0.45;
          }

          .starEmitter {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            pointer-events: none;
            z-index: 2;
            --N: 36;
            --emit-radius: calc(var(--core-size) * 0.96);
          }
          .starEmitter i {
            position: absolute;
            left: 50%;
            top: 50%;
            width: var(--sz, 1.4px);
            height: var(--sz, 1.4px);
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.65) 60%, rgba(255,255,255,0) 70%);
            box-shadow: 0 0 6px rgba(180,200,255,0.55);
            opacity: 0;
            mix-blend-mode: screen;
            backface-visibility: hidden;
            will-change: transform, opacity;
            --a: calc(360deg * (var(--i) / var(--N)));
            transform: rotate(var(--a)) translateX(0) scale(1);
            animation: shoot var(--spd, 2.8s) linear infinite;
            animation-delay: var(--delay, 0s);
          }
          .starEmitter i::after {
            content: "";
            position: absolute;
            left: calc(-1 * var(--tail, 28px));
            top: 50%;
            transform: translateY(-50%);
            width: var(--tail, 28px);
            height: 1px;
            background: linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0));
            filter: blur(0.6px);
            opacity: calc(var(--alpha, 0.8) * 0.7);
            pointer-events: none;
          }
          @keyframes shoot {
            0%   { transform: rotate(var(--a)) translateX(0)       scale(1);   opacity: 0; }
            8%   {                                                   opacity: var(--alpha, 0.9); }
            60%  { transform: rotate(var(--a)) translateX(calc(var(--emit-radius) * 0.66)) scale(0.9); opacity: calc(var(--alpha, 0.9) * 0.5); }
            100% { transform: rotate(var(--a)) translateX(var(--emit-radius))               scale(0.82); opacity: 0; }
          }

          .ring {
            --size: calc(var(--core-size) * 0.82);
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(var(--ring-start-scale));
            width: var(--size);
            height: var(--size);
            border-radius: 50%;
            box-shadow:
              0 0 42px rgba(188,166,255,0.45),
              inset 0 0 38px rgba(107,134,255,0.28);
            background:
              radial-gradient(circle at 50% 50%,
                rgba(255,255,255,0.95) 0%,
                rgba(188,166,255,0.55) 30%,
                rgba(120,140,255,0.22) 52%,
                rgba(0,0,0,0) 62%);
            filter: blur(0.25px);
            opacity: 0.9;
            animation: ripple var(--ripple-period) cubic-bezier(0.16, 0.66, 0.38, 1) infinite;
            animation-delay: var(--d);
          }

          .starsBelt {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: calc(var(--core-size) * 1.06);
            height: calc(var(--core-size) * 1.06);
            border-radius: 50%;
            pointer-events: none;
            mix-blend-mode: screen;
            opacity: 0.55;
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
            -webkit-mask: radial-gradient(circle at 50% 50%,
              transparent 0 62%, #fff 64% 70%, transparent 72% 100%);
            mask: radial-gradient(circle at 50% 50%,
              transparent 0 62%, #fff 64% 70%, transparent 72% 100%);
            animation: twinkle 4s ease-in-out infinite alternate;
          }

          .reflection {
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            width: 200vmax;
            height: 40vh;
            background:
              radial-gradient(120vmin 60% at 50% 0%,
                rgba(140,150,255,0.28) 0%,
                rgba(140,150,255,0.10) 40%,
                transparent 75%);
            filter: blur(14px);
            opacity: 0.7;
          }

          @keyframes breathe {
            0%, 100% { transform: scale(1); filter: blur(10px) saturate(125%) contrast(105%); }
            50%      { transform: scale(1.02); filter: blur(12px) saturate(140%) contrast(110%); }
          }
          @keyframes ripple {
            0%   { transform: translate(-50%, -50%) scale(var(--ring-start-scale)); opacity: 0.9; }
            70%  { opacity: 0.22; }
            100% { transform: translate(-50%, -50%) scale(var(--ring-end-scale));   opacity: 0; }
          }
          @keyframes twinkle {
            from { opacity: 0.45; }
            to   { opacity: 0.85; }
          }

          /* モーション配慮 */
          @media (prefers-reduced-motion: reduce) {
            .minutesWrap,
            .minutesWrap.inview,
            .minutesFlow > *,
            .minutesWrap.inview .minutesFlow > * {
              animation: none !important;
              transition: none !important;
              clip-path: inset(0 0 0 0) !important;
              transform: none !important;
              opacity: 1 !important;
            }
          }

          /* ===== モバイル ===== */
          @media (max-width: 640px) {
            .scene {
              --core-size: clamp(320px, 86vmin, 80vh);
              padding-bottom: calc((var(--core-size) / 2) + 130vh);
            }
            .heroTop  { font-size: clamp(26.4px, 8.88vw, 72px); padding-top: 14vh; }
            .sameSize { font-size: clamp(26.4px, 8.88vw, 72px); }

            .deviceStage { width: min(calc(92vw * 0.8), 416px); }

            .deviceGlass {
              aspect-ratio: 9 / 19.5;
              border-radius: clamp(26px, 7.5vw, 40px);
            }

            .mtitle { font-size: clamp(32px, 10.4vw, 44px); }
            .mdate  { font-size: clamp(24px, 7.6vw, 30px); }
            .mhead  { font-size: clamp(26px, 8.4vw, 34px); }
            .fline  { font-size: clamp(24px, 7.6vw, 30px); }
          }
        `}</style>

        {/* ===== Global styles for header（styled-jsx のスコープ外対策） ===== */}
        <style jsx global>{`
          header.top{
            position:fixed; left:0; top:0; right:0;
            z-index:10; display:flex; justify-content:space-between; align-items:center;
            padding:16px 22px;
          }
          header.top .brand{
            font-weight:800; font-size:24px; letter-spacing:0.2px; text-decoration:none;
            color:#b6eaff;
          }
          header.top .brand .ai{
            background:linear-gradient(90deg,#7cc7ff,#65e0c4);
            -webkit-background-clip:text; background-clip:text; color:transparent;
          }
          header.top .nav{
            -webkit-backdrop-filter: blur(12px);
            backdrop-filter: blur(12px);
            background:rgba(20,40,60,0.7);
            padding:10px 18px; border-radius:999px; display:flex; align-items:center;
          }
          header.top .navLink,
          header.top .navLink:visited,
          header.top .navLink:hover,
          header.top .navLink:active{
            color:#eaf4f7 !important;
            text-decoration:none !important;
            margin:0 8px; opacity:0.95;
            display:inline-flex; align-items:center; gap:6px; line-height:1;
          }
          header.top .navLink:hover{ opacity:1; }
          header.top .navText{
            font-weight:800; font-size:clamp(14px,1.6vw,18px); line-height:1; display:inline-block;
          }
          header.top .gradHeader{
            background:linear-gradient(90deg,#7cc7ff 0%,#8db4ff 35%,#65e0c4 100%);
            -webkit-background-clip:text; background-clip:text; color:transparent;
          }
          header.top .apple{
            font-size:clamp(14px,1.55vw,17px); line-height:1; transform:translateY(1px); color:#eaf4f7;
          }
        `}</style>
      </main>
    </>
  );
}
