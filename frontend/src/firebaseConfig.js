// src/firebaseConfig.js
// Next.js (pages router) / クライアント専用ユーティリティ

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ---- App（単一インスタンス）----
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// HMR を跨いで再利用するため globalThis を利用
const g = typeof globalThis !== "undefined" ? globalThis : window;
g.__FB_AUTH__ = g.__FB_AUTH__ || null;
g.__FB_DB__ = g.__FB_DB__ || null;

// ---- Auth（クライアントのみ）----
export async function getClientAuth() {
  if (typeof window === "undefined") return null;
  if (!g.__FB_AUTH__) {
    const auth = getAuth(app);
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      // Persistence が使えない環境でも落とさない
    }
    g.__FB_AUTH__ = auth;
  }
  return g.__FB_AUTH__;
}

// ---- Firestore（クライアントのみ）----
export function getDb() {
  if (typeof window === "undefined") return null;
  if (!g.__FB_DB__) {
    // ここで初めて Firestore をバインド（動的 import は使わない）
    g.__FB_DB__ = getFirestore(app);
  }
  return g.__FB_DB__;
}

// ---- Analytics（対応環境のみ）----
export let analytics = null;
if (typeof window !== "undefined") {
  (async () => {
    try {
      const { isSupported, getAnalytics } = await import("firebase/analytics");
      if (await isSupported()) {
        analytics = getAnalytics(app);
      }
    } catch {
      // 未対応環境は無視
    }
  })();
}

// ---- 任意ユーティリティ ----
let _persistenceSet = false;
export async function initAuthPersistence() {
  if (_persistenceSet || typeof window === "undefined") return;
  const auth = await getClientAuth();
  if (auth) _persistenceSet = true;
}
