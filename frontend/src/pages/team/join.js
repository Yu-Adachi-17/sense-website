import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const IOS_LINK = "https://apps.apple.com/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";
const ANDROID_LINK = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

export default function TeamJoinPage() {
  const router = useRouter();
  const { code } = router.query;
  const [copied, setCopied] = useState(false);

  // Try to open the app via Universal Link / Deep Link
  useEffect(() => {
    if (code) {
      // Attempt to open the app with the invite code
      // If the app is installed, it will handle the link
      // Otherwise, the user stays on this page
      const appLink = `minutesai://team/join?code=${code}`;
      const timeout = setTimeout(() => {
        // App didn't open — user stays on this page
      }, 2000);
      window.location.href = appLink;
      return () => clearTimeout(timeout);
    }
  }, [code]);

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Head>
        <title>チームに参加 — Minutes.AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>

      <div style={styles.page}>
        <div style={styles.card}>
          {/* Logo */}
          <div style={styles.logoWrap}>
            <span style={styles.logo}>Minutes.</span>
            <span style={styles.logoAi}>AI</span>
          </div>

          {/* Main message */}
          <h1 style={styles.h1}>チームに招待されています</h1>
          <p style={styles.subtitle}>
            アプリをダウンロードして、チームの議事録・ナレッジに
            アクセスしましょう。
          </p>

          {/* Invite code display */}
          {code && (
            <div style={styles.codeBox}>
              <div style={styles.codeLabel}>招待コード</div>
              <div style={styles.codeValue}>{code}</div>
              <button
                onClick={handleCopyCode}
                style={styles.copyBtn}
              >
                {copied ? "✓ コピーしました" : "コピー"}
              </button>
            </div>
          )}

          {/* Steps */}
          <div style={styles.steps}>
            <div style={styles.step}>
              <span style={styles.stepNum}>1</span>
              <span>アプリをダウンロード</span>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNum}>2</span>
              <span>アカウントを作成・ログイン</span>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNum}>3</span>
              <span>「Team」ボタンから招待コードを入力</span>
            </div>
          </div>

          {/* Download buttons */}
          <div style={styles.downloadRow}>
            <a href={IOS_LINK} style={styles.iosBtn} target="_blank" rel="noopener noreferrer">
              <span style={{ fontSize: 20 }}>&#63743;</span>
              <span>iPhone</span>
            </a>
            <a href={ANDROID_LINK} style={styles.androidBtn} target="_blank" rel="noopener noreferrer">
              <span style={{ fontSize: 16 }}>&#9654;</span>
              <span>Android</span>
            </a>
          </div>

          {/* Features */}
          <div style={styles.features}>
            <div style={styles.featureItem}>✓ チーム議事録を閲覧・共有</div>
            <div style={styles.featureItem}>✓ AIナレッジダッシュボード</div>
            <div style={styles.featureItem}>✓ タスク管理・プロジェクト管理</div>
            <div style={styles.featureItem}>✓ 閲覧は完全無料</div>
          </div>
        </div>

        <div style={styles.footer}>
          &copy; Sense LLC — Minutes.AI
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e1c 0%, #0b1030 50%, #05060e 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif",
  },
  card: {
    maxWidth: 440,
    width: "100%",
    background: "#ffffff",
    borderRadius: 20,
    padding: "36px 28px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
    textAlign: "center",
  },
  logoWrap: {
    marginBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: 800,
    color: "#1a1a1a",
    letterSpacing: "-0.5px",
  },
  logoAi: {
    fontSize: 24,
    fontWeight: 800,
    background: "linear-gradient(90deg, #7cc7ff, #65e0c4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1a1a1a",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 1.6,
    margin: "0 0 24px",
  },
  codeBox: {
    background: "#f0f4ff",
    borderRadius: 12,
    padding: "16px",
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: 800,
    color: "#2563eb",
    letterSpacing: 2,
    marginBottom: 10,
    fontFamily: "monospace",
  },
  copyBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  steps: {
    textAlign: "left",
    marginBottom: 24,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    fontSize: 14,
    color: "#333",
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },
  downloadRow: {
    display: "flex",
    gap: 10,
    marginBottom: 24,
  },
  iosBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "#000",
    color: "#fff",
    textDecoration: "none",
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
  },
  androidBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "#34A853",
    color: "#fff",
    textDecoration: "none",
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
  },
  features: {
    textAlign: "left",
    borderTop: "1px solid #eee",
    paddingTop: 16,
  },
  featureItem: {
    fontSize: 13,
    color: "#555",
    padding: "4px 0",
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
};
