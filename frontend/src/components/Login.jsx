import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebaseConfig";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

const auth = getAuth(app);

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/"); // ✅ ログイン成功時にホーム画面へ遷移
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate("/"); // ✅ Googleサインイン成功時にホーム画面へ遷移
    } catch (error) {
      setAlertMessage("Googleサインインに失敗しました");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      navigate("/"); // ✅ Appleサインイン成功時にホーム画面へ遷移
    } catch (error) {
      setAlertMessage("Appleサインインに失敗しました");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#000",
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "white",
      }}
    >
      <h1
        style={{
          fontSize: "40px",
          fontWeight: "700",
          color: "white",
          margin: 0,
          marginBottom: "20px",
        }}
      >
        Log in
      </h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "300px",
          height: "40px",
          paddingLeft: "10px",
          borderRadius: "25px",
          border: "1px solid gray",
          marginBottom: "20px",
        }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "300px",
          height: "40px",
          paddingLeft: "10px",
          borderRadius: "25px",
          border: "1px solid gray",
          marginBottom: "20px",
        }}
      />

      {/* Email ログインボタン */}
      <button
        onClick={handleLogin}
        disabled={isLoading}
        style={{
          padding: "10px 20px",
          background: "white",
          color: "black",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        Login
      </button>

      {/* Googleサインイン */}
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
        Googleでログイン
      </button>

      {/* Appleサインイン */}
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
        Appleでログイン
      </button>

      <button
        onClick={() => navigate("/signup")}
        style={{
          color: "red",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        まだアカウントをお持ちでないですか？こちらをクリック
      </button>

      {showAlert && (
        <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>
      )}
    </div>
  );
};

export default Login;
