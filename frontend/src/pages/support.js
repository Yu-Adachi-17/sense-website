// pages/support.js
import Head from "next/head";

const SUPPORT = {
  email: "support@sense-ai.world",
  phoneIntl: "+817031057815",
};

export default function SupportPage() {
  const mailto = `mailto:${SUPPORT.email}?subject=Support%20Request&body=Please%20describe%20your%20inquiry%20below.%0D%0A%0D%0A- Name:%0D%0A- App/Plan:%0D%0A- Issue%20details:%0D%0A- Steps%20to%20reproduce:%0D%0A- Screenshot/Logs%20(optional):%0D%0A`;

  return (
    <>
      <Head>
        <title>Support | Sense G.K.</title>
        <meta
          name="description"
          content="Official support contact for Sense G.K. Email and phone contact."
        />
        <meta property="og:title" content="Support | Sense G.K." />
        <meta property="og:type" content="website" />
      </Head>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>Support</h1>
          <p style={{ color: "#555", marginTop: 8 }}>
            Get in touch with our support team.
          </p>
        </header>

        <section style={{ lineHeight: 1.9, marginBottom: 16 }}>
          <p>
            Email: <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
            <br />
            Phone: <a href={`tel:${SUPPORT.phoneIntl}`}>{SUPPORT.phoneIntl}</a>
          </p>
          <p>
            <a
              href={mailto}
              style={{
                display: "inline-block",
                padding: "10px 16px",
                borderRadius: 8,
                textDecoration: "none",
                border: "1px solid #ddd",
                background: "#f7f7f7",
              }}
            >
              Email Support
            </a>
          </p>
        </section>

        <nav
          aria-label="back-links"
          style={{ display: "flex", gap: 16, flexWrap: "wrap" }}
        >
          <a href="/company">/company</a>
          <a href="/privacy-policy">/privacy-policy</a>
          <a href="/terms-of-use">/terms-of-use</a>
        </nav>
      </main>
    </>
  );
}
