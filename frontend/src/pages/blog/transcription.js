// src/pages/blog/transcription.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

import { TbWorld, TbQuote, TbMicrophone } from "react-icons/tb";
import { BsGooglePlay, BsCheckCircleFill } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants & Currency Logic ---------- */
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

/* ---------- Content Strategy (English-first) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "More Than Just Summaries: The Power of Full-Text Transcription | Minutes.AI",
    description: "Discover the hidden power of Minutes.AI: precise, full-text transcription powered by Whisper. Perfect for verifying quotes, resolving disputes, and capturing every detail.",
    ogTitle: "Why You Need Full-Text Transcription (Powered by Whisper)",
    ogDescription: "Summaries are great, but sometimes you need the exact words. Learn how Minutes.AI handles verbatim transcription.",
  },
  nav: { blog: "Blog", pricing: "Pricing" },

  hero: {
    kicker: "Hidden Features",
    h1: "The Unsung Hero: Full-Text Transcription",
    tagline: "Minutes.AI is famous for its clean summaries. But did you know it also creates a flawless verbatim record of your meetings? Here is why that matters.",
    badges: ["Powered by Whisper", "Verbatim Mode", "Evidence Protection"],
  },

  article: {
    intro: {
      h2: "Summaries tell you what happened. Transcripts prove it.",
      p1: "Our core mission at Minutes.AI has always been to create the “Ultimate Summary”—concise, actionable notes that move your business forward without the fluff.",
      p2: "However, there is a “hidden gem” feature that many power users rely on daily: **Full-Text Transcription**.",
    },
    problem: {
      h3: "Avoiding the “He Said, She Said” Trap",
      p1: "Even the best AI summary might skip a subtle nuance. You might find yourself asking:",
      bullets: [
        "“Wait, what exactly did Mr. Tanaka say about the budget?”",
        "“Did Sarah actually agree to that deadline, or did she hesitate?”",
        "“I remember a counter-argument, but it’s not in the summary.”",
      ],
      p2: "In high-stakes negotiations or client meetings, these missing details can be fatal. A summary gives you the context, but the transcript gives you the **evidence**.",
    },
    solution: {
      h3: "Precision Powered by Whisper",
      p1: "When in doubt, switch to the “Full Text” view. We utilize the latest **OpenAI Whisper** models to ensure industry-leading accuracy.",
      p2: "It captures every word, every stutter, and every dazzling idea that might have slipped through the cracks. It’s your safety net against ambiguity.",
    },
  },

  pricing: {
    h2: "Ready to capture every word?",
    p: "Start for free with our daily ticket, or upgrade for unlimited recording.",
    trial: { name: "Trial Pack", detail: "120 min", foot: "No expiry. $1.99" },
    light: { name: "Light Pack", detail: "1200 min", foot: "No expiry. Best Value." },
    monthly: { name: "Monthly", foot: "Truly Unlimited." },
    annual: { name: "Annual", detail: "-26% off", foot: "Best for teams." },
    free: "Get 3 free minutes every single day.",
  },

  cta: { openBrowser: "Try on Web", downloadIOS: "Download iOS App" },
};

/* ---------- Utility Functions ---------- */
const getPath = (obj, path) => path.split(".").reduce((o, k) => (o && o[k] ? o[k] : undefined), obj);
const toArray = (v) => (Array.isArray(v) ? v : []);

function useTx(ns) {
  const { t } = useTranslation(ns);
  const txs = (key) => {
    const val = t(key);
    return (val === key) ? getPath(EN_FALLBACK, key) || key : val;
  };
  const txa = (key) => {
    const val = t(key, { returnObjects: true });
    return (Array.isArray(val)) ? val : toArray(getPath(EN_FALLBACK, key));
  };
  return { txs, txa };
}

