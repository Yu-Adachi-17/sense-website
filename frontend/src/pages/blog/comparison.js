// src/pages/blog/comparison.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback for blog_comparison ---------- */
const EN_FALLBACK = {
  seo: {
    title: "(2025 Review) Otter vs Notta vs Minutes.AI — Which AI Note Taker is Best for You?",
    description:
      "Otter, Notta, and Minutes.AI compared honestly. We look at real-world needs: language support, meeting types, and pricing. See why Minutes.AI is the most versatile choice for teams in 2025.",
    ogTitle: "Otter vs Notta vs Minutes.AI — 2025 Honest Comparison",
    ogDescription:
      "Struggling to choose between Otter, Notta, and Minutes.AI? We break down the pros, cons, and best use cases. Find out why Minutes.AI is our top recommendation for productive teams.",
    ld: {
      headline: "Otter vs Notta vs Minutes.AI — 2025 Comparison Guide",
      description:
        "A practical comparison of AI note-taking tools. We analyze features, pricing, and use cases to help you decide. Spoiler: Minutes.AI is often the safest bet for business use.",
    },
  },

  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", comparison: "Otter vs Notta vs Minutes.AI" },

  hero: {
    kicker: "2025 AI Note Taker Guide",
    h1: "Otter vs Notta vs Minutes.AI — Which Tool Fits Your Workflow?",
    tagline:
      "Full disclosure: We built Minutes.AI, so we love it. But we also respect Otter and Notta. This guide helps you decide which tool matches your style—and why we believe Minutes.AI is the safest default for most teams.",
  },

  lead: {
    p1:
      "Searching for 'Otter alternatives' or 'best AI minute taker'? You're likely tired of manually typing notes or fixing messy transcripts. In 2025, there are many AI tools, but few handle the reality of work: recurring syncs, sales calls, and messy brainstorms. Here is a problem-first comparison of Otter.ai, Notta, and Minutes.AI to help you stop searching and start recording.",
  },

  tools: {
    h2: "At a Glance: What Each Tool Does Best",
    items: [
      {
        key: "otter",
        name: "Otter.ai",
        role: "The standard for English-speaking remote teams",
        p:
          "Otter evolved from a transcription app into an 'AI meeting agent.' Its main promise is convenience: it joins your Zoom/Teams calls, listens in English, and sends you notes so you can focus on the conversation.",
        bullets: [
          "Best for: Teams that work 100% in English and live on Zoom/Teams/Meet.",
          "Solves: 'We need a designated note-taker for our online calls.'",
          "The Catch: It struggles with non-English speakers and treats every meeting format the same way.",
        ],
      },
      {
        key: "notta",
        name: "Notta",
        role: "The powerhouse for multilingual transcription",
        p:
          "Notta specializes in flexibility. Whether it's a live meeting, a video file, or a microphone recording, Notta transcribes it. Its strength lies in handling dozens of languages and translating them efficiently.",
        bullets: [
          "Best for: People who need to transcribe recordings from various sources in many languages.",
          "Solves: 'I have a pile of audio files in different languages that need to be text.'",
          "The Catch: You get a transcript, but you still have to manually summarize it into actionable tasks.",
        ],
      },
      {
        key: "minutes",
        name: "Minutes.AI",
        role: "The productivity tool for structured, shareable minutes",
        p:
          "Minutes.AI isn't just about transcription; it's about 'What happens next?'. Supporting over 100 languages via Whisper, it formats your notes based on the meeting type—Sales, 1-on-1, or Brainstorming. The goal is to give you a clear summary, decisions, and to-do list immediately.",
        bullets: [
          "Best for: Teams that want finished meeting minutes (not just transcripts) to share on Slack or Notion.",
          "Solves: 'We have transcripts, but nobody reads them. We need action items.'",
          "The Bonus: Specialized formats for different meetings and 'Pay-as-you-go' options make it very easy to adopt.",
        ],
      },
    ],
  },

  axes: {
    h2: "How to Choose the Right One",
    intro:
      "Don't get lost in feature lists. Instead, ask yourself these four questions to find the tool that actually solves your daily frustrations.",
    items: [
      {
        label: "1) Language & Context",
        description:
          "Is your team 100% English-speaking? Or do you have cross-border meetings, mixed languages, and different meeting styles (Sales vs. HR)?",
      },
      {
        label: "2) Recording Source",
        description:
          "Is everything on Zoom? or do you also record face-to-face meetings, upload heavy video files, or use mobile voice memos?",
      },
      {
        label: "3) Output Expectations",
        description:
          "Are you happy with a raw text transcript? Or do you need a structured document with 'Decisions' and 'Next Actions' ready to send?",
      },
      {
        label: "4) Payment Preference",
        description:
          "Do you want a fixed monthly subscription? Or do you prefer a flexible 'Pay-as-you-go' model that never expires?",
      },
    ],
  },

  compare: {
    h2: "Feature Snapshot",
    th: ["Comparison Point", "Otter.ai", "Notta", "Minutes.AI"],
    rows: [
      [
        "Core Philosophy",
        "An automated agent for English online meetings.",
        "A universal transcriber for any audio/video file.",
        "A business tool for structured, actionable minutes.",
      ],
      [
        "Languages",
        "Strong in English. Limited support otherwise.",
        "Great multilingual support with translation features.",
        "100+ languages (Whisper engine) designed for global business.",
      ],
      [
        "Ideal Meeting Types",
        "Standard remote video calls (Zoom/Teams).",
        "Mixed use: Interviews, lectures, and file uploads.",
        "Specific business scenarios: Sales, 1-on-1s, periodic reviews, and workshops.",
      ],
      [
        "The Output",
        "Transcript + Summary bullets.",
        "Transcript + AI summary (depending on plan).",
        "Formatted Minutes: Key points, Decisions, Owners, Deadlines.",
      ],
      [
        "Pricing Model",
        "Monthly subscription (per user).",
        "Freemium + Monthly subscription.",
        "Flexible: Choose between Subscription OR Non-expiring Time Packs.",
      ],
      [
        "Who loves it?",
        "Remote workers who hate typing during Zoom calls.",
        "Researchers/Journalists handling many files and languages.",
        "Teams who need clarity and want to share results instantly.",
      ],
    ],
  },

  personas: {
    h2: "Which User Pattern Are You?",
    items: [
      {
        title: "Pattern A: The English-Only Remote Team",
        otter:
          "Otter is perfect here. It lives in your Zoom calls and handles English beautifully. If you don't work globally, this is a solid pick.",
        notta:
          "Notta works fine, but its multilingual strengths might be overkill for you.",
        minutes:
          "Minutes.AI is a strong contender if you want your notes structured by topic (e.g., separating 'Strategy' from 'HR') rather than just a timeline.",
      },
      {
        title: "Pattern B: The Global / Multilingual Team",
        otter:
          "Otter will struggle here. It is primarily built for English speakers.",
        notta:
          "A great choice. Its ability to transcribe and translate between languages keeps everyone on the same page.",
        minutes:
          "The best long-term choice. It supports 100+ languages natively and formats the output so local branches and HQ can both understand the key decisions instantly.",
      },
      {
        title: "Pattern C: The Busy Manager (Many Meeting Types)",
        otter:
          "Good for capturing audio, but finding specific 'To-Dos' in a long transcript can still be a chore.",
        notta:
          "Excellent for transcribing everything, but you still need to rewrite the raw text into a shareable report.",
        minutes:
          "Built for you. Select 'Sales Mode' for client calls or '1-on-1 Mode' for staff reviews. The AI automatically formats the notes to fit the context, saving you editing time.",
      },
    ],
  },

  recommendation: {
    h2: "Final Verdict",
    lead:
      "We promised an honest take. Otter and Notta are excellent tools, but for general business use, Minutes.AI offers the most complete package.",
    bullets: [
      "**Choose Otter** if you only have English Zoom meetings and just want a record of what was said.",
      "**Choose Notta** if your main goal is converting various audio files into text across many languages.",
      "**Choose Minutes.AI** if you want **finished minutes**. If you need clear decisions, action items, and support for multiple languages and meeting styles, this is the safest default.",
      "**Still unsure?** Try Minutes.AI with a small Time Pack. It's a low-risk way to see if it fits your workflow before committing to a subscription.",
    ],
    note:
      "Yes, we are biased—but we built Minutes.AI specifically to fix the gaps we found in other tools.",
  },

  pricing: {
    h2: "Pricing: Subscription vs. Pay-As-You-Go",
    lead:
      "Pricing plans change, but the philosophy matters. Otter and Notta rely on monthly subscriptions. Minutes.AI offers a unique hybrid model.",
    bullets: [
      "**Otter & Notta:** Standard SaaS model. You pay a monthly fee for a set amount of minutes. Good for predictable, heavy usage.",
      "**Minutes.AI:** Offers both Subscriptions AND **Time Packs**. Time packs never expire. You can buy 10 hours today and use them over six months. This is perfect for users whose meeting volume varies.",
    ],
    disclaimer:
      "Note: Prices and plan details change frequently. Please check the official pricing pages for the latest info.",
    linkText: "Check Minutes.AI Pricing",
  },

  faq: {
    h2: "FAQ",
    items: [
      {
        q: "Should we use multiple tools?",
        a:
          "It's usually better to standardize. If you need English transcription, global language support, and structured minutes all in one, Minutes.AI is the most versatile 'all-in-one' choice.",
      },
      {
        q: "My team is growing globally. Which is safest?",
        a:
          "Start with Minutes.AI. Since it supports 100+ languages and structured formatting from day one, you won't have to switch tools when you hire non-English speakers.",
      },
      {
        q: "I already have transcripts. Why do I need this?",
        a:
          "A transcript is just raw data. **Minutes** are insights. Minutes.AI converts the 'wall of text' into Decisions, Deadlines, and Owners, so your team knows exactly what to do next.",
      },
      {
        q: "Can I use Minutes.AI just for specific important meetings?",
        a:
          "Absolutely. Because of the 'Time Pack' model, you don't need a monthly subscription. You can just use it for high-stakes Board Meetings or Client Negotiations.",
      },
    ],
  },

  images: {
    main: {
      src: "/images/comparison-hero.png",
      alt: "Comparison of Otter, Notta, and Minutes.AI interfaces",
      caption: "Three tools, three approaches. Choose the one that fits your workflow.",
    },
  },

  meta: {
    h2: "Article Info",
    published: "Published",
    type: "Comparison",
    category: "Productivity Tools",
  },

  cta: {
    openBrowser: "Try Minutes.AI Web",
    downloadIOS: "Get iOS App",
  },
};
/* ---------- end of fallback block ---------- */

