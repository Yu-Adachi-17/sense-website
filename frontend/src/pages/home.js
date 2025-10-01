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
        {/* 球体の“ど真ん中”に配置されたグラデ文字 */}
        <h1 className="heroCenter gradText">Just Record.</h1>

        {/* 奥行き（星＋軌道） */}
        <div className="space" aria-hidden />

        {/* 球体（完全な円） */}
        <div className="core" aria-hidden>
          <div className="coreGlow" />
          <div className="shine" />
          <div className="orbits" />
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />
        </div>

        {/* 反射の霞 */}
        <div className="reflection" aria-hidden />

        <style jsx>{`
          /* 変数は .scene に置く（styled-JSXのスコープ対策） */
          .scene {
            --bg-1: #05060e;
            --bg-2: #0b1030;
            --halo: 255, 255, 255;

            /* 球体サイズ（常に画面に収まる） */
            --core-size: clamp(420px, 70vmin, 80vh);

            --ring-start-scale: 0.78;
            --ring-end-scale: 1.75;
            --ripple-period: 6s;

            position: relative;
            min-height: 100vh;
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

          /* 見出し：球体の中心と同一座標に固定 */
          .heroCenter {
            position: absolute;
            left: 50%;
            top: 50vh;                 /* 画面中央＝球体中心 */
            transform: translate(-50%, -50%);
            margin: 0;
            z-index: 3;
            text-align: center;
            letter-spacing: -0.02em;
            line-height: 1.02;
            font-weight: 800;

            /* ▼ 以前より1.5倍に拡大（28→42px, 6.2→9.3vw, 86→129px） */
            font-size: clamp(42px, 9.3vw, 129px);

            /* 輪郭をほんのり発光（グラデを邪魔しない程度） */
            filter: drop-shadow(0 0 10px rgba(160,145,255,0.35))
                    drop-shadow(0 0 2px rgba(130,150,255,0.2));
            white-space: nowrap;
            pointer-events: none;
          }

          /* ご指定のグラデ文字（Safari対応込み） */
          .gradText {
            background: linear-gradient(90deg, #7cc7ff 0%, #8db4ff 35%, #65e0c4 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent; /* Safari */
          }

          .space {
            position: absolute;
            inset: -20vmin;
            background:
              radial-gradient(closest-side, transparent 56%, rgba(var(--halo),0.05) 57%, transparent 58%) center/120vmin 120vmin no-repeat,
              repeating-conic-gradient(from 0deg,
                rgba(var(--halo),0.045) 0deg 0.6deg,
                transparent 0.6deg 12deg);
            filter: blur(0.4px);
            opacity: 0.35;
            animation: spin 120s linear infinite;
          }

          .core {
            position: absolute;
            left: 50%;
            top: 50vh;
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
              repeating-conic-gradient(from 0deg,
                rgba(var(--halo),0.05) 0deg 0.6deg,
                transparent 0.6deg 12deg);
            mix-blend-mode: screen;
            filter: blur(0.5px);
            opacity: 0.55;
            animation: spin 90s linear infinite;
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

          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes breathe {
            0%, 100% { transform: scale(1); filter: blur(10px) saturate(125%) contrast(105%); }
            50% { transform: scale(1.02); filter: blur(12px) saturate(140%) contrast(110%); }
          }
          @keyframes ripple {
            0%   { transform: translate(-50%, -50%) scale(var(--ring-start-scale)); opacity: 0.9; }
            70%  { opacity: 0.22; }
            100% { transform: translate(-50%, -50%) scale(var(--ring-end-scale)); opacity: 0; }
          }

          @media (max-width: 640px) {
            .scene { --core-size: clamp(320px, 86vmin, 80vh); }
            /* 文字も1.5倍相当を維持 */
            .heroCenter { font-size: clamp(33px, 11.1vw, 90px); white-space: normal; padding: 0 16px; }
          }
        `}</style>
      </main>
    </>
  );
}
