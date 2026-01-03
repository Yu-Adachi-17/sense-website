// src/firebaseUserSync.js
import { getDb } from "./firebaseConfig";

/**
 * ログイン後にユーザーの初期データを同期する
 *   - SSRでは何もしない（getDb() が null を返す設計）
 *   - FirestoreのAPIは dynamic import でクライアントだけに読み込む
 *
 * 重要:
 *   - 既存ユーザーの subscription / plan 系を「勝手に null / false 上書き」しない
 *   - 初回（docが無い）だけ初期値を入れる
 *   - subscription は原則「true への昇格」以外は書き換えない（誤ダウングレード防止）
 */
export const syncUserData = async (user, email, userIsUnlimited, currentCountdown) => {
  const db = await getDb();
  if (!db) return;

  const { doc, setDoc, getDoc, serverTimestamp } = await import("firebase/firestore");

  const uid = user?.uid;
  if (!uid) {
    console.warn("syncUserData: user.uid が未定義です");
    return;
  }

  const userDocRef = doc(db, "users", uid);

  let snap = null;
  try {
    snap = await getDoc(userDocRef);
  } catch (e) {
    console.error("syncUserData: getDoc に失敗しました:", e);
  }

  const exists = !!snap?.exists?.();
  const existing = exists ? snap.data() : {};

  const safeEmail = (email ?? user?.email ?? "").trim();
  const patch = {
    updatedAt: serverTimestamp(),
    email: safeEmail,
    userName: safeEmail ? safeEmail.substring(0, 3) : "",
  };

  // 初回のみ「初期値」を入れる（既存値を壊さない）
  if (!exists) {
    patch.createdAt = serverTimestamp();

    patch.recordingDevice = null;
    patch.recordingTimestamp = null;

    // Minutes側の既存運用に合わせたフィールド（初回だけ）
    patch.originalTransactionId = null;
    patch.subscriptionPlan = null;
    patch.subscriptionStartDate = null;
    patch.subscriptionEndDate = null;
    patch.lastSubscriptionUpdate = null;

    patch.remainingSeconds = currentCountdown != null ? currentCountdown : 0;

    // 初回はデフォルト false（userIsUnlimited が true の場合のみ true）
    patch.subscription = userIsUnlimited === true;
    if (userIsUnlimited === true) {
      patch.lastSubscriptionUpdate = serverTimestamp();
    }
  } else {
    // 既存ユーザー：必要なものだけ更新
    if (currentCountdown != null) {
      patch.remainingSeconds = currentCountdown;
    }

    // subscription の誤ダウングレードを防ぐ
    // - userIsUnlimited === true のときだけ true を書く（昇格）
    // - userIsUnlimited === false は、既存が true の場合は無視
    if (userIsUnlimited === true) {
      patch.subscription = true;
      patch.lastSubscriptionUpdate = serverTimestamp();
    } else if (userIsUnlimited === false) {
      if (existing?.subscription !== true) {
        patch.subscription = false;
        patch.lastSubscriptionUpdate = serverTimestamp();
      }
    }
  }

  try {
    await setDoc(userDocRef, patch, { merge: true });
    console.log("ユーザーデータの同期に成功しました。");
  } catch (error) {
    console.error("ユーザーデータの同期に失敗しました:", error);
  }
};
