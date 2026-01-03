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

function getSafeNextPath(router) {
  const raw = router?.query?.next;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return "/";
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  return v;
}

/**
 * users/{uid} が存在しなければ初期Docを作成。
 * 既存なら一切上書きしない（subscriptionPlan等の破壊を防ぐ）。
 */
const ensureUserDocument = async (user) => {
  const db = await getDb();
  if (!db) return;

  const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");

  const uid = String(user?.uid || "");
  if (!uid) throw new Error("Invalid user uid");

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return;
  }

  const safeEmail = typeof user?.email === "string" ? user.email : "";
  const userName = safeEmail ? safeEmail.substring(0, 3) : uid.substring(0, 6);

  await setDoc(userRef, {
    createdAt: serverTimestamp(),
    userName,
    email: safeEmail,

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

  const popup = (msg) => {
    if (typeof window !== "undefined") window.alert(msg);
  };

  useEffect(() => {
    const emailSentFlag = typeof window !== "undefined" && localStorage.getItem("isEmailSent");
    if (emailSentFlag === "true") {
      setIsEmailSent(true);
      localStorage.removeItem("isEmailSent");
    }
  }, []);

  const gotoLoginWithNext = () => {
    const nextPath = getSafeNextPath(router);
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);

    let createdUser = null;

    try {
      const auth = await getClientAuth();
      if (!auth) throw new Error("Auth is not available on server.");

      const { createUserWithEmailAndPassword, sendEmailVerification, signOut } = await import("firebase/auth");

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      createdUser = user;

      await ensureUserDocument(user);

      await sendEmailVerification(user);
      await signOut(auth);

      localStorage.setItem("isEmailSent", "true");
      window.location.reload();
    } catch (error) {
      console.error(error);

      const code = String(error?.code || "");

      // すでに登録済みのメール（Authが弾く）
      if (code === "auth/email-already-in-use") {
        popup("This email is already registered. Please log in.");
        gotoLoginWithNext();
        return;
      }

      // Firestore作成等で失敗した場合、作成直後ならAuthユーザーの削除を試行（孤児回避）
      if (createdUser && typeof createdUser?.delete === "function") {
        try {
          await createdUser.delete();
        } catch {
          // delete できないケース（recent login要件など）は黙って継続
        }
      }

      popup(error?.message || "Sign up failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) await ensureUserDocument(user);

      const nextPath = getSafeNextPath(router);
      await router.replace(nextPath);
    } catch (error) {
      console.error(error);

      const code = String(error?.code || "");
      if (code === "auth/account-exists-with-different-credential") {
        popup("An account already exists with the same email but different sign-in method. Please log in.");
      } else {
        popup(error?.message || "Google sign-in failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithApple();
      if (user) await ensureUserDocument(user);

      const nextPath = getSafeNextPath(router);
      await router.replace(nextPath);
    } catch (error) {
      console.error(error);

      const code = String(error?.code || "");
      if (code === "auth/account-exists-with-different-credential") {
        popup("An account already exists with the same email but different sign-in method. Please log in.");
      } else {
        popup(error?.message || "Apple sign-in failed");
      }
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
          <h1 className="title">{t("Verification Email Sent")}</h1>
          <p className="desc">{t("Please click the link in the email to verify your account and then log in.")}</p>

          <button onClick={gotoLoginWithNext} className="btn primary">
            {t("Log In After Verification")}
          </button>
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

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
        <h1 className="title">{t("Create Account")}</h1>

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

        <button onClick={handleSignUp} disabled={isLoading} aria-busy={isLoading} className="btn primary">
          {t("Email Verification")}
          {isLoading && <span className="loader" aria-hidden="true" />}
        </button>

        <button onClick={handleGoogleSignIn} disabled={isLoading} aria-busy={isLoading} className="btn social">
          <FcGoogle style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Google")}
          {isLoading && <span className="loader" aria-hidden="true" />}
        </button>

        <button onClick={handleAppleSignIn} disabled={isLoading} aria-busy={isLoading} className="btn social strong">
          <FaApple style={{ marginRight: 10, fontSize: 20 }} />
          {t("Sign in with Apple")}
          {isLoading && <span className="loader" aria-hidden="true" />}
        </button>

        <button onClick={gotoLoginWithNext} disabled={isLoading} className="link">
          {t("Already have an account? Click here.")}
        </button>
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
    transition: transform 120ms ease, opacity 120ms ease;
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

  .loader {
    width: 16px;
    height: 16px;
    border: 2px solid #000;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
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
`;

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
    revalidate: 60,
  };
}
