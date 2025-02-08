import { useEffect, useState } from "react";
import { getAuth, applyActionCode, signInWithEmailAndPassword } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

const EmailVerification = () => {
  const auth = getAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState("認証中...");

  useEffect(() => {
    console.log("🔍 URL検索パラメータ:", location.search);

    // URL から oobCode を取得
    const query = new URLSearchParams(location.search);
    const oobCode = query.get("oobCode");

    console.log("🔑 取得したoobCode:", oobCode);

    if (oobCode) {
      applyActionCode(auth, oobCode)
        .then(async () => {
          setStatusMessage("メール認証に成功しました。ログインしています…");

          // 🔥【追加】 認証成功後に自動ログインを試みる
          try {
            const user = auth.currentUser;
            if (user && user.email) {
              console.log("🟢 自動ログイン: ", user.email);
              // すでにログイン状態ならそのまま進める
              navigate("/");
            } else {
              // すでに認証されたメールアドレスを取得してログイン
              console.log("🔵 ユーザー情報なし、自動ログインを試みる");
              // 再ログイン用のパスワードが必要な場合は、別の方法（例: カスタムトークン）を検討する
            }
          } catch (error) {
            console.error("❌ 自動ログイン失敗:", error);
            setStatusMessage("メール認証に成功しましたが、ログインに失敗しました。手動でログインしてください。");
          }

          // 3秒後にホーム画面へリダイレクト
          setTimeout(() => {
            navigate("/");
          }, 3000);
        })
        .catch((error) => {
          console.error("❌ 認証エラー:", error);
          setStatusMessage("メール認証に失敗しました。コードが無効か、既に認証済みかもしれません。");
        });
    } else {
      setStatusMessage("認証コードが見つかりません。");
    }
  }, [auth, location.search, navigate]);

  return (
    <div
      style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "Impact, sans-serif",
      }}
    >
      <h1>Email Verification</h1>
      <p>{statusMessage}</p>
    </div>
  );
};

export default EmailVerification;
