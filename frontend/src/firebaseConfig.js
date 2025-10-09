// src/firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// SSRでも安全に app を返す
export function getAppSafe() {
  const apps = getApps();
  return apps.length ? apps[0] : initializeApp(firebaseConfig);
}

// ---- Auth: クライアント限定で返す ----
let _auth = null;
export async function getClientAuth() {
  if (typeof window === "undefined") return null;
  if (_auth) return _auth;
  const app = getAppSafe();
  const { getAuth, setPersistence, browserLocalPersistence } = await import("firebase/auth");
  _auth = getAuth(app);
  try {
    await setPersistence(_auth, browserLocalPersistence);
  } catch {} // 既に設定済みなら無視
  return _auth;
}

// ---- Firestore: クライアント限定で返す ----
let _db = null;
export async function getDb() {
  if (typeof window === "undefined") return null;
  if (_db) return _db;
  const app = getAppSafe();
  const { getFirestore } = await import("firebase/firestore");
  _db = getFirestore(app);
  return _db;
}

// ---- Analytics: クライアント＋対応環境のみ ----
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

// 必要なら外から参照できるように
export { analytics };

// 既存のユーティリティ（必要なら）
let _persistenceSet = false;
export async function initAuthPersistence() {
  if (_persistenceSet || typeof window === "undefined") return;
  const auth = await getClientAuth();
  if (!auth) return;
  _persistenceSet = true;
}
