// src/pages/blog/cost.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
// Cost記事用に通貨計算ロジックは保持しつつ、より「計算」にフォーカスした内容にします
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
  if (
    lang.startsWith("de") || lang.startsWith("fr") || lang.startsWith("es") ||
    lang.startsWith("it") || lang.startsWith("nl") || lang.startsWith("nb")
  ) return "EUR";
  return "USD";
};

/* ---------- Content Strategy: Focus on ROI & Hidden Costs ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Minutes.AI Cost Analysis (2025) — True ROI of AI Meeting Notes",
    description:
      "Is an AI note taker worth the cost? We break down the 'Cost Per Meeting' of Minutes.AI vs. human transcription and monthly subscriptions. Learn how to stop paying for unused minutes.",
    ogTitle: "The Real Cost of Meeting Minutes: AI vs Human (2025 Guide)",
    ogDescription:
      "Worried about the cost of AI tools? We analyze the true cost of Minutes.AI. See why our 'Pay-as-you-go' model saves you money compared to rigid subscriptions.",
    ld: {
      headline: "Minutes.AI Cost & ROI Guide (2025)",
      description:
        "A breakdown of meeting minute costs. Comparison of Time Packs vs. Subscriptions vs. Human Transcription costs.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", cost: "Cost Analysis" },

  hero: {
    kicker: "Cost Efficiency Guide",
    h1: "The Real Cost of Meeting Minutes: Are You Overpaying?",
    tagline:
      "Most productivity tools hide their true cost behind monthly fees you rarely utilize fully. Here is a transparent look at the cost of Minutes.AI compared to your time and other tools.",
    subtag:
      "Stop paying 'rent' for software. Pay only for the value you actually use.",
  },

  intro: {
    h2: "The hidden cost of \"Fixed Monthly Fees\"",
    p1: "When searching for the cost of AI note-takers, you usually see a flat monthly rate (e.g., $30/month). But if you only have 3 meetings that month, your **actual cost per meeting** is $10. That's expensive.",
    p2: "We built Minutes.AI to fix this inefficiency with a model that respects your wallet.",
  },

  breakdown: {
    h2: "Cost Breakdown: Time Packs vs. Subscriptions",
    note: "We offer two ways to pay, depending on your frequency. Here is the cost efficiency analysis for each.",
    
    packTitle: "Option A: The \"Pay-As-You-Go\" Approach (Best for ROI)",
    packDesc: "Ideal if your meeting schedule varies. You buy minutes that **never expire**. Zero wasted money.",
    packMetric: "Cost Efficiency: Approx $0.50 - $1.00 per hour of recording", // Approximate calc based on $11.99/1200min
    
    subTitle: "Option B: The \"Power User\" Subscription",
    subDesc: "Ideal if you record daily. The more you record, the cheaper it gets.",
    subMetric: "Cost Efficiency: Unlimited usage for a fixed cap",
  },

  roi: {
    h2: "ROI Comparison: AI vs. Human vs. Competitors",
    lead: "What does it actually cost to transcribe a 1-hour meeting? Let's look at the numbers.",
    tableHead: ["Method", "Est. Cost for 1 Hour", "Time Cost (Your Labor)", "Hidden Risks"],
    rows: [
      {
        method: "Human / Yourself",
        cost: "$0 (technically)",
        labor: "1-2 hours of typing",
        risk: "High opportunity cost. You aren't doing your actual job.",
      },
      {
        method: "Human Service",
        cost: "$60 - $100",
        labor: "Zero",
        risk: "Very expensive. Privacy concerns with sharing audio.",
      },
      {
        method: "Typical Monthly AI Sub",
        cost: "$15 - $30 / month",
        labor: "Low",
        risk: "Sunk cost. You pay even if you have zero meetings.",
      },
      {
        method: "Minutes.AI (Time Pack)",
        cost: "~$0.60 (via Light Pack)",
        labor: "Low",
        risk: "None. Minutes never expire.",
      },
    ],
  },

  value: {
    h2: "What am I actually paying for?",
    p1: "The cost covers more than just speech-to-text. It covers the intelligence that structures your data.",
    items: [
      "**Security Costs:** We don't sell your data to offset costs. You pay us so we can keep your data private.",
      "**High-End Models:** We use premium models (Whisper, GPT-4o, Gemini Pro) which have higher API costs but deliver readable accuracy.",
      "**Cloud Storage:** Secure hosting for your audio and transcripts is included in the price.",
    ],
  },

  faq: {
    h2: "FAQ — Common Questions on Cost",
    items: [
      {
        q: "Are there any hidden setup fees?",
        a: "No. The price you see for the Time Pack or Subscription is the final price (excluding local VAT/taxes).",
      },
      {
        q: "Why is the Time Pack considered 'lower risk'?",
        a: "Because it eliminates the 'subscription fatigue'. If you don't use the app for 3 months, you lose $0. Your minutes wait for you.",
      },
      {
        q: "Is the Free version actually free?",
        a: "Yes. The 'Daily Ticket' gives you 3 minutes of recording/processing every day for $0 cost. It's great for quick voice memos.",
      },
      {
        q: "How does the Annual cost compare to Monthly?",
        a: "Paying annually ($149.99) lowers the effective monthly cost to about $12.50, compared to the $16.99 monthly plan. That's a ~26% saving.",
      },
    ],
  },

  cta: {
    text: "Ready to stop wasting money on empty subscriptions?",
    button: "Check Current Prices",
    sub: "Start with a $1.99 trial pack. Lowest risk in the industry.",
  },

  meta: { h2: "Meta", published: "Published", type: "Analysis", category: "Cost & ROI" },
};

/* ---------- Helper Functions (Same as pricing.js) ---------- */
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
      return typeof fb === "string" ? fb : key;
    }
    return val;
  };
  const txa = (key) => {
    const val = t(key, { returnObjects: true });
    if (Array.isArray(val) && val.length > 0) return val;
    const fb = getPath(EN_FALLBACK, key);
    return Array.isArray(fb) ? fb : toArray(fb);
  };
  return { txs, txa };
}

