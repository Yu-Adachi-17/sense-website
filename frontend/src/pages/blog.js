// src/pages/blog.js
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

/* ===================== i18n (軽量辞書) ===================== */
const I18N = {
  en: {
    title: "Minutes AI Blog",
    desc:
      "Learn how to run better meetings with AI. Workflows, updates, interviews, and articles from Minutes AI.",
    heroP:
      "Learn how to run better meetings with AI. New workflows, interviews, and product updates.",
    allTags: "All Tags",
    loadMore: "Load more",
    noPosts: "No posts yet. Come back soon.",
    backHome: "Back to Home",
  },
  ja: {
    title: "議事録AI ブログ",
    desc:
      "AIでより良い会議を。ワークフロー、アップデート、インタビュー、解説記事をお届けします。",
    heroP:
      "AIで会議をもっと良く。新しいワークフロー、インタビュー、製品アップデート。",
    allTags: "すべてのタグ",
    loadMore: "もっと見る",
    noPosts: "まだ記事がありません。後日またお越しください。",
    backHome: "ホームへ戻る",
  },
  "zh-CN": {
    title: "会议记录AI 博客",
    desc:
      "用AI开好每一次会议。工作流程、更新、采访与文章。",
    heroP:
      "用AI提升会议质量。新的工作流程、采访与产品更新。",
    allTags: "全部标签",
    loadMore: "加载更多",
    noPosts: "暂无文章，敬请期待。",
    backHome: "返回首页",
  },
  nb: {
    title: "Referat AI Blogg",
    desc:
      "Lær å holde bedre møter med AI. Arbeidsflyter, oppdateringer, intervjuer og artikler fra Referat AI.",
    heroP:
      "Lær å holde bedre møter med AI. Nye arbeidsflyter, intervjuer og produktoppdateringer.",
    allTags: "Alle tagger",
    loadMore: "Vis mer",
    noPosts: "Ingen innlegg ennå. Kom tilbake snart.",
    backHome: "Tilbake til forsiden",
  },
};

