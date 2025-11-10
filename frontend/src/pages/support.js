// pages/support.js
import Head from "next/head";

const SUPPORT = {
  email: "support@sense-ai.world",
  phoneIntl: "+817031057815",
  // 必要に応じて受付時間などを追記
  hoursJp: "受付時間：平日 9:00–17:00（JST）",
  hoursEn: "Hours: Mon–Fri 9:00–17:00 (JST)",
};

export default function SupportPage() {
  const mailtoJp = `mailto:${SUPPORT.email}?subject=サポート問い合わせ&body=以下にご用件をご記入ください。%0D%0A%0D%0A・お名前:%0D%0A・ご利用アプリ/プラン:%0D%0A・事象の詳細:%0D%0A・再現手順:%0D%0A・スクリーンショット/ログ（任意）:%0D%0A`;
  const mailtoEn = `mailto:${SUPPORT.email}?subject=Support%20Request&body=Please describe your inquiry below.%0D%0A%0D%0A- Name:%0D%0A- App/Plan:%0D%0A- Issue details:%0D%0A- Steps to reproduce:%0D%0A- Screenshot/Logs (optional):%0D%0A`;

  return (
    <>
      <Head>
        <title>Support | Sense G.K.</title>
        <meta
          name="description"
          content="Official support contact for Sense G.K. (合同会社Sense). Email support, phone number, and business hours."
        />
        <meta property="og:title" content="Support | Sense G.K." />
        <meta
          property="og:description"
          content="Get in touch with Sense G.K. support."
        />
      </Head>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>サポート / Support</h1>
          <p style={{ color: "#555", marginTop: 8 }}>
            製品やアカウントに関するお問い合わせはこちらから。
          </p>
        </header>

        <section style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>日本語</h2>
          <p>
            メール：{" "}
            <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
            <br />
            電話： <a href={`tel:${SUPPORT.phoneIntl}`}>{SUPPORT.phoneIntl}</a>
            <br />
            {SUPPORT.hoursJp}
          </p>
          <p>
            <a href={mailtoJp} style={button}>
              メールで問い合わせる
            </a>
          </p>
        </section>

        <section style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>English</h2>
          <p>
            Email: <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
            <br />
            Phone: <a href={`tel:${SUPPORT.phoneIntl}`}>{SUPPORT.phoneIntl}</a>
            <br />
            {SUPPORT.hoursEn}
          </p>
          <p>
            <a href={mailtoEn} style={button}>
              Email Support
            </a>
          </p>
        </section>

        <nav
          aria-label="back-links"
          style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}
        >
          <a href="/company">/company</a>
          <a href="/privacy-policy">/privacy-policy</a>
          <a href="/terms-of-use">/terms-of-use</a>
        </nav>
      </main>
    </>
  );
}

const card = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  background: "#fff",
};

const button = {
  display: "inline-block",
  padding: "10px 16px",
  borderRadius: 8,
  textDecoration: "none",
  border: "1px solid #ddd",
  background: "#f7f7f7",
};
