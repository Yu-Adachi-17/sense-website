import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";

export default function Cancel() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const id = setTimeout(() => router.replace("/"), 3000);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <>
      <Head>
        <title>{t("Payment Failed or Canceled")}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 720 }}>
          <h1
            style={{
              marginBottom: 12,
              fontWeight: 700,
              fontSize: "clamp(24px, 3.2vw, 36px)", // ← タイトルを少し大きく
              letterSpacing: 0.2,
            }}
          >
            {t("Payment not completed")}
          </h1>
          <p style={{ opacity: 0.85, marginBottom: 0, fontSize: "clamp(14px, 1.6vw, 18px)" }}>
            {t("Your purchase was canceled or failed. Redirecting to the main page in a few seconds…")}
          </p>
        </div>
      </main>
    </>
  );
}
