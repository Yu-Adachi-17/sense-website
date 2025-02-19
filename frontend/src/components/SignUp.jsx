import React, { useState } from "react";
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

const auth = getAuth(app);
const db = getFirestore(app);

const createUserDocument = async (user) => {
  // user.email から3文字を取得（SwiftUI側の String(emailField.prefix(3)) に相当）
  const email = user.email || "";
  await setDoc(
    doc(db, "users", user.uid),
    {
      createdAt: serverTimestamp(),
      userName: email.substring(0, 3),
      email: email,
      recordingDevice: null,         // SwiftUIでは NSNull() に相当
      recordingTimestamp: null,      // 同上
      originalTransactionId: null,   // 同上
      subscriptionPlan: null,        // 同上
      subscriptionStartDate: null,   // 同上
      subscriptionEndDate: null,     // 同上
      lastSubscriptionUpdate: null,  // 同上
      remainingSeconds: 180,           // 存在する場合はその値、なければ 0
      subscription: false,           // 初期値 false（SwiftUI側は @AppStorage("userIsUnlimited") と同期）
    },
    { merge: true }
  );
};

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // サインアップ完了ではなく「メール送信完了」状態のフラグ
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Email サインアップ処理
  const handleSignUp = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      // ユーザー作成
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Firestore にユーザードキュメントを作成
      await createUserDocument(user);
      console.log("✅ Firestore にユーザードキュメントを作成しました: ", user.uid);

      // 認証メールを送信
      await sendEmailVerification(user);
      // ユーザーをサインアウト（※認証済みになってほしくないため）
      await signOut(auth);
      // 「メール送信完了」の状態にする
      setIsEmailSent(true);
    } catch (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Google サインイン処理
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Googleサインインを実施
      await signInWithGoogle();
      const user = auth.currentUser;
      if (user) {
        // サインイン後にもFirestoreにユーザードキュメントを作成（または更新）
        await createUserDocument(user);
        console.log("✅ GoogleサインインでFirestoreにユーザードキュメントを作成しました: ", user.uid);
      }
      navigate("/");
    } catch (error) {
      setAlertMessage("Googleサインインに失敗しました");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Apple サインイン処理
  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      // Appleサインインを実施
      await signInWithApple();
      const user = auth.currentUser;
      if (user) {
        // サインイン後にもFirestoreにユーザードキュメントを作成（または更新）
        await createUserDocument(user);
        console.log("✅ AppleサインインでFirestoreにユーザードキュメントを作成しました: ", user.uid);
      }
      navigate("/");
    } catch (error) {
      setAlertMessage("Appleサインインに失敗しました");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 「メール送信完了」後の画面表示
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
          確認メールを送信しました
        </h1>
        <p style={{ fontSize: "0.8em", marginTop: "10px" }}>
          メール内のリンクをクリックしてアカウントの認証をし、ログインを完了してください。
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
          アカウント認証後にログイン
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
        Create Account
      </h1>
      <input
        type="email"
        placeholder="Email"
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
        placeholder="Password"
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
        Email verification
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
        Googleでサインイン
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
        Appleでサインイン
      </button>
      <button
        onClick={() => navigate("/login")}
        style={{
          color: "red",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        すでにアカウントをお持ちですか？こちらをクリック
      </button>
      {showAlert && (
        <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>
      )}
    </div>
  );
};

export default SignUp;
