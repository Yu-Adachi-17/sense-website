// src/pages/blog/longrecording.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

import { TbWorld, TbInfinity, TbClockExclamation, TbBrain } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-01-07";
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
    lang.startsWith("de") || lang.startsWith("fr") || lang.startsWith("es") ||
    lang.startsWith("it") || lang.startsWith("nl") || lang.startsWith("nb") ||
    lang.startsWith("pt") || lang.startsWith("fi") ||
    lang.startsWith("pl")
  ) return "EUR";
  return "USD";
};

/* ---------- English-first fallback ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Best AI for Long Recordings (2026): Why Minutes.AI Beats Otter & Notta on Duration",
    description: "Tired of the 90-minute limit on Otter or file limits on Notta? Discover why Minutes.AI is the best choice for recording long meetings, workshops, and interviews without interruption.",
    ogTitle: "Unlimited Recording AI: Minutes.AI vs Otter vs Notta",
    ogDescription: "Don't let your AI stop recording halfway through. See why Minutes.AI is the standard for long-form meeting minutes.",
    ld: {
      headline: "Best AI Note Taker for Long Recordings",
      description: "A deep dive into recording limits: Comparing Otter.ai, Notta, and Minutes.AI for long-duration sessions.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", pricing: "Pricing" },

  hero: {
    kicker: "Long-Form Recording",
    h1: "The 90-Minute Wall is History. Record Without Limits.",
    tagline:
      "Most AI note-takers cut you off just when the conversation gets deep. Minutes.AI is built differently—designed to handle hours of continuous discussion without dropping a single detail.",
    badges: ["Truly Unlimited Duration", "No File Size Caps", "Long-Context AI"],
  },

  problem: {
    h2: "The hidden problem with Otter & Notta",
    p1: "Imagine this: You are in a critical 3-hour strategy workshop. Suddenly, your AI stops recording because you hit a 'per-meeting limit'. You lose focus, scramble to restart, and break the flow.",
    p2: "This is the reality for users of many popular tools. They treat long recordings as edge cases. We treat them as standard.",
    items: [
      { title: "Otter.ai (Pro)", desc: "Hard cap at 90 minutes per conversation." },
      { title: "Notta (Pro)", desc: "Often capped around 3-5 hours or strictly by file size." },
    ]
  },

  comparison: {
    h2: "Duration Limits Compared",
    note: "Data based on 'Pro/Standard' paid plans as of late 2026.",
    tableHead: ["Service", "Max Duration (Per Session)", "What happens when limit hits?"],
    rows: [
      {
        service: "Minutes.AI",
        duration: "Unlimited",
        outcome: "Nothing. It keeps recording until you stop.",
        highlight: true
      },
      {
        service: "Otter.ai (Pro)",
        duration: "90 Minutes",
        outcome: "Recording stops. You must start a new session.",
        highlight: false
      },
      {
        service: "Notta (Pro)",
        duration: "Approx. 3-5 Hours",
        outcome: "Upload fails or recording stops due to size limits.",
        highlight: false
      },
    ],
  },

  quality: {
    h2: "It’s not just about 'Recording'—it’s about 'Thinking'",
    p1: "Technically, any app could let you record for 10 hours. The hard part is **processing** that information.",
    p2: "Most AI models have a small 'context window.' If you feed them a 4-hour transcript, they forget the first hour by the time they reach the end. They hallucinate or give vague summaries.",
    p3: "**Minutes.AI is different.** Our architecture is specifically designed for long-context retention. We don't just transcribe; we maintain the thread of the argument from minute 1 to minute 240, ensuring your final minutes are coherent, not just a jumbled mess.",
    badge: "The Long-Context Advantage"
  },

  pricing: {
    h2: "Simple Pricing for Heavy Users",
    p1: "Whether you need a one-off long recording or a daily workhorse, we have a plan.",
    trial: { name: "Trial Pack", detail: "120 min", foot: "$1.99 (No expiry)" },
    light: { name: "Light Pack", detail: "1200 min", foot: "$11.99 (No expiry)" },
    monthly: { name: "Monthly", detail: "Unlimited", foot: "$16.99 / mo" },
    annual: { name: "Annual", detail: "Unlimited", foot: "$149.99 / yr" },
    free: { badge: "Free Daily Ticket", text: "Try it free for 3 mins every day." },
    bullets: [
      "**Time Packs**: Perfect for one-off long seminars.",
      "**Subscriptions**: truly unlimited for power users.",
      "**100+ Languages**: Works globally."
    ],
    foot: {
        pre: "* Prices in {currency}.", 
        post: "Taxes may apply at checkout."
    }
  },

  cta: { openBrowser: "Start Recording Now", downloadIOS: "Download iOS app" },
  meta: { h2: "Meta", published: "Published", type: "Comparison", category: "Features" },
};

/* ---------- Utility Functions ---------- */
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
    if (typeof val === "object") return toArray(fb);
    return toArray(val);
  };
  return { txs, txa };
}

