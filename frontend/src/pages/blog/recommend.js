// src/pages/blog/recommend.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback (used when i18n returns keys) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "(2025) Why we recommend the Minutes.AI iPhone app for meeting minutes",
    description:
      "Looking for an iPhone meeting-minutes AI app? Here’s the blunt truth: Minutes.AI is a straight-to-the-point, readable, action-oriented minutes app with flexible pricing.",
    ogTitle: "Minutes.AI iPhone app — our no-BS recommendation",
    ogDescription:
      "Stop wading through fluff. If you’re searching 'AI minutes app recommendation' or 'AI minutes app pricing', this guide explains why the Minutes.AI iPhone app is the pick.",
    ld: {
      headline: "Why we recommend the Minutes.AI iPhone app",
      description:
        "Five direct reasons: radically simple UI, readable/actionable outputs, format per meeting type, post-meeting actions (Project/Strategy), and sane, flexible pricing.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", recommend: "Why Minutes.AI for iPhone" },

  hero: {
    kicker: "Buyer's Guide (No-BS)",
    h1: "Why the Minutes.AI iPhone app is our top pick for meeting minutes (2025)",
    tagline:
      "If you’re googling “議事録 AI アプリ おすすめ” or “議事録 AI アプリ 料金”, here’s the straight talk: this app is built to record fast, generate clean minutes, and drive next actions.",
  },

  lead: {
    p1:
      "AI minutes apps are everywhere now. Here’s why we still recommend Minutes.AI on iPhone. We’ll be unapologetically direct and keep it to five reasons.",
  },

  reasons: {
    h2: "5 reasons we recommend the Minutes.AI iPhone app",
    items: [
      {
        t: "1) Ridiculously simple UI — zero thinking to start",
        p:
          "No labyrinth. One tap to record. One tap to see previous minutes. That’s it. People shouldn’t need a manual to take minutes.",
        imgAlt: "Minutes.AI main screen with one-tap recording",
        caption: "One-tap start, one-tap history. Learn nothing, ship minutes.",
      },
      {
        t: "2) Readability and real “value” over AI fluff",
        p:
          "It’s not “AI-ish” noise. Headings, emphasis, and structure are tuned so readers can jump straight to decisions and next steps. It’s optimized for action, not just text.",
        imgAlt: "Readable minutes emphasizing decisions and actions",
        caption: "Decisions pop. Owners and deadlines are obvious by design.",
      },
      {
        t: "3) Pick the best format per meeting",
        p:
          "General meeting, negotiation/sales, 1-on-1, presentation, brainstorm, interview… Each format is customized to how that meeting actually works in the real world.",
        imgAlt: "Format selection: general, negotiation, 1-on-1, presentation, brainstorm, interview",
        caption: "Format matters. Structure changes how teams behave.",
      },
      {
        t: "4) Post-meeting actions are built-in (Project & Strategy)",
        p:
          "Press “Project” to instantly output “who does what by when,” and keep it visible inside the app. Press “Strategy” to have the latest AI (ChatGPT-5 & Gemini 2.5 Pro) propose concrete next moves based on your meeting.",
        note: "Want a deeper dive on Strategy? See the article below.",
      },
      {
        t: "5) Pricing that actually fits usage (including time packs)",
        p:
          "Not everyone needs another monthly subscription. Minutes.AI lets daily power users pick Unlimited, and light users buy non-expiring time. Trial is just 120 min for $1.99 — cheap enough to judge for yourself.",
        note: "Full details and math below.",
      },
    ],
  },

  strategy: {
    h2: "Strategy: turn minutes into motion",
    p1:
      "“Strategy” takes your meeting context and proposes next action plans with top-tier models. Less hand-waving, more concrete steps you can assign.",
    linkText: "Read the Strategy deep-dive",
  },

  pricing: {
    h2: "Pricing that won’t fight you",
    lead:
      "Different teams have different rhythms. Minutes.AI doesn’t force you into one payment pattern.",
    bullets: [
      "Trial: 120 minutes for $1.99 — the honest ‘taste test’.",
      "Time Packs: non-expiring. Use when you actually meet.",
      "Unlimited Subscription: for daily/weekly heavy users.",
    ],
    tableNote:
      "Prices and availability may vary by region/store. See the Pricing article for up-to-date details.",
    linkText: "See full Pricing breakdown",
  },

  compare: {
    h2: "Quick comparison snapshot",
    th: ["What matters", "Typical AI minutes apps", "Minutes.AI (iPhone)"],
    rows: [
      [
        "Start/record friction",
        "Multiple taps, mode confusion",
        "One tap to record. One tap to history.",
      ],
      [
        "Output readability",
        "Verbose, AI-ish paragraphs",
        "Structured, emphasized, action-first",
      ],
      [
        "Per-meeting format",
        "One generic template",
        "Dedicated formats: general/sales/1-on-1/etc.",
      ],
      [
        "Post-meeting follow-through",
        "Copy/paste into task tools",
        "Project (who/when/what) & Strategy (next moves)",
      ],
      [
        "Pricing fit",
        "Subscription only",
        "Trial $1.99 / Time Packs / Unlimited",
      ],
    ],
  },

  faq: {
    h2: "FAQ — the blunt answers",
    items: [
      {
        q: "Is there a recording time limit?",
        a:
          "Your available time depends on plan/quota. With Time Packs and Unlimited, you can record according to your remaining balance or plan limits.",
      },
      {
        q: "Will it work offline?",
        a:
          "You can record offline and sync when back online. Generation quality/features may vary until the device reconnects.",
      },
      {
        q: "Is Minutes.AI only on iPhone?",
        a:
          "No. There’s a web version and broader support. But iPhone is our friction-free, always-with-you choice for fast capture.",
      },
      {
        q: "How is pricing different from others?",
        a:
          "Most apps push monthly/annual only. We also offer non-expiring time — great if you meet less frequently — plus a cheap trial to decide without commitment.",
      },
      {
        q: "Can I get clean, shareable outputs?",
        a:
          "Yes. Minutes emphasize decisions, owners, and dates. That’s the difference between reading minutes and actually moving work forward.",
      },
    ],
  },

  images: {
    main: {
      src: "/images/mainscreen.png",
      alt: "Minutes.AI iPhone main screen",
      caption: "Main screen — start recording instantly.",
    },
    minutes: {
      src: "/images/minutesimage.png",
      alt: "Minutes.AI generated minutes example",
      caption: "Readable minutes — decisions and next steps are obvious.",
    },
    formats: {
      src: "/images/formats.png",
      alt: "Minutes.AI meeting formats",
      caption: "Pick the right format for the meeting, not the other way around.",
    },
  },

  meta: { h2: "Meta", published: "Published", type: "Guide", category: "iPhone" },
  cta: { openBrowser: "Open in browser", downloadIOS: "Download iOS app" },
};

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
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {txa("pricing.bullets").map((b, i) => (
                <li key={i}>{b}</li>
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
                  <p className="mt-1 text-indigo-100/90">{f.a}</p>
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
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg:white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              {txs("cta.openBrowser")}
            </Link>
            <a
              href="https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              {txs("cta.downloadIOS")}
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
