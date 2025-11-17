// src/pages/blog/onlinemeeting.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import React from "react"; // BoldParserのためにReactをインポート

// CTA icons
import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback (リライト版コンテンツに更新) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Minutes.AI now supports Online Meetings (iOS)",
    description:
      'Click "Online" to issue a URL, share it, and start a Zoom-like meeting instantly. Clean minutes are generated automatically when the meeting ends.',
    ogTitle: "Online Meetings come to Minutes.AI",
    ogDescription:
      'Start Zoom-like meetings from the "Online" button and get automatic, well-formatted minutes at the end.',
    ld: {
      headline: "Minutes.AI adds Online Meetings",
      description:
        "Host Zoom-like meetings via an issued URL, then get automatic minutes with clear decisions and actions.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", onlinemeeting: "Online Meetings" },
  hero: {
    kicker: "Release Note",
    h1: "Online Meetings for Minutes.AI (iOS)",
    tagline:
      'Go from "Start Meeting" to "Finished Minutes"—Instantly.\nClick the new **"Online"** button, issue a unique URL, and share it with your team. Just like that, you’re in a live meeting. When you hang up, Minutes.AI automatically gets to work generating your complete, formatted minutes.',
  },
  release: {
    h2: "What’s New",
    p1: "Forget switching between apps. We’ve built a powerful, Zoom-like online meeting feature directly into Minutes.AI for iOS.",
    p2: "This update transforms your workflow: you no longer need one app to host the call and another to analyze it. It’s an all-in-one solution.",
    p3: "Host your call with a clean, familiar interface. The moment your meeting ends, Minutes.AI automatically generates your high-quality minutes, complete with clearly captured **decisions and action items**.",
  },
  image: { alt: "Minutes.AI Online Meeting UI", caption: 'Start a Zoom-like meeting right from the "Online" button.' },
  steps: {
    h2: "How to Start in 4 Simple Steps",
    items: [
      '**Tap "Online"**: Find the new "Online" button in the app or on the web.',
      "**Issue URL**: Instantly get a unique, shareable meeting link.",
      "**Share & Meet**: Send the link to your participants to join the call.",
      "**Get Minutes**: End the meeting, and your automated minutes will be ready moments later.",
    ],
  },
  features: {
    h2: "Key Highlights",
    items: [
      "**Familiar, High-Quality UX**: Enjoy a smooth, Zoom-like video call experience (powered by LiveKit).",
      "**One-Click Simplicity**: No setup required. Just tap once to get your meeting link.",
      "**Fully Automatic Minutes**: The core strength of Minutes.AI, now built directly into your calls.",
      "**Clean, Readable Formats**: Get minutes that highlight decisions and actions, not just a wall of text.",
      "**Multilingual Support**: Perfect for global teams, with support for multiple languages.",
    ],
  },
  notes: {
    h2: "Important Notes",
    items: [
      "**Meeting Duration:** The total available meeting time is based on your current Minutes.AI plan and remaining quota.",
      "**Call Quality:** As with any online call, audio and video quality may be affected by your network conditions and device settings.",
    ],
  },
  // --- 新規 Pricing セクション ---
  pricing: {
    h2: "How This Works With Your Minutes.AI Plan",
    p1: 'Since "pricing" is a top question, here’s a simple breakdown of how this new feature works with our plans.',
    p2: "Your meeting time quota is the same as your transcription quota. We offer two simple options that fit how you work.",
    timepacks: {
      h3: "1. One-Time Packs (They Never Expire)",
      p1: "Perfect for occasional meetings. Buy a pack of minutes, and use them whenever you want—this month, or next year.",
      items: ["Trial: 120 minutes for **$1.99**", "Light: 1200 minutes for **$11.99**"],
    },
    subs: {
      h3: "2. Subscriptions (Truly Unlimited)",
      p1: "For teams with regular or daily meetings. Forget watching the clock—just go truly unlimited.",
      items: ["Monthly: **$16.99** / month", "Annual: **$149.99** / year (Saves you about 26%!)"],
    },
    free: {
      quote:
        "**Don't forget:** You get a **3-minute free ticket every single day** to try any feature, including Online Meetings!",
    },
  },
  // --- ここまで ---
  meta: { h2: "Meta", published: "Published", type: "Release", category: "Online Meeting" },
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

