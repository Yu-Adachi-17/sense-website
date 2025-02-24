import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * ユーザードキュメントの作成時刻が新規ユーザー（例：登録から5分以内）で、
 * remainingSeconds が 0 なら 180 に再設定する関数
 * @param {object} user Firebase Auth のユーザーオブジェクト
 */
export const fixNewUserRemainingSeconds = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    console.warn("User doc does not exist");
    return;
  }
  const data = userSnap.data();
  
  // createdAt は serverTimestamp() で設定されるので、toDate() で Date オブジェクトに変換できる場合もある
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  const now = new Date();

  // 例として、新規ユーザーを「登録から5分以内」と判断する
  if (createdAt && now - createdAt < 5 * 60 * 1000 && data.remainingSeconds === 0) {
    await updateDoc(userRef, { remainingSeconds: 180 });
    console.log("New user: remainingSeconds updated to 180");
  } else {
    console.log("No update needed: either not a new user or remainingSeconds is already set");
  }
};
