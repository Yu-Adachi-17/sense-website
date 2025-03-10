import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import HomeIcon from './homeIcon';
import { FaApple } from "react-icons/fa";

import PrivacyPolicy from "./privacy-policy";
import TermsOfUse from "./terms-of-use";
import TransactionsLaw from "./transactions-law";

// react-helmet を利用して <head> 内の要素を制御
import { Helmet } from "react-helmet";
import Link from 'next/link';

export default function ServicesPage() {
  const { t, i18n } = useTranslation();

  // アラビア語の場合に dir="rtl" を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // グラデーションスタイルを定義
  const gradientStyle = {
    background: 'linear-gradient(90deg, rgb(153, 184, 255), rgba(115, 115, 255, 1), rgba(102, 38, 153, 1), rgb(95, 13, 133), rgba(255, 38, 38, 1), rgb(199, 42, 76))',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  const containerStyle = {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '30px',
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '18px',
    lineHeight: 1.8,
    fontFamily: 'Arial, sans-serif',
    textAlign: 'left',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const homeIconStyle = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    cursor: 'pointer',
  };

  // 各見出しにグラデーションを適用
  const centerTextStyle = {
    textAlign: 'center',
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '40px',
    ...gradientStyle,
  };

  const headingStyle = {
    fontWeight: 'bold',
  };

  const h1Style = {
    fontSize: '40px',
    marginBottom: '20px',
    ...headingStyle,
    ...gradientStyle,
  };

  const h2Style = {
    fontSize: '28px',
    marginTop: '30px',
    marginBottom: '10px',
    ...headingStyle,
    ...gradientStyle,
  };

  const paragraphStyle = {
    marginBottom: '10px',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };

  const thStyle = {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #777',
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
  };

  const tdStyle = {
    border: '1px solid #777',
    padding: '10px',
    textAlign: 'center',
  };

  const appStoreButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#fff',
    backgroundColor: '#000',
    border: '1px solid #fff',
    padding: '6px 12px',
    borderRadius: '4px',
    textDecoration: 'none',
    marginTop: '10px',
    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.25), rgba(255,255,255,0))',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4), 0 0 8px rgba(255,255,255,0.3)',
  };

  const footerLinksContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #777',
  };

  const footerLinkStyle = {
    color: '#fff',
    textDecoration: 'underline',
    cursor: 'pointer',
  };

  return (
    <div>
      {/* react-helmet を使って hreflang タグ等を設定 */}
      <Helmet>
        <html lang={i18n.language} />
        <link rel="alternate" hrefLang="en" href="https://www.sense-ai.world/en/services" />
        <link rel="alternate" hrefLang="ja" href="https://www.sense-ai.world/ja/services" />
        <link rel="alternate" hrefLang="de" href="https://www.sense-ai.world/de/services" />
        <link rel="alternate" hrefLang="nl" href="https://www.sense-ai.world/nl/services" />
        <link rel="alternate" hrefLang="ko" href="https://www.sense-ai.world/ko/services" />
        <link rel="alternate" hrefLang="fr" href="https://www.sense-ai.world/fr/services" />
        <link rel="alternate" hrefLang="pt-BR" href="https://www.sense-ai.world/pt-BR/services" />
        <link rel="alternate" hrefLang="pt-PT" href="https://www.sense-ai.world/pt-PT/services" />
        <link rel="alternate" hrefLang="es-ES" href="https://www.sense-ai.world/es-ES/services" />
        <link rel="alternate" hrefLang="es-MX" href="https://www.sense-ai.world/es-MX/services" />
        <link rel="alternate" hrefLang="da" href="https://www.sense-ai.world/da/services" />
        <link rel="alternate" hrefLang="sv" href="https://www.sense-ai.world/sv/services" />
        <link rel="alternate" hrefLang="tr" href="https://www.sense-ai.world/tr/services" />
        <link rel="alternate" hrefLang="zh-CN" href="https://www.sense-ai.world/zh-CN/services" />
        <link rel="alternate" hrefLang="zh-TW" href="https://www.sense-ai.world/zh-TW/services" />
        <link rel="alternate" hrefLang="no" href="https://www.sense-ai.world/no/services" />
        <link rel="alternate" hrefLang="ar" href="https://www.sense-ai.world/ar/services" />
        <link rel="alternate" hrefLang="ms" href="https://www.sense-ai.world/ms/services" />
        <link rel="alternate" hrefLang="id" href="https://www.sense-ai.world/id/services" />
        <link rel="alternate" hrefLang="x-default" href="https://www.sense-ai.world/services" />
      </Helmet>

      {/* HomeIcon を左上に配置 */}
      <div style={homeIconStyle}>
        <HomeIcon size={30} />
      </div>

      <div style={containerStyle}>
        <div style={centerTextStyle}>{t("Minutes AI Service & Pricing")}</div>

        <h2 style={h2Style}>{t("AI Tool That Automatically Creates Meeting Minutes")}</h2>

        <p style={paragraphStyle}>
          {t("Minutes AI leverages cutting-edge artificial intelligence technology to instantly analyze meeting audio and automatically generate highly accurate meeting minutes. With just one tap, it efficiently converts speech to text and shares it via the cloud, significantly reducing post-meeting tasks.")}
        </p>

        <h2 style={h2Style}>{t("Features")}</h2>

        <h3>{t("State-of-the-Art Speech Recognition AI")}</h3>
        <p>
          {t("It employs advanced natural language processing to accurately capture conversational nuances. Diverse statements are converted into text with minimal errors, producing highly accurate meeting minutes.")}
        </p>

        <h3>{t("Flexible Meeting Minutes Formats")}</h3>
        <p>
          {t("Automatically formats minutes according to your needs. It efficiently generates meeting minutes suitable for regular meetings, online conferences, and more.")}
        </p>

        <h3>{t("Multilingual Support")}</h3>
        <p>
          {t("Supports English and other languages, making it easy for AI to assist in creating minutes for global meetings.")}
        </p>

        <h3>{t("Cloud Storage & Sharing Features")}</h3>
        <p>
          {t("The generated meeting minutes are stored in the cloud and can be quickly shared with team members. Version control is also managed effortlessly.")}
        </p>

        <h2 style={h2Style}>{t("Pricing Plans")}</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t("Plan")}</th>
              <th style={thStyle}>{t("Price")}</th>
              <th style={thStyle}>{t("Recording Time")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>{t("Trial")}</td>
              <td style={tdStyle}>{t("$1.99")}</td>
              <td style={tdStyle}>{t("120 minutes")}</td>
            </tr>
            <tr>
              <td style={tdStyle}>{t("Light")}</td>
              <td style={tdStyle}>{t("$11.99")}</td>
              <td style={tdStyle}>{t("1200 minutes")}</td>
            </tr>
            <tr>
              <td style={tdStyle}>{t("Monthly Subscription")}</td>
              <td style={tdStyle}>{t("$17.99")}</td>
              <td style={tdStyle}>{t("Unlimited")}</td>
            </tr>
            <tr>
              <td style={tdStyle}>{t("Yearly Subscription")}</td>
              <td style={tdStyle}>{t("$149.99")}</td>
              <td style={tdStyle}>{t("Unlimited")}</td>
            </tr>
          </tbody>
        </table>
        <p style={paragraphStyle}>
          {t("Note: Guest users can record up to 3 minutes per day.")}
        </p>

        <h2 style={h2Style}>{t("Track Record")}</h2>
        <p style={paragraphStyle}>
          {t("Within just 6 months of the iOS version release, Minutes AI achieved 15,000 downloads worldwide and has been adopted in over 160 countries.")}
        </p>

        {/* App Store Button */}
        <a
          href="https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901"
          style={appStoreButtonStyle}
        >
          <FaApple size={20} />
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>{t("App Store")}</span>
        </a>

        {/* Footer Links */}
        <div style={footerLinksContainerStyle}>

        <Link href="/privacy-policy">
  <span style={footerLinkStyle}>Privacy Policy</span>
</Link>
<Link href="/terms-of-use">
  <span style={footerLinkStyle}>Terms of Use</span>
</Link>
<Link href="/transactions-law">
  <span style={footerLinkStyle}>Legal Notice</span>
</Link>
        </div>
      </div>
    </div>
  );
}
