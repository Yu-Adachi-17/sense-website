// src/pages/blog/meetinganalysis.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import { TbWorld, TbBrain, TbListSearch } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

// ★ 追加：日付を固定（SEO/ハイドレーションエラー対策）
const PUBLISHED_DATE = "2025-12-01T10:00:00+09:00";
const MODIFIED_DATE = "2025-12-10T10:00:00+09:00";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English Fallback (TARGETING "ANALYSIS" INTENT) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "AI Protocol Analysis: Turning Meeting Audio into Business Intelligence (2025)",
    description:
      "Stop just transcribing. Start analyzing. Trusted by 30,000 users, Minutes.AI transforms raw meeting audio into structured data, strategic insights, and decision-ready reports.",
    ogTitle: "From Scribe to Analyst: The Power of AI Meeting Analysis",
    ogDescription:
      "Searching for 'AI protocol analysis'? See how Minutes.AI uses ChatGPT-5 & Gemini 2.5 Pro to extract trends, decisions, and counter-arguments from your meetings.",
    ld: {
      headline: "AI Protocol Analysis: Beyond Simple Transcription",
      description:
        "A guide to using AI not just for recording, but for analyzing meeting dynamics, extracting core issues, and generating strategic counter-measures.",
    },
    keywords: "AI analysis, meeting intelligence, protocol analysis, business insights, Minutes.AI strategy",
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", analysis: "AI Analysis" },

  hero: {
    kicker: "Business Intelligence",
    h1: "Don't Just Record. Analyze.",
    tagline:
      "The era of the 'scribe' is over. Used by over 30,000 professionals, Minutes.AI acts as your automated business analyst, turning hours of conversation into structured data, risk assessments, and strategic next steps.",
  },

  intro: {
    h2: "Why 'Transcription' is Not Enough",
    p1: "Many teams suffer from 'Data Debt'. They record every meeting, but nobody has time to review them. A raw transcript is just a wall of text—it's data, but it's not *information*.",
    p2: "True 'Protocol Analysis' means understanding the context. Minutes.AI doesn't just listen; it thinks. It structures your chaos into clear Decisions, Concerns, and Action Items.",
  },

  features: {
    h2: "3 Layers of AI Analysis",
    items: [
      {
        title: "1. Structural Analysis",
        desc: "The AI automatically separates 'Chatter' from 'Decisions'. It formats the protocol so you can scan a 60-minute meeting in 30 seconds.",
        icon: "structure"
      },
      {
        title: "2. Strategic Analysis (The 'Brain')",
        desc: "Using our Strategy feature, the AI acts as a consultant. It finds the 'Top Issue', offers 'Counter-arguments' you might have missed, and proposes 'Lateral Thinking' solutions.",
        icon: "brain"
      },
      {
        title: "3. Contextual Analysis",
        desc: "By identifying owners and deadlines automatically, the AI turns talk into a project management feed. It answers 'Who needs to do what?' without you asking.",
        icon: "list"
      }
    ]
  },

  visual: {
    h2: "Visual Proof: The Analysis Result",
    p: "This is not a mock-up. This is how Minutes.AI renders a chaotic marketing meeting into a structured, analyzed protocol.",
    // Sample data for the renderer
    sample: {
      meetingTitle: "Q4 Marketing Strategy & Budget Allocation",
      date: "Nov 12, 2025",
      location: "Online / Teams",
      attendees: ["Sarah (CMO)", "James (Ads)", "Elena (Product)"],
      coreMessage: "Shift 30% of the TV budget to Influencer Marketing; focus on 'User Trust' campaign.",
      topics: [
        {
          topic: "Budget Reallocation Analysis",
          discussion: [
            "TV ads ROI has dropped by 12% YoY.",
            "Influencer campaigns (Micro-tier) showing 4.5x ROAS.",
            "Elena raised concerns about brand safety with influencers."
          ],
          decisions: [
            "APPROVED: Cut TV spend by 30%.",
            "APPROVED: Reallocate funds to 'Tech-Influencer' tier."
          ],
          concerns: ["Need a strict vetting process for influencers to avoid scandals."]
        },
        {
          topic: "Campaign Theme: 'Trust'",
          keyMessages: ["Users are tired of hype. They want raw, unedited reviews."],
          actionItems: [
            "James — Draft new guidelines for unscripted reviews by Friday.",
            "Sarah — Approve final creator list."
          ]
        }
      ]
    }
  },

  strategy: {
    h2: "Deep Dive: The 'Analyst' Mode",
    p1: "For deeper insights, our Strategy function applies advanced models (like Gemini 2.5 Pro) to your protocol.",
    boost: "**Boost Analysis:** Identifies what is working well and suggests how to scale it.",
    counter: "**Counter Analysis:** Plays 'Devil's Advocate' to help you spot risks before they happen.",
    cta: "See Strategy Feature"
  },

  cta: {
    h2: "Start Analyzing Your Meetings Today",
    p: "Stop treating meetings as 'write-only' memory. Turn them into your competitive advantage.",
    openBrowser: "Analyze on Web",
    downloadIOS: "Download iOS App",
    downloadAndroid: "Get Android App"
  },

  meta: {
    h2: "Meta",
    published: "Published",
    type: "Analysis Guide",
    category: "AI Features"
  }
};