/* ---------- UI Components ---------- */
function Kicker({ children }) {
  return <span className="inline-block rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium tracking-wide text-teal-200">{children}</span>;
}
function SectionCard({ children, className = "" }) {
  return (
    <section className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur shadow-2xl ${className}`}>
      {children}
    </section>
  );
}

/* ---------- Page Component ---------- */
export default function BlogTranscription() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_transcription");
  const siteUrl = "https://www.sense-ai.world";
  
  // Currency State
  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => { setCurrency(guessCurrency()); }, []);

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <link rel="canonical" href={`${siteUrl}/blog/transcription`} />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white selection:bg-teal-500/30`}>
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] rounded-full bg-teal-600/10 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 mx-auto max-w-4xl px-6 pt-10">
          <Link href="/home" aria-label="Home" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white">
            <HomeIcon size={24} />
          </Link>
          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:text-white transition">{txs("nav.blog")}</Link>
            <span className="mx-2">/</span>
            <span className="text-teal-200">Transcription</span>
          </nav>
        </header>

        {/* Hero */}
        <main className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-10">
          <div className="mb-10">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              {txs("hero.h1")}
            </h1>
            <p className="mt-6 text-lg leading-8 text-indigo-100/80">
              {txs("hero.tagline")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {txa("hero.badges").map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-indigo-500/20">
                  <BsCheckCircleFill className="text-[10px]" /> {b}
                </span>
              ))}
            </div>
          </div>

          {/* Article Body */}
          <article className="space-y-8">
            <SectionCard>
              <div className="flex items-center gap-3 text-teal-300 mb-4">
                <TbQuote size={28} />
                <h2 className="text-xl font-bold text-white">{txs("article.intro.h2")}</h2>
              </div>
              <p className="text-base text-indigo-100/90 leading-7">{txs("article.intro.p1")}</p>
              <p className="mt-4 text-base text-indigo-100/90 leading-7">{txs("article.intro.p2")}</p>
            </SectionCard>

            <div className="grid gap-8 sm:grid-cols-1">
              {/* Problem Section */}
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white mb-4">
                  {txs("article.problem.h3")}
                </h3>
                <p className="text-indigo-200/90 leading-7 mb-4">
                  {txs("article.problem.p1")}
                </p>
                <ul className="mb-4 space-y-2 rounded-xl bg-white/5 p-5">
                  {txa("article.problem.bullets").map((b, i) => (
                    <li key={i} className="flex gap-3 text-indigo-100 italic">
                      <span className="text-teal-400 select-none">"</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="text-indigo-200/90 leading-7 font-medium">
                  {txs("article.problem.p2")}
                </p>
              </div>

              {/* Solution Section */}
              <div>
                <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white mb-4">
                  <TbMicrophone className="text-teal-400" />
                  {txs("article.solution.h3")}
                </h3>
                <p className="text-indigo-200/90 leading-7 mb-4">
                  {txs("article.solution.p1")}
                </p>
                <div className="rounded-xl border-l-4 border-teal-500 bg-teal-500/5 p-4">
                  <p className="text-teal-100/90 leading-7">
                    {txs("article.solution.p2")}
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* Pricing Section (Compact) */}
          <div className="mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{txs("pricing.h2")}</h2>
              {/* Simple Currency Toggle */}
              <button 
                onClick={() => setCurrency(c => c === "USD" ? "EUR" : "USD")}
                className="text-xs font-mono text-indigo-300 hover:text-white border border-indigo-500/30 rounded px-2 py-1"
              >
                {currency}
              </button>
            </div>
            
            <SectionCard className="!p-0 border-0 bg-transparent shadow-none">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Packs */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-teal-500/50 transition duration-300">
                  <div className="text-xs text-teal-200 uppercase tracking-wider font-bold mb-1">Pay Once</div>
                  <h3 className="text-lg font-semibold">{txs("pricing.light.name")}</h3>
                  <div className="mt-2 text-2xl font-bold">{formatMoney(11.99, currency)}</div>
                  <p className="text-sm text-indigo-300 mt-1">{txs("pricing.light.detail")}</p>
                </div>

                {/* Subscription */}
                <div className="relative rounded-2xl border border-indigo-500/40 bg-indigo-600/10 p-5 hover:bg-indigo-600/20 transition duration-300">
                  <div className="absolute -top-3 right-4 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</div>
                  <div className="text-xs text-indigo-300 uppercase tracking-wider font-bold mb-1">Annual Sub</div>
                  <h3 className="text-lg font-semibold">{txs("pricing.annual.name")}</h3>
                  <div className="mt-2 text-2xl font-bold">{formatMoney(149.99, currency)}</div>
                  <p className="text-sm text-indigo-300 mt-1">{txs("pricing.annual.detail")}</p>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-indigo-200/70">
                  {txs("pricing.free")}
                </p>
              </div>
            </SectionCard>
          </div>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-teal-300/40 bg-teal-500/10 px-6 py-3 text-sm font-medium text-teal-50/90 backdrop-blur transition hover:bg-teal-500/20 hover:text-white"
            >
              <TbWorld className="text-lg" />
              <span>{txs("cta.openBrowser")}</span>
            </Link>
            <a
              href="https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-500/10 px-6 py-3 text-sm font-medium text-sky-50/90 backdrop-blur transition hover:bg-sky-500/20 hover:text-white"
            >
              <FaAppStore className="text-lg" />
              <span>{txs("cta.downloadIOS")}</span>
            </a>
          </div>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_transcription"], i18nConfig)),
    },
  };
}