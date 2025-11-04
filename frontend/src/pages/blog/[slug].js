// src/pages/blog/[slug].js
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { MDXRemote } from "next-mdx-remote";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import fs from "fs";
import path from "path";

import {
  listPostIds,
  listLocalesForPost,
  resolvePostIdFromSlug,
  loadMdx,
  getSlugForLocale,
} from "../../lib/blog";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";

// Facebook/OG 用のロケール対応（全ロケール網羅）
const OG_LOCALE_MAP = {
  ar: "ar_AR",
  cs: "cs_CZ",
  da: "da_DK",
  de: "de_DE",
  el: "el_GR",
  en: "en_US",
  "es-ES": "es_ES",
  "es-MX": "es_MX",
  fi: "fi_FI",
  fr: "fr_FR",
  he: "he_IL",
  hi: "hi_IN",
  hr: "hr_HR",
  hu: "hu_HU",
  id: "id_ID",
  it: "it_IT",
  ja: "ja_JP",
  ko: "ko_KR",
  ms: "ms_MY",
  nl: "nl_NL",
  no: "nb_NO",
  pl: "pl_PL",
  "pt-BR": "pt_BR",
  "pt-PT": "pt_PT",
  ro: "ro_RO",
  ru: "ru_RU",
  sk: "sk_SK",
  sv: "sv_SE",
  th: "th_TH",
  tr: "tr_TR",
  uk: "uk_UA",
  vi: "vi_VN",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
};

/** ─────────────────────────────────────────────────────
 *  専用ページ（/src/pages/blog/*.js）の slug を自動で除外
 *  例: businessnegotiation, introduction, universal-minutes など
 *  ──────────────────────────────────────────────────── */
function deriveBlockedSlugs() {
  const dir = path.join(process.cwd(), "src", "pages", "blog");
  const blocked = new Set();
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith(".js")) {
        const base = e.name.replace(/\.js$/, "");
        if (["[slug]", "index", "_app", "_document", "_error"].includes(base)) continue;
        blocked.add(base);
      }
      if (e.isDirectory()) {
        blocked.add(e.name);
      }
    }
  } catch {
    // noop（ローカル/CI差異対策）
  }
  return blocked;
}
const BLOCKED_SLUGS = deriveBlockedSlugs();

/** ─────────────────────────────────────────────────────
 *  slug → next-i18next namespace の対応
 *  （MDX本文には未使用でも、各記事で t() を使う可能性に備え必ず注入）
 *  ──────────────────────────────────────────────────── */
const NS_BY_SLUG = {
  businessnegotiation: "blog_businessnegotiation",
  introduction: "blog_introduction",
  "universal-minutes": "blog_universal",
  universalminutes: "blog_universal",
  pricing: "blog_pricing",
  strategy: "blog_strategy",
  recommend: "blog_recommend",
  onlinemeeting: "blog_onlinemeeting",
  aimodel: "blog_aimodel",
  "ai-model": "blog_aimodel",
};

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

        {/* canonical / hreflang */}
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
  const paths = [];
  for (const id of listPostIds()) {
    for (const l of locales) {
      const slug = getSlugForLocale(id, l);
      if (!slug) continue;
      if (BLOCKED_SLUGS.has(slug)) continue;
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
  const postId = resolvePostIdFromSlug(locale, params.slug);
  const loaded = await loadMdx(postId, locale);
  if (!loaded) return { notFound: true };

  const front = loaded.frontmatter;

  const availableLocales = listLocalesForPost(postId);

  const alternates = availableLocales.map((l) => {
    const prefix = l === defaultLocale ? "" : `/${l}`;
    const slugL = getSlugForLocale(postId, l);
    return { l, href: `${SITE_URL}${prefix}/blog/${slugL}` };
  });

  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const canonical = `${SITE_URL}${prefix}/blog/${front.slug}`;
  const ogLocale = OG_LOCALE_MAP[locale] || OG_LOCALE_MAP.en;

  const maybeNs = NS_BY_SLUG[front.slug];
  const nsList = ["common", ...(maybeNs ? [maybeNs] : [])];
  const i18nProps = await serverSideTranslations(locale ?? "en", nsList);

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
    revalidate: 60,
  };
}
