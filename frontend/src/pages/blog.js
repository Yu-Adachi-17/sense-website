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
    desc: "用AI开好每一次会议。工作流程、更新、采访与文章。",
    heroP: "用AI提升会议质量。新的工作流程、采访与产品更新。",
    allTags: "全部标签",
    loadMore: "加载更多",
    noPosts: "暂无文章，敬请期待。",
    backHome: "返回首页",
  },

  /* ----- Added locales ----- */
  ar: {
    title: "مدوّنة ‎Minutes.AI",
    desc:
      "تعلّم كيف تدير اجتماعات أفضل بالذكاء الاصطناعي. سير عمل، تحديثات، مقابلات، ومقالات من ‎Minutes.AI.",
    heroP:
      "طوّر اجتماعاتك بالذكاء الاصطناعي. سير عمل جديدة، مقابلات، وتحديثات المنتج.",
    allTags: "كل الوسوم",
    loadMore: "اعرض المزيد",
    noPosts: "لا توجد مقالات بعد. عد لاحقًا.",
    backHome: "العودة إلى الصفحة الرئيسية",
  },
  da: {
    title: "Referat AI Blog",
    desc:
      "Lær at holde bedre møder med AI. Arbejdsgange, opdateringer, interviews og artikler fra Referat AI.",
    heroP:
      "Bliv bedre til møder med AI. Nye arbejdsgange, interviews og produktnyheder.",
    allTags: "Alle tags",
    loadMore: "Indlæs mere",
    noPosts: "Ingen indlæg endnu. Kig forbi snart.",
    backHome: "Til forsiden",
  },
  de: {
    title: "Protokoll KI Blog",
    desc:
      "Lernen Sie, bessere Meetings mit KI durchzuführen. Workflows, Updates, Interviews und Artikel von Protokoll KI.",
    heroP:
      "Bessere Meetings mit KI. Neue Workflows, Interviews und Produkt-Updates.",
    allTags: "Alle Tags",
    loadMore: "Mehr laden",
    noPosts: "Noch keine Beiträge. Schauen Sie bald wieder vorbei.",
    backHome: "Zur Startseite",
  },
  "es-ES": {
    title: "Blog de Actas IA",
    desc:
      "Aprende a dirigir mejores reuniones con IA. Flujos de trabajo, novedades, entrevistas y artículos de Actas IA.",
    heroP:
      "Reuniones mejores con IA. Nuevos flujos, entrevistas y actualizaciones del producto.",
    allTags: "Todas las etiquetas",
    loadMore: "Cargar más",
    noPosts: "Aún no hay artículos. Vuelve pronto.",
    backHome: "Volver al inicio",
  },
  "es-MX": {
    title: "Blog de Actas IA",
    desc:
      "Aprende a llevar reuniones más efectivas con IA. Flujos de trabajo, actualizaciones, entrevistas y artículos de Actas IA.",
    heroP:
      "Mejora tus reuniones con IA. Nuevos flujos, entrevistas y novedades del producto.",
    allTags: "Todas las etiquetas",
    loadMore: "Cargar más",
    noPosts: "Todavía no hay artículos. Vuelve pronto.",
    backHome: "Volver al inicio",
  },
  fr: {
    title: "Blog Minutes.AI",
    desc:
      "Apprenez à mieux conduire vos réunions avec l’IA. Parcours, mises à jour, interviews et articles de Minutes.AI.",
    heroP:
      "Améliorez vos réunions avec l’IA. Nouveaux parcours, interviews et mises à jour produit.",
    allTags: "Toutes les étiquettes",
    loadMore: "Charger plus",
    noPosts: "Aucun article pour le moment. Revenez bientôt.",
    backHome: "Retour à l’accueil",
  },
  id: {
    title: "Blog Minutes AI",
    desc:
      "Pelajari cara menjalankan rapat yang lebih baik dengan AI. Alur kerja, pembaruan, wawancara, dan artikel dari Minutes AI.",
    heroP:
      "Tingkatkan rapat Anda dengan AI. Alur baru, wawancara, dan pembaruan produk.",
    allTags: "Semua tag",
    loadMore: "Muat lebih banyak",
    noPosts: "Belum ada artikel. Kunjungi lagi nanti.",
    backHome: "Kembali ke Beranda",
  },
  ko: {
    title: "회의록AI 블로그",
    desc:
      "AI로 더 나은 회의를 운영하세요. 회의 흐름, 업데이트, 인터뷰, 그리고 회의록AI의 기사들을 제공합니다.",
    heroP:
      "AI로 회의를 더 좋게. 새로운 워크플로우, 인터뷰, 제품 업데이트.",
    allTags: "모든 태그",
    loadMore: "더 보기",
    noPosts: "아직 게시물이 없습니다. 곧 다시 방문해 주세요.",
    backHome: "홈으로",
  },
  ms: {
    title: "Blog Minit AI",
    desc:
      "Pelajari cara mengendalikan mesyuarat yang lebih baik dengan AI. Aliran kerja, kemas kini, temu bual dan artikel daripada Minit AI.",
    heroP:
      "Perbaiki mesyuarat anda dengan AI. Aliran baharu, temu bual dan kemas kini produk.",
    allTags: "Semua tag",
    loadMore: "Muat lagi",
    noPosts: "Belum ada artikel. Datang semula nanti.",
    backHome: "Kembali ke Laman Utama",
  },
  nl: {
    title: "Notulen AI Blog",
    desc:
      "Leer betere vergaderingen houden met AI. Workflows, updates, interviews en artikelen van Notulen AI.",
    heroP:
      "Betere vergaderingen met AI. Nieuwe workflows, interviews en productupdates.",
    allTags: "Alle tags",
    loadMore: "Meer laden",
    noPosts: "Nog geen artikelen. Kom later terug.",
    backHome: "Terug naar home",
  },
  // 既存の nb を保持（フォルダは no でも、実行時 locale が nb のケースに対応）
  nb: {
    title: "Referat AI Blogg",
    desc:
      "Lær å holde bedre møter med AI. Arbeidsflyter, oppdateringer, intervjuer og artikler fra Referat AI.",
    heroP:
      "Bli bedre på møter med AI. Nye arbeidsflyter, intervjuer og produktoppdateringer.",
    allTags: "Alle tagger",
    loadMore: "Vis mer",
    noPosts: "Ingen innlegg ennå. Kom tilbake snart.",
    backHome: "Tilbake til forsiden",
  },
  no: {
    title: "Referat AI Blogg",
    desc:
      "Lær å holde bedre møter med AI. Arbeidsflyter, oppdateringer, intervjuer og artikler fra Referat AI.",
    heroP:
      "Bli bedre på møter med AI. Nye arbeidsflyter, intervjuer og produktoppdateringer.",
    allTags: "Alle tagger",
    loadMore: "Vis mer",
    noPosts: "Ingen innlegg ennå. Kom tilbake snart.",
    backHome: "Tilbake til forsiden",
  },
  "pt-BR": {
    title: "Blog do Ata AI",
    desc:
      "Aprenda a conduzir reuniões melhores com IA. Fluxos de trabalho, atualizações, entrevistas e artigos do Ata AI.",
    heroP:
      "Reuniões melhores com IA. Novos fluxos, entrevistas e atualizações do produto.",
    allTags: "Todas as tags",
    loadMore: "Carregar mais",
    noPosts: "Ainda não há artigos. Volte em breve.",
    backHome: "Voltar para a Página Inicial",
  },
  "pt-PT": {
    title: "Blog do Ata AI",
    desc:
      "Aprenda a conduzir reuniões melhores com IA. Fluxos de trabalho, atualizações, entrevistas e artigos do Ata AI.",
    heroP:
      "Reuniões melhores com IA. Novos fluxos, entrevistas e novidades do produto.",
    allTags: "Todas as etiquetas",
    loadMore: "Carregar mais",
    noPosts: "Ainda não há artigos. Volte em breve.",
    backHome: "Voltar à Página Inicial",
  },
  sv: {
    title: "Protokoll AI Blogg",
    desc:
      "Lär dig hålla bättre möten med AI. Arbetsflöden, uppdateringar, intervjuer och artiklar från Protokoll AI.",
    heroP:
      "Bättre möten med AI. Nya arbetsflöden, intervjuer och produktuppdateringar.",
    allTags: "Alla taggar",
    loadMore: "Ladda mer",
    noPosts: "Inga inlägg ännu. Kom tillbaka snart.",
    backHome: "Tillbaka hem",
  },
  tr: {
    title: "Tutanakları AI Blogu",
    desc:
      "Yapay zekâ ile daha iyi toplantılar yapın. İş akışları, güncellemeler, röportajlar ve Tutanakları AI’dan makaleler.",
    heroP:
      "Toplantılarınızı yapay zekâ ile geliştirin. Yeni iş akışları, röportajlar ve ürün güncellemeleri.",
    allTags: "Tüm etiketler",
    loadMore: "Daha fazlası",
    noPosts: "Henüz yazı yok. Yakında tekrar bakın.",
    backHome: "Ana sayfaya dön",
  },
  "zh-TW": {
    title: "會議紀錄AI 部落格",
    desc:
      "用 AI 讓每場會議更有效。工作流程、最新消息、訪談與文章。",
    heroP:
      "用 AI 提升會議品質。全新工作流程、訪談與產品更新。",
    allTags: "全部標籤",
    loadMore: "載入更多",
    noPosts: "尚無文章，敬請期待。",
    backHome: "返回首頁",
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

/* ===== Hydration-safe locale handling for dates ===== */
function localeWithExtensions(loc) {
  if (!loc) return undefined;
  const base = String(loc).replace(/-u-.*$/i, ""); // strip existing -u- extensions
  // Use gregorian calendar + latin digits to keep SSR/CSR consistent.
  // If you want Eastern Arabic numerals, change nu-latn -> nu-arab.
  return `${base}-u-ca-gregory-nu-latn`;
}

function formatDate(d, locale) {
  if (!d) return "";
  try {
    const date = new Date(d);
    const normalized = localeWithExtensions(locale || undefined);
    return new Intl.DateTimeFormat(normalized, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return d;
  }
}

function Card({ post, locale }) {
  const safeHref =
    typeof post?.href === "string" ? post.href : `/blog/${post?.slug || ""}`;

  // 画像フォールバック順：post.coverImage -> 既定
  const FALLBACK_IMG = "/images/General03.jpeg";
  const coverSrc = post.coverImage || FALLBACK_IMG;

  return (
    <Link
      href={safeHref}
      className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition-colors hover:bg-white/10"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={post.title}
          src={coverSrc}
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
          <span className="ml-auto text-indigo-200/70" suppressHydrationWarning>
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

  // OG画像はサイト共通サムネに更新
  const OG_IMG = `${siteUrl}/images/General03.jpeg`;

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
        <meta property="og:image" content={OG_IMG} />
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

    // cover または image のどちらかを採用
    const coverImage = data.cover || data.image || null;

    pushPost({
      slug,
      title,
      date: toISO(data.date, true),
      updatedAt: toISO(data.updatedAt, false),
      excerpt: data.excerpt || (content ? content.slice(0, 180) : ""),
      coverImage,
      tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ["Articles"],
      href,
    });
  }

  /* 2) サブディレクトリ（/businessnegotiation 等, ここに /aimodel も含まれる） */
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

    // cover -> image -> 既定の順で決定
    const coverImage =
      data?.cover || data?.image || "/images/General03.jpeg";

    pushPost({
      slug: dir,
      title,
      date: toISO(data?.date, true),
      updatedAt: toISO(data?.updatedAt, false),
      excerpt: excerpt || (content ? content.slice(0, 180) : ""),
      coverImage,
      tags: Array.isArray(data?.tags) && data.length ? data.tags : ["Articles"],
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
