// pages/zoom-app-docs.js
import React from "react";
import HomeIcon from './homeIcon';

export default function ZoomAppDocs() {
  // ここは後で実URLに差し替え（承認後の Unlisted 用）
  const UNLISTED_INSTALL_URL = "#"; // ← TBD after approval
  // ベータテスト時の招待リンク（Beta Test で発行したものを貼る）
  const BETA_TEST_INSTALL_URL = "#"; // ← paste your Beta Test / Authorization URL

  const homeIconStyle = { position: "absolute", top: 20, left: 20, cursor: "pointer" };
  const containerStyle = {
    maxWidth: 800, margin: "40px auto", padding: 30,
    backgroundColor: "#000", color: "#fff", fontSize: 18, lineHeight: 1.8,
    fontFamily: "Arial, sans-serif", textAlign: "left",
    borderRadius: 8, boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
  };
  const h1 = { fontSize: 40, fontWeight: "bold", marginBottom: 20 };
  const h2 = { fontSize: 28, fontWeight: "bold", marginTop: 30, marginBottom: 10 };
  const p  = { marginBottom: 10 };
  const a  = { color: "#8ec5ff", textDecoration: "underline" };

  return (
    <div>
      <div style={homeIconStyle}><HomeIcon size={30} /></div>
      <main style={containerStyle}>
        <h1 style={h1}>Minutes.AI for Zoom — Documentation</h1>

        <h2 style={h2}>Overview</h2>
        <p style={p}>
          Minutes.AI converts your meeting audio into structured minutes. This page explains how to install (Unlisted/Beta),
          use, and remove the Zoom integration.
        </p>

        <h2 style={h2}>Install</h2>
        <ol>
          <li style={p}>
            <b>For reviewers / testers (before approval):</b> open the Beta / Authorization link:&nbsp;
            <a style={a} href={BETA_TEST_INSTALL_URL} target="_blank" rel="noreferrer">Install for testing</a>
            &nbsp;(sign in to Zoom, then authorize the app).
          </li>
          <li style={p}>
            <b>After approval (Unlisted):</b> share this private install link with users you choose:&nbsp;
            <a style={a} href={UNLISTED_INSTALL_URL} target="_blank" rel="noreferrer">Install Minutes.AI (Unlisted)</a>.
            If the link is not yet active, it will be available after Zoom approval.
          </li>
        </ol>

        <h2 style={h2}>Use</h2>
        <ol>
          <li style={p}>Open Minutes.AI (Zoom client will load our in-client web view).</li>
          <li style={p}>Upload your Zoom audio file (or recording extract).</li>
          <li style={p}>AI generates minutes automatically. Review and copy/download the results.</li>
        </ol>

        <h2 style={h2}>Remove / Uninstall</h2>
        <ol>
          <li style={p}>Open the <a style={a} href="https://marketplace.zoom.us/" target="_blank" rel="noreferrer">Zoom App Marketplace</a> and sign in.</li>
          <li style={p}>Click <b>Manage</b> (top right) → <b>Added Apps</b>.</li>
          <li style={p}>Find <b>Minutes.AI</b> and click <b>Remove</b> to uninstall.</li>
        </ol>

        <h2 style={h2}>Data & Permissions</h2>
        <ul>
          <li style={p}>This integration does not request Zoom user data via OAuth scopes at this time.</li>
          <li style={p}>Audio you upload is processed to generate minutes. We do not sell data. See our Privacy Policy for details.</li>
        </ul>

        <h2 style={h2}>Support</h2>
        <p style={p}>
          Need help? Contact <b>info@sense-ai.world</b>.
        </p>
      </main>
    </div>
  );
}
