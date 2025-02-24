import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

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

  if (createdAt && now - createdAt < 5 * 60 * 1000 && data.remainingSeconds === 0) {
    await updateDoc(userRef, { remainingSeconds: 180 });
    console.log("New user: remainingSeconds updated to 180");
  } else {
    console.log("No update needed: either not a new user or remainingSeconds is already set");
  }
};
