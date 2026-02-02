// src/pages/blog/flexible.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

// Icons
import { TbWorld, TbBrain, TbArrowsShuffle, TbListCheck, TbHierarchy2 } from "react-icons/tb";
import { BsGooglePlay, BsLightningChargeFill } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

// ★ 追加：日付を固定（ハイドレーションエラー＆SEO対策）
const PUBLISHED_DATE = "2025-12-03T10:00:00+09:00";
const MODIFIED_DATE = "2026-01-16T10:00:00+09:00";

/* ---------- English-first fallback (keys missing -> EN) ---------- */
const EN_FALLBACK = {
  seo: {
    title:
      "Meet 'Flexible': The Ultimate AI Meeting Format for Every Conversation | Minutes.AI",
    description:
      "Stop guessing which meeting format to use. Trusted by 30,000 users, 'Flexible' mode adapts instantly to organize your chaos into crystal-clear logic.",
    ogTitle: "One Format to Rule Them All: Meet Flexible Mode",
    ogDescription:
      "Chaos in, structure out. Discover why the 'Flexible' format is the smartest way to record meetings, interviews, and ideas.",
    ld: {
      headline: "The 'Flexible' Format: Perfect Minutes, Zero Setup",
      description:
        "An in-depth look at Minutes.AI's most versatile recording mode that adapts to any context.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", feature: "Feature Spotlight" },

  hero: {
    kicker: "Feature Spotlight",
    h1: "The Only Format You Really Need: Meet \"Flexible\"",
    // ★ 修正：実績を追加
    tagline:
      "General, Sales, Interview, Presentation... tired of choosing? We built 'Flexible' to end the decision fatigue. Trusted by over 30,000 users, it adapts to your conversation in real-time, turning any discussion into a masterpiece of logic.",
    subtag:
      "From chaotic brainstorms to structured interviews, Flexible captures the essence without you lifting a finger.",
    badges: ["Context-Aware", "Zero Config", "Universal Adapter"],
  },

  problem: {
    h2: "Analysis Paralysis is Real",
    p1: "Minutes.AI offers specialized formats like 'Sales', 'Lecture', and '1-on-1'. They are powerful, but sometimes life doesn't fit into a neat box.",
    p2: "Have you ever hesitated before hitting record? \"Is this a meeting or just a chat?\" \"It's kind of a lecture but also a brainstorm...\" Choosing the 'General' format often feels like a compromise that might result in a vague summary.",
    quote: "\"I just want it to work without thinking about settings.\"",
  },

  solution: {
    h2: "Chaos In, Structure Out",
    p1: "This is why we created **Flexible**. It is our smartest, most adaptive algorithm yet.",
    p2: "It doesn't assume the structure beforehand; it discovers it. Whether you are rambling to yourself to organize thoughts or arguing in a 5-person strategy meeting, Flexible detects the context and organizes the output logically.",
    highlights: [
      "**Context Detection**: Automatically identifies if it's a dialogue, a monologue, or a debate.",
      "**Smart Extraction**: Pulls out action items and decisions even from messy conversations.",
      "**Logical Flow**: Reorders scattered points into a coherent narrative.",
    ],
  },

  scenarios: {
    h2: "One Format, Infinite Possibilities",
    note: "See how 'Flexible' handles completely different scenarios seamlessly.",
    items: [
      {
        icon: "brain",
        title: "Solo Brain Dumping",
        desc: "Walking and talking to yourself? Flexible treats it like a structured memo, grouping your scattered ideas into clear headers.",
      },
      {
        icon: "shuffle",
        title: "Hybrid Meetings",
        desc: "Starts as a 'Check-in', turns into a 'Brainstorm', ends with 'Sales strategy'? Flexible tracks the shift and formats accordingly.",
      },
      {
        icon: "hierarchy",
        title: "Complex Interviews",
        desc: "Q&A sessions where topics jump around? Flexible regroups answers by topic, not just chronologically.",
      },
    ],
  },

  cta: {
    h2: "Seeing is Believing",
    text: "Don't just take our word for it. Join 30,000+ users on Minutes.AI, select 'Flexible', and start talking. Experience the magic of having your thoughts organized by a pro.",
    openBrowser: "Try Flexible Mode Web",
    downloadIOS: "Download iOS app",
  },

  meta: { h2: "Meta", published: "Published", type: "Feature", category: "Product Update" },
};

const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

// useTx hook with EN fallback
function useTx(ns) {
  const { t } = useTranslation(ns);

  const txs = (key, options) => {
    const val = t(key, options);
    if (typeof val === "string" && val === key) {
      const fb = getPath(EN_FALLBACK, key);
      if (typeof fb === "string") {
        if (options && typeof options === "object") {
          return Object.entries(options).reduce(
            (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
            fb
          );
        }
        return fb;
      }
      return key;
    }
    return val;
  };

  const txa = (key) => {
    const val = t(key, { returnObjects: true });
    if (Array.isArray(val) && val.length > 0) return val;

    const fb = getPath(EN_FALLBACK, key);
    if (Array.isArray(fb)) return fb;

    if (typeof val === "string" && val === key) return toArray(fb);
    if (typeof val === "object" && !Array.isArray(val)) return toArray(fb);

    return toArray(val);
  };

  return { txs, txa };
}

/* ---------- UI bits ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-block rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs tracking-wide text-fuchsia-200">
      {children}
    </span>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur " +
        "shadow-[0_10px_40px_rgba(86,77,255,0.12)] " +
        className
      }
    >
      {/* Decorative blobs customized for Flexible theme */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      {children}
    </section>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-xs text-indigo-100/90 border border-white/5">
      {children}
    </span>
  );
}