/* ---------- Components (Reusing consistent design) ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-block rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs tracking-wide text-emerald-200/90">
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
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
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

/* ---------- Page Component ---------- */
export default function BlogCost({ canonicalPath = "/blog/cost" }) {
  const router = useRouter();
  const { txs, txa } = useTx("blog_cost");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}${canonicalPath}`;

  // Currency logic for display
  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => { setCurrency(guessCurrency()); }, []);

  const roiRows = txa("roi.rows");
  const roiHead = txa("roi.tableHead");

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
        {/* Reuse pricing hero or specific cost image */}
        <meta property="og:image" content={`${siteUrl}/images/pricing-hero.png`} />

        {/* FAQ Schema for "Cost" questions */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: txa("faq.items").map(f => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a }
              })),
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              datePublished: new Date().toISOString(),
              mainEntityOfPage: canonical,
              author: { "@type": "Organization", name: "Minutes.AI" },
              publisher: { "@type": "Organization", name: "Minutes.AI", logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` } },
              description: txs("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(16,185,129,0.15),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(99,102,241,0.15),transparent)]`}>
        
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link href="/home" aria-label={txs("aria.home")} className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white">
            <HomeIcon size={28} />
          </Link>
          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">{txs("nav.blog")}</Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-emerald-200">{txs("nav.cost")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-3 sm:pt-12 sm:pb-4">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-200 via-white to-indigo-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">{txs("hero.tagline")}</p>
            <p className="mt-2 text-sm text-emerald-200/80">{txs("hero.subtag")}</p>
          </div>
        </section>

        {/* Main Content */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          
          {/* Intro: The Problem with Fixed Costs */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("intro.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("intro.p1")}</p>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("intro.p2")}</p>
          </SectionCard>

          {/* ROI Table */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{txs("roi.h2")}</h2>
            <p className="text-sm text-indigo-200/80 mb-6">{txs("roi.lead")}</p>
            
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm text-left border-collapse bg-black/20">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    {roiHead.map((h, i) => (
                      <th key={i} className="px-4 py-3 font-semibold text-emerald-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roiRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                      <td className="px-4 py-3 font-medium text-white">{row.method}</td>
                      <td className="px-4 py-3 text-emerald-300 font-bold">{row.cost}</td>
                      <td className="px-4 py-3 text-indigo-100/80">{row.labor}</td>
                      <td className="px-4 py-3 text-indigo-200/70 text-xs">{row.risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Cost Breakdown Analysis */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{txs("breakdown.h2")}</h2>
            <p className="mt-2 text-sm text-indigo-200/80 mb-6">{txs("breakdown.note")}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Pack Analysis */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/10 p-5">
                <div className="text-sm font-semibold text-emerald-200 mb-2">{txs("breakdown.packTitle")}</div>
                <p className="text-sm text-indigo-100/90 leading-relaxed min-h-[3rem]">{txs("breakdown.packDesc")}</p>
                <div className="mt-4 pt-4 border-t border-emerald-500/20">
                  <span className="text-xs font-mono text-emerald-300">{txs("breakdown.packMetric")}</span>
                </div>
              </div>

              {/* Sub Analysis */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-900/10 p-5">
                <div className="text-sm font-semibold text-indigo-200 mb-2">{txs("breakdown.subTitle")}</div>
                <p className="text-sm text-indigo-100/90 leading-relaxed min-h-[3rem]">{txs("breakdown.subDesc")}</p>
                <div className="mt-4 pt-4 border-t border-indigo-500/20">
                  <span className="text-xs font-mono text-indigo-300">{txs("breakdown.subMetric")}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Value Logic */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{txs("value.h2")}</h2>
            <p className="mt-3 text-indigo-100/90">{txs("value.p1")}</p>
            <ul className="mt-4 space-y-3">
              {txa("value.items").map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-indigo-100/90">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* FAQ */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("faq.h2")}</h2>
            <div className="mt-4 space-y-4">
              {txa("faq.items").map((f, i) => (
                <details key={i} className="rounded-xl border border-white/10 bg-black/25 p-4 group">
                  <summary className="cursor-pointer text-sm font-semibold text-white/90 group-open:text-emerald-300 transition-colors">
                    {f.q}
                  </summary>
                  <p className="mt-2 text-sm text-indigo-100/90 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </SectionCard>

          {/* CTA / Meta */}
          <div className="mt-12 text-center">
            <h3 className="text-xl font-bold text-white mb-2">{txs("cta.text")}</h3>
            <p className="text-sm text-indigo-200/70 mb-6">{txs("cta.sub")}</p>
            <Link
              href="/blog/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-8 py-3 text-base font-medium text-emerald-100 backdrop-blur shadow-[0_0_30px_rgba(16,185,129,0.3)] transition hover:bg-emerald-500/20 hover:text-white"
            >
              {txs("cta.button")}
            </Link>

            <div className="mt-10 flex flex-wrap justify-center gap-2 text-xs text-indigo-300/50">
               <Pill>{txs("meta.published")}: {new Date().toLocaleDateString(router.locale || "en-US", { year: "numeric", month: "short", day: "2-digit" })}</Pill>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_cost"], i18nConfig)),
    },
  };
}