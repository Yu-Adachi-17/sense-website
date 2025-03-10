import React, { useState, useEffect } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useRouter } from "next/router";
import { app } from "../firebaseConfig";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { syncUserData } from "../firebaseUserSync";
import { useTranslation } from "react-i18next";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const auth = getAuth(app);
const db = getFirestore(app);

export default function Login() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // アラビア語の場合に dir="rtl" を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage(t("Please enter your email and password."));
      setShowAlert(true);
      return;
    }
    setIsLoading(true);
    try {
      // Email/Password でサインイン
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // メール認証が完了していない場合はサインアウトしてエラーを表示
      if (!user.emailVerified) {
        await signOut(auth);
        setAlertMessage(
          t("Your email has not been verified. Please click the link in the email to verify your account.")
        );
        setShowAlert(true);
        return;
      }

      // 既存ユーザーの場合、Firestore から remainingSeconds を取得する
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let remainingSecondsFromFirebase = 180; // デフォルトは 180（新規の場合用）
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.remainingSeconds != null && data.remainingSeconds > 0) {
          remainingSecondsFromFirebase = data.remainingSeconds;
        }
      }

      // ログイン成功後、Firestore にユーザーデータを同期（既存ユーザーの場合は取得した値を利用）
      await syncUserData(user, email, false, remainingSecondsFromFirebase);

      // ホーム画面へナビゲート
      router.push("/");
      // ナビゲーション後にページをリロード
      window.location.reload();
    } catch (error) {
      console.error("Login error:", error);
      switch (error.code) {
        case "auth/invalid-email":
          setAlertMessage(t("The email address is invalid."));
          break;
        case "auth/user-disabled":
          setAlertMessage(t("This account has been disabled."));
          break;
        case "auth/user-not-found":
          setAlertMessage(t("User not found."));
          break;
        case "auth/wrong-password":
          setAlertMessage(t("Incorrect password."));
          break;
        case "auth/too-many-requests":
          setAlertMessage(t("Too many attempts in a short period. Please wait and try again."));
          break;
        default:
          setAlertMessage(t("Login failed. Please try again."));
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
      router.push("/");
      window.location.reload();
    } catch (error) {
      setAlertMessage(t("Google sign-in failed."));
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      router.push("/");
      window.location.reload();
    } catch (error) {
      setAlertMessage(t("Apple sign-in failed."));
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setAlertMessage(t("Please enter your email address."));
      setShowAlert(true);
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setAlertMessage(t("A password reset email has been sent. Please check your email."));
      setShowAlert(true);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      setAlertMessage(t("Failed to send password reset email."));
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
        {t("Log in")}
      </h1>
      <input
        type="email"
        placeholder={t("Email")}
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
        placeholder={t("Password")}
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
          background: "white",
          color: "black",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        {t("Login")}
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
        {t("Sign in with Google")}
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
        {t("Sign in with Apple")}
      </button>
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
        {t("Forgot your password? Send a reset email.")}
      </button>
      <button
        onClick={() => router.push("/signup")}
        style={{
          color: "white",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {t("Don't have an account? Click here.")}
      </button>
      {showAlert && (
        <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>
      )}
    </div>
  );
}
