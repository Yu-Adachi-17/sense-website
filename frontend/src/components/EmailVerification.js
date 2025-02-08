// EmailVerification.js
import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

const EmailVerification = () => {
  const auth = getAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState("認証中...");

  useEffect(() => {
    // URL から oobCode を取得
    const query = new URLSearchParams(location.search);
    const oobCode = query.get("oobCode");

    if (oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatusMessage("メール認証に成功しました。アカウント認証後にログインしてください。");
        })
        .catch((error) => {
          console.error("認証エラー:", error);
          setStatusMessage("メール認証に失敗しました。コードが無効か、既に認証済みかもしれません。");
        });
    } else {
      setStatusMessage("認証コードが見つかりません。");
    }
  }, [auth, location.search]);

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
      <h1>Email Verification</h1>
      <p>{statusMessage}</p>
      {statusMessage.includes("成功") && (
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
          アカウント認証後にログイン
        </button>
      )}
    </div>
  );
};

export default EmailVerification;
