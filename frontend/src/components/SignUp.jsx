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

const auth = getAuth(app);
const db = getFirestore(app);

// ユーザードキュメント作成時に、同じ email のドキュメントが既に存在する場合はエラーを throw する
const createUserDocument = async (user) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", user.email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    // 既に同じ email のドキュメントが存在する場合は、処理を中断
    throw new Error("このアカウントは既に登録されています。");
  }
  
  // ドキュメントが存在しなければ、新規にユーザーデータを作成
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
    remainingSeconds: 180, // 新規ユーザーには 180 をセット
    subscription: false,
  });
};

const SignUp = () => {
  const { t, i18n } = useTranslation(); // ✅ useTranslation() から `i18n` を取得

  // ✅ アラビア語の場合に `dir="rtl"` を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Email認証用のフラグ（サインアップ完了＝検証メール送信済み）
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // コンポーネントマウント時に、ローカルストレージのフラグをチェック
  useEffect(() => {
    const emailSentFlag = localStorage.getItem("isEmailSent");
    if (emailSentFlag === "true") {
      setIsEmailSent(true);
      localStorage.removeItem("isEmailSent");
    }
  }, []);

  // Emailサインアップハンドラー
  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      // メールとパスワードでユーザー作成
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Firestoreにユーザードキュメントを作成（同じ email があればエラーとなる）
      await createUserDocument(user);
      console.log("✅ Created user document in Firestore:", user.uid);

      // 認証メールを送信
      await sendEmailVerification(user);
      // ユーザーをサインアウト（直ちに認証状態にならないように）
      await signOut(auth);
      // サインアップ完了のフラグをローカルストレージに保存
      localStorage.setItem("isEmailSent", "true");
      // リロードすることで最新の状態に更新
      window.location.reload();
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Googleサインインハンドラー
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Googleサインインの実行
      await signInWithGoogle();
      const user = auth.currentUser;
      if (user) {
        // サインイン後、Firestoreにユーザードキュメントを作成または更新（同じ email があればエラーとなる）
        await createUserDocument(user);
        console.log("✅ Created user document in Firestore via Google sign-in:", user.uid);
      }
      navigate("/");
      window.location.reload();
    } catch (error) {
      setAlertMessage(error.message || "Google sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Appleサインインハンドラー
  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      // Appleサインインの実行
      await signInWithApple();
      const user = auth.currentUser;
      if (user) {
        // サインイン後、Firestoreにユーザードキュメントを作成または更新（同じ email があればエラーとなる）
        await createUserDocument(user);
        console.log("✅ Created user document in Firestore via Apple sign-in:", user.uid);
      }
      navigate("/");
      window.location.reload();
    } catch (error) {
      setAlertMessage(error.message || "Apple sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 検証メール送信済み画面の表示
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

  // 通常のサインアップ画面
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
      <h1
        style={{
          fontSize: "40px",
          fontWeight: "700",
          color: "white",
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
        style={{
          color: "white",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {t("Already have an account? Click here.")}
      </button>
      {showAlert && (
        <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>
      )}
    </div>
  );
};

export default SignUp;
