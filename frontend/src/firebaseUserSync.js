// firebaseUserSync.js
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * ログイン後にユーザーの初期データを同期する関数
 * @param {object} user Firebase Auth のユーザーオブジェクト
 * @param {string} email ユーザーのメールアドレス
 * @param {boolean} userIsUnlimited サブスクリプション状態
 * @param {number|null|undefined} currentCountdown サブスクリプションのカウントダウン秒数（存在しない場合は更新しない）
 */
export const syncUserData = async (user, email, userIsUnlimited, currentCountdown) => {
  // まず、更新したいデータの基本部分を定義
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
    subscription: userIsUnlimited
  };

  // currentCountdown が数値であれば remainingSeconds を更新する
  if (typeof currentCountdown === "number") {
    dataToUpdate.remainingSeconds = currentCountdown;
  }
  // もし currentCountdown が undefined や null なら remainingSeconds フィールドは更新しない

  try {
    await setDoc(doc(db, "users", user.uid), dataToUpdate, { merge: true });
    console.log("ユーザーデータの同期に成功しました。");
  } catch (error) {
    console.error("ユーザーデータの同期に失敗しました:", error);
  }
};
