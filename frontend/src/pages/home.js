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
        <header className="heroCopy">
          <h1>Think better with Minutes.AI</h1>
          <p>Never miss a note, idea or connection.</p>
        </header>

        {/* 宇宙の奥行き（星＋軌道ライン） */}
        <div className="space" aria-hidden />

        {/* ブラックホール本体（完全な球体） */}
        <div className="core" aria-hidden>
          <div className="coreGlow" />
          <div className="shine" />
          <div className="orbits" />
          {/* リップル波紋（明るめ／Reflect寄せ） */}
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />
        </div>

        {/* 地面方向の余韻（反射の霞） */}
        <div className="reflection" aria-hidden />

        <style jsx>{`
          :root {
            /* トーン（Reflect寄り：中心は白に近い強発光） */
            --bg-1: #05060e;
            --bg-2: #0b1030;

            --violet: #bca6ff;   /* 明るめの紫 */
            --indigo: #6b86ff;   /* 明るめの青 */
            --halo: 255, 255, 255;

            --core-size: 84vmin; /* 球体のサイズ */
            --ring-start-scale: 0.78;
            --ring-end-scale: 1.75;
            --ripple-period: 6s; /* リップル周期 */
          }

          * { box-sizing: border-box; }

          .scene {
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

          .heroCopy {
            position: relative;
            z-index: 3;
            text-align: center;
            padding-top: clamp(48px, 8vh, 112px);
          }
          .heroCopy h1 {
            margin: 0 16px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.02;
            font-size: clamp(36px, 6.5vw, 96px);
            text-shadow:
              0 0 36px rgba(188,166,255,0.45),
              0 0 10px rgba(107,134,255,0.25);
          }
          .heroCopy p {
            margin: 14px 16px 0;
            opacity: 0.95;
            font-size: clamp(14px, 1.6vw, 22px);
          }

          .space {
            position: absolute;
            inset: -20vmin;
            background:
              /* ごく薄い同心円の軌道 */
              radial-gradient(closest-side, transparent 56%, rgba(var(--halo),0.05) 57%, transparent 58%) center/120vmin 120vmin no-repeat,
              /* 放射状の細い線（回転させる） */
              repeating-conic-gradient(from 0deg,
                rgba(var(--halo),0.045) 0deg 0.6deg,
                transparent 0.6deg 12deg);
            filter: blur(0.4px);
            opacity: 0.35;
            animation: spin 120s linear infinite;
          }

          /* ====== 球体（画面中央寄り・完全な円） ====== */
          .core {
            position: absolute;
            left: 50%;
            top: clamp(54vh, 56vh, 58vh); /* 下で切れない位置に */
            transform: translate(-50%, -50%);
            width: var(--core-size);
            height: var(--core-size);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
          }

          /* 強い中心発光＋紫〜青のハロー（明るめ設定） */
          .coreGlow {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background:
              radial-gradient(circle at 50% 50%,
                rgba(var(--halo),1) 0%,
                rgba(242, 238, 255, 0.98) 8%,
                rgba(206, 196, 255, 0.92) 18%,
                rgba(178, 164, 255, 0.80) 32%,
                rgba(131, 146, 255, 0.58) 48%,
                rgba(92, 118, 255, 0.38) 62%,
                rgba(55, 88, 255, 0.22) 72%,
                rgba(0,0,0,0) 78%);
            filter: blur(10px) saturate(125%) contrast(105%);
            animation: breathe 6s ease-in-out infinite;
          }

          /* 中心の“白い刃”のような強ハイライト */
          .shine {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background:
              radial-gradient(60% 18% at 50% 50%,
                rgba(var(--halo),0.95) 0%,
                rgba(var(--halo),0.0) 100%),
              radial-gradient(28% 10% at 50% 50%,
                rgba(var(--halo),0.85) 0%,
                rgba(var(--halo),0) 100%);
            mix-blend-mode: screen;
            filter: blur(6px);
            opacity: 0.7;
            animation: breathe 6s ease-in-out infinite reverse;
          }

          /* 極薄の軌道ラインを回転（球体の上に重ねる） */
          .orbits {
            position: absolute;
            inset: -3%;
            border-radius: 50%;
            background:
              repeating-conic-gradient(
                from 0deg,
                rgba(var(--halo),0.05) 0deg 0.6deg,
                transparent 0.6deg 12deg);
            mix-blend-mode: screen;
            filter: blur(0.5px);
            opacity: 0.55;
            animation: spin 90s linear infinite;
          }

          /* リップル（輪郭が光る広がり） */
          .ring {
            --size: calc(var(--core-size) * 0.82);
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(var(--ring-start-scale));
            width: var(--size);
            height: var(--size);
            border-radius: 50%;
            /* 外側と内側に光が回る */
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

          /* 地面側の反射（明るめ） */
          .reflection {
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            width: 200vmax;
            height: 40vh;
            background:
              radial-gradient(120vmin 60% at 50% 0%,
                rgba(140, 150, 255, 0.28) 0%,
                rgba(140, 150, 255, 0.10) 40%,
                transparent 75%);
            filter: blur(14px);
            opacity: 0.7;
          }

          /* ===== Animations */
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
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
            :root { --core-size: 92vmin; }
            .heroCopy h1 { font-size: clamp(32px, 8.5vw, 64px); }
          }
        `}</style>
      </main>
    </>
  );
}
