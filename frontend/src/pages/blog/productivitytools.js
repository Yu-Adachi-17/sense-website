// src/pages/blog/productivitytools.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import { TbWorld, TbBulb, TbSearch, TbPalette, TbNotes } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

// ★ 追加：日付を固定（SEO/ハイドレーションエラー対策）
const PUBLISHED_DATE = "2025-12-02T10:00:00+09:00";
const MODIFIED_DATE = "2025-12-06T10:00:00+09:00";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Top 5 Productivity AI Tools You Need in 2025",
    description:
      "Stop juggling generic tools. Here are the 5 essential AI apps for text, research, design, and meetings that will actually save you time in 2025. Featuring Minutes.AI, trusted by 30,000 users.",
    ogTitle: "The 5 Best Productivity AI Tools (2025 Edition)",
    ogDescription:
      "ChatGPT is not enough. We curated the perfect AI stack: One for writing, one for research, one for design, and Minutes.AI for meetings.",
    ld: {
      headline: "Top 5 Productivity AI Tools for 2025",
      description:
        "A curated list of the best AI tools including ChatGPT, Notion, Perplexity, Canva, and Minutes.AI.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", current: "Top 5 AI Tools" },

  hero: {
    kicker: "2025 Productivity Stack",
    h1: "The 5 Best AI Tools to Automate Your Workday (2025)",
    // ★ 修正：実績を追加
    tagline:
      "Using AI isn't just about ChatGPT anymore. To truly boost productivity, you need the right specialist for each task. Here is the ultimate stack for writing, researching, designing, and—most importantly—meetings (featuring Minutes.AI, trusted by 30,000 users).",
  },

  intro: {
    p: "We tested dozens of apps to find the ones that seamlessly fit into a professional workflow. These aren't just toys; they are tools that pay for themselves in saved time.",
  },

  // The Big 4 Tools (General High-Volume Keywords)
  tools: [
    {
      name: "1. ChatGPT (o1/GPT-4o)",
      role: "Best for: Ideation & Drafting",
      desc: "The undisputed king of generative text. Whether you need to draft an email, debug code, or brainstorm marketing angles, ChatGPT remains the most versatile starting point.",
      icon: "bulb",
      color: "text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      name: "2. Notion AI",
      role: "Best for: Knowledge & Docs",
      desc: "Notion is where your team's knowledge lives. Notion AI acts as a smart librarian, letting you summarize huge wikis, auto-fill database properties, and rewrite messy notes instantly.",
      icon: "notes",
      color: "text-neutral-300",
      bg: "bg-neutral-500/10",
      border: "border-neutral-500/20"
    },
    {
      name: "3. Perplexity",
      role: "Best for: Research & Search",
      desc: "Stop Googling and opening ten tabs. Perplexity scans the web and gives you a cited, summarized answer. It’s the fastest way to verify facts or research competitors.",
      icon: "search",
      color: "text-cyan-300",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    },
    {
      name: "4. Canva (Magic Studio)",
      role: "Best for: Visuals & Slides",
      desc: "You don't need to be a designer. Canva's AI features let you generate images, resize assets for social media, and even build entire slide decks from a text prompt.",
      icon: "palette",
      color: "text-fuchsia-300",
      bg: "bg-fuchsia-500/10",
      border: "border-fuchsia-500/20"
    },
  ],

  // The 5th Tool (Your Product - The "Hidden Gem" Pitch)
  spotlight: {
    label: "5. The Meeting Specialist",
    h2: "Minutes.AI (The Best Choice for Audio)",
    lead: "While the tools above handle text and visuals, your meetings are often the biggest productivity leak. This is where Minutes.AI shines.",
    reasons: [
      {
        title: "Why it makes the list:",
        text: "Most people still take notes manually while trying to listen. Minutes.AI records, transcribes, and summarizes simultaneously, so you can actually focus on the conversation."
      },
      {
        title: "Killer Feature:",
        text: "<strong>Flexible Pricing.</strong> Unlike most enterprise tools that demand $30/month, Minutes.AI offers non-expiring Time Packs (starting at $1.99). Perfect if you don't have meetings every single day."
      },
      {
        title: "Best For:",
        text: "Freelancers, Project Managers, and anyone tired of writing meeting minutes after the call ends."
      }
    ]
  },

  cta: {
    h2: "Ready to complete your AI stack?",
    p: "Don't let meetings be the only manual part of your day. Try the Minutes.AI iPhone app.",
    openBrowser: "Open in browser",
    downloadIOS: "Download iOS app",
  },
  
  meta: { h2: "Meta", published: "Published", type: "Roundup", category: "Productivity" },
};
/* ---------- end of fallback block ---------- */

