// src/pages/blog/freeplan.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import * as React from "react";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

import { TbWorld, TbTicket, TbCoin, TbLockOpen, TbHeartHandshake } from "react-icons/tb";

import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

// ★ 追加：日付を時間付きで固定し、ハイドレーションエラーを防止
const PUBLISHED_DATE = "2025-11-20T10:00:00+09:00";
const MODIFIED_DATE = "2025-12-10T10:00:00+09:00";

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
const EN_FALLBACK = {
  seo: {
    title: "Free AI Note Taker: Try Minutes.AI Without The Subscription Risk",
    description:
      "Tired of paying for apps before you know if they work? Minutes.AI, trusted by 30,000 users, offers a free daily ticket and non-expiring $1.99 packs.",
    ogTitle: "Don't Subscribe Blindly. Try Minutes.AI Risk-Free.",
    ogDescription:
      "We hate 'paywall traps' too. That's why we give you free daily minutes and $1.99 non-expiring packs. Join 30,000 users and see if we fit your needs.",
    ld: {
      headline: "Free AI Note Taker Options: Daily Tickets & Non-Expiring Packs",
      description:
        "Minutes.AI provides a risk-free way to test AI note taking. Includes a daily free 3-minute ticket and low-cost non-expiring time packs.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", active: "Free Plan Guide" },

  hero: {
    kicker: "Honest Pricing",
    h1: "Stop Paying for AI Note Takers You Might Not Use",
    // ★ 修正：実績を追加
    tagline:
      "Have you ever subscribed to an app only to realize it wasn't what you needed? We believe you shouldn't have to pay to find out if a service works. Join 30,000+ users across 150 countries who trust Minutes.AI.",
  },

  pain: {
    h2: "The 'Subscription Trap'",
    p1: "It's a common story: You download a note taker app, hit a paywall immediately, and sign up for a trial that turns into a monthly charge. Then you realize the app doesn't quite fit your workflow.",
    p2: "We don't want that. We want you to be 100% convinced before you commit to a subscription.",
  },

  solution_free: {
    icon: "ticket",
    h2: "Solution 1: The Daily Free Ticket",
    p1: "Every single user gets a **3-minute free ticket, every single day**.",
    p2: "We know 3 minutes sounds short. But it's enough to test:",
    list: [
      "Does the AI understand my voice?",
      "Is the summary format readable?",
      "Does the UI feel right?",
    ],
    note: "Use it daily to record quick stand-ups or voice memos. Completely free.",
  },

  solution_paid: {
    icon: "coin",
    h2: "Solution 2: The $1.99 'Forever' Pack",
    p1: "Need more time to test? Don't buy a month yet. We offer a **Trial Pack (120 mins) for just $1.99**.",
    p2: "The best part? **It never expires.**",
    p3: "You can buy it today and use the minutes next month or next year. It's the perfect safety net for 'occasional' users or those still deciding.",
  },

  philosophy: {
    h2: "Our Promise",
    // ★ 修正：実績を追加
    p1: "Minutes.AI aims to be the best note taker for many. Trusted by over 30,000 users, we know we can't be perfect for everyone (100 out of 100 people).",
    p2: "That's why we offer these low-risk options. We only want you to subscribe when you are sure we are the right partner for your meetings.",
  },

  meta: { published: "Published", category: "Guide" },
  cta: { 
    text: "Try it risk-free today",
    openBrowser: "Open in browser", 
    downloadIOS: "Download iOS app" 
  },
};

/* ---------- Helpers ---------- */
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

const Icons = {
  ticket: TbTicket,
  coin: TbCoin,
  lock: TbLockOpen,
  handshake: TbHeartHandshake,
};

/* ---------- Page Component ---------- */
export default function BlogFreePlan() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_freeplan");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/freeplan`;

  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => {
    setCurrency(guessCurrency());
  }, []);

  const solutionFreeList = txa("solution_free.list");

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

        {/* JSON-LD の日付を定数化して安全に */}
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
              author: { "@type": "Organization", name: "Minutes.AI" },
              image: [`${siteUrl}/images/pricing-hero.png`],
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

        {/* Hero */}
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
          </div>
        </section>

        <main className="mx-auto max-w-3xl px-6 pb-20">
          
          {/* Pain Point */}
          <SectionCard>
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
                <TbLockOpen size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">{txs("pain.h2")}</h2>
                <p className="mt-3 text-indigo-100/90">{txs("pain.p1")}</p>
                <p className="mt-3 text-indigo-100/90">{txs("pain.p2")}</p>
              </div>
            </div>
          </SectionCard>

          {/* Solution 1: Free */}
          <SectionCard className="mt-8 border-indigo-500/30 bg-indigo-900/10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <TbTicket size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">{txs("solution_free.h2")}</h2>
                <p className="mt-2 text-lg font-medium text-white/90">{txs("solution_free.p1")}</p>
                <p className="mt-2 text-sm text-indigo-200/80">{txs("solution_free.p2")}</p>
                
                <ul className="mt-3 space-y-2">
                  {solutionFreeList.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-indigo-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"/>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 inline-block rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 border border-indigo-500/20">
                  {txs("solution_free.note")}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Solution 2: Paid Low Risk */}
          <SectionCard className="mt-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                <TbCoin size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">{txs("solution_paid.h2")}</h2>
                <p className="mt-2 text-sm text-indigo-100/90" 
                   dangerouslySetInnerHTML={{
                      __html: txs("solution_paid.p1").replace("$1.99", formatMoney(1.99, currency)) 
                   }}
                />
                <p className="mt-2 text-base font-semibold text-white">{txs("solution_paid.p2")}</p>
                <p className="mt-2 text-sm text-indigo-200/80">{txs("solution_paid.p3")}</p>
              </div>
            </div>
          </SectionCard>

          {/* Philosophy */}
          <SectionCard className="mt-8">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                <TbHeartHandshake size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">{txs("philosophy.h2")}</h2>
                <p className="mt-3 text-indigo-100/90">{txs("philosophy.p1")}</p>
                <p className="mt-3 text-indigo-100/90">{txs("philosophy.p2")}</p>
              </div>
            </div>
          </SectionCard>

          {/* Meta & CTA */}
          <SectionCard className="mt-8">
             <div className="flex gap-3 text-xs text-indigo-200/60 mb-6">
                <span className="bg-white/5 px-2 py-1 rounded">
                  {txs("meta.published")}:{" "}
                  {/* 表示用日付もハイドレーションエラーを避けるため安全な方法に変更 */}
                  {new Date(PUBLISHED_DATE).toLocaleDateString(router.locale || "ja-JP", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit"
                  })}
                </span>
                <span className="bg-white/5 px-2 py-1 rounded">{txs("meta.category")}</span>
             </div>

             <div className="text-center sm:text-left mb-4">
               <p className="text-sm font-semibold text-white">{txs("cta.text")}</p>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_freeplan"], i18nConfig)),
    },
  };
}