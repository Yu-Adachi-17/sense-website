import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * ログイン後にユーザーの初期データを同期する関数
 * ※初期設定では remainingSeconds は currentCountdown の値（通常は 0）になる
 */
export const syncUserData = async (user, email, userIsUnlimited, currentCountdown) => {
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

/**
 * ログイン時にユーザーの remainingSeconds に追加の時間を加算する関数
 * @param {object} user - Firebase Auth のユーザーオブジェクト
 * @param {number} extraSeconds - 追加する秒数（デフォルトは 180 秒＝3 分）
 */
export const addExtraTimeOnLogin = async (user, extraSeconds = 180) => {
  const userRef = doc(db, "users", user.uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn("ユーザードキュメントが存在しません。");
      return;
    }
    const data = userSnap.data();
    let currentSeconds = data.remainingSeconds;
    if (typeof currentSeconds !== "number") {
      currentSeconds = 0;
    }
    const newSeconds = currentSeconds + extraSeconds;
    await updateDoc(userRef, { remainingSeconds: newSeconds });
    console.log("ログイン時に余分な時間を加算しました。新しい remainingSeconds:", newSeconds);
  } catch (error) {
    console.error("余分な時間の加算に失敗しました:", error);
  }
};