/* ---------- UI Components ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-block rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs tracking-wide text-indigo-200">
      {children}
    </span>
  );
}
function SectionCard({ children, className = "" }) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur " +
        "shadow-[0_10px_40px_rgba(0,0,0,0.2)] " +
        className
      }
    >
       <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-indigo-500/5 blur-3xl" />
      {children}
    </section>
  );
}
function ComparisonTable({ head, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-indigo-200">
          <tr>
            {head.map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <tr key={i} className={r.highlight ? "bg-indigo-500/10" : ""}>
              <td className="px-4 py-3 font-semibold text-white/90">{r.service}</td>
              <td className="px-4 py-3 text-indigo-100/80">{r.duration}</td>
              <td className="px-4 py-3 text-indigo-200/60">{r.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function PricingCard({ name, price, detail, foot, highlight }) {
  return (
    <div className={`flex flex-col rounded-2xl border p-4 ${highlight ? 'border-indigo-400/50 bg-indigo-500/10' : 'border-white/10 bg-black/20'}`}>
      <div className="text-sm text-indigo-200/80">{name}</div>
      <div className="mt-1 text-xl font-bold text-white">{price}</div>
      <div className="text-xs font-medium text-indigo-300">{detail}</div>
      <div className="mt-2 text-[10px] text-white/40">{foot}</div>
    </div>
  );
}

/* ---------- Page Component ---------- */
export default function BlogLongRecording() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_longrecording");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/longrecording`;

  // Currency
  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => { setCurrency(guessCurrency()); }, []);

  const compareHead = txa("comparison.tableHead");
  const compareRows = txa("comparison.rows");
  const heroBadges = txa("hero.badges");
  const problemItems = txa("problem.items");
  const pricingBullets = txa("pricing.bullets");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:image" content={`${siteUrl}/images/long-recording-hero.png`} />
        {/* Article Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              datePublished: LAST_UPDATED_ISO,
              author: { "@type": "Organization", name: "Minutes.AI" },
              description: txs("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0b0e2e] to-black`}>
        
        {/* Nav */}
        <header className="mx-auto max-w-7xl px-6 pt-8 pb-4">
          <Link href="/home" className="inline-flex rounded-full bg-white/5 p-2 transition hover:bg-white/10">
            <HomeIcon size={24} />
          </Link>
        </header>

        {/* Hero */}
        <main className="mx-auto max-w-3xl px-6 pb-24">
          <div className="pt-6 pb-12">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-white to-sky-200 bg-clip-text text-transparent">
              {txs("hero.h1")}
            </h1>
            <p className="mt-6 text-lg leading-8 text-indigo-100/80">
              {txs("hero.tagline")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {heroBadges.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-indigo-100 ring-1 ring-inset ring-white/20">
                  <TbInfinity className="text-indigo-300"/> {b}
                </span>
              ))}
            </div>
            <div className="mt-4 text-xs text-indigo-400">
              Last updated: {new Date(LAST_UPDATED_ISO).toLocaleDateString()}
            </div>
          </div>

          {/* Problem Section */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <TbClockExclamation className="text-3xl text-red-300/80" />
              <h2 className="text-2xl font-bold">{txs("problem.h2")}</h2>
            </div>
            <p className="text-indigo-100/90 leading-relaxed mb-4">{txs("problem.p1")}</p>
            <p className="text-indigo-100/90 leading-relaxed mb-6">{txs("problem.p2")}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {problemItems.map((item, i) => (
                <div key={i} className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                  <div className="font-semibold text-red-100">{item.title}</div>
                  <div className="text-sm text-red-200/70 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Comparison Table */}
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-2 pl-2">{txs("comparison.h2")}</h2>
            <p className="text-sm text-indigo-300/60 mb-4 pl-2">{txs("comparison.note")}</p>
            <ComparisonTable head={compareHead} rows={compareRows} />
          </div>

          {/* Quality Argument (The AI Context USP) */}
          <SectionCard className="mt-12 border-indigo-400/30 bg-indigo-900/10">
            <div className="flex items-center gap-3 mb-4">
              <TbBrain className="text-3xl text-emerald-300/80" />
              <h2 className="text-2xl font-bold">{txs("quality.h2")}</h2>
            </div>
            <div className="space-y-4 text-indigo-100/90 leading-relaxed">
              <p>{txs("quality.p1")}</p>
              <p className="p-4 rounded-xl bg-black/20 border-l-4 border-yellow-500/50 italic">
                {txs("quality.p2")}
              </p>
              <p>{txs("quality.p3")}</p>
            </div>
            <div className="mt-6 flex justify-end">
               <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/80 border border-emerald-400/30 px-3 py-1 rounded full">
                 {txs("quality.badge")}
               </span>
            </div>
          </SectionCard>

          {/* Pricing Section */}
          <div className="mt-16">
             <div className="text-center mb-8">
               <h2 className="text-3xl font-bold">{txs("pricing.h2")}</h2>
               <p className="text-indigo-200/70 mt-2">{txs("pricing.p1")}</p>
             </div>

             <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Time Packs */}
                <PricingCard 
                  name={txs("pricing.trial.name")} 
                  detail={txs("pricing.trial.detail")}
                  price={formatMoney(1.99, currency)}
                  foot={txs("pricing.trial.foot")}
                />
                <PricingCard 
                  name={txs("pricing.light.name")} 
                  detail={txs("pricing.light.detail")}
                  price={formatMoney(11.99, currency)}
                  foot={txs("pricing.light.foot")}
                />
                {/* Subs */}
                <PricingCard 
                  name={txs("pricing.monthly.name")} 
                  detail={txs("pricing.monthly.detail")}
                  price={formatMoney(16.99, currency)}
                  foot={txs("pricing.monthly.foot")}
                  highlight={true}
                />
                <PricingCard 
                  name={txs("pricing.annual.name")} 
                  detail={txs("pricing.annual.detail")}
                  price={formatMoney(149.99, currency)}
                  foot={txs("pricing.annual.foot")}
                  highlight={true}
                />
             </div>

             <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                <span className="block text-xs font-bold text-emerald-300 uppercase">{txs("pricing.free.badge")}</span>
                <span className="text-sm text-emerald-100">{txs("pricing.free.text")}</span>
             </div>

             <ul className="mt-6 space-y-2 px-4">
               {pricingBullets.map((b, i) => (
                 <li key={i} className="flex items-start gap-2 text-sm text-indigo-200/80">
                   <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                   <span dangerouslySetInnerHTML={{__html: b.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}} />
                 </li>
               ))}
             </ul>
             
             <p className="mt-4 text-center text-[10px] text-indigo-400/50">
               {txs("pricing.foot.pre", { currency })} {txs("pricing.foot.post")}
             </p>
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/"
              className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-indigo-900 shadow-xl transition hover:bg-indigo-50"
            >
              <TbWorld className="text-lg" />
              <span>{txs("cta.openBrowser")}</span>
            </Link>
            <div className="flex gap-4">
              <a href="https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition">
                <FaAppStore size={32} />
              </a>
              <a href="https://play.google.com/store/apps/details?id=world.senseai.minutes" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition">
                <BsGooglePlay size={30} />
              </a>
            </div>
          </div>

          {/* Meta Footer */}
          <div className="mt-16 border-t border-white/5 pt-8 flex flex-wrap gap-3 text-xs text-indigo-400/60">
             <span>{txs("meta.type")}</span>
             <span>•</span>
             <span>{txs("meta.category")}</span>
             <span>•</span>
             <span>{new Date().getFullYear()} Minutes.AI</span>
          </div>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_longrecording"], i18nConfig)),
    },
  };
}