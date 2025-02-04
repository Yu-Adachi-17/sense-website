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

  // 新規作成＋確認メール送信処理
  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // ユーザー作成後、確認メールを送信
      await sendEmailVerification(userCredential.user);
      setAlertMessage("確認メールを送信しました。メールをご確認ください。");
      setShowAlert(true);
      // 確認メール送信後、登録ボタン（＝最終登録処理）を表示する（※実際はメール認証後の処理が必要）
      setShowRegisterButton(true);
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    }
    setIsLoading(false);
  };

  // ※簡易版の登録完了処理（実際はメール認証済みかをチェックする必要があります）
  const handleRegister = async () => {
    setAlertMessage("登録完了です。メール認証後、ログインしてください。");
    setShowAlert(true);
    // ここでユーザー情報を Firestore に保存するなどの処理も追加可能
  };

  // SwiftUI の見た目に近いスタイル
  const titleStyle = {
    fontSize: "40px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "20px",
    background: "linear-gradient(to right, cyan, blue, indigo, purple, red)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  };

  const inputStyle = {
    width: "300px",
    height: "40px",
    paddingLeft: "10px",
    borderRadius: "25px",
    border: "1px solid gray",
    marginBottom: "20px"
  };

  const buttonStyle = {
    padding: "10px 20px",
    borderRadius: "20px",
    border: "2px solid",
    borderImage: "linear-gradient(to right, cyan, blue, indigo, purple, red) 1",
    background: "transparent",
    color: "black",
    cursor: (!email || !password || isLoading) ? "not-allowed" : "pointer",
    opacity: (!email || !password || isLoading) ? 0.5 : 1,
    marginBottom: "20px"
  };

  const linkStyle = {
    color: "red",
    background: "none",
    border: "none",
    cursor: "pointer"
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"20px" }}>
      <div style={titleStyle}>Create Account</div>
      <input 
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        style={inputStyle}
      />
      <input 
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        style={inputStyle}
      />
      <button onClick={handleSignUp} style={buttonStyle} disabled={!email || !password || isLoading}>
        Email verification
      </button>
      {showRegisterButton && (
        <button onClick={handleRegister} style={buttonStyle} disabled={isLoading}>
          Register
        </button>
      )}
      <button onClick={()=> navigate("/login")} style={linkStyle}>
        すでにアカウントをお持ちですか？こちらをクリック
      </button>
      {showAlert && <div style={{color:"red", marginTop:"20px"}}>{alertMessage}</div>}
    </div>
  );
};

export default SignUp;
