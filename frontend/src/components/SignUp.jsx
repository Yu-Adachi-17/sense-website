import React, { useState, useEffect } from "react"; // ✅ useEffect を追加
import { useTranslation } from "react-i18next";
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
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { app } from "../firebaseConfig";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { getDoc } from "firebase/firestore";
import { runTransaction, getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";

const auth = getAuth(app);
const db = getFirestore(app);


const createUserDocument = async (user) => {
  const userRef = doc(db, "users", user.uid);

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      // ドキュメントが存在しない場合は、新規作成時として全てのフィールドをセット
      transaction.set(userRef, {
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
    } else {
      // ドキュメントが既に存在している場合
      const data = userSnap.data();
      // remainingSeconds が未設定（null/undefined）または 0 なら更新する
      if (data.remainingSeconds == null || data.remainingSeconds === 0) {
        transaction.update(userRef, { remainingSeconds: 180 });
      }
      // 他のフィールドは merge して null をセット（nullフィールドも存在させたい場合）
      transaction.set(
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
  // Flag indicating that the verification email has been sent (not that sign-up is complete)
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Email sign-up handler
  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create a user document in Firestore
      await createUserDocument(user);
      console.log("✅ Created user document in Firestore:", user.uid);

      // Send verification email
      await sendEmailVerification(user);
      // Sign out the user so they don't become authenticated immediately
      await signOut(auth);
      // Set the state to indicate that the email has been sent
      setIsEmailSent(true);
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Perform Google sign-in
      await signInWithGoogle();
      const user = auth.currentUser;
      if (user) {
        // Create or update the user document in Firestore after sign-in
        await createUserDocument(user);
        console.log("✅ Created user document in Firestore via Google sign-in:", user.uid);
      }
      navigate("/");
    } catch (error) {
      setAlertMessage("Google sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Apple sign-in handler
  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      // Perform Apple sign-in
      await signInWithApple();
      const user = auth.currentUser;
      if (user) {
        // Create or update the user document in Firestore after sign-in
        await createUserDocument(user);
        console.log("✅ Created user document in Firestore via Apple sign-in:", user.uid);
      }
      navigate("/");
    } catch (error) {
      setAlertMessage("Apple sign-in failed");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Display screen after verification email is sent
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

  // Regular sign-up screen
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
