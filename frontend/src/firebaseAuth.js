// src/firebaseAuth.js
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { app } from "./firebaseConfig";

const auth = getAuth(app);

// ログイン処理
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// ログアウト処理
export const logout = async () => {
  try {
    await signOut(auth);
    console.log("Logged out");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export { auth };
