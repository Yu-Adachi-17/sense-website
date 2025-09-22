import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { app } from "../firebaseConfig";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import HomeIcon from "./homeIcon";

const auth = getAuth(app);
const db = getFirestore(app);

const createUserDocument = async (user) => {
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
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const emailSentFlag = localStorage.getItem("isEmailSent");
    if (emailSentFlag === "true") {
      setIsEmailSent(true);
      localStorage.removeItem("isEmailSent");
    }
  }, []);

  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await createUserDocument(user);
      await sendEmailVerification(user);
      await signOut(auth);

      localStorage.setItem("isEmailSent", "true");
      window.location.reload();
    } catch (error) {
      setAlertMessage(error.message || "Sign up failed.");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      const user = auth.currentUser;
      if (user) await createUserDocument(user);
      await router.replace("/");
    } catch (error) {
      setAlertMessage(error.message || "Google sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      const user = auth.currentUser;
      if (user) await createUserDocument(user);
      await router.replace("/");
    } catch (error) {
      setAlertMessage(error.message || "Apple sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div
        style={{
          backgroundColor: "#fff",
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          color: "#000",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          position: "relative",
        }}
      >
        {/* ← 左上固定のホーム（外部） */}
        <div style={{ position: "fixed", top: 20, left: 20, zIndex: 1000 }}>
          <HomeIcon size={30} href="https://sense-ai.world" />
        </div>

        <h1 style={{ fontWeight: 700, letterSpacing: "0.02em", margin: 0 }}>
          {t("Verification Email Sent")}
        </h1>
        <p style={{ fontSize: "0.95rem", marginTop: "12px", textAlign: "center", maxWidth: 520 }}>
          {t("Please click the link in the email to verify your account and then log in.")}
        </p>
        <button
          onClick={() => router.push("/login")}
          style={{
            marginTop: "20px",
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
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#fff",
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "#000",
        position: "relative",
      }}
    >
      {/* ← 左上固定のホーム（外部） */}
      <div style={{ position: "fixed", top: 20, left: 20, zIndex: 1000 }}>
        <HomeIcon size={30} href="https://sense-ai.world" />
      </div>

      <h1
        style={{
          fontSize: "40px",
          fontWeight: 700,
          color: "#000",
          margin: 0,
          marginBottom: "20px",
        }}
      >
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
          border: "1px solid #333",
          color: "#000",
          background: "#fff",
          marginBottom: "20px",
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
          cursor: "not-allowed",
          opacity: isLoading ? 0.6 : 1,
          marginBottom: "20px",
          fontWeight: 700,
          width: "300px",
          height: "44px",
          cursor: isLoading ? "not-allowed" : "pointer",
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
          background: "#fff",
          color: "#000",
          border: "1px solid #000",
          borderRadius: "6px",
          cursor: "pointer",
          width: "300px",
          height: "44px",
          marginBottom: "20px",
          fontWeight: 700,
        }}
      >
        <FaApple style={{ marginRight: "10px", fontSize: "20px" }} />
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
        <div style={{ color: "#b00020", marginTop: "20px", fontWeight: 600 }}>
          {alertMessage}
        </div>
      )}
    </div>
  );
}
