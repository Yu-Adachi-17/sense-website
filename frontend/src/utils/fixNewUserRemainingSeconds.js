import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const fixNewUserRemainingSeconds = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.warn("User doc does not exist");
    return;
  }

  const data = userSnap.data();
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  const now = new Date();

  // **remainingSeconds が 0, null, undefined の場合に 180 に修正**
  if (createdAt && now - createdAt < 5 * 60 * 1000 && (data.remainingSeconds === 0 || data.remainingSeconds == null)) {
    await updateDoc(userRef, { remainingSeconds: 180 });
    console.log("🔥 New user: remainingSeconds updated to 180");
  } else {
    console.log("✅ No update needed: remainingSeconds is already set or user is not new");
  }
};