/* ---------- NEW HELPER: Simple Markdown Bold Parser ---------- */
/**
 * A simple component to parse strings with **bold** syntax.
 * @param {{children: string}} props
 */
function BoldParser({ children }) {
  if (!children || typeof children !== "string") {
    return null;
  }
  // Split the string by the ** delimiter
  const parts = children.split("**");

  // Reassemble the parts, wrapping every odd-indexed part in <strong>
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </>
  );
}
/* ---------- END NEW HELPER ---------- */

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

/* ---------- CTA constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS =
  "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=world.senseai.minutes";

export default function BlogOnlineMeeting() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_onlinemeeting");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/onlinemeeting";

  const features = txa("features.items");
  const steps = txa("steps.items");
  const notes = txa("notes.items");

  // Pricing data
  const pricingTimepackItems = txa("pricing.timepacks.items");
  const pricingSubItems = txa("pricing.subs.items");

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
        <meta property="og:image" content={`${siteUrl}/images/LivekitMeeting.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              datePublished: new Date().toISOString(),
              dateModified: new Date().toISOString(),
              mainEntityOfPage: canonical,
              author: { "@type": "Organization", name: "Minutes.AI" },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` },
              },
              image: [`${siteUrl}/images/LivekitMeeting.png`],
              description: txs("seo.ld.description"),
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
            <span className="text-indigo-100">{txs("nav.onlinemeeting")}</span>
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
            {/* whitespace-pre-wrap を追加して \n を改行として解釈させる */}
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl whitespace-pre-wrap">
              <BoldParser>{txs("hero.tagline")}</BoldParser>
            </p>
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Release Note (リライト版) */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("release.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{txs("release.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{txs("release.p2")}</p>
              <p className="text-base leading-7 text-indigo-100/90">
                <BoldParser>{txs("release.p3")}</BoldParser>
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src="/images/LivekitMeeting.png"
                  alt={txs("image.alt")}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-indigo-200/70">{txs("image.caption")}</p>
              </div>
            </div>
          </SectionCard>

          {/* How to start (リライト版) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("steps.h2")}</h2>
            <ol className="mt-4 space-y-2 text-indigo-100/90 list-decimal ml-5">
              {steps.map((s, i) => (
                <li key={i}>
                  <BoldParser>{s}</BoldParser>
                </li>
              ))}
            </ol>
            {/* Pill (steps.note) は削除 */}
          </SectionCard>

          {/* Features (リライト版) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("features.h2")}</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {features.map((f, i) => (
                <li key={i}>
                  <BoldParser>{f}</BoldParser>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Notes (リライト版) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("notes.h2")}</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {notes.map((n, i) => (
                <li key={i}>
                  <BoldParser>{n}</BoldParser>
                </li>
              ))}
            </ul>
            {/* foot は削除 */}
          </SectionCard>

          {/* --- 新規 Pricing セクション --- */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("pricing.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("pricing.p1")}</p>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("pricing.p2")}</p>
            
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Time Packs */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">{txs("pricing.timepacks.h3")}</h3>
                <p className="mt-1 text-sm text-indigo-200/80">{txs("pricing.timepacks.p1")}</p>
                <ul className="mt-3 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {pricingTimepackItems.map((p, i) => (
                    <li key={i}><BoldParser>{p}</BoldParser></li>
                  ))}
                </ul>
              </div>
              {/* Subscriptions */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold">{txs("pricing.subs.h3")}</h3>
                <p className="mt-1 text-sm text-indigo-200/80">{txs("pricing.subs.p1")}</p>
                <ul className="mt-3 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {pricingSubItems.map((p, i) => (
                    <li key={i}><BoldParser>{p}</BoldParser></li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Free Offer */}
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
               <blockquote className="text-sm text-emerald-100/90">
                 <BoldParser>{txs("pricing.free.quote")}</BoldParser>
               </blockquote>
            </div>
          </SectionCard>
          {/* --- ここまで --- */}


          {/* Meta (元のまま維持) */}
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

          {/* CTA (元のまま維持) */}
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_onlinemeeting"], i18nConfig)),
    },
  };
}