/* ---------- tiny helpers ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

/* If i18n returns the key (missing), use EN fallback */
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

/* ---------- CTA link constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS =
  "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=world.senseai.minutes";

export default function BlogComparison() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_comparison");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/comparison";

  const tools = txa("tools.items");
  const axes = txa("axes.items");
  const compareRows = txa("compare.rows");
  const compareTh = txa("compare.th");
  const personas = txa("personas.items");
  const pricingBullets = txa("pricing.bullets");
  const faq = txa("faq.items");
  const recommendationBullets = txa("recommendation.bullets");

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
        <meta property="og:image" content={`${siteUrl}${EN_FALLBACK.images.main.src}`} />

        {/* Article structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              description: txs("seo.ld.description"),
              datePublished: new Date().toISOString(),
              dateModified: new Date().toISOString(),
              mainEntityOfPage: canonical,
              author: { "@type": "Organization", name: "Minutes.AI" },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: {
                  "@type": "ImageObject",
                  url: `${siteUrl}/icon-master.png`,
                },
              },
              image: [`${siteUrl}${EN_FALLBACK.images.main.src}`],
            }),
          }}
        />

        {/* FAQ structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
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
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              {txs("nav.blog")}
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{txs("nav.comparison")}</span>
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

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Lead */}
          <SectionCard>
            <p className="text-base leading-7 text-indigo-100/90">{txs("lead.p1")}</p>
          </SectionCard>

          {/* Tool overviews */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("tools.h2")}
            </h2>
            <div className="mt-6 space-y-8">
              {tools.map((tool) => (
                <div key={tool.key} className="border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-xl font-semibold">{tool.name}</h3>
                    <span className="text-xs uppercase tracking-wide text-indigo-200/70">
                      {tool.role}
                    </span>
                  </div>
                  <p className="mt-3 text-sm sm:text-base text-indigo-100/90">{tool.p}</p>
                  {Array.isArray(tool.bullets) && tool.bullets.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm text-indigo-100/85 list-disc ml-5">
                      {tool.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Axes */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("axes.h2")}
            </h2>
            <p className="mt-3 text-indigo-100/90">{txs("axes.intro")}</p>
            <div className="mt-5 space-y-4">
              {axes.map((axis, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-semibold text-indigo-50">{axis.label}</h3>
                  <p className="mt-2 text-sm text-indigo-100/90">{axis.description}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Comparison table */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("compare.h2")}
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    {compareTh.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-semibold text-indigo-100/90">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-white/5 align-top">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-indigo-100/85">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Personas / who should choose which */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("personas.h2")}
            </h2>
            <div className="mt-5 space-y-6">
              {personas.map((p, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg_black/20 bg-black/20 p-4 space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold text-indigo-50">{p.title}</h3>
                  <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <Pill>Otter.ai</Pill>
                      <p className="mt-2 text-indigo-100/90">{p.otter}</p>
                    </div>
                    <div>
                      <Pill>Notta</Pill>
                      <p className="mt-2 text-indigo-100/90">{p.notta}</p>
                    </div>
                    <div>
                      <Pill>Minutes.AI</Pill>
                      <p className="mt-2 text-indigo-100/90">{p.minutes}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Our honest recommendation */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("recommendation.h2")}
            </h2>
            <p className="mt-3 text-indigo-100/90">{txs("recommendation.lead")}</p>
            <ul className="mt-4 space-y-3 text-sm text-indigo-100/90 list-disc ml-5">
              {recommendationBullets.map((b, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
              ))}
            </ul>
            <p className="mt-3 text-xs text-indigo-200/70">{txs("recommendation.note")}</p>
          </SectionCard>

          {/* Pricing styles */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("pricing.h2")}
            </h2>
            <p className="mt-3 text-indigo-100/90">{txs("pricing.lead")}</p>
            <ul className="mt-4 space-y-3 text-sm text-indigo-100/90 list-disc ml-5">
              {pricingBullets.map((b, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
              ))}
            </ul>
            <p className="mt-3 text-xs text-indigo-200/70">{txs("pricing.disclaimer")}</p>
            <div className="mt-4">
              <Link
                href="/blog/pricing"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                {txs("pricing.linkText")}
              </Link>
            </div>
          </SectionCard>

          {/* FAQ */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("faq.h2")}
            </h2>
            <div className="mt-4 space-y-4">
              {faq.map((f, i) => (
                <div key={i}>
                  <h3 className="text-base font-semibold">{f.q}</h3>
                  <p className="mt-1 text-indigo-100/90" dangerouslySetInnerHTML={{ __html: f.a }} />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Meta */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {txs("meta.h2")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-indigo-100/90">
              <Pill>
                {txs("meta.published")}:{" "}
                {new Date().toLocaleDateString(router.locale || "ja-JP", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </Pill>
              <Pill>{txs("meta.type")}</Pill>
              <Pill>{txs("meta.category")}</Pill>
            </div>
          </SectionCard>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-4">
            {/* Browser */}
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
            >
              <TbWorld className="text-lg sm:text-xl text-indigo-200 group-hover:text-white" />
              <span>{txs("cta.openBrowser")}</span>
            </Link>

            {/* App Store */}
            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
            >
              <FaAppStore className="text-lg sm:text-xl text-sky-200 group-hover:text-white" />
              <span>{txs("cta.downloadIOS")}</span>
            </a>

            {/* Google Play */}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
            >
              <BsGooglePlay className="text-lg sm:text-xl text-emerald-200 group-hover:text-white" />
              <span>Google Play</span>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_comparison"], i18nConfig)),
    },
  };
}
