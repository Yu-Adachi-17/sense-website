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

          {/* ★ 放射エミッタ（星屑を中心→外へ） */}
          <div className="starEmitter" aria-hidden>
            {Array.from({ length: 36 }).map((_, i) => {
              const spd = 2.4 + (i % 7) * 0.15;                         // 2.4s〜3.3s
              const delay = -((i * 173) % 900) / 300;                   // 0〜-3.0s（デスパ）
              const size = 1 + ((i * 37) % 3) * 0.4;                    // 1.0〜1.8px
              const alpha = 0.55 + (((i * 29) % 40) / 100);             // 0.55〜0.95
              const tail = 20 + ((i * 67) % 24);                        // 20〜44px
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

          {/* ★ 波紋の“周囲だけ”に星を散りばめた細いベルト（控えめ） */}
          <div className="starsBelt" />
        </div>

        {/* 球体の下セクション */}
        <section className="below">
          <div className="line1 sameSize">AI Makes</div>
          <div className="line2 gradText sameSize">Beautiful&nbsp;Minutes</div>

          {/* ▼ ここから：ガラス調デバイス・セクション（iPad/モバイルはiPhone） */}
          <div className="deviceStage">
            <div className="deviceGlass" aria-label="Minutes preview surface">
              {/* 将来ここに議事録のイメージや要素を配置します */}
              {/* 例）<img src="/minutes-placeholder.png" alt="" className="fit" /> */}
            </div>
          </div>
          {/* ▲ ここまで */}
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
            /* 下のガラスデバイス分の余白を少し増やす */
            padding-bottom: calc((var(--core-size) / 2) + 48vh);
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
            width: 100%;
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

          /* ===== デバイス風・ガラスパネル ===== */
          .deviceStage {
            pointer-events: auto;    /* 子要素は触れるように */
            margin: clamp(16px, 5vh, 44px) auto 0;
            width: min(92vw, 1160px);  /* デスクトップはiPad想定 */
          }
          .deviceGlass {
            --top: #2b3753;   /* 添付の淡い紺〜青み */
            --bot: #4a6270;
            position: relative;
            width: 100%;
            aspect-ratio: 4 / 3;           /* iPad比率 */
            border-radius: clamp(22px, 3.2vmax, 44px);
            overflow: hidden;

            /* すりガラス感：背景ブラー＋淡い青グラデ */
            background:
              linear-gradient(180deg, var(--top) 0%, var(--bot) 100%);
            -webkit-backdrop-filter: blur(10px) saturate(140%);
            backdrop-filter: blur(10px) saturate(140%);

            /* 枠・立体感 */
            border: 1px solid rgba(255,255,255,0.14);
            box-shadow:
              0 30px 90px rgba(10,20,60,0.40),
              0 10px 24px rgba(0,0,0,0.35),
              inset 0 1px 0 rgba(255,255,255,0.25),
              inset 0 -1px 0 rgba(0,0,0,0.25);
          }
          /* 上面の柔らかい反射 */
          .deviceGlass::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background:
              radial-gradient(70% 55% at 50% -10%,
                rgba(255,255,255,0.38) 0%,
                rgba(255,255,255,0.00) 70%)
              ,
              radial-gradient(50% 35% at 25% 110%,
                rgba(255,255,255,0.10) 0%,
                rgba(255,255,255,0.00) 70%);
            mix-blend-mode: screen;
            pointer-events: none;
          }
          /* 微細な内側ライン＆うっすら周辺減光 */
          .deviceGlass::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow:
              inset 0 0 0 1px rgba(255,255,255,0.06),
              inset 0 0 40px rgba(0,0,0,0.20);
            pointer-events: none;
          }
          /* 画像を入れるときに使うユーティリティ */
          .fit {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
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

          /* ========= 放射エミッタ ========= */
          .starEmitter {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            pointer-events: none;
            z-index: 2; /* リングより手前に */
            --N: 36; /* 角度分割数（JS側と合わせる） */
            --emit-radius: calc(var(--core-size) * 0.96);
          }
          .starEmitter i {
            position: absolute;
            left: 50%;
            top: 50%;
            width: var(--sz, 1.4px);
            height: var(--sz, 1.4px);
            border-radius: 50%;
            /* 小さな光点（周囲ほど薄く） */
            background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.65) 60%, rgba(255,255,255,0) 70%);
            box-shadow: 0 0 6px rgba(180,200,255,0.55);
            opacity: 0;
            mix-blend-mode: screen;
            backface-visibility: hidden;
            will-change: transform, opacity;
            /* 角度をCSS変数にしてキーフレーム内で使い回す */
            --a: calc(360deg * (var(--i) / var(--N)));
            transform: rotate(var(--a)) translateX(0) scale(1);
            animation: shoot var(--spd, 2.8s) linear infinite;
            animation-delay: var(--delay, 0s);
          }
          /* 尾（控えめの流れ）*/
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
          /* ========= 放射エミッタ ここまで ========= */

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

          /* ★ 波紋の“縁”の周囲だけに星を露出させるベルト（控えめ） */
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

          /* ===== モバイル最適化：iPhone比率（縦長） ===== */
          @media (max-width: 640px) {
            .scene { --core-size: clamp(320px, 86vmin, 80vh); padding-bottom: calc((var(--core-size) / 2) + 60vh); }
            .heroTop { font-size: clamp(33px, 11.1vw, 90px); padding-top: 12vh; }
            .sameSize { font-size: clamp(33px, 11.1vw, 90px); }

            .deviceStage { width: min(92vw, 520px); }
            .deviceGlass {
              aspect-ratio: 9 / 19.5;                 /* iPhone比率（縦） */
              border-radius: clamp(26px, 7.5vw, 40px);
            }
          }
        `}</style>
      </main>
    </>
  );
}
