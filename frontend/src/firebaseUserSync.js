// src/firebaseUserSync.js
import { getDb } from "./firebaseConfig";

/**
 * ログイン後にユーザーの初期データを同期する
 *   - SSRでは何もしない（getDb() が null を返す設計）
 *   - FirestoreのAPIは dynamic import でクライアントだけに読み込む
 */
export const syncUserData = async (user, email, userIsUnlimited, currentCountdown) => {
  const db = await getDb();
  if (!db) {
    // SSR/SSG 側などブラウザでない場合は何もしない
    return;
  }

  // Firestore 関数はクライアントでだけ読み込む
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");

  const uid = user?.uid;
  if (!uid) {
    console.warn("syncUserData: user.uid が未定義です");
    return;
  }

  const dataToUpdate = {
    createdAt: serverTimestamp(),
    userName: (email || "").substring(0, 3),
    email: email ?? "",
    recordingDevice: null,
    recordingTimestamp: null,
    originalTransactionId: null,
    subscriptionPlan: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    lastSubscriptionUpdate: null,
    remainingSeconds: currentCountdown != null ? currentCountdown : 0,
    subscription: !!userIsUnlimited,
  };

  try {
    await setDoc(doc(db, "users", uid), dataToUpdate, { merge: true });
    console.log("ユーザーデータの同期に成功しました。");
  } catch (error) {
    console.error("ユーザーデータの同期に失敗しました:", error);
  }
};
