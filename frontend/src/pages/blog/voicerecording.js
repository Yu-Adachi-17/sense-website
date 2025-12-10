// src/pages/blog/voicerecording.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

import { TbWorld, TbMicrophone, TbWaveSine } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

// ★ 追加：日付を固定（SEO/ハイドレーションエラー対策）
const PUBLISHED_DATE = "2025-12-03T10:00:00+09:00";
const MODIFIED_DATE = "2025-12-10T10:00:00+09:00";

const inter = Inter({ subsets: ["latin"] });

/* ---------- English-first fallback (keys missing -> EN) ---------- */
const EN_FALLBACK = {
  seo: {
    title:
      "Why Voice Recording Matters in AI Meeting Notes — Capturing the Atmosphere",
    description:
      "Text transcripts aren't enough. Discover why 30,000+ users trust Minutes.AI for capturing the nuance, emotion, and 'vibe' of their meetings.",
    ogTitle: "Don't Just Read the Minutes. Hear the Moment.",
    ogDescription:
      "A transcript tells you what was said. Voice recording tells you how it was felt. Experience the depth of audio with Minutes.AI.",
    ld: {
      headline: "Why Voice Recording is the Heart of Great Meeting Notes",
      description:
        "Minutes.AI combines accurate transcription with clear voice recording to preserve the true atmosphere of your meetings.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", pricing: "Pricing", current: "Voice Recording" },

  hero: {
    kicker: "Feature Spotlight",
    h1: "Don't Just Read the Minutes. Replay the Atmosphere.",
    // ★ 修正：実績を追加
    tagline:
      "AI transcription services are everywhere. But text alone is flat. Trusted by over 30,000 users, Minutes.AI lets you truly understand a decision by hearing the voice behind it.",
    badges: ["Crystal Clear Audio", "Sync Playback", "Capture Nuance"],
  },

  intro: {
    h2: "The Missing Piece in AI Transcription",
    p1: "Notta, Otter, tl;dv, Minutes.AI... the market is flooded with 'AI Meeting Assistants'. They are all excellent at turning speech into text. But even the best AI in the world misses one crucial thing when it only generates text:",
    highlight: "The atmosphere of the room.",
  },

  problem: {
    h2: "The 'Plan A' Paradox",
    p1: "Imagine reading this line in your meeting minutes:",
    quote: "“The team unanimously decided to go with Plan A.”",
    p2: "On paper, this is a fact. But in reality, what actually happened?",
    scenarios: [
      {
        title: "Scenario 1: High Energy",
        desc: "Everyone was excited, shouting 'Yes!' and high-fiving. The momentum is unstoppable.",
      },
      {
        title: "Scenario 2: Reluctant Compromise",
        desc: "There was a long silence. Finally, someone sighed, 'I guess Plan A is the only option left...' and others nodded strictly out of fatigue.",
      },
    ],
    summary:
      "These two scenarios have opposite meanings for your business strategy, yet the text transcript looks exactly the same. This is the 'depth' of a meeting that text alone destroys.",
  },

  solution: {
    h2: "Minutes.AI: Text + Audio = Truth",
    p1: "We believe that information without context is dangerous. That's why Minutes.AI isn't just a summarizer—it's a high-fidelity voice recorder.",
    p2: "We refuse to discard the audio data after processing. By keeping the original voice recording linked to the transcript, we allow you to travel back in time.",
    features: [
      "**Contextual Playback**: Tap any sentence to hear exactly how it was said.",
      "**Tone Analysis**: Was the stakeholder angry or joking? Verify it instantly.",
      "**Complete Archive**: Your minutes are the summary; the audio is the proof.",
    ],
  },

  cta: {
    h2: "Experience the Full Picture",
    p1: "Don't settle for flat text. Join 30,000 users and experience the trinity of modern meeting records: Summaries, Full Transcripts, and Original Voice Audio.",
    openBrowser: "Try on Web",
    downloadIOS: "Download iOS App",
  },
  
  meta: { h2: "Meta", published: "Published", type: "Insight", category: "Features" },
};

const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

// useTx hook
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

/* ---------- UI bits ---------- */
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

/* ---------- Page ---------- */
export default function BlogVoiceRecording() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_voicerecording");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/voicerecording`;

  const heroBadges = txa("hero.badges");
  const scenarios = txa("problem.scenarios");
  const features = txa("solution.features");

  // Links
  const LINK_IOS = "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

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
        {/* Placeholder for blog image */}
        <meta property="og:image" content={`${siteUrl}/images/blog-voice-hero.png`} />

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
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* Header */}
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
            <span className="text-indigo-100">{txs("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-8 sm:pt-16 sm:pb-12">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-indigo-100/90 max-w-2xl">{txs("hero.tagline")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {heroBadges.map((b, i) => <Pill key={i}>{b}</Pill>)}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          
          {/* Intro */}
          <SectionCard>
            <div className="flex items-start gap-4">
               <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                  <TbMicrophone size={24} />
               </div>
               <div>
                <h2 className="text-2xl font-bold tracking-tight">{txs("intro.h2")}</h2>
                <p className="mt-4 text-base leading-7 text-indigo-100/90">
                  {txs("intro.p1")}
                  <br/>
                  <span className="mt-2 block font-semibold text-white">
                    {txs("intro.highlight")}
                  </span>
                </p>
               </div>
            </div>
          </SectionCard>

          {/* The Problem (Scenario) */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-semibold">{txs("problem.h2")}</h2>
            <p className="mt-2 text-sm text-indigo-200/80">{txs("problem.p1")}</p>
            
            <div className="my-6 border-l-4 border-indigo-400 bg-white/5 p-4 italic text-indigo-50">
              {txs("problem.quote")}
            </div>

            <p className="text-sm text-indigo-200/80 mb-4">{txs("problem.p2")}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {scenarios.map((s, i) => (
                <div key={i} className={`rounded-xl border p-4 ${i === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                  <div className={`text-sm font-bold ${i === 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {s.title}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-indigo-100/80">{s.desc}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm leading-6 text-indigo-200/90">
              {txs("problem.summary")}
            </p>
          </SectionCard>

          {/* The Solution */}
          <SectionCard className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <TbWaveSine className="text-fuchsia-300 text-2xl" />
              <h2 className="text-2xl font-bold tracking-tight">{txs("solution.h2")}</h2>
            </div>
            
            <p className="text-base leading-7 text-indigo-100/90">{txs("solution.p1")}</p>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("solution.p2")}</p>

            <ul className="mt-6 space-y-3">
              {features.map((f, i) => (
                <li key={i} className="flex gap-3 text-sm text-indigo-100/90">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* CTA / Conclusion */}
          <SectionCard className="mt-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("cta.h2")}</h2>
            <p className="mt-4 text-base text-indigo-100/90 max-w-lg mx-auto">
              {txs("cta.p1")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {/* Browser */}
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-5 py-3 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
              >
                <TbWorld className="text-lg group-hover:text-white" />
                <span>{txs("cta.openBrowser")}</span>
              </Link>

              {/* iOS */}
              <a
                href={LINK_IOS}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-5 py-3 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
              >
                <FaAppStore className="text-lg group-hover:text-white" />
                <span>{txs("cta.downloadIOS")}</span>
              </a>

               {/* Android */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
              >
                <BsGooglePlay className="text-lg group-hover:text-white" />
                <span>Google Play</span>
              </a>
            </div>
          </SectionCard>

          {/* Meta Footer */}
          <div className="mt-12 flex flex-wrap gap-2 text-xs text-indigo-300/50 justify-center">
            <span>
              {txs("meta.published")}:{" "}
              {/* 表示用日付も安全に固定 */}
              {new Date(PUBLISHED_DATE).toLocaleDateString(router.locale || "en-US", { year: "numeric", month: "long", day: "numeric" })}
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_voicerecording"], i18nConfig)),
    },
  };
}