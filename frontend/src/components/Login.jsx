import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
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
    if (!email || !password) {
      setAlertMessage("メールアドレスとパスワードを入力してください");
      setShowAlert(true);
      return;
    }
    setIsLoading(true);
    try {
      // サインイン処理
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // メール認証が完了していない場合
      if (!user.emailVerified) {
        // ログイン状態にさせないためサインアウト
        await signOut(auth);
        setAlertMessage("メール認証が完了していません。メール内のリンクをクリックして認証してください。");
        setShowAlert(true);
        return;
      }
  
      // 認証済みの場合のみホーム画面へ遷移
      navigate("/");
    } catch (error) {
      console.error("ログインエラー:", error);
  
      // Firebase のエラーコードに応じたメッセージ表示
      switch (error.code) {
        case "auth/invalid-email":
          setAlertMessage("無効なメールアドレスです。");
          break;
        case "auth/user-disabled":
          setAlertMessage("このアカウントは無効になっています。");
          break;
        case "auth/user-not-found":
          setAlertMessage("ユーザーが見つかりません。");
          break;
        case "auth/wrong-password":
          setAlertMessage("パスワードが違います。");
          break;
        case "auth/too-many-requests":
          setAlertMessage("短時間での試行が多すぎます。しばらく待ってください。");
          break;
        default:
          setAlertMessage("ログインに失敗しました。もう一度お試しください。");
      }
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

  // パスワード再設定メール送信処理
  const handlePasswordReset = async () => {
    if (!email) {
      setAlertMessage("メールアドレスを入力してください");
      setShowAlert(true);
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setAlertMessage("パスワード再設定メールを送信しました。メールをご確認ください。");
      setShowAlert(true);
    } catch (error) {
      console.error("パスワード再設定メール送信エラー:", error);
      setAlertMessage("パスワード再設定メールの送信に失敗しました。");
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

      {/* パスワード再設定メール送信用ボタン */}
      <button
        onClick={handlePasswordReset}
        disabled={isLoading}
        style={{
          color: "red",
          background: "none",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        パスワードを忘れましたか？再設定メールを送ります。
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
