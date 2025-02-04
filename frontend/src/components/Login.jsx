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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // ※メール認証済みかのチェック等の処理を入れるとより実運用に近くなります
      console.log("Logged in:", userCredential.user);
      // ログイン成功後の処理（例：ダッシュボードへ遷移）を追加
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    }
    setIsLoading(false);
  };

  const titleStyle = {
    fontSize: "50px",
    fontWeight: "700",
    background: "linear-gradient(to right, cyan, blue, indigo, purple, red)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textAlign: "center",
    marginBottom: "20px"
  };

  const inputStyle = {
    width: "300px",
    height: "40px",
    paddingLeft: "10px",
    borderRadius: "15px",
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
    color: "blue",
    background: "none",
    border: "none",
    cursor: "pointer"
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"20px" }}>
      <div style={titleStyle}>Log in</div>
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
      <button onClick={handleLogin} style={buttonStyle} disabled={!email || !password || isLoading}>
        Login
      </button>
      <button 
        onClick={()=>{
          /* パスワードリセット画面表示などの処理 */
        }} 
        style={{ marginBottom:"20px", color:"blue", background:"none", border:"none", cursor:"pointer" }}>
        Forget password?
      </button>
      <button onClick={()=> navigate("/signup")} style={linkStyle}>
        まだアカウントをお持ちでないですか？こちらをクリック
      </button>
      {showAlert && <div style={{ color:"red", marginTop:"20px" }}>{alertMessage}</div>}
    </div>
  );
};

export default Login;
