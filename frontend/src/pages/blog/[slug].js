// src/pages/blog/[slug].js
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { MDXRemote } from "next-mdx-remote";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import {
  listPostIds,
  listLocalesForPost,
  resolvePostIdFromSlug,
  loadMdx,
  getSlugForLocale,
} from "../../lib/blog";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";

// Facebook/OG 用のロケール対応
const OG_LOCALE_MAP = {
  en: "en_US",
  ja: "ja_JP",
  de: "de_DE",
  fr: "fr_FR",
  "es-ES": "es_ES",
  "es-MX": "es_MX",
  ar: "ar_AR",
  id: "id_ID",
  ko: "ko_KR",
  nl: "nl_NL",
  "pt-BR": "pt_BR",
  "pt-PT": "pt_PT",
  sv: "sv_SE",
  da: "da_DK",
  no: "nb_NO",
  ms: "ms_MY",
  it: "it_IT",
  el: "el_GR",
  hr: "hr_HR",
  cs: "cs_CZ",
  sk: "sk_SK",
  th: "th_TH",
  tr: "tr_TR",
  uk: "uk_UA",
};

// ★ 重要：専用ページと衝突する slug はブロック
const BLOCKED_SLUGS = new Set(["introduction"]);

export default function BlogPost({
  postId,
  mdx,
  front,
  alternates,
  canonical,
  ogLocale,
}) {
  const router = useRouter();
  const { asPath, locale } = router;

  // /home と同様：クエリ/ハッシュ除去 → 現ロケールprefix除去
  const pathNoLocale = (() => {
    const strip = (p) => (p || "/").split("#")[0].split("?")[0] || "/";
    const raw = strip(asPath || "/");
    const re = new RegExp(`^/${locale}(?=/|$)`);
    const cleaned = raw.replace(re, "");
    return cleaned || "/";
  })();

  return (
    <>
      <Head>
        <title>{front.title} | Minutes.AI Blog</title>
        <meta name="description" content={front.description || ""} />

        {/* canonical / hreflang（自己 canonical ＋ 相互 alternate） */}
        <link rel="canonical" href={canonical} />
        {alternates.map(({ l, href }) => (
          <link
            key={l}
            rel="alternate"
            hrefLang={String(l).toLowerCase()}
            href={href}
          />
        ))}
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${SITE_URL}${pathNoLocale}`}
        />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={`${front.title} | Minutes.AI Blog`} />
        <meta property="og:description" content={front.description || ""} />
        <meta
          property="og:image"
          content={`${SITE_URL}${front.ogImage || "/og-image.jpg"}`}
        />
        <meta property="og:locale" content={ogLocale} />
        {alternates
          .filter((a) => a.l !== locale && OG_LOCALE_MAP[a.l])
          .map((a) => (
            <meta
              key={a.l}
              property="og:locale:alternate"
              content={OG_LOCALE_MAP[a.l]}
            />
          ))}

        {/* JSON-LD（BlogPosting） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: front.title,
              description: front.description || "",
              image: [`${SITE_URL}${front.ogImage || "/og-image.jpg"}`],
              datePublished: front.datePublished,
              dateModified: front.dateModified || front.datePublished,
              mainEntityOfPage: canonical,
              author:
                front.authors?.map((a) => ({
                  "@type": "Organization",
                  name: a.name,
                })) ?? [{ "@type": "Organization", name: "Sense LLC" }],
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: {
                  "@type": "ImageObject",
                  url: `${SITE_URL}/icon-master.png`,
                },
              },
            }),
          }}
        />
      </Head>

      <article className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold">{front.title}</h1>
          {front.datePublished && (
            <p className="mt-2 opacity-80">
              <time dateTime={front.datePublished}>{front.datePublished}</time>
            </p>
          )}
        </header>
        <MDXRemote {...mdx} />
        <hr className="my-10 border-white/10" />
        <nav className="text-sm">
          <Link href="/blog">← Blog</Link>
        </nav>
      </article>
    </>
  );
}

export async function getStaticPaths({ locales }) {
  // “存在する言語ファイルのみ” path を作成。ただし BLOCKED_SLUGS は除外。
  const paths = [];
  for (const id of listPostIds()) {
    for (const l of locales) {
      const slug = getSlugForLocale(id, l);
      if (!slug) continue;
      if (BLOCKED_SLUGS.has(slug)) continue; // ★ ここで衝突回避
      paths.push({ params: { slug }, locale: l });
    }
  }
  return { paths, fallback: false };
}

export async function getStaticProps({
  params,
  locale,
  locales,
  defaultLocale,
}) {
  // introduction はここには来ない（BLOCKED_SLUGSで除外済）
  const postId = resolvePostIdFromSlug(locale, params.slug);
  const loaded = await loadMdx(postId, locale);
  if (!loaded) return { notFound: true };

  const front = loaded.frontmatter;

  // 記事ごとに“実在するロケール”だけを列挙
  const availableLocales = listLocalesForPost(postId);

  // 各ロケールの URL（言語ごとに slug は別物でもOK）
  const alternates = availableLocales.map((l) => {
    const prefix = l === defaultLocale ? "" : `/${l}`;
    const slugL = getSlugForLocale(postId, l);
    return { l, href: `${SITE_URL}${prefix}/blog/${slugL}` };
  });

  // canonical は “このロケール自身”
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const canonical = `${SITE_URL}${prefix}/blog/${front.slug}`;
  const ogLocale = OG_LOCALE_MAP[locale] || OG_LOCALE_MAP.en;

  // i18n を確実に初期化（このページで t() を使っていなくても安全）
  const i18nProps = await serverSideTranslations(locale, ["common"]);

  return {
    props: {
      postId,
      mdx: loaded.mdx,
      front,
      alternates,
      canonical,
      ogLocale,
      ...i18nProps,
    },
  };
}
