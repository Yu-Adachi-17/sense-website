// pages/company.js
import Head from "next/head";

const COMPANY = {
  jpName: "合同会社Sense",
  enName: "Sense G.K.",
  representativeJp: "代表社員 安達 悠",
  representativeEn: "Representative Partner: Yu Adachi",
  // 確定反映（番地・郵便番号は未共有のため省略）
  addressJp: "（登記住所）東京都港区芝公園 コンシェリア芝公園405",
  addressEn:
    "Registered Office: Concieria Shiba-Koen 405, Shiba-Koen, Minato-ku, Tokyo, Japan",
  // 連絡先
  phoneIntl: "+817031057815",
  supportEmail: "support@sense-ai.world",
  supportUrl: "https://www.sense-ai.world/support",
  marketingUrl: "https://www.sense-ai.world/minutes-ai",
  // 事業内容（踏襲）
  businessJp:
    "AIプロダクトの企画・開発・運用（議事録AI、SlideAI ほか）",
  businessEn:
    "Planning, development, and operation of AI products (Minutes.AI, SlideAI, etc.)",
  establishedJp: "設立：登記簿記載の設立日",
  establishedEn: "Incorporated: As recorded in the corporate registry",
  entityJp: "法人種別：合同会社（G.K.）",
  entityEn: "Entity Type: Godo Kaisha (G.K.)",
  siteDomain: "sense-ai.world",
};

export default function CompanyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: `${COMPANY.enName} (${COMPANY.jpName})`,
    url: "https://www.sense-ai.world/company",
    sameAs: [COMPANY.supportUrl, COMPANY.marketingUrl],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: COMPANY.supportEmail,
      telephone: COMPANY.phoneIntl,
      url: COMPANY.supportUrl,
      availableLanguage: ["ja", "en"],
    },
  };

  return (
    <>
      <Head>
        <title>Company | {COMPANY.enName}</title>
        <meta
          name="description"
          content="Company information for Sense G.K. (合同会社Sense): address, representative, business overview, and support contact."
        />
        <meta property="og:title" content="Company | Sense G.K." />
        <meta
          property="og:description"
          content="Company profile and official support contact for Sense G.K."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.sense-ai.world/company" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0 }}>会社情報 / Company</h1>
          <p style={{ marginTop: 8, color: "#555" }}>
            本ページは Apple Developer Program の要件に基づき、公的に参照可能な企業情報とサポート窓口を明示しています。
          </p>
        </header>

        {/* 日本語セクション（踏襲） */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 12 }}>会社概要（日本語）</h2>
          <dl style={{ lineHeight: 1.9 }}>
            <dt>会社名</dt>
            <dd>
              {COMPANY.jpName}（{COMPANY.enName}）
            </dd>

            <dt>法人種別</dt>
            <dd>{COMPANY.entityJp}</dd>

            <dt>代表者</dt>
            <dd>{COMPANY.representativeJp}</dd>

            <dt>所在地</dt>
            <dd>{COMPANY.addressJp}</dd>

            <dt>事業内容</dt>
            <dd>{COMPANY.businessJp}</dd>

            <dt>問い合わせ・サポート</dt>
            <dd>
              サポートURL： <a href={COMPANY.supportUrl}>{COMPANY.supportUrl}</a>
              <br />
              メール：{" "}
              <a href={`mailto:${COMPANY.supportEmail}`}>
                {COMPANY.supportEmail}
              </a>
              <br />
              電話：<a href={`tel:${COMPANY.phoneIntl}`}>{COMPANY.phoneIntl}</a>
            </dd>
          </dl>
        </section>

        {/* 英語セクション（踏襲） */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 12 }}>Company (English)</h2>
          <dl style={{ lineHeight: 1.9 }}>
            <dt>Legal Name</dt>
            <dd>
              {COMPANY.enName} ({COMPANY.jpName})
            </dd>

            <dt>Entity Type</dt>
            <dd>{COMPANY.entityEn}</dd>

            <dt>Representative</dt>
            <dd>{COMPANY.representativeEn}</dd>

            <dt>Registered Address</dt>
            <dd>{COMPANY.addressEn}</dd>

            <dt>Business</dt>
            <dd>{COMPANY.businessEn}</dd>

            <dt>Support Contact</dt>
            <dd>
              Support URL: <a href={COMPANY.supportUrl}>{COMPANY.supportUrl}</a>
              <br />
              Email:{" "}
              <a href={`mailto:${COMPANY.supportEmail}`}>
                {COMPANY.supportEmail}
              </a>
              <br />
              Phone: <a href={`tel:${COMPANY.phoneIntl}`}>{COMPANY.phoneIntl}</a>
            </dd>
          </dl>
        </section>

        {/* 下段リンク（指定3本） */}
        <nav
          aria-label="legal-and-support-links"
          style={{
            borderTop: "1px solid #eee",
            paddingTop: 16,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <a href="/support">/support</a>
          <a href="/privacy-policy">/privacy-policy</a>
          <a href="/terms-of-use">/terms-of-use</a>
        </nav>
      </main>
    </>
  );
}

const buttonStyle = {
  display: "inline-block",
  padding: "10px 16px",
  borderRadius: 8,
  textDecoration: "none",
  border: "1px solid #ddd",
  background: "#f7f7f7",
};