/* ---------- Helpers ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

function useTx(ns) {
  const { t } = useTranslation(ns);
  const txs = (key) => {
    const val = t(key);
    if (typeof val === "string" && val === key) {
      const fb = getPath(EN_FALLBACK, key);
      return typeof fb === "string" ? fb : key;
    }
    return val;
  };
  const txa = (key) => {
    const val = t(key, { returnObjects: true });
    if (Array.isArray(val)) return val;
    const fb = getPath(EN_FALLBACK, key);
    return toArray(fb);
  };
  return { txs, txa };
}

/* ---------- UI Components ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs tracking-wide text-indigo-100/90">
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
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      {children}
    </section>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-xs text-indigo-100/90">
      {children}
    </span>
  );
}

function ToolIcon({ name, className }) {
  switch (name) {
    case "bulb": return <TbBulb className={className} size={32} />;
    case "search": return <TbSearch className={className} size={32} />;
    case "palette": return <TbPalette className={className} size={32} />;
    case "notes": return <TbNotes className={className} size={32} />;
    default: return <TbBulb className={className} size={32} />;
  }
}

/* ---------- CTA link constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS = "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

export default function BlogProductivityTools() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_productivitytools");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/productivitytools";

  const toolList = txa("tools");
  const spotlightReasons = txa("spotlight.reasons");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/mainscreen.png`} />

        {/* JSON-LDの日付を固定化 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              description: txs("seo.ld.description"),
              datePublished: PUBLISHED_DATE,
              dateModified: MODIFIED_DATE,
              mainEntityOfPage: canonical,
              author: { "@type": "Organization", name: "Minutes.AI" },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` },
              },
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
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
            <span className="text-indigo-100">{txs("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">{txs("hero.tagline")}</p>
          </div>
        </section>

        <main className="mx-auto max-w-3xl px-6 pb-20">
          <SectionCard>
            <p className="text-base leading-7 text-indigo-100/90">{txs("intro.p")}</p>
          </SectionCard>

          {/* The Big 4 Tools Grid */}
          <div className="mt-8 grid gap-6 sm:grid-cols-1">
            {toolList.map((tool, i) => (
              <div 
                key={i} 
                className={`group relative overflow-hidden rounded-2xl border bg-black/20 p-6 backdrop-blur transition hover:bg-white/[0.07] ${tool.border || 'border-white/10'}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl p-3 ${tool.bg || 'bg-white/10'}`}>
                    <ToolIcon name={tool.icon} className={tool.color || 'text-white'} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{tool.name}</h3>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${tool.color || 'text-indigo-300'} mt-1`}>
                        {tool.role}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-indigo-100/80">
                        {tool.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SPOTLIGHT SECTION: Minutes.AI */}
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-indigo-500/50"></div>
                <span className="text-sm font-semibold uppercase tracking-widest text-indigo-300">{txs("spotlight.label")}</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-indigo-500/50"></div>
            </div>

            <SectionCard className="border-indigo-500/30 bg-indigo-900/10 shadow-[0_0_50px_rgba(79,70,229,0.15)]">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">{txs("spotlight.h2")}</h2>
                        <p className="mt-3 text-indigo-100/90 leading-relaxed">
                            {txs("spotlight.lead")}
                        </p>
                        
                        <div className="mt-6 space-y-4">
                            {spotlightReasons.map((r, i) => (
                                <div key={i} className="rounded-xl bg-white/5 p-4 border border-white/5">
                                    <h4 className="text-sm font-bold text-indigo-200">{r.title}</h4>
                                    <p className="mt-1 text-sm text-indigo-100/80" dangerouslySetInnerHTML={{__html: r.text}} />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Visual for App */}
                    <div className="w-full sm:w-1/3 flex-shrink-0">
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-2 shadow-2xl">
                             <img
                                src="/images/mainscreen.png"
                                alt="Minutes.AI App Screen"
                                className="w-full rounded-xl"
                                loading="lazy"
                            />
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                            <a
                                href={LINK_IOS}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 rounded-lg bg-white text-indigo-950 px-3 py-2 text-xs font-bold hover:bg-indigo-50"
                            >
                                <FaAppStore size={16} /> iOS Download
                            </a>
                             <a
                                href={PLAY_STORE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 rounded-lg bg-white/10 text-white border border-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
                            >
                                <BsGooglePlay size={16} /> Android
                            </a>
                        </div>
                    </div>
                </div>
            </SectionCard>
          </div>

          {/* CTA / Conclusion */}
          <SectionCard className="mt-12 text-center">
            <h2 className="text-2xl font-bold">{txs("cta.h2")}</h2>
            <p className="mt-2 text-indigo-200">{txs("cta.p")}</p>
             <div className="mt-6 flex justify-center flex-wrap gap-4">
                <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-5 py-3 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
                >
                <TbWorld className="text-lg text-indigo-200 group-hover:text-white" />
                <span>{txs("cta.openBrowser")}</span>
                </Link>
            </div>
          </SectionCard>


          {/* Meta */}
          <div className="mt-12 text-center">
            <div className="flex flex-wrap justify-center gap-2 text-sm text-indigo-100/50">
              <Pill>
                {txs("meta.published")}:{" "}
                {/* ★ 日付を固定化（ハイドレーションエラー回避） */}
                {new Date(PUBLISHED_DATE).toLocaleDateString(router.locale || "ja-JP", {
                  year: "numeric",
                  month: "short",
                })}
              </Pill>
              <Pill>{txs("meta.category")}</Pill>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_productivitytools"], i18nConfig)),
    },
  };
}