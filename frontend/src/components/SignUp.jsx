import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore"; // Firestore のインポート
import { useNavigate } from "react-router-dom";
import { app } from "../firebaseConfig";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

const auth = getAuth(app);
const db = getFirestore(app); // Firestore 初期化

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpSuccess, setIsSignUpSuccess] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Email サインアップ処理
  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      // ユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Firestore にユーザードキュメントを作成（初期値 remainingMinutes: 0 など）
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        subscription: false, // 初期状態では未加入 (merge: true で確実に作成)
        displayName: user.displayName || "",
        remainingSeconds: 180, // 初期値: 180秒 (秒単位のInt)
        createdAt: serverTimestamp(),
      }, { merge: true }); // ✅ 追加: merge オプションを有効にする
      
      
      console.log("✅ Firestore にユーザードキュメントを作成しました: ", user.uid);

      // メール認証を送信
      await sendEmailVerification(user);
      setIsSignUpSuccess(true); // サインアップ成功
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Google サインイン処理
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      setIsSignUpSuccess(true); // サインイン成功
    } catch (error) {
      setAlertMessage("Googleサインインに失敗しました");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Apple サインイン処理
  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      setIsSignUpSuccess(true); // サインイン成功
    } catch (error) {
      setAlertMessage("Appleサインインに失敗しました");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // サインアップ成功画面の表示
  if (isSignUpSuccess) {
    setTimeout(() => {
      navigate("/"); // 2秒後にホーム画面に遷移
    }, 2000);
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
          fontFamily: "Impact, sans-serif",
        }}
      >
        <h1 style={{ fontWeight: 300, letterSpacing: "0.05em" }}>
          Sign Up Successful
        </h1>
        <p style={{ fontSize: "0.8em", marginTop: "10px" }}>
          Redirecting to home in a few seconds...
        </p>
      </div>
    );
  }

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
        onClick={handleSignUp}
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
        Email verification
      </button>

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
      <button
        onClick={() => navigate("/login")}
        style={{
          color: "red",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        すでにアカウントをお持ちですか？こちらをクリック
      </button>
      {showAlert && (
        <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>
      )}
    </div>
  );
};

export default SignUp;
