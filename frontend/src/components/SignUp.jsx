import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

const SignUp = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate("/"); // ホーム画面にリダイレクト
    } catch (error) {
      setAlertMessage("Googleサインインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      navigate("/"); // ホーム画面にリダイレクト
    } catch (error) {
      setAlertMessage("Appleサインインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#000",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: "40px", fontWeight: "700", color: "white", marginBottom: "20px" }}>
        Create Account
      </h1>
      <button
        onClick={handleGoogleSignIn}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 20px",
          background: "white",
          color: "black",
          border: "1px solid #ccc",
          borderRadius: "5px",
          cursor: "pointer",
          width: "300px",
          marginBottom: "10px",
          fontWeight: "bold",
        }}
      >
        <FcGoogle style={{ marginRight: "10px", fontSize: "20px" }} />
        Googleでサインイン
      </button>
      <button
        onClick={handleAppleSignIn}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 20px",
          background: "black",
          color: "white",
          border: "1px solid white",
          borderRadius: "5px",
          cursor: "pointer",
          width: "300px",
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        <FaApple style={{ marginRight: "10px", fontSize: "20px" }} />
        Appleでサインイン
      </button>
      {alertMessage && <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>}
    </div>
  );
};

export default SignUp;
