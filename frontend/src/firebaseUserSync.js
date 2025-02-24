// firebaseUserSync.js
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * ログイン後にユーザーの初期データを同期する関数
 * @param {object} user Firebase Auth のユーザーオブジェクト
 * @param {string} email ユーザーのメールアドレス
 * @param {boolean} userIsUnlimited サブスクリプション状態（例: @AppStorage("userIsUnlimited") と同等）
 * @param {number|null} currentCountdown サブスクリプションのカウントダウン秒数（存在しない場合は 0）
 */
export const syncUserData = async (user, email, userIsUnlimited, currentCountdown) => {
  const dataToUpdate = {
    createdAt: serverTimestamp(), // ユーザー作成日時（既存の場合は上書きされないよう merge オプションを利用）
    userName: email.substring(0, 3), // 例としてメールアドレスの先頭3文字をユーザー名に
    email: email,
    recordingDevice: null,
    recordingTimestamp: null,
    originalTransactionId: null,
    subscriptionPlan: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    lastSubscriptionUpdate: null,
    remainingSeconds: currentCountdown !== null ? currentCountdown : 0,
    subscription: userIsUnlimited
  };

  try {
    await setDoc(doc(db, "users", user.uid), dataToUpdate, { merge: true });
    console.log("ユーザーデータの同期に成功しました。");
  } catch (error) {
    console.error("ユーザーデータの同期に失敗しました:", error);
  }
};
