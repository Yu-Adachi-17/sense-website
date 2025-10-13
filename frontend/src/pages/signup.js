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

  if (isEmailSent) {
    return (
      <div className="loginRoot">
        <div className="homeIcon">
          <HomeIcon size={30} href="https://sense-ai.world" />
        </div>

        {/* 左：画像（デスクトップのみ表示） */}
        <div className="visualPane" aria-hidden="true">
          <Image
            src="/loginAndSignup.png"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 66vw"
            style={{ objectFit: "contain", objectPosition: "center center" }}
            priority
          />
        </div>

        {/* 縦の黒線（デスクトップのみ表示） */}
        <div className="vline" aria-hidden="true" />

        {/* 右：内容 */}
        <div className="formPane">
          <h1 className="title">{t("Verification Email Sent")}</h1>
          <p className="desc">
            {t("Please click the link in the email to verify your account and then log in.")}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn primary"
          >
            {t("Log In After Verification")}
          </button>

          {showAlert && <div className="alert">{alertMessage}</div>}
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="loginRoot">
      {/* 左上ホーム固定 */}
      <div className="homeIcon">
        <HomeIcon size={30} href="https://sense-ai.world" />
      </div>

      {/* 左：画像（デスクトップのみ表示） */}
      <div className="visualPane" aria-hidden="true">
        <Image
          src="/loginAndSignup.png"
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 66vw"
          style={{ objectFit: "contain", objectPosition: "center center" }}
          priority
        />
      </div>

      {/* 縦の黒線（デスクトップのみ表示） */}
      <div className="vline" aria-hidden="true" />

      {/* 右：フォーム（スマホでは中央フル幅） */}
      <div className="formPane">
        <h1 className="title">{t("Create Account")}</h1>

        <input
          type="email"
          placeholder={t("Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <input
          type="password"
          placeholder={t("Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />

        <button
          onClick={handleSignUp}
          disabled={isLoading}
          className="btn primary"
        >
          {t("Email Verification")}
        </button>

        <button onClick={handleGoogleSignIn} className="btn social">
          <FcGoogle style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Google")}
        </button>

        <button onClick={handleAppleSignIn} className="btn social strong">
          <FaApple style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Apple")}
        </button>

        <button
          onClick={() => router.push("/login")}
          className="link"
        >
          {t("Already have an account? Click here.")}
        </button>

        {showAlert && <div className="alert">{alertMessage}</div>}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .loginRoot {
    background: #fff;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: row;
    color: #000;
    position: relative;
    overflow: hidden;
  }
  .homeIcon {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
  }
  .visualPane {
    flex: 2 1 0%;
    position: relative;
    min-width: 0;
    background: #fff;
  }
  .vline {
    width: 2px;
    background: #000;
    height: 100%;
  }
  .formPane {
    flex: 1 1 0%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
    overflow-y: auto;
  }
  .title {
    font-size: 40px;
    font-weight: 700;
    margin: 0 0 20px 0;
    letter-spacing: 0.02em;
  }
  .desc {
    font-size: 0.95rem;
    margin-top: 12px;
    text-align: center;
    max-width: 520px;
  }
  .input {
    width: 300px;
    height: 40px;
    padding-left: 10px;
    border-radius: 25px;
    border: 1px solid #333;
    color: #000;
    background: #fff;
    margin-bottom: 16px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background: #fff;
    color: #000;
    border-radius: 6px;
    cursor: pointer;
    width: 300px;
    height: 44px;
    font-weight: 700;
    margin-bottom: 12px;
    transition: transform 120ms ease;
  }
  .btn:active { transform: scale(0.99); }
  .btn.primary {
    border: 1px solid #000;
    margin-bottom: 16px;
  }
  .btn.social {
    border: 1px solid #ccc;
  }
  .btn.social.strong {
    border: 1px solid #000;
    margin-bottom: 16px;
  }
  .link {
    color: #000;
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .alert {
    color: #b00020;
    margin-top: 8px;
    font-weight: 600;
    text-align: center;
    max-width: 320px;
  }

  /* ===== スマホ版専用（640px以下） ===== */
  @media (max-width: 640px) {
    .loginRoot {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100svh; /* モバイルのアドレスバー起因のvh揺れ対策 */
    }
    .visualPane { display: none; }  /* 画像を消す */
    .vline { display: none; }       /* 縦線を消す */
    .formPane {
      width: 100%;
      max-width: 420px;
      padding: 24px 16px;
      gap: 12px;
      align-items: center;
      justify-content: center;
      min-height: 100svh;
    }
    .title { font-size: 34px; margin-bottom: 18px; }
    .input { width: min(92vw, 360px); }
    .btn { width: min(92vw, 360px); }
    .alert { max-width: min(92vw, 360px); }
  }
`;

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
    revalidate: 60,
  };
}