/* ---------- UTILS ---------- */
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
  // t関数もコンポーネント内で使うために返す
  return { txs, txa, t };
}

/* ---------- UI COMPONENTS (Reused for consistency) ---------- */
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

/* ---------- RENDERER COMPONENTS ---------- */
function SectionLabel({ children }) {
  return <h5 className="mt-4 mb-2 text-base sm:text-lg font-semibold tracking-wide text-indigo-100/90">{children}</h5>;
}

function ActionItemLine({ text }) {
  const match = text.match(/^\s*([^—-]+?)\s*[—-]\s*(.+)$/);
  if (match) {
    return <li><span className="font-semibold">{match[1].trim()}</span> — {match[2].trim()}</li>;
  }
  return <li>{text}</li>;
}

function TopicBlock({ index, topic }) {
  const { topic: title, discussion = [], decisions, actionItems, concerns, keyMessages } = topic || {};
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <h4 className="text-lg sm:text-xl font-bold text-white">{index}. {title}</h4>
      {discussion?.length > 0 && (
        <>
          <SectionLabel>Discussion</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">{discussion.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </>
      )}
      {decisions?.length > 0 && (
        <>
          <SectionLabel>Decisions</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">{decisions.map((d, i) => <li key={i} className="font-medium text-white/95">{d}</li>)}</ul>
        </>
      )}
      {actionItems?.length > 0 && (
        <>
          <SectionLabel>Action Items</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">{actionItems.map((a, i) => <ActionItemLine key={i} text={a} />)}</ul>
        </>
      )}
      {concerns?.length > 0 && (
        <>
          <SectionLabel>Concerns / Risks</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">{concerns.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </>
      )}
      {keyMessages?.length > 0 && (
        <>
          <SectionLabel>Key Messages</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">{keyMessages.map((k, i) => <li key={i} className="font-medium">{k}</li>)}</ul>
        </>
      )}
    </article>
  );
}

function MinutesPrettyRender({ minutes }) {
  if (!minutes) return null;
  const { meetingTitle, date, location, attendees, coreMessage, topics = [] } = minutes;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 shadow-2xl">
      <header className="mb-5">
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{meetingTitle}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-indigo-100/90">
          {date && <Pill>{date}</Pill>}
          {location && <Pill>{location}</Pill>}
        </div>
        {attendees && (
          <p className="mt-2 text-sm text-indigo-100/90">
            <span className="font-semibold text-indigo-200/90">Attendees:</span> {attendees.join(", ")}
          </p>
        )}
        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </header>
      <div className="space-y-4">
        {topics.map((tpc, i) => <TopicBlock key={i} index={i + 1} topic={tpc} />)}
      </div>
      {coreMessage && (
        <aside className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <h5 className="mb-2 text-base sm:text-lg font-semibold tracking-wide text-indigo-200/90">Closing Message</h5>
          <blockquote className="text-indigo-100/90">“{coreMessage}”</blockquote>
        </aside>
      )}
    </section>
  );
}

