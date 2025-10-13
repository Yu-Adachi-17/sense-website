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
 * - スマホ版では左画像と縦線を消して、フォームを中央にフル幅寄せ
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
      await signInWithGoogle();
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
        <h1 className="title">{t("Log in")}</h1>

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
          onClick={handleLogin}
          disabled={isLoading}
          className="btn primary"
        >
          {t("Login")}
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
          onClick={handlePasswordReset}
          disabled={isLoading}
          className="link danger"
        >
          {t("Forgot your password? Send a reset email.")}
        </button>

        <button onClick={() => router.push("/signup")} className="link">
          {t("Don't have an account? Click here.")}
        </button>

        {showAlert && <div className="alert">{alertMessage}</div>}
      </div>

      <style jsx>{`
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
        .link.danger {
          color: #b00020;
          font-weight: 700;
          margin-bottom: 16px;
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
            /* “どーん”：中央に大きめ配置 */
            align-items: center;
            justify-content: center;
            min-height: 100svh;
          }
          .title { font-size: 34px; margin-bottom: 18px; }
          .input { width: min(92vw, 360px); }
          .btn { width: min(92vw, 360px); }
          .alert { max-width: min(92vw, 360px); }
        }
      `}</style>
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
