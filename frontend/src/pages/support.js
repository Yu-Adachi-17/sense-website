// pages/support.js
import React from "react";
import HomeIcon from './homeIcon';

export default function SupportPage() {
  const homeIconStyle = {
    position: "absolute",
    top: 20,
    left: 20,
    cursor: "pointer",
  };

  const containerStyle = {
    maxWidth: 800,
    margin: "40px auto",
    padding: 30,
    backgroundColor: "#000",
    color: "#fff",
    fontSize: 18,
    lineHeight: 1.8,
    fontFamily: "Arial, sans-serif",
    textAlign: "left",
    borderRadius: 8,
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
  };

  const h1 = { fontSize: 40, fontWeight: "bold", marginBottom: 20 };
  const h2 = { fontSize: 28, fontWeight: "bold", marginTop: 30, marginBottom: 10 };
  const p  = { marginBottom: 10 };

  const link = { color: "#8ec5ff", textDecoration: "underline" };
  const badge = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 9999,
    background: "#111",
    border: "1px solid #333",
    fontSize: 14,
    marginLeft: 8
  };
  const btn = {
    display: "inline-block",
    padding: "10px 14px",
    background: "#1e293b",
    borderRadius: 8,
    border: "1px solid #334155",
    color: "#fff",
    textDecoration: "none",
    transition: "opacity .15s",
  };

  const mailTo = (subject, body) =>
    `mailto:info@sense-ai.world?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div>
      <div style={homeIconStyle}>
        <HomeIcon size={30} />
      </div>

      <main style={containerStyle}>
        <h1 style={h1}>Minutes.AI — Support</h1>
        <p style={p}>
          If you have questions or run into an issue, please contact us at
          {" "}
          <a style={link} href="mailto:info@sense-ai.world">info@sense-ai.world</a>.
          <span style={badge}>Typically replies within 2 business days</span>
        </p>

        <h2 style={h2}>Quick Links</h2>
        <ul>
          <li style={p}>
            Zoom integration guide (install / basic usage / uninstall):
            {" "}
            <a style={link} href="/zoom-app-docs" rel="noreferrer">Minutes.AI for Zoom — Documentation</a>
          </li>
          <li style={p}>
            Privacy Policy: <a style={link} href="/privacy-policy" rel="noreferrer">Privacy Policy</a>
          </li>
          <li style={p}>
            Terms of Use: <a style={link} href="/terms-of-use" rel="noreferrer">Terms of Use</a>
          </li>
          <li style={p}>
            Legal Notice (Specified Commercial Transactions Act):
            {" "}
            <a style={link} href="/transactions-law" rel="noreferrer">Transactions Law</a>
          </li>
        </ul>

        <h2 style={h2}>Contact</h2>
        <p style={p}>Using the templates below helps us assist you faster.</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <a
            style={btn}
            href={mailTo(
              'Support: Minutes.AI for Zoom',
              `
▼ Issue
(e.g., billing, upload, minutes formatting)

▼ Steps to reproduce
1) 
2) 
3) 

▼ Environment
OS/Browser: 
App (iOS/Android/Zoom): 
Version: 

▼ Contact
Your name: 
`
            )}
          >Email Support</a>

        </div>

        <h2 style={h2}>Support Policy</h2>
        <ul>
          <li style={p}>Support hours: Weekdays 10:00–18:00 (JST)</li>
          <li style={p}>Typical response time: within 2 business days</li>
          <li style={p}>Personal data: Files uploaded for processing are deleted after a defined retention period (see Privacy Policy).</li>
        </ul>

        <h2 style={h2}>Tips</h2>
        <ul>
          <li style={p}>For long recordings, we recommend uploading over a stable connection.</li>
          <li style={p}>You can adjust the minutes template in app settings (where supported).</li>
        </ul>
      </main>
    </div>
  );
}
