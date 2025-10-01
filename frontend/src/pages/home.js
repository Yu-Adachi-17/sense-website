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
        {/* ヒーロー（球体の上・白） */}
        <h1 className="heroTop">Just Record.</h1>

        {/* 背景（直線光線は無し） */}
        <div className="space" aria-hidden />

        {/* 球体 */}
        <div className="core" aria-hidden>
          <div className="coreGlow" />
          <div className="shine" />
          <div className="orbits" />

          {/* 放射エミッタ（星屑） */}
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

          {/* 波紋（ディレイ違い） */}
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />

          {/* 波紋縁の星帯（控えめ） */}
          <div className="starsBelt" />
        </div>

        {/* 球体の下セクション */}
        <section className="below">
          <div className="line1 sameSize">AI Makes</div>
          <div className="line2 gradText sameSize">Beautiful&nbsp;Minutes</div>
        </section>

        {/* 反射の霞 */}
        <div className="reflection" aria-hidden />

        <style jsx>{`
          .scene {
            /* ===== テーマ色（紫系を強調） ===== */
            --bg-1: #070815;     /* 最暗 */
            --bg-2: #0d0a23;     /* 背景インディゴ */
            --violet-1: 173, 98, 255;   /* 明るいバイオレット */
            --violet-2: 142, 76, 255;   /* コア外周の紫 */
            --violet-3: 96, 55, 214;    /* 深い紫 */
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

            /* 背景（紫トーン） */
            background:
              radial-gradient(130vmax 130vmax at 50% 120%, #15103a 0%, var(--bg-2) 50%, var(--bg-1) 100%),
              radial-gradient(90vmax 60vmax at 50% -10%,
                rgba(var(--violet-2),0.20) 0%,
                rgba(0,0,0,0) 60%),
              radial-gradient(1px 1px at 20% 30%, rgba(var(--halo),0.20) 99%, transparent 100%),
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
            font-size: clamp(42px, 9.3vw, 129px);
            filter:
              drop-shadow(0 0 22px rgba(var(--violet-1),0.35))
              drop-shadow(0 0 2px rgba(130,150,255,0.18));
            pointer-events: none;
          }

          /* 下セクション */
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
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.06;
            font-size: clamp(42px, 9.3vw, 129px);
            margin: 0;
          }
          .line1 { color: #fff; }
          .line2 { margin-top: 8px; }

          /* グラデ文字（紫→アクアの輝き） */
          .gradText {
            background: linear-gradient(90deg,
              #cda8ff 0%,
              #a97aff 35%,
              #8a55ff 55%,
              #69e4d2 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }

          .space {
            position: absolute;
            inset: -20vmin;
            background:
              radial-gradient(closest-side, transparent 56%, rgba(255,255,255,0.05) 57%, transparent 58%)
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

          /* ====== コアの配色を全面刷新（白→鮮やかな紫） ====== */
          .coreGlow {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background:
              /* 眩しい中心 */
              radial-gradient(circle at 50% 50%,
                rgba(255,255,255,1) 0%,
                rgba(255,255,255,0.98) 7%,
                #f6f2ff 11%,
                #eee6ff 16%,
                #e4d7ff 22%,
                #d7c2ff 30%,
                #caa8ff 40%,
                #b985ff 52%,
                #a463ff 64%,
                rgba(var(--violet-2),0.38) 72%,
                rgba(0,0,0,0) 79%),
              /* 外周の紫グロー */
              radial-gradient(75% 75% at 50% 50%,
                rgba(var(--violet-1),0.55) 0%,
                rgba(var(--violet-1),0.00) 70%);
            filter: blur(8px) saturate(145%) contrast(112%);
            box-shadow:
              0 0 80px rgba(var(--violet-1),0.55),
              0 0 160px rgba(var(--violet-1),0.25),
              inset 0 0 120px rgba(255,255,255,0.35);
            animation: breathe 6s ease-in-out infinite;
          }

          /* ハイライト（白の照り返しを強調） */
          .shine {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background:
              radial-gradient(60% 18% at 50% 48%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%),
              radial-gradient(28% 10% at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%);
            mix-blend-mode: screen;
            filter: blur(5px);
            opacity: 0.85;
            animation: breathe 6s ease-in-out infinite reverse;
          }

          .orbits {
            position: absolute;
            inset: -3%;
            border-radius: 50%;
            background:
              radial-gradient(closest-side, rgba(255,255,255,0.05) 55%, transparent 56%) center/100% 100% no-repeat;
            mix-blend-mode: screen;
            filter: blur(0.5px);
            opacity: 0.5;
          }

          /* ========= 放射エミッタ ========= */
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
            box-shadow: 0 0 6px rgba(var(--violet-1),0.65);
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
            background: linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0));
            filter: blur(0.6px);
            opacity: calc(var(--alpha, 0.9) * 0.7);
            pointer-events: none;
          }
          @keyframes shoot {
            0%   { transform: rotate(var(--a)) translateX(0) scale(1);   opacity: 0; }
            8%   { opacity: var(--alpha, 0.9); }
            60%  { transform: rotate(var(--a)) translateX(calc(var(--emit-radius) * 0.66)) scale(0.9); opacity: calc(var(--alpha, 0.9) * 0.5); }
            100% { transform: rotate(var(--a)) translateX(var(--emit-radius)) scale(0.82); opacity: 0; }
          }
          /* ========= 放射エミッタ ここまで ========= */

          /* 紫のリングを強調 */
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
              0 0 60px rgba(var(--violet-1),0.45),
              inset 0 0 46px rgba(var(--violet-2),0.35);
            background:
              radial-gradient(circle at 50% 50%,
                rgba(255,255,255,0.95) 0%,
                rgba(240,230,255,0.75) 18%,
                rgba(var(--violet-2),0.55) 36%,
                rgba(var(--violet-3),0.20) 52%,
                rgba(0,0,0,0) 62%);
            filter: blur(0.25px);
            opacity: 0.92;
            animation: ripple var(--ripple-period) cubic-bezier(0.16, 0.66, 0.38, 1) infinite;
            animation-delay: var(--d);
          }

          /* 波紋の“縁”の周囲だけに星 */
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

          /* 紫がかった床反射 */
          .reflection {
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            width: 200vmax;
            height: 40vh;
            background:
              radial-gradient(120vmin 60% at 50% 0%,
                rgba(var(--violet-1),0.38) 0%,
                rgba(var(--violet-1),0.14) 42%,
                transparent 75%);
            filter: blur(14px);
            opacity: 0.78;
          }

          @keyframes breathe {
            0%, 100% { transform: scale(1); filter: blur(8px) saturate(145%) contrast(112%); }
            50% { transform: scale(1.02); filter: blur(10px) saturate(160%) contrast(116%); }
          }
          @keyframes ripple {
            0%   { transform: translate(-50%, -50%) scale(var(--ring-start-scale)); opacity: 0.95; }
            70%  { opacity: 0.24; }
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
