import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/router";
import { app } from "../firebaseConfig";

/**
 * 認証初期化(onAuthStateChanged)が終わるまで描画を保留。
 * 未ログインなら /login にリダイレクト（redirectIfUnauthed=true の場合）。
 */
export function useAuthGate(redirectIfUnauthed: boolean = true) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // 1) Firebase Auth の初期化完了を待つ
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  // 2) 初期化後の判定のみで遷移させる（往復防止）
  useEffect(() => {
    if (!ready) return;
    if (redirectIfUnauthed && !user && router.pathname !== "/login" && router.pathname !== "/signup") {
      router.replace("/login");
    }
  }, [ready, user, redirectIfUnauthed, router]);

  return { ready, user };
}