/* ---------- MAIN PAGE ---------- */
const LINK_IOS = "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

export default function BlogMeetingAnalysis() {
  const router = useRouter();
  const { txs, txa, t } = useTx("blog_meeting_analysis"); // t関数を取得
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = siteUrl + (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) + "/blog/meetinganalysis";

  // ★ 修正：ここで翻訳データを取得するように変更。
  // 以前は `const sampleData = EN_FALLBACK.visual.sample;` と固定されていたため、ローカライズが無視されていました。
  const rawSample = t("visual.sample", { returnObjects: true });
  
  // 翻訳データがオブジェクトとして正しく取得できた場合はそれを使い、そうでなければFallbackを使う
  const sampleData = (rawSample && typeof rawSample === 'object' && !Array.isArray(rawSample) && Object.keys(rawSample).length > 0)
    ? rawSample
    : EN_FALLBACK.visual.sample;

  const featureList = txa("features.items");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <meta name="keywords" content={txs("seo.keywords")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/minutesimage.png`} />
        
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
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` },
              },
              image: [`${siteUrl}/images/minutesimage.png`],
              description: txs("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}>
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href="/home"
            aria-label={txs("aria.home")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">{txs("nav.blog")}</Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{txs("nav.analysis")}</span>
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

        {/* Main Content */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          
          {/* Intro: The Problem */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("intro.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{txs("intro.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{txs("intro.p2")}</p>
            </div>
          </SectionCard>

          {/* 3 Features Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {featureList.map((item, idx) => (
              <div key={idx} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur hover:bg-white/[0.08] transition">
                <div className="mb-4 text-indigo-300">
                  {idx === 0 && <TbListSearch size={32} />}
                  {idx === 1 && <TbBrain size={32} />}
                  {idx === 2 && <TbWorld size={32} />}
                </div>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-indigo-100/80">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Visual Proof: The Rendered Minute */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{txs("visual.h2")}</h2>
            <p className="text-indigo-100/90 mb-6">{txs("visual.p")}</p>
            
            {/* The Component demonstrating "Analysis" */}
            <MinutesPrettyRender minutes={sampleData} />
            
          </SectionCard>

          {/* Strategy Deep Dive */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("strategy.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("strategy.p1")}</p>
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
                <p className="text-indigo-100 text-sm">{txs("strategy.boost")}</p>
              </div>
              <div className="rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 p-4">
                <p className="text-indigo-100 text-sm">{txs("strategy.counter")}</p>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/blog/strategy" className="text-sm font-semibold text-indigo-300 hover:text-indigo-200 underline underline-offset-4">
                {txs("strategy.cta")} &rarr;
              </Link>
            </div>
          </SectionCard>

          {/* CTA */}
          <SectionCard className="mt-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("cta.h2")}</h2>
            <p className="mt-3 text-indigo-100/90 max-w-lg mx-auto">{txs("cta.p")}</p>
            
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-5 py-3 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
              >
                <TbWorld className="text-xl group-hover:text-white text-indigo-200" />
                <span>{txs("cta.openBrowser")}</span>
              </Link>

              <a
                href={LINK_IOS}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-5 py-3 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
              >
                <FaAppStore className="text-xl group-hover:text-white text-sky-200" />
                <span>{txs("cta.downloadIOS")}</span>
              </a>

              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
              >
                <BsGooglePlay className="text-xl group-hover:text-white text-emerald-200" />
                <span>{txs("cta.downloadAndroid")}</span>
              </a>
            </div>
          </SectionCard>

          {/* Meta Info */}
          <div className="mt-8 flex justify-center gap-2 text-xs text-indigo-200/50">
             <span>
                {txs("meta.published")}:{" "}
                {/* 表示用日付も安全に固定 */}
                {new Date(PUBLISHED_DATE).toLocaleDateString(router.locale || "en-US", { year: "numeric", month: "short" })}
             </span>
             <span>•</span>
             <span>{txs("meta.type")}</span>
          </div>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_meeting_analysis"], i18nConfig)),
    },
  };
}