import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * ログイン後にユーザーの初期データを同期する関数
 * @param {object} user Firebase Auth のユーザーオブジェクト
 * @param {string} email ユーザーのメールアドレス
 * @param {boolean} userIsUnlimited サブスクリプション状態
 * @param {number|null} currentCountdown サブスクリプションのカウントダウン秒数（存在しない場合は 0）
 */
export const syncUserData = async (user, email, userIsUnlimited, currentCountdown) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  let remainingSeconds = 180; // デフォルト値

  if (userSnap.exists()) {
    const existingData = userSnap.data();
    if (existingData.remainingSeconds !== undefined) {
      // 既に Firestore に remainingSeconds がある場合、それを維持
      remainingSeconds = existingData.remainingSeconds;
    }
  }

  // currentCountdown が有効な場合のみ更新
  if (typeof currentCountdown === "number") {
    remainingSeconds = currentCountdown;
  }

  const dataToUpdate = {
    createdAt: serverTimestamp(),
    userName: email.substring(0, 3),
    email: email,
    recordingDevice: null,
    recordingTimestamp: null,
    originalTransactionId: null,
    subscriptionPlan: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    lastSubscriptionUpdate: null,
    remainingSeconds: remainingSeconds, // 上書きを防ぐ
    subscription: userIsUnlimited
  };

  try {
    await setDoc(userRef, dataToUpdate, { merge: true });
    console.log("✅ ユーザーデータの同期に成功しました。", user.uid, dataToUpdate);
  } catch (error) {
    console.error("❌ ユーザーデータの同期に失敗しました:", error);
  }
};
