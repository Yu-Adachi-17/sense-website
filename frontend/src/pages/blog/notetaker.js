// src/pages/blog/notetaker.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import * as React from "react";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

import { TbWorld, TbCheck, TbCpu, TbCoin } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

// ★ 追加：日付を固定（SEO/ハイドレーションエラー対策）
const PUBLISHED_DATE = "2025-11-28T10:00:00+09:00";
const MODIFIED_DATE = "2026-01-03T10:00:00+09:00";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Currency / Logic Setup ---------- */
const FX = { EUR_PER_USD: 0.92 };

const formatMoney = (amountUSD, currency) => {
  let value = amountUSD;
  if (currency === "EUR") value = amountUSD * FX.EUR_PER_USD;
  const code = currency === "EUR" ? "EUR" : "USD";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(value);
};

const guessCurrency = () => {
  const lang = typeof navigator !== "undefined" ? navigator.language : "en-US";
  if (lang.match(/^(de|fr|es|it|nl|nb|pt|fi|sv|da|pl|cs|sk|hu|ro|el)/)) return "EUR";
  return "USD";
};

/* ---------- Content Configuration (English Fallback) ---------- */
/* Key Strategy: 
   Mix "Features" and "Pricing" naturally, heavily optimizing for the keyword "Note Taker".
*/
const EN_FALLBACK = {
  seo: {
    title: "(2026) The Best AI Note Taker: Pricing & Features Review | Minutes.AI",
    description:
      "Searching for 'note taker pricing'? Trusted by 30,000 users, Minutes.AI offers the most structured notes and flexible costs. From $1.99 packs to unlimited plans.",
    ogTitle: "The Best AI Note Taker (2026): Pricing & Features",
    ogDescription:
      "Don't overpay for subscriptions you don't use. Minutes.AI is the note taker that fits your schedule and budget. See full pricing.",
    ld: {
      headline: "The Best AI Note Taker: Pricing & Features",
      description:
        "A complete guide to Minutes.AI capabilities and pricing. The only note taker offering both non-expiring time packs and unlimited subscriptions.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", active: "Note Taker Guide" },

  hero: {
    kicker: "2026 Note Taker Guide",
    h1: "The AI Meeting Note Taker That Actually Fits Your Budget",
    // ★ 修正：実績を追加
    tagline:
      "You need a professional note taker, not just a recorder. Chosen by over 30,000 users, Minutes.AI combines structured, readable minutes with the market's most flexible pricing model.",
    badges: ["AI Note Taker", "Flexible Pricing", "iOS & Web"],
  },

  // SECTION 1: The "Note Taker" Capability
  features: {
    h2: "What makes a pro 'Note Taker'?",
    lead: "A standard recorder just gives you text. A true AI Note Taker like Minutes.AI gives you clarity. Here is how it handles your meetings.",
    cards: [
      {
        icon: "structure",
        title: "It Structures Chaos",
        desc: "The AI listens to messy conversations and instantly organizes them into clear topics. No walls of text.",
      },
      {
        icon: "action",
        title: "It Captures Decisions",
        desc: "The primary job of a note taker is to track 'Who does What'. Minutes.AI extracts action items automatically.",
      },
      {
        icon: "strategy",
        title: "It Thinks Ahead",
        desc: "Using Gemini 2.5 & GPT-5 logic, it suggests strategic next steps based on the meeting context.",
      },
    ],
  },

  // SECTION 2: The "Note Taker" Pricing (The core SEO target)
  pricing: {
    h2: "AI Note Taker Pricing: Pay for What You Use",
    lead: "Most note takers force you into expensive monthly contracts. Minutes.AI is different. We offer a 'Pay-as-you-go' model alongside unlimited plans.",
    toggleLabel: "Show prices in:",
    options: [
      {
        type: "Occasional User",
        title: "Time Packs",
        price: "Starts at $1.99",
        desc: "Perfect if you have few meetings. Buy minutes that **NEVER expire**.",
        highlight: "No monthly fees",
      },
      {
        type: "Power User",
        title: "Unlimited Sub",
        price: "$16.99 / mo",
        desc: "For daily meeting pros. Record as much as you want without limits.",
        highlight: "Best value",
      },
    ],
    cta: "See Full Pricing Table",
  },

  // SECTION 3: Comparison
  compare: {
    h2: "Minutes.AI vs. Standard Note Takers",
    th: ["Feature", "Standard Apps", "Minutes.AI"],
    rows: [
      ["Pricing Model", "Use it or lose it (Monthly reset)", "Flexible (Non-expiring packs available)"],
      ["Output Quality", "Often just a transcript", "Structured, Action-Oriented Minutes"],
      ["Platform", "Web focused", "Native iOS App + Web"],
    ],
  },

  faq: {
    h2: "FAQ: AI Note Taker Questions",
    items: [
      {
        q: "Is there a free AI note taker option?",
        a: "Yes! Minutes.AI gives you a **free 3-minute ticket every single day**. Perfect for quick memos or testing the quality.",
      },
      {
        q: "How does the 'Time Pack' pricing work?",
        a: "Unlike other note takers, our Time Packs (e.g., 120 mins for $1.99) **never expire**. You can buy them today and use them next month. You only pay for the time you need.",
      },
      {
        q: "Can this note taker handle multiple languages?",
        a: "Absolutely. Minutes.AI supports over 100 languages, making it an ideal global note taker.",
      },
    ],
  },

  meta: { published: "Published", category: "Guide" },
  cta: { openBrowser: "Open in browser", downloadIOS: "Download iOS app" },
};

/* ---------- Helpers & Hooks ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

function useTx(ns) {
  const { t } = useTranslation(ns);
  const txs = (key, options) => {
    const val = t(key, options);
    if (typeof val === "string" && val === key) {
      const fb = getPath(EN_FALLBACK, key);
      // Simple string interpolation for currency if needed
      if (typeof fb === "string" && options) {
         return Object.entries(options).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), fb);
      }
      return typeof fb === "string" ? fb : key;
    }
    return val;
  };
  const txa = (key) => {
    const val = t(key, { returnObjects: true });
    if (Array.isArray(val) && val.length > 0) return val;
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

/* ---------- Icons Mapping ---------- */
const Icons = {
  structure: TbCpu,
  action: TbCheck,
  strategy: TbWorld, // abstract rep
};

/* ---------- Page Component ---------- */
export default function BlogNoteTaker() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_notetaker");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/notetaker`;

  // Currency State
  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => {
    setCurrency(guessCurrency());
  }, []);

  const features = txa("features.cards");
  const priceOptions = txa("pricing.options");
  const compareRows = txa("compare.rows");
  const faqItems = txa("faq.items");

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
        <meta property="og:image" content={`${siteUrl}/images/pricing-hero.png`} />

        {/* Structured Data: FAQ & Article */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Article",
                  headline: txs("seo.ld.headline"),
                  description: txs("seo.ld.description"),
                  datePublished: PUBLISHED_DATE,
                  dateModified: MODIFIED_DATE,
                  author: { "@type": "Organization", name: "Minutes.AI" },
                  image: [`${siteUrl}/images/pricing-hero.png`],
                },
                {
                  "@type": "FAQPage",
                  mainEntity: faqItems.map(f => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a }
                  }))
                }
              ]
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href="/home"
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
            <span className="text-indigo-100">{txs("nav.active")}</span>
          </nav>
        </header>

        {/* HERO: Note Taker Focus */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">
              {txs("hero.tagline")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {txa("hero.badges").map((b, i) => (
                <Pill key={i}>{b}</Pill>
              ))}
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-3xl px-6 pb-20">
          
          {/* SECTION 1: Features (Why this Note Taker?) */}
          <SectionCard>
            <h2 className="text-2xl font-bold tracking-tight">{txs("features.h2")}</h2>
            <p className="mt-2 text-indigo-100/90">{txs("features.lead")}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {features.map((card, i) => {
                const Icon = Icons[card.icon] || TbCpu;
                return (
                  <div key={i} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <Icon className="text-2xl text-indigo-300 mb-2" />
                    <h3 className="text-sm font-bold text-white">{card.title}</h3>
                    <p className="mt-1 text-xs text-indigo-200/70 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* SECTION 2: Pricing (SEO Target) */}
          <SectionCard className="mt-8 border-indigo-500/30 bg-indigo-900/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{txs("pricing.h2")}</h2>
                <p className="mt-2 text-sm text-indigo-100/90 max-w-lg">{txs("pricing.lead")}</p>
              </div>
              
              {/* Currency Toggle */}
              <div className="shrink-0 flex items-center gap-2 rounded-lg bg-black/30 p-1">
                <span className="ml-2 text-[10px] uppercase text-indigo-300">{txs("pricing.toggleLabel")}</span>
                {["USD", "EUR"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2 py-1 text-xs rounded-md transition ${
                      currency === c ? "bg-white/20 text-white font-bold" : "text-indigo-300 hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {/* Option 1: Time Pack */}
              <div className="relative rounded-2xl border border-white/10 bg-black/40 p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-sky-300">
                  {priceOptions[0]?.type}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {priceOptions[0]?.price === "Starts at $1.99" 
                    ? `Starts at ${formatMoney(1.99, currency)}` 
                    : priceOptions[0]?.price}
                </div>
                <div className="mt-1 text-lg font-semibold text-indigo-100">{priceOptions[0]?.title}</div>
                <p className="mt-2 text-sm text-indigo-200/80">{priceOptions[0]?.desc}</p>
                <div className="mt-4 inline-block rounded-md bg-sky-500/20 px-2 py-1 text-xs text-sky-200 border border-sky-500/30">
                  {priceOptions[0]?.highlight}
                </div>
              </div>

              {/* Option 2: Subscription */}
              <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-900/20 to-black/40 p-5">
                <div className="absolute top-0 right-0 rounded-bl-xl bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-300 border-b border-l border-emerald-500/30">
                  RECOMMENDED
                </div>
                <div className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                  {priceOptions[1]?.type}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {formatMoney(16.99, currency)} <span className="text-sm font-normal text-white/50">/ mo</span>
                </div>
                <div className="mt-1 text-lg font-semibold text-indigo-100">{priceOptions[1]?.title}</div>
                <p className="mt-2 text-sm text-indigo-200/80">{priceOptions[1]?.desc}</p>
                <div className="mt-4 inline-block rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 border border-emerald-500/30">
                  {priceOptions[1]?.highlight}
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
               <Link href="/blog/pricing" className="text-sm text-indigo-300 hover:text-white underline underline-offset-4">
                 {txs("pricing.cta")}
               </Link>
            </div>
          </SectionCard>

          {/* SECTION 3: Comparison */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{txs("compare.h2")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                     {txa("compare.th").map((h, i) => (
                       <th key={i} className={`px-3 py-2 font-semibold text-indigo-100/90 ${i===2 ? 'text-indigo-300' : ''}`}>{h}</th>
                     ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-3 font-medium text-white/80">{row[0]}</td>
                      <td className="px-3 py-3 text-indigo-200/60">{row[1]}</td>
                      <td className="px-3 py-3 text-indigo-100 font-semibold">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* SECTION 4: FAQ */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{txs("faq.h2")}</h2>
            <div className="mt-4 space-y-4">
              {faqItems.map((f, i) => (
                <div key={i}>
                  <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                    <span className="text-indigo-400">Q.</span> {f.q}
                  </h3>
                  <p className="mt-1 pl-5 text-sm text-indigo-200/80">{f.a}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Meta & CTA */}
          <SectionCard className="mt-8">
             <div className="flex gap-3 text-xs text-indigo-200/60 mb-6">
                <span className="bg-white/5 px-2 py-1 rounded">
                  {txs("meta.published")}:{" "}
                  {/* ★ 日付を固定（SEO/ハイドレーションエラー対策） */}
                  {new Date(PUBLISHED_DATE).toLocaleDateString(router.locale || "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="bg-white/5 px-2 py-1 rounded">{txs("meta.category")}</span>
             </div>

             <div className="flex flex-wrap gap-4">
                <Link
                  href="/"
                  className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
                >
                  <TbWorld className="text-lg" />
                  <span>{txs("cta.openBrowser")}</span>
                </Link>

                <a
                  href="https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
                >
                  <FaAppStore className="text-lg" />
                  <span>{txs("cta.downloadIOS")}</span>
                </a>

                <a
                  href="https://play.google.com/store/apps/details?id=world.senseai.minutes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
                >
                  <BsGooglePlay className="text-lg" />
                  <span>Google Play</span>
                </a>
             </div>
          </SectionCard>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_notetaker"], i18nConfig)),
    },
  };
}