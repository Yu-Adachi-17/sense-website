import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function SignUpSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[DEBUG] SignUpSuccess component rendered");
    const timer = setTimeout(() => {
      navigate("/"); // ホーム画面に遷移
    }, 2000);
    return () => clearTimeout(timer); // クリーンアップ
  }, [navigate]);

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
      <h1 style={{ fontWeight: 225, letterSpacing: "0.05em" }}>
        Sign Up Successful
      </h1>
      <p style={{ fontSize: "0.6em", marginTop: "10px" }}>
        Redirecting to home in a few seconds...
      </p>
    </div>
  );
}
