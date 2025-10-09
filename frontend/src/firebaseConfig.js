// src/firebaseConfig.js
// （pages ルーターでも問題ありません。RSC を使っていない前提）

import { initializeApp, getApps, getApp } from "firebase/app";
// 🔴 重要: Firestore をトップレベルで静的 import（provider を確実に登録）
import { getFirestore } from "firebase/firestore";
// Auth はここで静的 import しても OK（SSR では実行しないように返り値でガード）
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ---- App: 既存 or 初期化 ----
export function getAppSafe() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// ---- Auth: クライアントだけ返す ----
let _auth = null;
export async function getClientAuth() {
  if (typeof window === "undefined") return null;
  if (_auth) return _auth;
  const app = getAppSafe();
  _auth = getAuth(app);
  try {
    await setPersistence(_auth, browserLocalPersistence);
  } catch {}
  return _auth;
}

// ---- Firestore: クライアントだけ返す ----
// ---- Firestore: クライアント限定・1度だけ作る（Promiseで多重ガード）----
let _dbPromise = null;

export async function getDb() {
  // SSR/Edge では絶対に実行しない
  if (typeof window === "undefined") return null;
  if (_dbPromise) return _dbPromise;

  _dbPromise = (async () => {
    // ← app と firestore を「同一動的 import チャンク」から読み込む
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { getFirestore, initializeFirestore } = await import("firebase/firestore");

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    // provider の登録を先に強制（既登録なら try/catchで無視）
    try { initializeFirestore(app, {}); } catch {}

    return getFirestore(app);
  })();

  return _dbPromise;
}


// ---- Analytics: クライアント & 対応環境のみ ----
let analytics = null;
if (typeof window !== "undefined") {
  (async () => {
    try {
      const { isSupported, getAnalytics } = await import("firebase/analytics");
      if (await isSupported()) {
        const app = getAppSafe();
        analytics = getAnalytics(app);
      }
    } catch {}
  })();
}
export { analytics };

// ---- 任意ユーティリティ ----
let _persistenceSet = false;
export async function initAuthPersistence() {
  if (_persistenceSet || typeof window === "undefined") return;
  const auth = await getClientAuth();
  if (!auth) return;
  _persistenceSet = true;
}
