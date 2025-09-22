// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
// ※ analytics は SSR/非対応環境で落ちないよう dynamic import で扱う
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 追加

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);

// Firestore / Auth は通常どおり
const db = getFirestore(app);
const auth = getAuth(app);

// ---- Analytics はブラウザ&対応環境のみ安全に初期化（SSR回避）----
let analytics = null;
if (typeof window !== "undefined") {
  (async () => {
    try {
      const { isSupported, getAnalytics } = await import("firebase/analytics");
      if (await isSupported()) {
        analytics = getAnalytics(app);
      }
    } catch (e) {
      // 非対応環境やブロック時は何もしない
      // console.debug("Analytics init skipped:", e);
    }
  })();
}

// ---- Auth 永続化の“クライアント専用”初期化（トップレベルでは呼ばない）----
let _persistenceSet = false;
/**
 * クライアントで一度だけ Auth 永続化を設定する。
 * SSR では実行しない。dynamic import でサーバーバンドルから除外。
 */
export async function initAuthPersistence() {
  if (_persistenceSet) return;
  if (typeof window === "undefined") return;

  const { setPersistence, browserLocalPersistence } = await import("firebase/auth");
  await setPersistence(auth, browserLocalPersistence);
  _persistenceSet = true;
}

export { app, analytics, db, auth }; // auth をエクスポート
