// src/firebaseAuth.js
// ✅ SSRで評価されないように、authは「使うときだけ」初期化
import { getClientAuth } from "./firebaseConfig";

/** Email/Password ログイン */
export async function login(email, password) {
  const auth = await getClientAuth();
  if (!auth) throw new Error("Auth is not available on server.");
  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log("Logged in:", cred.user);
  return cred.user;
}

/** ログアウト */
export async function logout() {
  const auth = await getClientAuth();
  if (!auth) return; // SSR時などは何もしない
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
  console.log("Logged out");
}

/** Googleでサインイン */
export async function signInWithGoogle() {
  const auth = await getClientAuth();
  if (!auth) throw new Error("Auth is not available on server.");
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  console.log("Googleサインイン成功:", result.user);
  return result.user;
}

/** Appleでサインイン */
export async function signInWithApple() {
  const auth = await getClientAuth();
  if (!auth) throw new Error("Auth is not available on server.");
  const { OAuthProvider, signInWithPopup } = await import("firebase/auth");
  const provider = new OAuthProvider("apple.com");
  const result = await signInWithPopup(auth, provider);
  console.log("Appleサインイン成功:", result.user);
  return result.user;
}

/** 必要なら auth を直接触りたいとき用のユーティリティ */
export async function getAuthClient() {
  return getClientAuth(); // クライアント以外は null を返す設計
}
