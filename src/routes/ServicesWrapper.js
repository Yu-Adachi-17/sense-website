import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import ServicesPage from "../components/Services";

const ServicesWrapper = () => {
  const router = useRouter();
  const { lang } = router.query; // URLのクエリパラメータから言語を取得
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang); // 言語を切り替え
    }
  }, [lang, i18n]);

  return <ServicesPage />;
};

export default ServicesWrapper;