function Bullet({ children }) {
  return (
    <li className="pl-2 relative before:absolute before:left-0 before:top-2.5 before:h-[6px] before:w-[6px] before:rounded-full before:bg-cyan-400">
      {children}
    </li>
  );
}

function IconBox({ iconName }) {
  const size = 24;
  let Icon = BsLightningChargeFill;
  if (iconName === "brain") Icon = TbBrain;
  if (iconName === "shuffle") Icon = TbArrowsShuffle;
  if (iconName === "hierarchy") Icon = TbHierarchy2;

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
      <Icon size={size} />
    </div>
  );
}

/* ---------- CTA constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS = "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

/* ---------- Page ---------- */
export default function BlogFlexible({ canonicalPath = "/blog/flexible" }) {
  const router = useRouter();
  const { txs, txa } = useTx("blog_flexible");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}${canonicalPath}`;

  // SEO Logic
  const locales = i18nConfig?.i18n?.locales || ["en"];
  const altLinks = [
    { href: `${siteUrl}/blog/flexible`, lang: "x-default" },
    ...locales.map((lc) => ({
      href: `${siteUrl}${lc === i18nConfig.i18n.defaultLocale ? "" : `/${lc}`}/blog/flexible`,
      lang: lc === "ja" ? "ja-JP" : lc,
    })),
  ];

  const heroBadges = txa("hero.badges");
  const scenarioItems = txa("scenarios.items");
  const solutionHighlights = txa("solution.highlights");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        {altLinks.map((l, i) => (
          <link key={i} rel="alternate" href={l.href} hrefLang={l.lang} />
        ))}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/flexible-hero.png`} />

        {/* JSON-LDの日付を固定化 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              datePublished: PUBLISHED_DATE,
              dateModified: MODIFIED_DATE,
              mainEntityOfPage: canonical,
              author: { "@type": "Organization", name: "Minutes.AI" },
              publisher: { "@type": "Organization", name: "Minutes.AI", logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` } },
              description: txs("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_50%_-20%,rgba(56,189,248,.15),transparent),radial-gradient(800px_600px_at_0%_100%,rgba(168,85,247,.15),transparent)]`}
      >
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href={LINK_HOME}
            aria-label={txs("aria.home")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              {txs("nav.blog")}
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{txs("nav.feature")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-14 sm:pb-8">
            <div className="flex justify-start">
              <Kicker>{txs("hero.kicker")}</Kicker>
            </div>
            <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow-sm">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-7 text-indigo-100/90 max-w-2xl">
              {txs("hero.tagline")}
            </p>
            <p className="mt-2 text-sm leading-7 text-indigo-200/70 max-w-2xl">
              {txs("hero.subtag")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {heroBadges.map((b, i) => <Pill key={i}>{b}</Pill>)}
            </div>
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          
          {/* Problem: Analysis Paralysis */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-red-400/80 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {txs("problem.h2")}
              </h2>
            </div>
            <p className="text-base leading-7 text-indigo-100/90">{txs("problem.p1")}</p>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("problem.p2")}</p>
            
            <blockquote className="mt-6 border-l-2 border-indigo-500/30 pl-4 text-indigo-200 italic">
              {txs("problem.quote")}
            </blockquote>
          </SectionCard>

          {/* Solution: The Magic of Flexible */}
          <SectionCard className="mt-8 border-indigo-500/30 bg-indigo-500/5">
             <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-white">
                 <TbBrain size={18} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {txs("solution.h2")}
              </h2>
            </div>
            
            <p className="text-base leading-7 text-indigo-100/90">{txs("solution.p1")}</p>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("solution.p2")}</p>
            
            <ul className="mt-6 space-y-3 text-indigo-100/90">
              {solutionHighlights.map((h, i) => (
                <Bullet key={i}>{h}</Bullet>
              ))}
            </ul>
          </SectionCard>

          {/* Scenarios Grid */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {txs("scenarios.h2")}
            </h2>
            <p className="mt-2 text-sm text-indigo-200/80">{txs("scenarios.note")}</p>

            <div className="mt-6 grid grid-cols-1 gap-4">
              {scenarioItems.map((item, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-white/5 bg-black/20 p-4 transition hover:bg-black/30">
                  <div className="shrink-0">
                    <IconBox iconName={item.icon} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/90">{item.title}</h3>
                    <p className="mt-1 text-sm text-indigo-200/80 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* CTA */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-white">{txs("cta.h2")}</h2>
            <p className="mt-2 text-indigo-200/80 max-w-lg mx-auto">{txs("cta.text")}</p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {/* Browser */}
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-6 py-3 text-base font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.5)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
              >
                <TbWorld className="text-xl text-indigo-200 group-hover:text-white" />
                <span>{txs("cta.openBrowser")}</span>
              </Link>

              {/* App Store */}
              <a
                href={LINK_IOS}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-6 py-3 text-base font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.5)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
              >
                <FaAppStore className="text-xl text-sky-200 group-hover:text-white" />
                <span>iOS</span>
              </a>

               {/* Google Play */}
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-6 py-3 text-base font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.5)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
                >
                  <BsGooglePlay className="text-xl text-emerald-200 group-hover:text-white" />
                  <span>Android</span>
                </a>
            </div>
          </div>

          {/* Meta Info */}
          <div className="mt-16 border-t border-white/10 pt-6 flex flex-wrap gap-2 text-xs text-indigo-200/50">
             <span>
               {txs("meta.published")}:{" "}
               {/* 日付表示を安全に（固定定数を使用） */}
               {new Date(PUBLISHED_DATE).toLocaleDateString(router.locale || "ja-JP", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit"
               })}
             </span>
             <span>•</span>
             <span>{txs("meta.category")}</span>
          </div>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_flexible"], i18nConfig)),
    },
  };
}