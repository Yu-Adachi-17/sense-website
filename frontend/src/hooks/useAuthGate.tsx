import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getClientAuth } from "../firebaseConfig";
import type { User } from "firebase/auth";

/**
 * 認証初期化(onAuthStateChanged)が終わるまで描画を保留。
 * 未ログインなら /login にリダイレクト（redirectIfUnauthed=true の場合）。
 * - SSR安全: firebase/auth を動的 import、authは getClientAuth() でクライアント限定初期化
 */
export function useAuthGate(redirectIfUnauthed: boolean = true) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // 1) Firebase Auth の初期化完了を待つ（クライアント限定）
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;

    (async () => {
      const auth = await getClientAuth();         // SSRでは null を返す設計
      if (!mounted) return;

      if (!auth) {
        // サーバー側レンダリング時などは何もせずready=trueに
        setReady(true);
        return;
      }

      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(auth, (u) => {
        if (!mounted) return;
        setUser(u);
        setReady(true);
      });
    })();

    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // 2) 初期化後の判定でのみリダイレクト（往復防止）
  useEffect(() => {
    if (!ready) return;
    if (
      redirectIfUnauthed &&
      !user &&
      router.pathname !== "/login" &&
      router.pathname !== "/signup"
    ) {
      router.replace("/login");
    }
  }, [ready, user, redirectIfUnauthed, router]);

  return { ready, user };
}
