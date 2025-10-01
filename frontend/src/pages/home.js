// frontend/src/pages/home.js
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Minutes.AI — Home</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="scene">
        {/* ヒーローテキスト（必要なければ <header> ごと削除可） */}
        <header className="heroCopy">
          <h1>Think better with Minutes.AI</h1>
          <p>Never miss a note, idea or connection.</p>
        </header>

        {/* 宇宙の奥行き（星の微粒子＋軌道ラインの回転） */}
        <div className="space" aria-hidden />

        {/* 地平線の強い発光ライン */}
        <div className="horizon" aria-hidden />

        {/* ブラックホールの上半球グロー＋波紋 */}
        <div className="coreWrap" aria-hidden>
          <div className="coreGlow" />
          <div className="orbits" />
          {/* リップル波紋（ディレイ違いで連続発生） */}
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />
        </div>

        {/* 余韻のグラデーション（地面反射風） */}
        <div className="reflection" aria-hidden />

        <style jsx>{`
          /* ===== Theme */
          :root {
            --bg-1: #060814;      /* 最深背景 */
            --bg-2: #0b1030;      /* 上層背景(青み) */
            --violet: #9d7bff;    /* 紫の主光 */
            --indigo: #5a68ff;    /* 青の主光 */
            --white: 255, 255, 255;

            --ringHueA: 274deg;   /* 紫寄り */
            --ringHueB: 218deg;   /* 青寄り */
          }

          * { box-sizing: border-box; }

          .scene {
            position: relative;
            min-height: 100vh;
            overflow: hidden;
            color: #fff;
            background:
              radial-gradient(120vmax 120vmax at 50% 120%, #12183a 0%, var(--bg-2) 50%, var(--bg-1) 100%);
            /* ほんのり星粒パターンを重ねる */
            background-image:
              radial-gradient(120vmax 120vmax at 50% 120%, #12183a 0%, var(--bg-2) 50%, var(--bg-1) 100%),
              radial-gradient(1px 1px at 20% 30%, rgba(var(--white),0.25) 99%, transparent 100%),
              radial-gradient(1px 1px at 80% 20%, rgba(var(--white),0.18) 99%, transparent 100%),
              radial-gradient(1px 1px at 30% 70%, rgba(var(--white),0.18) 99%, transparent 100%),
              radial-gradient(1px 1px at 60% 50%, rgba(var(--white),0.12) 99%, transparent 100%),
              radial-gradient(1px 1px at 75% 80%, rgba(var(--white),0.12) 99%, transparent 100%);
          }

          .heroCopy {
            position: relative;
            z-index: 3;
            text-align: center;
            padding-top: clamp(56px, 10vh, 120px);
          }

          .heroCopy h1 {
            margin: 0 16px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.02;
            font-size: clamp(36px, 6.5vw, 96px);
            text-shadow:
              0 0 24px rgba(150, 120, 255, 0.35),
              0 0 6px rgba(120, 160, 255, 0.2);
          }
          .heroCopy p {
            margin: 16px 16px 0;
            opacity: 0.9;
            font-size: clamp(14px, 1.6vw, 22px);
          }

          /* 奥の宇宙：薄い同心円(軌道)を超低不透明でゆっくり回転 */
          .space {
            position: absolute;
            inset: -20vmin -20vmin -10vmin -20vmin;
            background:
              radial-gradient(closest-side, transparent 55%, rgba(var(--white),0.04) 56%, transparent 58%) center/120vmin 120vmin no-repeat,
              repeating-conic-gradient(from 0deg,
                rgba(var(--white),0.04) 0.0deg 0.4deg,
                transparent 0.4deg 18deg);
            filter: blur(0.3px);
            animation: spin 120s linear infinite;
            opacity: 0.35;
          }

          /* 地平線の強いライン */
          .horizon {
            position: absolute;
            left: 50%;
            bottom: 12vh;
            transform: translateX(-50%);
            width: 160vmax;
            height: 4px;
            background:
              radial-gradient(70vmin 70% at 50% 50%,
                rgba(var(--white),0.95) 0%,
                rgba(157,123,255,0.85) 22%,
                rgba(90,104,255,0.55) 42%,
                transparent 60%);
            filter: blur(8px);
            opacity: 0.9;
          }

          /* グロー本体と波紋は半円だけ見せるためのラッパでクリップ */
          .coreWrap {
            position: absolute;
            left: 50%;
            bottom: 12vh;
            transform: translateX(-50%);
            width: 110vmin;
            height: 60vmin;
            overflow: hidden; /* ここで上半球だけ表示 */
            z-index: 1;
          }

          /* 中心の発光（紫→青→透明） */
          .coreGlow {
            position: absolute;
            left: 50%;
            bottom: -10vmin;        /* 半球感を強めるため少し沈める */
            transform: translateX(-50%);
            width: 90vmin;
            height: 90vmin;
            border-radius: 50%;
            background:
              radial-gradient(circle at 50% 50%,
                rgba(var(--white),1) 0%,
                rgba(186, 156, 255, 0.95) 18%,
                rgba(128, 112, 255, 0.70) 34%,
                rgba(90, 120, 255, 0.45) 52%,
                rgba(60, 90, 255, 0.25) 62%,
                rgba(0,0,0,0) 68%);
            filter: blur(12px) saturate(120%);
            animation: breathe 6s ease-in-out infinite;
          }

          /* 薄い軌道ラインをゆっくり回転させる（上に載る輪） */
          .orbits {
            position: absolute;
            left: 50%;
            bottom: -20vmin;
            transform: translateX(-50%);
            width: 120vmin;
            height: 120vmin;
            border-radius: 50%;
            background:
              radial-gradient(circle at 50% 50%, transparent 54%, rgba(var(--white),0.03) 55%, transparent 56%) center/100% 100% no-repeat,
              repeating-conic-gradient(
                from 0deg,
                rgba(var(--white),0.05) 0.0deg 0.6deg,
                transparent 0.6deg 12deg);
            mix-blend-mode: screen;
            filter: blur(0.4px);
            opacity: 0.5;
            animation: spin 90s linear infinite;
          }

          /* 波紋リング */
          .ring {
            --size: 70vmin;               /* 基本サイズ（スケールで広がる） */
            position: absolute;
            left: 50%;
            bottom: -10vmin;
            transform: translateX(-50%) scale(0.75);
            width: var(--size);
            height: var(--size);
            border-radius: 50%;
            /* 外周と内側の両方に光が回るように二重のshadow */
            box-shadow:
              0 0 36px rgba(150, 120, 255, 0.35),
              inset 0 0 36px rgba(120, 160, 255, 0.25);
            /* グラデの輪郭 */
            border: 2px solid transparent;
            background:
              radial-gradient(circle at 50% 50%,
                rgba(255,255,255,0.85) 0%,
                rgba(185,155,255,0.4) 30%,
                rgba(110,130,255,0.15) 50%,
                rgba(0,0,0,0) 60%) border-box;
            filter: blur(0.2px);
            opacity: 0.85;
            animation: ripple 6s cubic-bezier(0.16, 0.66, 0.38, 1) infinite;
            animation-delay: var(--d);
          }

          /* 地面側の反射グラデーション */
          .reflection {
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            width: 200vmax;
            height: 38vh;
            background:
              radial-gradient(120vmin 60% at 50% 0%,
                rgba(120, 120, 255, 0.2) 0%,
                rgba(120, 120, 255, 0.08) 35%,
                transparent 70%);
            filter: blur(12px);
            opacity: 0.6;
          }

          /* ===== Animations */
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes breathe {
            0%, 100% { filter: blur(12px) saturate(120%); transform: translateX(-50%) scale(1); }
            50%      { filter: blur(14px) saturate(140%); transform: translateX(-50%) scale(1.02); }
          }
          @keyframes ripple {
            0%   { transform: translateX(-50%) scale(0.75); opacity: 0.85; }
            70%  { opacity: 0.22; }
            100% { transform: translateX(-50%) scale(1.65); opacity: 0; }
          }

          /* レスポンシブ微調整 */
          @media (max-width: 640px) {
            .coreWrap { width: 120vmin; height: 64vmin; }
            .horizon { bottom: 11vh; }
            .heroCopy h1 { font-size: clamp(32px, 8.5vw, 64px); }
          }
        `}</style>
      </main>
    </>
  );
}
