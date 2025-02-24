import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { app } from "../firebaseConfig";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * ユーザーの Firestore ドキュメントを作成または更新する関数
 * ・ドキュメントが存在しなければ全フィールド（remainingSeconds: 180 も含む）をセット
 * ・既に存在する場合、remainingSeconds が 0 なら 180 に更新、それ以外のフィールドは merge: true で null をセット
 */
const createUserDocument = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // ドキュメントが存在しない場合（新規ユーザー）→ 全フィールドを上書きセット
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
      remainingSeconds: 180, // 新規ユーザーは 180 をセット
      subscription: false,
    });
  } else {
    // 既にドキュメントが存在する場合
    const data = userSnap.data();
    // remainingSeconds が 0 なら更新（0 の場合は新規作成時の Cloud Function などの影響と想定）
    if (data.remainingSeconds === 0) {
      await setDoc(userRef, { remainingSeconds: 180 }, { merge: true });
    }
    // null を明示したいフィールドは merge: true で更新
    await setDoc(
      userRef,
      {
        recordingDevice: null,
        recordingTimestamp: null,
        originalTransactionId: null,
        subscriptionPlan: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        lastSubscriptionUpdate: null,
      },
      { merge: true }
    );
  }
};

const SignUp = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // Email サインアップハンドラー
  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore にユーザードキュメントを作成または更新
      await createUserDocument(user);
      console.log("✅ Created user document in Firestore:", user.uid);

      // 認証メールを送信しサインアウト
      await sendEmailVerification(user);
      await signOut(auth);
      setIsEmailSent(true);
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Google サインインハンドラー
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      const user = auth.currentUser;
      if (user) {
        await createUserDocument(user);
        console.log("✅ Created user document via Google sign-in:", user.uid);
      }
      navigate("/");
    } catch (error) {
      setAlertMessage("Google sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Apple サインインハンドラー
  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      const user = auth.currentUser;
      if (user) {
        await createUserDocument(user);
        console.log("✅ Created user document via Apple sign-in:", user.uid);
      }
      navigate("/");
    } catch (error) {
      setAlertMessage("Apple sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
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
          {t("Verification Email Sent")}
        </h1>
        <p style={{ fontSize: "0.8em", marginTop: "10px" }}>
          {t("Please click the link in the email to verify your account and then log in.")}
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: "20px",
            color: "white",
            background: "none",
            border: "1px solid white",
            padding: "10px 20px",
            cursor: "pointer",
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
        {t("Email Verification")}
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
        onClick={() => navigate("/login")}
        style={{ color: "white", background: "none", border: "none", cursor: "pointer" }}
      >
        {t("Already have an account? Click here.")}
      </button>
      {showAlert && <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>}
    </div>
  );
};

export default SignUp;
