// EmailVerification.js
import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const EmailVerification = () => {
  const auth = getAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [statusMessage, setStatusMessage] = useState(t("Verifying..."));

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const oobCode = query.get("oobCode");

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
  }, [auth, location.search, t]);

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
          onClick={() => navigate("/login")}
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
};

export default EmailVerification;
