// src/pages/login.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { getClientAuth, getDb } from "../firebaseConfig";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { syncUserData } from "../firebaseUserSync";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import HomeIcon from "./homeIcon";
import Image from "next/image";

/**
 * ログインページ（SSR安全版）
 * - firebase/auth と firebase/firestore は関数内で dynamic import
 * - Auth/DB は getClientAuth()/getDb() でクライアント時のみ初期化
 */
export default function Login() {
  const router = useRouter();
  const { t, i18n } = useTranslation("common");

  useEffect(() => {
    document.documentElement.setAttribute(
      "dir",
      i18n.language === "ar" ? "rtl" : "ltr"
    );
  }, [i18n.language]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage(t("Please enter your email and password."));
      setShowAlert(true);
      return;
    }
    setIsLoading(true);
    try {
      // クライアントでのみ auth を取得
      const auth = await getClientAuth();
      if (!auth) throw new Error("Auth is not available on server.");

      const { signInWithEmailAndPassword, signOut } = await import("firebase/auth");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      if (!user.emailVerified) {
        await signOut(auth);
        setAlertMessage(
          t(
            "Your email has not been verified. Please click the link in the email to verify your account."
          )
        );
        setShowAlert(true);
        return;
      }

      // Firestore もクライアントでのみ
      const db = await getDb();
      if (!db) throw new Error("Firestore is not available on server.");
      const { doc, getDoc } = await import("firebase/firestore");

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let remainingSecondsFromFirebase = 180;
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.remainingSeconds != null && data.remainingSeconds > 0) {
          remainingSecondsFromFirebase = data.remainingSeconds;
        }
      }

      await syncUserData(user, email, false, remainingSecondsFromFirebase);
      await router.replace("/");
    } catch (error) {
      console.error("Login error:", error);
      const code =
        error && typeof error === "object" && "code" in error ? error.code : undefined;
      switch (code) {
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
          setAlertMessage(
            t("Too many attempts in a short period. Please wait and try again.")
          );
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
      await signInWithGoogle(); // ← クリックハンドラ内なのでOK
      await router.replace("/");
    } catch {
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
      await router.replace("/");
    } catch {
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
      const auth = await getClientAuth();
      if (!auth) throw new Error("Auth is not available on server.");
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      setAlertMessage(
        t("A password reset email has been sent. Please check your email.")
      );
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
        backgroundColor: "#fff",
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        color: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 左上ホーム固定 */}
      <div style={{ position: "fixed", top: 20, left: 20, zIndex: 1000 }}>
        <HomeIcon size={30} href="https://sense-ai.world" />
      </div>

      {/* 左：画像（高さ優先で全体表示） */}
      <div style={{ flex: "2 1 0%", position: "relative", minWidth: 0, background: "#fff" }}>
        <Image
          src="/loginAndSignup.png"
          alt="Login / Signup Visual"
          fill
          sizes="(max-width: 900px) 100vw, 66vw"
          style={{ objectFit: "contain", objectPosition: "center center" }}
          priority
        />
      </div>

      {/* 縦の黒線 */}
      <div style={{ width: "2px", background: "#000", height: "100%" }} />

      {/* 右：フォーム */}
      <div
        style={{
          flex: "1 1 0%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          gap: "12px",
          overflowY: "auto",
        }}
      >
        <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0, marginBottom: 20 }}>
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
            border: "1px solid #333",
            color: "#000",
            background: "#fff",
            marginBottom: "16px",
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
            border: "1px solid #333",
            color: "#000",
            background: "#fff",
            marginBottom: "16px",
          }}
        />

        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            background: "#fff",
            color: "#000",
            border: "1px solid #000",
            borderRadius: "6px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            marginBottom: "16px",
            fontWeight: 700,
            width: "300px",
            height: "44px",
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
            background: "#fff",
            color: "#000",
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer",
            width: "300px",
            height: "44px",
            marginBottom: "10px",
            fontWeight: 700,
          }}
        >
          <FcGoogle style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Google")}
        </button>

        <button
          onClick={handleAppleSignIn}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 20px",
            background: "#fff",
            color: "#000",
            border: "1px solid #000",
            borderRadius: "6px",
            cursor: "pointer",
            width: "300px",
            height: "44px",
            marginBottom: "16px",
            fontWeight: 700,
          }}
        >
          <FaApple style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Apple")}
        </button>

        <button
          onClick={handlePasswordReset}
          disabled={isLoading}
          style={{
            color: "#b00020",
            background: "none",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            marginBottom: "16px",
            fontWeight: 700,
          }}
        >
          {t("Forgot your password? Send a reset email.")}
        </button>

        <button
          onClick={() => router.push("/signup")}
          style={{
            color: "#000",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t("Don't have an account? Click here.")}
        </button>

        {showAlert && (
          <div style={{ color: "#b00020", marginTop: "8px", fontWeight: 600 }}>
            {alertMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
    revalidate: 60,
  };
}
