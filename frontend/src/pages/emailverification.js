import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode } from "firebase/auth";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

export default function EmailVerification() {
  const auth = getAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [statusMessage, setStatusMessage] = useState(t("Verifying..."));

  // アラビア語の場合に dir="rtl" を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  useEffect(() => {
    if (!router.isReady) return;
    const { oobCode } = router.query;

    if (oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatusMessage(
            t("Email verification successful. Please log in after your account is verified.")
          );
        })
        .catch((error) => {
          console.error("Verification error:", error);
          setStatusMessage(
            t("Email verification failed. The code may be invalid or already verified.")
          );
        });
    } else {
      setStatusMessage(t("Verification code not found."));
    }
  }, [router.isReady, router.query, auth, t]);

  return (
    <div
      style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "Impact, sans-serif",
      }}
    >
      <h1>{t("Email Verification")}</h1>
      <p>{statusMessage}</p>
      {statusMessage.includes("successful") && (
        <button
          onClick={() => router.push("/login")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: "white",
            color: "black",
            border: "none",
            borderRadius: "5px",
          }}
        >
          {t("Log In After Verification")}
        </button>
      )}
    </div>
  );
}