/* ===================== UI bits ===================== */
function Badge({ children, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ${
        active
          ? "bg-indigo-600 text-white border-indigo-600 shadow"
          : "bg-white/5 text-indigo-100 border-white/15 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(d, locale) {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString(locale || undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function Card({ post, locale }) {
  const safeHref =
    typeof post?.href === "string" ? post.href : `/blog/${post?.slug || ""}`;
  return (
    <Link
      href={safeHref}
      className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition-colors hover:bg-white/10"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={post.title}
          src={post.coverImage || "/images/hero-phone.png"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-indigo-100/90">
          {post.tags?.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-full bg-indigo-500/30 px-2 py-0.5 backdrop-blur-sm"
            >
              {t}
            </span>
          ))}
          <span className="ml-auto text-indigo-200/70">
            {formatDate(post.date, locale)}
          </span>
        </div>
        <h3 className="text-xl font-semibold leading-tight text-white drop-shadow-sm">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1 text-sm text-indigo-100/90 line-clamp-2 drop-shadow-sm">
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function BlogIndex({ posts = [], siteUrl, locale, defaultLocale }) {
  const router = useRouter();
  const L = I18N[locale] || I18N[router.locale] || I18N.en;

  const [activeTag, setActiveTag] = useState("All");
  const [limit, setLimit] = useState(12);

  const tags = useMemo(() => {
    const t = new Set(["All"]);
    posts.forEach((p) => (p.tags || []).forEach((x) => t.add(x)));
    return Array.from(t);
  }, [posts]);

  const filtered = useMemo(() => {
    const arr =
      activeTag === "All" ? posts : posts.filter((p) => p.tags?.includes(activeTag));
    return arr.slice(0, limit);
  }, [activeTag, limit, posts]);

  // ローカライズされたcanonical
  const base =
    locale && defaultLocale && locale !== defaultLocale
      ? `${siteUrl}/${locale}`
      : siteUrl;
  const canonical = `${base}/blog`;

  return (
    <>
      <Head>
        <title>{L.title}</title>
        <meta name="description" content={L.desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={L.title} />
        <meta property="og:description" content={L.heroP || L.desc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        {/* hreflang（最低限：現在と言語無し） */}
        <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/blog`} />
        {locale && (
          <link rel="alternate" hrefLang={locale} href={canonical} />
        )}
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-6">
          <Link
            href={locale && defaultLocale && locale !== defaultLocale ? `/${locale}` : "/"}
            aria-label={L.backHome}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-7xl px-6 pt-8 pb-10">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              {L.title}
            </h1>
            <p className="mt-4 max-w-2xl text-indigo-100/90 text-lg">{L.heroP}</p>

            {/* Tags */}
            <div className="mt-8 flex flex-wrap gap-3">
              {tags.map((t) => (
                <Badge key={t} active={activeTag === t} onClick={() => setActiveTag(t)}>
                  {t === "All" ? L.allTags : t}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section>
          <div className="mx-auto max-w-7xl px-6 pb-16">
            {filtered.length === 0 ? (
              <p className="text-indigo-100/80">{L.noPosts}</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((post) => (
                  <Card key={post.slug || post.title} post={post} locale={locale} />
                ))}
              </div>
            )}

            {/* Load more */}
            {limit <
              (activeTag === "All"
                ? posts.length
                : posts.filter((p) => p.tags?.includes(activeTag)).length) && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setLimit((v) => v + 9)}
                  className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                >
                  {L.loadMore}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

/* ===================== Build-time: read markdown from /content/blog ===================== */
import fs from "fs";
import path from "path";
import matter from "gray-matter";

function toISO(v, fallbackNow = false) {
  if (!v && fallbackNow) return new Date().toISOString();
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime())
    ? fallbackNow
      ? new Date().toISOString()
      : null
    : d.toISOString();
}

/**
 * dirPath 内で i18n優先順にフロントマターを探す
 * 優先： currentLocale → defaultLocale → en
 */
function tryReadFrontFromDir(dirPath, currentLocale, defaultLocale) {
  const all = fs.readdirSync(dirPath);
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const candidates = uniq([
    `${currentLocale}.mdx`,
    `${currentLocale}.md`,
    `${defaultLocale}.mdx`,
    `${defaultLocale}.md`,
    `en.mdx`,
    `en.md`,
    all.find((f) => /\.mdx$/i.test(f)),
    all.find((f) => /\.md$/i.test(f)),
  ]);

  for (const name of candidates) {
    const p = path.join(dirPath, name);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      const { data, content } = matter(raw);
      return { data, content, filePath: p };
    }
  }
  return null;
}

/** JSON補完も current → default → en の順で探す */
function readI18nJsonFallback(baseDir, currentLocale, defaultLocale, file) {
  const tryPaths = [
    path.join(baseDir, currentLocale, file),
    path.join(baseDir, defaultLocale, file),
    path.join(baseDir, "en", file),
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
      } catch {}
    }
  }
  return null;
}

export async function getStaticProps({ locale, defaultLocale }) {
  const contentDir = path.join(process.cwd(), "content", "blog");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const posts = [];
  const hrefSet = new Set();
  const pushPost = (p) => {
    if (!p?.href) return;
    if (hrefSet.has(p.href)) return;
    hrefSet.add(p.href);
    posts.push(p);
  };

  const ents = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir, { withFileTypes: true })
    : [];

  /* 1) 直下の .md / .mdx */
  for (const ent of ents.filter((e) => e.isFile())) {
    if (!/\.(md|mdx)$/i.test(ent.name)) continue;
    const filename = ent.name;
    const slug = filename.replace(/\.(md|mdx)$/i, "");
    const raw = fs.readFileSync(path.join(contentDir, filename), "utf8");
    const { data, content } = matter(raw);

    const title = (data.title || slug).toString();
    const norm = title.toLowerCase().replace(/\s+/g, " ").replace(/[?？]/g, "");
    const isIntroByTitle =
      norm === "what is minutes.ai" || norm === "what is minutes ai";
    const isIntroBySlug =
      slug === "hello-minutes-ai" || slug === "what-is-minutes-ai";

    const href =
      (typeof data.link === "string" && data.link.trim()) ||
      (isIntroByTitle || isIntroBySlug ? "/blog/introduction" : `/blog/${slug}`);

    pushPost({
      slug,
      title,
      date: toISO(data.date, true),
      updatedAt: toISO(data.updatedAt, false),
      excerpt: data.excerpt || (content ? content.slice(0, 180) : ""),
      coverImage: data.cover || null,
      tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ["Articles"],
      href,
    });
  }

  /* 2) サブディレクトリ（/businessnegotiation 等） */
  for (const ent of ents.filter((e) => e.isDirectory())) {
    const dir = ent.name;
    const dirPath = path.join(contentDir, dir);

    const picked = tryReadFrontFromDir(dirPath, locale || "en", defaultLocale || "en");
    if (!picked) continue;

    let { data, content } = picked;

    // Frontmatterが薄いときは i18n JSON（public/locales/<loc>/blog_<dir>.json）から補完
    const localesBase = path.join(process.cwd(), "public", "locales");
    const j =
      readI18nJsonFallback(localesBase, locale || "en", defaultLocale || "en", `blog_${dir}.json`) ||
      {};
    let title = (data?.title || j?.hero?.h1 || dir).toString().trim();
    let excerpt = (data?.excerpt || j?.hero?.tagline || "").toString().trim();

    const href = `/blog/${dir}`;

    pushPost({
      slug: dir,
      title,
      date: toISO(data?.date, true),
      updatedAt: toISO(data?.updatedAt, false),
      excerpt: excerpt || (content ? content.slice(0, 180) : ""),
      coverImage: data?.cover || "/images/hero-phone.png",
      tags: Array.isArray(data?.tags) && data.tags.length ? data.tags : ["Articles"],
      href,
    });
  }

  /* 3) onlinemeeting フォールバック（i18n補完込み） */
  const hasOnlineMeeting = posts.some(
    (p) => p.slug === "onlinemeeting" || p.href === "/blog/onlinemeeting"
  );
  if (!hasOnlineMeeting) {
    const localesBase = path.join(process.cwd(), "public", "locales");
    const j =
      readI18nJsonFallback(
        localesBase,
        locale || "en",
        defaultLocale || "en",
        "blog_onlinemeeting.json"
      ) || {};
    let title = j?.hero?.h1 || "Online Meetings for Minutes.AI";
    let excerpt =
      j?.hero?.tagline ||
      "Click “Online”, issue a URL, share it, and you’re in. When you hang up, minutes start generating automatically.";

    pushPost({
      slug: "onlinemeeting",
      title,
      date: new Date().toISOString(),
      updatedAt: null,
      excerpt,
      coverImage: "/images/LivekitMeeting.png",
      tags: ["Release", "Minutes.AI"],
      href: "/blog/onlinemeeting",
    });
  }

  // 新しい順
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    props: { posts, siteUrl, locale: locale || null, defaultLocale: defaultLocale || null },
    revalidate: 600,
  };
}
