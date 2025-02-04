// src/components/SignUp.jsx
import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebaseConfig";

const auth = getAuth(app);

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showRegisterButton, setShowRegisterButton] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setAlertMessage("確認メールを送信しました。メールをご確認ください。");
      setShowAlert(true);
      setShowRegisterButton(true);
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    }
    setIsLoading(false);
  };

  const handleRegister = async () => {
    setAlertMessage("登録完了です。メール認証後、ログインしてください。");
    setShowAlert(true);
  };

  return (
    <div style={{ backgroundColor: "#000", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", color: "white" }}>
      <h1 style={{ fontSize: "40px", fontWeight: "700", background: "linear-gradient(to right, white)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Create Account
      </h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "300px", height: "40px", paddingLeft: "10px", borderRadius: "25px", border: "1px solid gray", marginBottom: "20px" }} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "300px", height: "40px", paddingLeft: "10px", borderRadius: "25px", border: "1px solid gray", marginBottom: "20px" }} />
      <button onClick={handleSignUp} style={{ padding: "10px 20px", borderRadius: "20px", border: "2px solid", borderImage: "linear-gradient(to right, cyan, blue, indigo, purple, red) 1", background: "transparent", color: "white", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1, marginBottom: "20px" }} disabled={isLoading}>
        Email verification
      </button>
      {showRegisterButton && <button onClick={handleRegister} style={{ padding: "10px 20px", borderRadius: "20px", border: "2px solid", borderImage: "linear-gradient(to right, cyan, blue, indigo, purple, red) 1", background: "transparent", color: "white", cursor: "pointer", marginBottom: "20px" }}>Register</button>}
      <button onClick={() => navigate("/login")} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>すでにアカウントをお持ちですか？こちらをクリック</button>
      {showAlert && <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>}
    </div>
  );
};

export default SignUp;
