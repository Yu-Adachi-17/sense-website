import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

// ---- Small UI bits ----
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

function Card({ post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
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
        {/* overlay */}
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
        <h3 className="text-xl font-semibold leading-tight text-white drop-shadow-sm">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1 text-sm text-indigo-100/90 line-clamp-2 drop-shadow-sm">{post.excerpt}</p>
        )}
      </div>
    </Link>
  );
}

function formatDate(d) {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export default function BlogIndex({ posts = [], siteUrl }) {
  const [activeTag, setActiveTag] = useState("All");
  const [limit, setLimit] = useState(12);

  const tags = useMemo(() => {
    const t = new Set(["All"]);
    posts.forEach((p) => (p.tags || []).forEach((x) => t.add(x)));
    // 並びを安定
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
        <meta name="description" content="Learn how to run better meetings with AI. Workflows, updates, interviews, and articles from Minutes AI." />
        <link rel="canonical" href={`${siteUrl}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Minutes AI Blog" />
        <meta property="og:description" content="Learn how to run better meetings with AI. Workflows, updates, interviews, and articles." />
        <meta property="og:url" content={`${siteUrl}/blog`} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Blog",
              name: "Minutes AI Blog",
              url: `${siteUrl}/blog`,
              blogPost: posts.slice(0, 10).map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                datePublished: p.date,
                dateModified: p.updatedAt || p.date,
                url: `${siteUrl}/blog/${p.slug}`,
                image: p.coverImage ? [p.coverImage] : undefined,
                description: p.excerpt,
              })),
            }),
          }}
        />
      </Head>

      {/* Background */}
      <div className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}>
        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-7xl px-6 pt-20 pb-10">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Minutes AI Blog</h1>
            <p className="mt-4 max-w-2xl text-indigo-100/90 text-lg">
              Learn how to run better meetings with AI. New workflows, interviews, and product updates.
            </p>

            {/* Tag filters */}
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
                  <Card key={post.slug} post={post} />
                ))}
              </div>
            )}

            {/* Load more */}
            {limit < (activeTag === "All" ? posts.length : posts.filter((p) => p.tags?.includes(activeTag)).length) && (
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

// --- Build-time data: read markdown frontmatter from /content/blog ---
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function getStaticProps() {
  const contentDir = path.join(process.cwd(), "content", "blog");
  let posts = [];
  try {
    const files = fs.existsSync(contentDir) ? fs.readdirSync(contentDir) : [];
    posts = files
      .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
      .map((filename) => {
        const slug = filename.replace(/\.(md|mdx)$/i, "");
        const raw = fs.readFileSync(path.join(contentDir, filename), "utf8");
        const { data, content } = matter(raw);
        return {
          slug,
          title: data.title || slug,
          date: data.date || new Date().toISOString(),
          updatedAt: data.updatedAt || null,
          excerpt: data.excerpt || (content ? content.slice(0, 180) : ""),
          coverImage: data.cover || null,
          tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ["Articles"],
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (e) {
    // no posts yet; keep empty
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";

  return {
    props: { posts, siteUrl },
    revalidate: 600,
  };
}
