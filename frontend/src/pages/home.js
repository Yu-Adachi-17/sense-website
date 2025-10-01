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
        {/* ヒーロー（球体の上・白・1.5倍） */}
        <h1 className="heroTop">Just Record.</h1>

        {/* 背景（直線光線は削除） */}
        <div className="space" aria-hidden />

        {/* 球体 */}
        <div className="core" aria-hidden>
          <div className="coreGlow" />
          <div className="shine" />
          {/* 薄い軌道（円弧イメージ）。“無限に伸びる直線”は無し */}
          <div className="orbits" />

          {/* 波紋（ディレイ違い） */}
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />

          {/* ★ 波紋の“周囲だけ”に星を散りばめた細いベルト */}
          <div className="starsBelt" />
        </div>

        {/* 球体の下セクション */}
        <section className="below">
          <div className="line1 sameSize">AI Makes</div>
          <div className="line2 gradText sameSize">Beautiful Minutes</div>
        </section>

        {/* 反射の霞 */}
        <div className="reflection" aria-hidden />

        <style jsx>{`
          .scene {
            --bg-1: #05060e;
            --bg-2: #0b1030;
            --halo: 255, 255, 255;

            /* 球体サイズ（必ず画面に収まる） */
            --core-size: clamp(420px, 70vmin, 80vh);

            --ring-start-scale: 0.78;
            --ring-end-scale: 1.75;
            --ripple-period: 6s;

            position: relative;
            min-height: 100vh;
            padding-bottom: calc((var(--core-size) / 2) + 28vh);
            overflow: hidden;
            color: #fff;

            /* 背景。放射状の直線は入れない */
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
            padding-top: clamp(48px, 9vh, 120px);
            letter-spacing: -0.02em;
            line-height: 1.02;
            font-weight: 800;
            color: #fff;
            /* “1.5倍”サイズ */
            font-size: clamp(42px, 9.3vw, 129px);
            filter: drop-shadow(0 0 10px rgba(160,145,255,0.35))
                    drop-shadow(0 0 2px rgba(130,150,255,0.2));
            pointer-events: none;
          }

          /* 下セクション（球体の底から少し下） */
          .below {
            position: absolute;
            left: 50%;
            top: calc(60vh + (var(--core-size) / 2) + 6vh);
            transform: translateX(-50%);
            z-index: 3;
            text-align: center;
            pointer-events: none;
          }
          .sameSize {
            /* ヒーローと同じサイズに統一 */
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.06;
            font-size: clamp(42px, 9.3vw, 129px);
            margin: 0;
          }
          .line1 { color: #fff; }
          .line2 { margin-top: 8px; }

          /* 指定のグラデ文字（Safari対応込み） */
          .gradText {
            background: linear-gradient(90deg, #7cc7ff 0%, #8db4ff 35%, #65e0c4 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }

          .space {
            position: absolute;
            inset: -20vmin;
            /* 直線の光線は無し（repeating-conic-gradientを削除） */
            background:
              radial-gradient(closest-side, transparent 56%, rgba(var(--halo),0.05) 57%, transparent 58%)
                center/120vmin 120vmin no-repeat;
            filter: blur(0.4px);
            opacity: 0.35;
          }

          .core {
            position: absolute;
            left: 50%;
            top: 60vh; /* 見出しと重なりにくい位置 */
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
            /* 線は“円弧感”のみ。直線ラジアルは無し */
            background:
              radial-gradient(closest-side, rgba(255,255,255,0.04) 55%, transparent 56%) center/100% 100% no-repeat;
            mix-blend-mode: screen;
            filter: blur(0.5px);
            opacity: 0.45;
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

          /* ★ 波紋の“縁”の周囲だけに星を露出させるベルト */
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
            opacity: 0.65;
            /* ランダム点（コスト低めの手描きドット） */
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
            /* マスクで細い“環”だけ表示（Safari/他ブラウザ両対応） */
            -webkit-mask: radial-gradient(circle at 50% 50%,
              transparent 0 62%, #fff 64% 70%, transparent 72% 100%);
            mask: radial-gradient(circle at 50% 50%,
              transparent 0 62%, #fff 64% 70%, transparent 72% 100%);
            /* きらめき */
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
            50% { transform: scale(1.02); filter: blur(12px) saturate(140%) contrast(110%); }
          }
          @keyframes ripple {
            0%   { transform: translate(-50%, -50%) scale(var(--ring-start-scale)); opacity: 0.9; }
            70%  { opacity: 0.22; }
            100% { transform: translate(-50%, -50%) scale(var(--ring-end-scale)); opacity: 0; }
          }
          @keyframes twinkle {
            from { opacity: 0.45; }
            to   { opacity: 0.85; }
          }

          @media (max-width: 640px) {
            .scene { --core-size: clamp(320px, 86vmin, 80vh); }
            .heroTop { font-size: clamp(33px, 11.1vw, 90px); padding-top: 12vh; }
            .sameSize { font-size: clamp(33px, 11.1vw, 90px); }
          }
        `}</style>
      </main>
    </>
  );
}
