import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
  } from "firebase/auth";
  import { app } from "./firebaseConfig";
  
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();
  const appleProvider = new OAuthProvider("apple.com");
  
  // ログイン処理（Email）
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
  
  // Googleでサインイン
  export const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Googleサインイン成功:", result.user);
      return result.user; // ユーザー情報を返す
    } catch (error) {
      console.error("Googleサインインエラー:", error);
      throw error;
    }
  };
  
  // Appleでサインイン
  export const signInWithApple = async () => {
    try {
      const result = await signInWithPopup(auth, appleProvider);
      console.log("Appleサインイン成功:", result.user);
      return result.user; // ユーザー情報を返す
    } catch (error) {
      console.error("Appleサインインエラー:", error);
      throw error;
    }
  };
  
  export { auth };
  