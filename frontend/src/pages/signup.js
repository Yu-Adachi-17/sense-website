// src/pages/signup.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import Image from "next/image";

import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { getClientAuth, getDb } from "../firebaseConfig";
import HomeIcon from "./homeIcon";

import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

/**
 * Firestore 上にユーザーDocumentを作成（既存チェック込み）
 * - クライアントでのみ実行（SSRでは getDb() が null を返す）
 */
const createUserDocument = async (user) => {
  const db = await getDb();
  if (!db) return; // SSR/SSG時は何もしない

  const {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
  } = await import("firebase/firestore");

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", user.email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) throw new Error("This account is already registered.");

  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    createdAt: serverTimestamp(),
    userName: user.email.substring(0, 3),
    email: user.email,
    recordingDevice: null,
    recordingTimestamp: null,
    originalTransactionId: null,
    subscriptionPlan: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    lastSubscriptionUpdate: null,
    remainingSeconds: 180,
    subscription: false,
  });
};

export default function SignUp() {
  const router = useRouter();
  const { t, i18n } = useTranslation("common");

  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const emailSentFlag = typeof window !== "undefined" && localStorage.getItem("isEmailSent");
    if (emailSentFlag === "true") {
      setIsEmailSent(true);
      localStorage.removeItem("isEmailSent");
    }
  }, []);

  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      // Auth はクライアント側でのみ取得
      const auth = await getClientAuth();
      if (!auth) throw new Error("Auth is not available on server.");

      const {
        createUserWithEmailAndPassword,
        sendEmailVerification,
        signOut,
      } = await import("firebase/auth");

      // アカウント作成
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // Firestoreにユーザードキュメント作成（重複チェック込み）
      await createUserDocument(user);

      // 確認メール送信 → 直後にサインアウト
      await sendEmailVerification(user);
      await signOut(auth);

      // UI表示用フラグ
      localStorage.setItem("isEmailSent", "true");
      window.location.reload();
    } catch (error) {
      console.error(error);
      setAlertMessage(error?.message || "Sign up failed.");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // signInWithGoogle は user を返す実装（firebaseAuth.js）
      const user = await signInWithGoogle();
      if (user) await createUserDocument(user);
      await router.replace("/");
    } catch (error) {
      console.error(error);
      setAlertMessage(error?.message || "Google sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithApple();
      if (user) await createUserDocument(user);
      await router.replace("/");
    } catch (error) {
      console.error(error);
      setAlertMessage(error?.message || "Apple sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const TwoColumn = ({ children }) => (
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

      {/* 左：画像（高さ優先でトリミングなし） */}
      <div style={{ flex: "2 1 0%", position: "relative", minWidth: 0, background: "#fff" }}>
        <Image
          src="/loginAndSignup.png"
          alt="Create Account Visual"
          fill
          sizes="(max-width: 900px) 100vw, 66vw"
          style={{ objectFit: "contain", objectPosition: "center center" }}
          priority
        />
      </div>

      {/* 縦の黒線 */}
      <div style={{ width: "2px", background: "#000", height: "100%" }} />

      {/* 右：内容 1/3 */}
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
        {children}
      </div>
    </div>
  );

  if (isEmailSent) {
    return (
      <TwoColumn>
        <h1 style={{ fontWeight: 700, letterSpacing: "0.02em", margin: 0 }}>
          {t("Verification Email Sent")}
        </h1>
        <p style={{ fontSize: "0.95rem", marginTop: 12, textAlign: "center", maxWidth: 520 }}>
          {t("Please click the link in the email to verify your account and then log in.")}
        </p>
        <button
          onClick={() => router.push("/login")}
          style={{
            marginTop: 20,
            color: "#000",
            background: "#fff",
            border: "1px solid #000",
            borderRadius: "6px",
            padding: "10px 20px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {t("Log In After Verification")}
        </button>
      </TwoColumn>
    );
  }

  return (
    <TwoColumn>
      <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0, marginBottom: 20 }}>
        {t("Create Account")}
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
        onClick={handleSignUp}
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
        {t("Email Verification")}
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
        onClick={() => router.push("/login")}
        style={{
          color: "#000",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {t("Already have an account? Click here.")}
      </button>

      {showAlert && (
        <div style={{ color: "#b00020", marginTop: "8px", fontWeight: 600 }}>
          {alertMessage}
        </div>
      )}
    </TwoColumn>
  );
}

// SSG（SSRの場合は getServerSideProps に置き換え）
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
    revalidate: 60,
  };
}
