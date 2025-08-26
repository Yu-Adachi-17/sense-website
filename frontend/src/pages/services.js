// frontend/src/pages/services.js
import Head from "next/head";
import { useTranslation } from "react-i18next";

export default function Services() {
  const { t } = useTranslation();
  const LINK_MAIN = "https://www.sense-ai.world";
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";

  return (
    <>
      <Head>
        <title>Minutes.AI — Services</title>
        <meta name="description" content="Just Record. AI Makes Beautiful Minutes." />
      </Head>

      <div className="page">
        {/* ===== Header ===== */}
        <header className="top">
          <a href={LINK_MAIN} className="brand">
            Minutes.<span className="ai">AI</span>
          </a>
          <nav className="nav">
            <a href={LINK_MAIN} className="navLink">Home</a>
            <a href={LINK_IOS} className="navLink" rel="noopener noreferrer">iOS</a>
          </nav>
        </header>

        {/* ===== Main ===== */}
        <main className="hero">
          <div className="copy">
            <h1 className="line1">Just Record.</h1>
            <h2 className="line2">AI Makes</h2>
            <h2 className="line3"><span className="gradient">Beautiful Minutes</span></h2>
          </div>

          <div className="visual">
            {/* 画像は frontend/public/images/hero-phone.png に配置 */}
            <img src="/images/hero-phone.png" alt="Minutes.AI app mock" />
          </div>
        </main>

        {/* ===== Footer (通常フローの最下部) ===== */}
        <footer className="bottomBar">
          <a href={LINK_MAIN} className="cta">Get Started</a>
          <div className="legal">
            <a href="/terms-of-use" className="legalLink">{t("Terms of Use")}</a>
            <span className="sep">·</span>
            <a href="/privacy-policy" className="legalLink">{t("Privacy Policy")}</a>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .page {
          background: #000;
          color: #eaf4f7;
          min-height: 100vh;
          display: flex;
          flex-direction: column; /* 最下部にフッターを寄せるため */
        }

        /* Header */
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
        }
        .brand {
          font-weight: 800;
          font-size: 24px;
          letter-spacing: 0.2px;
          text-decoration: none;
          color: #b6eaff;
        }
        .brand .ai {
          background: linear-gradient(90deg, #7cc7ff, #65e0c4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .nav {
          backdrop-filter: blur(12px);
          background: rgba(20, 40, 60, 0.7);
          padding: 10px 18px;
          border-radius: 999px;
        }
        .navLink {
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          margin: 0 8px;
          opacity: 0.95;
        }

        /* Main */
        .hero {
          flex: 1; /* ここで余白を吸収し、フッターを下へ */
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 32px;
          align-items: center;
          padding: 20px 28px 48px; /* 下の固定余白は不要に */
        }
        .copy .line1 {
          font-size: clamp(40px, 8vw, 96px);
          margin: 0 0 8px;
          line-height: 1;
        }
        .copy .line2 {
          font-size: clamp(28px, 5vw, 56px);
          margin: 0;
          line-height: 1.1;
          opacity: 0.95;
        }
        .copy .line3 {
          font-size: clamp(36px, 7vw, 84px);
          margin: 12px 0 0;
          line-height: 1;
        }
        .gradient {
          background: linear-gradient(90deg, #7cc7ff 0%, #8db4ff 35%, #65e0c4 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .visual {
          display: flex;
          justify-content: center;
        }
        .visual img {
          max-width: 560px;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 30px 40px rgba(0, 120, 255, 0.35));
          border-radius: 22px;
        }

        /* Footer */
        .bottomBar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px 0 32px; /* 画面最下部に自然に配置 */
        }
        .cta {
          display: inline-block;
          padding: 14px 28px;
          border-radius: 999px;
          background: #0b2b3a;
          color: #eaf4f7;
          text-decoration: none;
          font-weight: 700;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
        }
        .legal {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          opacity: 0.55; /* 薄い白字で邪魔しない */
        }
        .legalLink {
          color: #ffffff;
          text-decoration: none;
        }
        .sep { opacity: 0.5; }

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .visual { order: -1; } /* モバイルで画像を上に */
          .top { padding: 16px 18px; }
        }
      `}</style>
    </>
  );
}
