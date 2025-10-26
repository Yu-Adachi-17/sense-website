// src/pages/blog.js
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

// ---- UI bits ----
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

function formatDate(d) {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function Card({ post }) {
  const safeHref = typeof post?.href === "string" ? post.href : `/blog/${post?.slug || ""}`;
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
            <span key={t} className="rounded-full bg-indigo-500/30 px-2 py-0.5 backdrop-blur-sm">
              {t}
            </span>
          ))}
          <span className="ml-auto text-indigo-200/70">{formatDate(post.date)}</span>
        </div>
        <h3 className="text-xl font-semibold leading-tight text-white drop-shadow-sm">{post.title}</h3>
        {post.excerpt && (
          <p className="mt-1 text-sm text-indigo-100/90 line-clamp-2 drop-shadow-sm">{post.excerpt}</p>
        )}
      </div>
    </Link>
  );
}

export default function BlogIndex({ posts = [], siteUrl }) {
  const [activeTag, setActiveTag] = useState("All");
  const [limit, setLimit] = useState(12);

  const tags = useMemo(() => {
    const t = new Set(["All"]);
    posts.forEach((p) => (p.tags || []).forEach((x) => t.add(x)));
    return Array.from(t);
  }, [posts]);

  const filtered = useMemo(() => {
    const arr = activeTag === "All" ? posts : posts.filter((p) => p.tags?.includes(activeTag));
    return arr.slice(0, limit);
  }, [activeTag, limit, posts]);

  return (
    <>
      <Head>
        <title>Minutes AI Blog</title>
        <meta
          name="description"
          content="Learn how to run better meetings with AI. Workflows, updates, interviews, and articles from Minutes AI."
        />
        <link rel="canonical" href={`${siteUrl}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Minutes AI Blog" />
        <meta property="og:description" content="Learn how to run better meetings with AI. Workflows, updates, interviews, and articles." />
        <meta property="og:url" content={`${siteUrl}/blog`} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
      </Head>

      {/* 背景 */}
      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* 左上ホームアイコン（追従しない通常配置） */}
        <header className="mx-auto max-w-7xl px-6 pt-6">
          <Link
            href="/"
            aria-label="Back to Home"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-7xl px-6 pt-8 pb-10">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Minutes AI Blog</h1>
            <p className="mt-4 max-w-2xl text-indigo-100/90 text-lg">
              Learn how to run better meetings with AI. New workflows, interviews, and product updates.
            </p>

            {/* タグ */}
            <div className="mt-8 flex flex-wrap gap-3">
              {tags.map((t) => (
                <Badge key={t} active={activeTag === t} onClick={() => setActiveTag(t)}>
                  {t === "All" ? "All Tags" : t}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section>
          <div className="mx-auto max-w-7xl px-6 pb-16">
            {filtered.length === 0 ? (
              <p className="text-indigo-100/80">No posts yet. Come back soon.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((post) => (
                  <Card key={post.slug || post.title} post={post} />
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
                  Load more
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

/* ===== Build-time: read markdown from /content/blog ===== */
import fs from "fs";
import path from "path";
import matter from "gray-matter";

function toISO(v, fallbackNow = false) {
  if (!v && fallbackNow) return new Date().toISOString();
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? (fallbackNow ? new Date().toISOString() : null) : d.toISOString();
}

function tryReadFrontFromDir(dirPath, defaultLocale) {
  // 優先順：<既定ロケール>.mdx → .md → en.mdx → en.md → そのフォルダ内の最初の mdx/md
  const all = fs.readdirSync(dirPath);
  const candidates = [
    `${defaultLocale}.mdx`,
    `${defaultLocale}.md`,
    `en.mdx`,
    `en.md`,
    all.find((f) => /\.mdx$/i.test(f)),
    all.find((f) => /\.md$/i.test(f)),
  ].filter(Boolean);

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

export async function getStaticProps({ locale, defaultLocale }) {
  const contentDir = path.join(process.cwd(), "content", "blog");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
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

  /* 1) 直下の .md / .mdx（従来どおり） */
  for (const ent of ents.filter((e) => e.isFile())) {
    if (!/\.(md|mdx)$/i.test(ent.name)) continue;
    const filename = ent.name;
    const slug = filename.replace(/\.(md|mdx)$/i, "");
    const raw = fs.readFileSync(path.join(contentDir, filename), "utf8");
    const { data, content } = matter(raw);

    const title = (data.title || slug).toString();
    const norm = title.toLowerCase().replace(/\s+/g, " ").replace(/[?？]/g, "");
    const isIntroByTitle = norm === "what is minutes.ai" || norm === "what is minutes ai";
    const isIntroBySlug = slug === "hello-minutes-ai" || slug === "what-is-minutes-ai";

    const href =
      (typeof data.link === "string" && data.link.trim()) ||
      (isIntroByTitle || isIntroBySlug ? "/blog/introduction" : `/blog/${slug}`);

    pushPost({
      slug,
      title,
      date: toISO(data.date, true),          // ★ ISO文字列化（必須）
      updatedAt: toISO(data.updatedAt, false),
      excerpt: data.excerpt || (content ? content.slice(0, 180) : ""),
      coverImage: data.cover || null,
      tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ["Articles"],
      href,
    });
  }

  /* 2) サブディレクトリ（/businessnegotiation などの多言語MDXフォルダ） */
  const dLocale = defaultLocale || "en";
  for (const ent of ents.filter((e) => e.isDirectory())) {
    const dir = ent.name; // 例: "businessnegotiation", "onlinemeeting" 等
    const dirPath = path.join(contentDir, dir);

    const picked = tryReadFrontFromDir(dirPath, dLocale);
    if (!picked) continue;

    let { data, content } = picked;

    // Frontmatterが薄いときは i18n JSON（public/locales/<loc>/blog_<dir>.json）から補完
    let title = (data?.title || "").toString().trim();
    let excerpt = (data?.excerpt || "").toString().trim();
    try {
      if (!title || !excerpt) {
        const i18nJsonPath = path.join(
          process.cwd(),
          "public",
          "locales",
          dLocale,
          `blog_${dir}.json`
        );
        if (fs.existsSync(i18nJsonPath)) {
          const j = JSON.parse(fs.readFileSync(i18nJsonPath, "utf8"));
          title = title || j?.hero?.h1 || title;
          excerpt = excerpt || j?.hero?.tagline || excerpt;
        }
      }
    } catch {}

    const href = `/blog/${dir}`; // 専用ページに誘導

    pushPost({
      slug: dir,
      title: title || dir,
      date: toISO(data?.date, true),         // ★ ISO文字列化（必須）
      updatedAt: toISO(data?.updatedAt, false),
      excerpt: excerpt || (content ? content.slice(0, 180) : ""),
      coverImage: data?.cover || "/images/hero-phone.png",
      tags: Array.isArray(data?.tags) && data.tags.length ? data.tags : ["Articles"],
      href,
    });
  }

  /* 3) onlinemeeting を確実に掲載（content/blog/onlinemeeting が無い場合のフォールバック） */
  const hasOnlineMeeting = posts.some((p) => p.slug === "onlinemeeting" || p.href === "/blog/onlinemeeting");
  if (!hasOnlineMeeting) {
    try {
      const dLocale = defaultLocale || "en";
      const i18nJsonPath = path.join(process.cwd(), "public", "locales", dLocale, "blog_onlinemeeting.json");
      let title = "Online Meetings for Minutes.AI";
      let excerpt = "Click “Online”, issue a URL, share it, and you’re in. When you hang up, minutes start generating automatically.";
      if (fs.existsSync(i18nJsonPath)) {
        const j = JSON.parse(fs.readFileSync(i18nJsonPath, "utf8"));
        title = j?.hero?.h1 || title;
        excerpt = j?.hero?.tagline || excerpt;
      }
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
    } catch {}
  }

  // 新しい順
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { props: { posts, siteUrl }, revalidate: 600 };
}
