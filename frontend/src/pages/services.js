import Head from "next/head";

export default function Services() {
  const LINK = "https://www.sense-ai.world";

  return (
    <>
      <Head>
        <title>Minutes.AI — Services</title>
        <meta
          name="description"
          content="Just Record. AI Makes Beautiful Minutes."
        />
      </Head>

      <div className="page">
        <header className="top">
          <a href={LINK} className="brand">
            Minutes.<span className="ai">AI</span>
          </a>

          <nav className="nav">
            <a href={LINK} className="navLink">Home</a>
          </nav>
        </header>

        <main className="hero">
          <div className="copy">
            <h1 className="line1">Just Record.</h1>
            <h2 className="line2">AI Makes</h2>
            <h2 className="line3">
              <span className="gradient">Beautiful Minutes</span>
            </h2>

            <a href={LINK} className="cta">Get Started</a>
          </div>

          <div className="visual">
            {/* 右側の画像。frontend/public/images/hero-phone.png に配置してください */}
            <img src="/images/hero-phone.png" alt="Minutes.AI app mock" />
          </div>
        </main>
      </div>

      <style jsx>{`
        .page {
          background: #000;
          color: #eaf4f7;
          min-height: 100vh;
        }

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
          margin: 0 6px;
          opacity: 0.92;
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 32px;
          align-items: center;
          padding: 40px 28px 80px;
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
          margin: 12px 0 28px;
          line-height: 1;
        }
        .gradient {
          background: linear-gradient(
            90deg,
            #7cc7ff 0%,
            #8db4ff 35%,
            #65e0c4 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .cta {
          display: inline-block;
          margin-top: 12px;
          padding: 14px 26px;
          border-radius: 999px;
          background: #0b2b3a;
          color: #eaf4f7;
          text-decoration: none;
          font-weight: 700;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
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

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .visual {
            order: -1; /* モバイルで画像を上に */
          }
          .top {
            padding: 16px 18px;
          }
        }
      `}</style>
    </>
  );
}
