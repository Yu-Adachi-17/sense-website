// src/pages/blog/recommend.js

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

/* ---------- Inline English fallback (REVISED) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "(2026) Why We Recommend the Minutes.AI iPhone App for Meeting Minutes",
    description:
      "Looking for the best iPhone AI minutes app? Here’s our honest review. Minutes.AI is a simple, readable, and action-oriented app with an incredibly flexible pricing model.",
    ogTitle: "Minutes.AI iPhone App — Our Honest Recommendation (2026)",
    ogDescription:
      "Searching 'AI minutes app recommendation' or 'AI minutes app pricing'? This guide explains why the Minutes.AI iPhone app is our top pick for its features and fair price.",
    ld: {
      headline: "Why We Recommend the Minutes.AI iPhone App",
      description:
        "Our 5 key reasons: A super-simple UI, truly readable outputs, smart meeting formats, built-in action tracking, and a flexible pricing model that fits any user.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", recommend: "Why Minutes.AI for iPhone" },

  hero: {
    kicker: "Our 2026 Buyer's Guide",
    h1: "Why the Minutes.AI iPhone App is Our Top Pick for Meeting Minutes (2026)",
    tagline:
      "If you’re googling “AI minutes app recommended” or “AI minutes app pricing,” you’re in the right place. This app is built to record fast, generate clean minutes, and help you *actually* get work done.",
  },

  lead: {
    p1:
      "AI-powered minute-taking apps are everywhere in 2026. So why do we still recommend Minutes.AI for the iPhone? We'll skip the hype and give you five direct, practical reasons.",
  },

  reasons: {
    h2: "5 Reasons We Recommend the Minutes.AI iPhone App",
    items: [
      {
        t: "1) A Ridiculously Simple UI — Zero Guesswork",
        p:
          "No confusing menus. One tap to record. One tap to see your past minutes. That's it. You shouldn't need a manual just to take notes.",
        imgAlt: "Minutes.AI main screen showing one-tap recording",
        caption: "One-tap start, one-tap history. No learning curve.",
      },
      {
        t: "2) Readability & Real Value (Not AI Fluff)",
        p:
          "This isn't just a wall of AI-generated text. The app formats everything so you can jump straight to decisions and next steps. It’s optimized for action.",
        imgAlt: "Example of clean, readable minutes from Minutes.AI",
        caption: "Decisions pop. Owners and deadlines are clear by design.",
      },
      {
        t: "3) Smart Formats for Different Meetings",
        p:
          "A 1-on-1 is different from a brainstorm. Minutes.AI gets this. You can choose a format (General, Sales, 1-on-1, Presentation, etc.) to get the best possible summary for that specific meeting type.",
        imgAlt: "Minutes.AI meeting format selection screen",
        caption: "Choose the right format for the right meeting.",
      },
      {
        t: "4) Post-Meeting Actions Are Built-In",
        p:
          "Minutes.AI doesn't just stop at recording. Hit “Project” to instantly see “who does what by when.” Hit “Strategy” to have the latest AI (ChatGPT-5.2.2 & Gemini 2.5 Pro) suggest concrete next steps based on your conversation.",
        note: "Want a deeper dive on Strategy? See the article below.",
      },
      {
        t: "5) Smart Pricing That Fits How You *Actually* Work",
        p:
          "This is a huge one. Not everyone needs *another* monthly subscription. If you have meetings all day, the **Unlimited Subscription** is great. But if you only have occasional meetings, you can buy **non-expiring Time Packs**. You can even start with a **120-minute pack for just $1.99** to try it out.",
        note: "We break down the full price list in its own section below.",
      },
    ],
  },

  strategy: {
    h2: "Strategy: Turn Minutes Into Motion",
    p1:
      "The “Strategy” feature takes your meeting's context and proposes clear action plans using top-tier AI models. Less guesswork, more concrete steps you can assign.",
    linkText: "Read the Strategy Deep-Dive",
  },

  // --- THIS SECTION IS HEAVILY REVISED FOR 'PRICE' SEO ---
  pricing: {
    h2: "A Detailed Look at Minutes.AI App Pricing",
    lead:
      "Here’s the biggest problem with most AI tools: they force you into a 'one-size-fits-all' monthly subscription. Minutes.AI's pricing is different. It’s designed to match your meeting frequency, so you only pay for what you actually need.",
    bullets: [
      "**The Perfect Trial ($1.99):** Not sure? Just buy the **120-minute Time Pack for $1.99**. It's cheap, simple, and has no expiry.",
      "**For Occasional Users (Time Packs):** Buy minutes that **NEVER expire**. This is perfect for freelancers or light users. Get **1200 minutes for just $11.99**.",
      "**For Heavy Users (Subscription):** Go unlimited. This is the best value for teams and daily meetings. Choose **$16.99/month** or save big with **$149.99/year**.",
    ],
    tableNote:
      "Prices and availability may vary by region/store. See the main Pricing article for the most up-to-date details.",
    linkText: "See Full Pricing Breakdown",
  },
  // --- END OF REVISION ---

  compare: {
    h2: "Quick Comparison Snapshot",
    th: ["What Matters", "Typical AI Minutes Apps", "Minutes.AI (iPhone)"],
    rows: [
      [
        "Start/Record Friction",
        "Multiple taps, confusing modes",
        "One tap to record. One tap to history.",
      ],
      [
        "Output Readability",
        "Wall of text, AI-ish paragraphs",
        "Structured, scannable, action-first",
      ],
      [
        "Meeting Formats",
        "One generic template",
        "Dedicated formats (Sales, 1-on-1, etc.)",
      ],
      [
        "Follow-Through",
        "Copy/paste into other tools",
        "Built-in Project (who/when/what) & Strategy",
      ],
      [
        "Pricing Model",
        "Subscription-only (often expensive)",
        "Flexible: $1.99 Trial, Non-expiring Packs, or Unlimited Sub",
      ],
    ],
  },

  faq: {
    h2: "FAQ — The Honest Answers",
    items: [
      {
        q: "Is there a recording time limit?",
        a:
          "Your available time depends on your plan. With Time Packs, your limit is the minutes you have left (they don't expire!). With a Subscription, you have unlimited usage.",
      },
      {
        q: "Will it work offline?",
        a:
          "Yes, you can record offline. The app will sync and process the minutes once you're back online. Features may be limited until you reconnect.",
      },
      {
        q: "Is Minutes.AI only on iPhone?",
        a:
          "While this review focuses on the iPhone app, there is also a web version. We just love the iPhone app because it's so fast and always with you.",
      },
      {
        q: "How is the pricing different from other apps?",
        a:
          "Most apps *only* offer monthly or annual subscriptions. Minutes.AI is different. We offer that *plus* **non-expiring Time Packs**. This is perfect if you don't have meetings every day. You can start with a **$1.99 trial pack** to decide without a big commitment.",
      },
      {
        q: "Can I get clean, shareable outputs?",
        a:
          "Absolutely. The outputs are designed to be shared, emphasizing decisions, owners, and dates. This is what helps move work forward.",
      },
    ],
  },

  images: {
    main: {
      src: "/images/mainscreen.png",
      alt: "Minutes.AI iPhone main screen showing one-tap recording",
      caption: "Main screen — just tap to start recording. No clutter.",
    },
    minutes: {
      src: "/images/minutesimage.png",
      alt: "Example of clean, readable minutes from Minutes.AI",
      caption: "Readable minutes — decisions and action items are clear.",
    },
    formats: {
      src: "/images/formats.png",
      alt: "Minutes.AI meeting format selection screen",
      caption: "Choose the right format for your meeting.",
    },
  },

  meta: { h2: "Meta", published: "Published", type: "Guide", category: "iPhone" },
  cta: { openBrowser: "Open in browser", downloadIOS: "Download iOS app" },
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

export default function BlogRecommend() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_recommend");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/recommend";

  const reasons = txa("reasons.items");
  const compareRows = txa("compare.rows");
  const compareTh = txa("compare.th");
  const faq = txa("faq.items");

  return (
    <>
      <Head>
        {/* ======= SEO (titles include key phrases 'AI minutes app recommendation' / 'AI minutes app pricing') ======= */}
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/mainscreen.png`} />

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
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` },
              },
              image: [`${siteUrl}/images/mainscreen.png`],
            }),
          }}
        />

        {/* FAQ structured data (for '料金/おすすめ' intents) */}
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
            <span className="text-indigo-100">{txs("nav.recommend")}</span>
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

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Lead */}
          <SectionCard>
            <p className="text-base leading-7 text-indigo-100/90">{txs("lead.p1")}</p>
          </SectionCard>

          {/* 5 Reasons */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("reasons.h2")}</h2>

            {/* Reason 1 */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xl font-semibold">{reasons[0]?.t}</h3>
              <p className="text-indigo-100/90">{reasons[0]?.p}</p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src="/images/mainscreen.png"
                  alt={txs("images.main.alt")}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-indigo-200/70">{txs("images.main.caption")}</p>
              </div>
            </div>

            {/* Reason 2 */}
            <div className="mt-8 space-y-3">
              <h3 className="text-xl font-semibold">{reasons[1]?.t}</h3>
              <p className="text-indigo-100/90">{reasons[1]?.p}</p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src="/images/minutesimage.png"
                  alt={txs("images.minutes.alt")}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-indigo-200/70">{txs("images.minutes.caption")}</p>
              </div>
            </div>

            {/* Reason 3 */}
            <div className="mt-8 space-y-3">
              <h3 className="text-xl font-semibold">{reasons[2]?.t}</h3>
              <p className="text-indigo-100/90">{reasons[2]?.p}</p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src="/images/formats.png"
                  alt={txs("images.formats.alt")}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-indigo-200/70">{txs("images.formats.caption")}</p>
              </div>
            </div>

            {/* Reason 4 */}
            <div className="mt-8 space-y-3">
              <h3 className="text-xl font-semibold">{reasons[3]?.t}</h3>
              <p className="text-indigo-100/90">{reasons[3]?.p}</p>
              <div className="mt-2 text-xs text-indigo-200/80">
                <Link href="/blog/strategy" className="underline underline-offset-4 hover:no-underline">
                  {txs("strategy.linkText")}
                </Link>
              </div>
            </div>

            {/* Reason 5 */}
            <div className="mt-8 space-y-3">
              <h3 className="text-xl font-semibold">{reasons[4]?.t}</h3>
              <p className="text-indigo-100/90">{reasons[4]?.p}</p>
              <div className="mt-2 text-xs text-indigo-200/80">{reasons[4]?.note}</div>
            </div>
          </SectionCard>

          {/* Strategy section */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("strategy.h2")}</h2>
            <p className="mt-3 text-indigo-100/90">{txs("strategy.p1")}</p>
            <div className="mt-4">
              <Link href="/blog/strategy" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                {txs("strategy.linkText")}
              </Link>
            </div>
          </SectionCard>

          {/* Pricing bullets */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("pricing.h2")}</h2>
            <p className="mt-3 text-indigo-100/90">{txs("pricing.lead")}</p>
            <ul className="mt-4 space-y-3 text-indigo-100/90 list-disc ml-5">
              {txa("pricing.bullets").map((b, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
              ))}
            </ul>
            <p className="mt-3 text-xs text-indigo-200/70">{txs("pricing.tableNote")}</p>
            <div className="mt-4">
              <Link href="/blog/pricing" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                {txs("pricing.linkText")}
              </Link>
            </div>
          </SectionCard>

          {/* Comparison snapshot */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("compare.h2")}</h2>
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
                    <tr key={rIdx} className="border-b border-white/5">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-indigo-100/85 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* FAQ */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("faq.h2")}</h2>
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("meta.h2")}</h2>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_recommend"], i18nConfig)),
    },
  };
}
