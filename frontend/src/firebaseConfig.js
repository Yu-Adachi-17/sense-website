// src/firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";

// .env は NEXT_PUBLIC_ プレフィックスのものを使用
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// multiple init を避ける
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** クライアントでだけ Firestore を返す（SSRでは null） */
export async function getDb() {
  if (typeof window === "undefined") return null;
  const { getFirestore } = await import("firebase/firestore");
  return getFirestore(app);
}

/** クライアントでだけ Auth を返す（SSRでは null） */
let _persistenceSet = false;
export async function getClientAuth() {
  if (typeof window === "undefined") return null;
  const { getAuth, setPersistence, browserLocalPersistence } = await import("firebase/auth");
  const auth = getAuth(app);
  if (!_persistenceSet) {
    await setPersistence(auth, browserLocalPersistence);
    _persistenceSet = true;
  }
  return auth;
}

/** 既存の API を残したい場合のラッパー（呼ぶ側は useEffect内で await する） */
export async function initAuthPersistence() {
  await getClientAuth(); // 中で setPersistence まで行う
}

/** Analytics は対応ブラウザ時のみ（既存と同じ思想） */
export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  try {
    const { isSupported, getAnalytics } = await import("firebase/analytics");
    if (await isSupported()) return getAnalytics(app);
  } catch {}
  return null;
}
