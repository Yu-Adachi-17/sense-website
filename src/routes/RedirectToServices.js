import { useRouter } from "next/router";
import { useEffect } from "react";

const RedirectToServices = () => {
  const router = useRouter();
  const { lang } = router.query; // URLのクエリパラメータからlangを取得

  useEffect(() => {
    if (lang) {
      router.replace(`/${lang}/services`);
    }
  }, [lang, router]);

  return null; // リダイレクト処理中は何も描画しない
};

export default RedirectToServices;
