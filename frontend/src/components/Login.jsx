// src/components/Login.jsx
import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebaseConfig";

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
      setAlertMessage("ログイン成功！");
      setShowAlert(true);
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    }
    setIsLoading(false);
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
          background: "linear-gradient(to right, white)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
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
      <button
        onClick={handleLogin}
        disabled={isLoading}
        style={{
          padding: "10px 20px",
          borderRadius: "20px",
          border: "2px solid",
          borderImage: "linear-gradient(to right, cyan, blue, indigo, purple, red) 1",
          background: "transparent",
          color: "white",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
          marginBottom: "20px",
        }}
      >
        Login
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
