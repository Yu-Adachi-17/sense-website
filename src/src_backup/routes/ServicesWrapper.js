import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ServicesPage from "../components/Services";

const ServicesWrapper = () => {
  const { lang } = useParams(); // URLから言語を取得
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang); // 言語を切り替え
    }
  }, [lang, i18n]);

  return <ServicesPage />;
};

export default ServicesWrapper;
