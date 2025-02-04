// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAMXPYc83E8AASYYb6D94Bu_XskVduXSUU",
  authDomain: "miniutesai.firebaseapp.com",
  projectId: "miniutesai",
  storageBucket: "miniutesai.firebasestorage.app",
  messagingSenderId: "829934411933",
  appId: "1:829934411933:web:f55ef7205123425f5f3474",
  measurementId: "G-0DJ5W7SD82"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
