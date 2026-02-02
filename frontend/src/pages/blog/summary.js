// src/pages/blog/summary.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants & Logic (Reused from Pricing) ---------- */
const LAST_UPDATED_ISO = "2025-11-20";
const FX = {
  EUR_PER_USD: 0.92,
};
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
  if (
    lang.startsWith("de") ||
    lang.startsWith("fr") ||
    lang.startsWith("es") ||
    lang.startsWith("it") ||
    lang.startsWith("nl") ||
    lang.startsWith("nb") ||
    lang.startsWith("pt") ||
    lang.startsWith("fi") ||
    lang.startsWith("sv") ||
    lang.startsWith("da") ||
    lang.startsWith("pl") ||
    lang.startsWith("cs") ||
    lang.startsWith("sk") ||
    lang.startsWith("hu") ||
    lang.startsWith("ro") ||
    lang.startsWith("el")
  )
    return "EUR";
  return "USD";
};

/* ---------- Content: English-first fallback ---------- */
const EN_FALLBACK = {
  seo: {
    title: "The Ultimate AI Note Taker: Perfect Meeting Summaries Every Time | Minutes.AI",
    description:
      "Tired of long meetings? Let Minutes.AI be your automated note taker. It captures every detail, generates concise summaries, and extracts action items so you can focus on the conversation.",
    ogTitle: "Stop Taking Notes. Start Collaborating. | Minutes.AI",
    ogDescription: "Discover how an AI note taker transforms 3-hour marathons into clear, actionable summaries.",
    ld: {
      headline: "Why Your Meetings Need an AI Note Taker",
      description: "How to automate meeting summaries and ensure no action item is ever left behind.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", summary: "Summary & Note Taking" },

  hero: {
    kicker: "Productivity",
    h1: "The Note Taker That Never Sleeps",
    tagline:
      "Meetings can drag on for hours. Your focus might fade, but Minutes.AI stays sharp. Transform long discussions into crystal-clear summaries instantly.",
    badges: ["Auto-Summary", "Action Extraction", "Focus on Talk"],
  },

  pain: {
    h2: "The Reality of Meeting Fatigue",
    p1:
      "How long are your typical meetings? A quick 15-minute sync? A standard hour? Or do they stretch into 3-hour marathons? We've all been there.",
    questions: [
      "**Can you truly stay focused** for hours on end?",
      "**Are you exhausted** by the time the call ends?",
      "**Do you miss next steps** because you were too busy typing?",
      "**Is the meeting the goal**, or just a means to an end?",
    ],
  },

  solution: {
    h2: "Your New AI Secretary",
    p1:
      "Meetings are a tool, not the destination. The real work happens *after* the call. That's why you need a dedicated **note taker** that doesn't get tired.",
    p2:
      "Minutes.AI is built to withstand the longest sessions. It listens, processes, and delivers a structured **summary** with zero gaps.",
    features: [
      {
        title: "Focus on the conversation",
        desc: "Stop scrambling to write everything down. Engage with your team while the AI handles the documentation.",
      },
      {
        title: "Perfect Summaries",
        desc: "Get a concise overview of what was discussed, logically organized by topic.",
      },
      {
        title: "Action Items Detected",
        desc: "Never miss a ToDo. The AI automatically extracts tasks and assigns them, ensuring smooth execution.",
      },
    ],
  },

  /* ---- Reused Pricing Content ---- */
  pricing: {
    h2: "Simple Pricing for Smart Teams",
    note: "Ready to upgrade your workflow? Choose a plan that fits your rhythm.",
    trial: { name: "Trial", detail: "120 min", foot: "No expiry — $1.99" },
    light: { name: "Light", detail: "1200 min", foot: "No expiry — $11.99" },
    monthly: { name: "Monthly", detail: "Unlimited", foot: "$16.99 / mo" },
    annual: { name: "Annual", detail: "Unlimited", foot: "$149.99 / yr" },
    free: { badge: "Daily Free Ticket", text: "Try it free for 3 minutes, every single day." },
    foot_pre: "* Prices shown in {currency}.",
    foot_post: "Checkout processed in USD.",
  },

  meta: { h2: "Meta", published: "Published", type: "Insight", category: "Productivity" },
  cta: { openBrowser: "Try in Browser", downloadIOS: "Get iOS App" },
};

const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
const toArray = (v) => (Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : []);

function useTx(ns) {
  const { t } = useTranslation(ns);
  const txs = (key, options) => {
    const val = t(key, options);
    if (typeof val === "string" && val === key) {
      const fb = getPath(EN_FALLBACK, key);
      if (typeof fb === "string") {
        if (options && typeof options === "object") {
          return Object.entries(options).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), fb);
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
    return toArray(val);
  };
  return { txs, txa };
}

/* ---------- markdown renderer (safe) ---------- */
function Md({ text, className = "" }) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <>{children}</>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-indigo-50/95">{children}</em>,
        }}
      >
        {String(text ?? "")}
      </ReactMarkdown>
    </span>
  );
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
  return <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-xs text-indigo-100/90">{children}</span>;
}
function Bullet({ children }) {
  return (
    <li className="pl-2 before:mr-2 before:inline-block before:h-[6px] before:w-[6px] before:rounded-full before:bg-indigo-300/80">
      {children}
    </li>
  );
}
function CurrencyToggle({ currency, setCurrency }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
      {["USD", "EUR"].map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-3 py-1.5 text-xs rounded-lg transition ${
            currency === c ? "bg-white/20 text-white" : "text-indigo-100/90 hover:bg-white/10"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

const LINK_HOME = "/home";
const LINK_IOS = "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

/* ---------- Main Page ---------- */
export default function BlogSummary({ canonicalPath = "/blog/summary" }) {
  const router = useRouter();
  const { txs, txa } = useTx("blog_summary");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}${canonicalPath}`;

  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => {
    setCurrency(guessCurrency());
  }, []);

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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              datePublished: new Date().toISOString(),
              author: { "@type": "Organization", name: "Minutes.AI" },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` },
              },
              description: txs("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href={LINK_HOME}
            aria-label={txs("aria.home")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              {txs("nav.blog")}
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{txs("nav.summary")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-3 sm:pt-12 sm:pb-4">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">
              <Md text={txs("hero.tagline")} />
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {txa("hero.badges").map((b, i) => (
                <Pill key={i}>{b}</Pill>
              ))}
            </div>

            <div className="mt-6 text-xs text-indigo-200/50">
              Last updated:{" "}
              {new Date(LAST_UPDATED_ISO).toLocaleDateString(router.locale || "en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Pain Points */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("pain.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">
              <Md text={txs("pain.p1")} />
            </p>

            <ul className="mt-6 space-y-3">
              {txa("pain.questions").map((q, i) => (
                <li key={i} className="flex items-start gap-3 text-indigo-50/90">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                  <Md text={q} />
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Solution */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("solution.h2")}</h2>

            <p className="mt-4 text-base leading-7 text-indigo-100/90">
              <Md text={txs("solution.p1")} />
            </p>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">
              <Md text={txs("solution.p2")} />
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-1">
              {txa("solution.features").map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/40"
                >
                  <h3 className="text-lg font-semibold text-white">
                    <Md text={f.title} />
                  </h3>
                  <p className="mt-2 text-sm text-indigo-200/80">
                    <Md text={f.desc} />
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Pricing Section (Mini) */}
          <SectionCard className="mt-12 border-emerald-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{txs("pricing.h2")}</h2>
                <p className="mt-1 text-sm text-indigo-200/80">{txs("pricing.note")}</p>
              </div>
              <CurrencyToggle currency={currency} setCurrency={setCurrency} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Packs */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-indigo-300 uppercase font-semibold mb-1">One-Time Pack</div>
                <div className="text-sm text-indigo-200/90">{txs("pricing.light.name")}</div>
                <div className="mt-1 text-xl font-bold">
                  {txs("pricing.light.detail")} / {formatMoney(11.99, currency)}
                </div>
                <p className="mt-1 text-xs text-indigo-200/60">{txs("pricing.light.foot")}</p>
              </div>

              {/* Subs */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                <div className="text-xs text-indigo-300 uppercase font-semibold mb-1">Subscription</div>
                <div className="text-sm text-indigo-200/90">{txs("pricing.annual.name")}</div>
                <div className="mt-1 text-xl font-bold">{formatMoney(149.99, currency)}</div>
                <p className="mt-1 text-xs text-indigo-200/60">{txs("pricing.annual.foot")}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-center border border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide mr-2">
                {txs("pricing.free.badge")}
              </span>
              <span className="text-sm text-emerald-100/90">{txs("pricing.free.text")}</span>
            </div>

            {/* NOTE: foot_pre は先頭に "*" があるので Markdown レンダリングはしない（意図せず斜体になるのを防ぐ） */}
            <p className="mt-4 text-[10px] text-center text-indigo-200/50">
              {txs("pricing.foot_pre", { currency })} {txs("pricing.foot_post")}
            </p>
          </SectionCard>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-6 py-3 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
            >
              <TbWorld className="text-xl" />
              <span>{txs("cta.openBrowser")}</span>
            </Link>

            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-6 py-3 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
            >
              <FaAppStore className="text-xl" />
              <span>{txs("cta.downloadIOS")}</span>
            </a>
          </div>

          {/* Meta Footer */}
          <div className="mt-12 border-t border-white/5 pt-6 text-center">
            <div className="flex flex-wrap justify-center gap-2 text-xs text-indigo-300/60">
              <Pill>
                {txs("meta.published")}:{" "}
                {new Date().toLocaleDateString(router.locale || "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Pill>
              <Pill>{txs("meta.type")}</Pill>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_summary"], i18nConfig)),
    },
  };
}
