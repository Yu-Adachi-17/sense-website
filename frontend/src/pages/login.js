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

  const popup = (msg) => {
    if (typeof window !== "undefined") window.alert(msg);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      popup(t("Please enter your email and password."));
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
        popup(
          t(
            "Your email has not been verified. Please click the link in the email to verify your account."
          )
        );
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
          popup(t("The email address is invalid."));
          break;
        case "auth/user-disabled":
          popup(t("This account has been disabled."));
          break;
        case "auth/user-not-found":
          popup(t("User not found."));
          break;
        case "auth/wrong-password":
          popup(t("Incorrect password."));
          break;
        case "auth/too-many-requests":
          popup(t("Too many attempts in a short period. Please wait and try again."));
          break;
        default:
          popup(t("Login failed. Please try again."));
      }
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
      popup(t("Google sign-in failed."));
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
      popup(t("Apple sign-in failed."));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      popup(t("Please enter your email address."));
      return;
    }
    setIsLoading(true);
    try {
      const auth = await getClientAuth();
      if (!auth) throw new Error("Auth is not available on server.");
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      popup(t("A password reset email has been sent. Please check your email."));
    } catch (error) {
      console.error("Error sending password reset email:", error);
      popup(t("Failed to send password reset email."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="loginRoot">
      <div className="homeIcon">
        <HomeIcon size={30} href="https://sense-ai.world" />
      </div>

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

      <div className="vline" aria-hidden="true" />

      <div className="formPane">
        <h1 className="title">{t("Log in")}</h1>

        <input
          type="email"
          placeholder={t("Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder={t("Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          disabled={isLoading}
        />

        <button
          onClick={handleLogin}
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn primary"
        >
          {t("Login")}
          {isLoading && <span className="loader" aria-hidden="true" />}
        </button>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn social"
        >
          <FcGoogle style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Google")}
          {isLoading && <span className="loader" aria-hidden="true" />}
        </button>

        <button
          onClick={handleAppleSignIn}
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn social strong"
        >
          <FaApple style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Apple")}
          {isLoading && <span className="loader" aria-hidden="true" />}
        </button>

        <button
          onClick={handlePasswordReset}
          disabled={isLoading}
          aria-busy={isLoading}
          className="link danger"
        >
          {t("Forgot your password? Send a reset email.")}
          {isLoading && <span className="loader small" aria-hidden="true" />}
        </button>

        <button
          onClick={() => router.push("/signup")}
          disabled={isLoading}
          className="link"
        >
          {t("Don't have an account? Click here.")}
        </button>
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
          transition: transform 120ms ease, opacity 120ms ease;
          position: relative;
          gap: 8px;
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
        .btn[disabled] {
          opacity: 0.6;
          cursor: default;
          pointer-events: none;
        }
        .link {
          color: #000;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .link.danger {
          color: #b00020;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .loader {
          width: 16px;
          height: 16px;
          border: 2px solid #000;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .loader.small {
          width: 14px;
          height: 14px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .loginRoot {
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100svh;
          }
          .visualPane { display: none; }
          .vline { display: none; }
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
