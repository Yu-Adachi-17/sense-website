import Head from "next/head";
import { useRouter } from "next/router";

const BASE = "https://www.sense-ai.world";

export default function SeoHead({ title, description }) {
  const { asPath, locale, defaultLocale, locales } = useRouter();
  // ロケール無しの論理パスを作る
  const path = asPath.startsWith(`/${locale}`) ? asPath.replace(`/${locale}`, "") || "/" : asPath || "/";
  const urlFor = (l) => `${BASE}${l === defaultLocale ? "" : `/${l}`}${path}`;

  return (
    <Head>
      {/* 自己参照 canonical */}
      <link rel="canonical" href={urlFor(locale)} />
      {/* hreflang: 全バージョン + x-default */}
      {locales?.map((l) => (
        <link key={l} rel="alternate" hrefLang={l} href={urlFor(l)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={urlFor(defaultLocale)} />

      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {/* og:url もロケールごとに更新（固定URLをやめる） */}
      <meta property="og:url" content={urlFor(locale)} />
    </Head>
  );
}
