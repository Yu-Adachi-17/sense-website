// src/pages/blog/universalminutes.js
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

/* ---------- Inline English fallback (Reconstructed by Gemini) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Why Minutes.AI Delivers the Best Minutes for Any Meeting Type",
    description:
      "A generic template fails. Learn why a baseline (Decisions, To-Dos, Risks) is just the start, and how AI must adapt to capture the 'temperature' of a 1-on-1 or brainstorm.",
    ogTitle: "Beyond 'To-Do': Why Your 1-on-1 Minutes Feel 'Tasteless'",
    ogDescription:
      "A simple to-do list isn't a good 1-on-1 summary. Learn how Minutes.AI adapts its output to match the *purpose* of your meeting, from negotiations to feedback sessions.",
    ld: {
      headline: "The 'One-Size-Fits-All' Minutes Problem (And How to Fix It)",
      description:
        "A pragmatic baseline is useful, but it fails to capture the 'temperature' of human-centric meetings. We explore how adaptive AI creates truly valuable minutes.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", current: "Why AI Minutes Must Adapt" },

  hero: {
    kicker: "Playbook",
    h1: "Why AI Gets You Better Minutes for *Any* Meeting Type",
    tagline:
      "A universal baseline (Decisions, To-Dos, Risks) ensures clarity. But great minutes adapt. We explore why a 1-on-1 and a sales call should *not* have the same format.",
  },

  byline: { name: "Written by Yu Adachi", title: "CEO, Sense G.K." },

  recap: {
    h2: "Recap: The 'Meaningful Minutes' Baseline",
    p1: {
      pre: "In our",
      link: "previous article",
      post: "we defined 'meaningful minutes' as knowing 'who does what by when' at a glance.",
    },
    points: [
      "Clear discussion points",
      "Key decisions and owners",
      "Actionable To-Do items",
      "Visible risks and blockers",
    ],
    note: "This raises a sharp question: Is this single format 'good enough' for *every* type of meeting?",
  },

  diversity: {
    h2: "The Problem: Not All Meetings Are Created Equal",
    core: {
      h3: "Typical Meetings",
      items: [
        "Weekly check-in (Updates & tactics)",
        "Brainstorming (Idea generation)",
        "Sales & negotiation (Commitments)",
      ],
    },
    wide: {
      h3: "The Wider Spectrum of 'Meetings'",
      items: [
        "1-on-1 (Growth & feedback)",
        "Interview (Evaluation)",
        "Workshop or Lecture (Learning)",
      ],
    },
    p1: "Any time people gather for a shared purpose, it's a meeting. And while our baseline ensures *readability*, forcing every meeting into it can be rough.",
  },

  limits: {
    h2: "The Limit of a 'One-Size-Fits-All' Template",
    p1: "Forcing every conversation into the same four buckets is restrictive. It creates 'tasteless' (無味乾燥) minutes that lose all the critical context.",
    generic: {
      h3: "The Generic Baseline (Lacks 'Temperature')",
      items: [
        "Guarantees a consistent, readable summary",
        "Easy to search across all meetings",
        "Captures key outcomes (decisions, to-dos)",
      ],
    },
    optimized: {
      h3: "The Optimized Output (Captures Purpose)",
      items: [
        "Negotiation: Tracks objections, alternatives, and commitments.",
        "Brainstorm: Captures themes, raw ideas, and 'what if' scenarios.",
        "Retrospective: Groups feedback (Keep, Problem, Try) with owners.",
      ],
    },
  },

  oneonone: {
    h2: "1-on-1 Example: The 'Lost Temperature' Problem",
    generic: {
      h3: "Generic (But 'Tasteless') Minutes",
      items: [
        "Discussion: Employee A is struggling with team dynamics.",
        "Decision: Manager B will mediate.",
        "To-Do: B to mediate; follow-up 1-on-1 on the 15th.",
        "Risks: What if Manager B is absent?",
        "Critique: This isn't *wrong*, but it's sterile. It's lost the human 'temperature' (温度感) of the conversation.",
      ],
    },
    optimized: {
      h3: "Optimized 1-on-1 (Captures Context & Tone)",
      items: [
        "Captures core emotion and tone ('Frustrated but open')",
        "Summarizes the employee's perspective and concerns",
        "Lists the manager's commitments and agreements",
        "Preserves the context so the follow-up is meaningful.",
      ],
    },
  },

  why: {
    h2: "This Is Why Minutes.AI Excels",
    items: [
      "Starts with a clear, universal baseline (Decisions, To-Dos).",
      "Intelligently optimizes the format for the *purpose* of the meeting.",
      "Captures the 'temperature' and context, not just dry facts.",
      "Constantly improving the 'most valuable output' for every scenario.",
      "Delivers structured, searchable minutes that are *actually* useful.",
    ],
  },

  wrap: {
    h2: "Experience It Yourself",
    p: "A baseline is just the start. Stop settling for 'tasteless' minutes that lose what's important. Experience a smarter AI that adapts to *you*.",
  },

  cta: {
    openBrowser: "Open in browser",
    downloadIOS: "Download iOS app",
    downloadGooglePlay: "Get it on Google Play",
  },
};

/* ---------- tiny helpers (same as reference) ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

/* i18n wrapper: if key is missing, use EN fallback */
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
    if (Array.isArray(val)) return val;
    const fb = getPath(EN_FALLBACK, key);
    return toArray(fb);
  };
  return { txs, txa };
}

/* ---------- Small UI components ---------- */
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
function StatFootnote({ children }) {
  return <p className="mt-3 text-xs text-indigo-200/70">{children}</p>;
}

/* ---------- Author Byline ---------- */
function Byline() {
  const { txs } = useTx("blog_universal");
  return (
    <div className="mt-8 flex items-center gap-3 text-sm text-indigo-100/85">
      <div className="h-9 w-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
        <span className="text-xs font-bold">YA</span>
      </div>
      <div>
        <p className="font-semibold">{txs("byline.name")}</p>
        <p className="text-indigo-200/80">{txs("byline.title")}</p>
      </div>
    </div>
  );
}

/* ---------- CTA link constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS =
  "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=world.senseai.minutes";

/* ---------- Page ---------- */
export default function BlogUniversalMinutes() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_universal");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/universalminutes";

  const recapPoints = txa("recap.points");
  const diversityCore = txa("diversity.core.items");
  const diversityWide = txa("diversity.wide.items");
  const limitsGeneric = txa("limits.generic.items");
  const limitsOptimized = txa("limits.optimized.items");
  const oneoneGeneric = txa("oneonone.generic.items");
  const oneoneOptimized = txa("oneonone.optimized.items");
  const whyItems = txa("why.items");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta
          name="description"
          content={txs("seo.description")}
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />

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
              author: {
                "@type": "Person",
                name: "Yu Adachi",
                jobTitle: "CEO",
                worksFor: { "@type": "Organization", name: "Sense G.K." },
              },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` },
              },
              image: [`${siteUrl}/images/hero-phone.png`],
            }),
          }}
        />
      </Head>

      {/* Background & Header */}
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

          {/* breadcrumbs */}
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
            <Byline />
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Recap of previous article */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("recap.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">
                {txs("recap.p1.pre")}{" "}
                <Link href="/blog/introduction" className="underline underline-offset-2">
                  {txs("recap.p1.link")}
                </Link>{" "}
                {txs("recap.p1.post")}
              </p>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                {recapPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <StatFootnote>{txs("recap.note")}</StatFootnote>
            </div>
          </SectionCard>

          {/* Diversity of meetings */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("diversity.h2")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/90">{txs("diversity.core.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {diversityCore.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/90">{txs("diversity.wide.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {diversityWide.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("diversity.p1")}</p>
          </SectionCard>

          {/* Limits of one-size-fits-all */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("limits.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("limits.p1")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">{txs("limits.generic.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {limitsGeneric.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold">{txs("limits.optimized.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {limitsOptimized.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* 1on1 example (temperature/tones) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("oneonone.h2")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-indigo-200/90">{txs("oneonone.generic.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {oneoneGeneric.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-indigo-200/90">{txs("oneonone.optimized.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {oneoneOptimized.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* Why Minutes.AI works for every meeting */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("why.h2")}</h2>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-indigo-100/90">
              {whyItems.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </SectionCard>

          {/* Wrap-up */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("wrap.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("wrap.p")}</p>
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
              <span>{txs("cta.downloadGooglePlay")}</span>
            </a>
          </div>
        </main>
      </div>
    </>
  );
}

/* ---------- SSR: load this page's namespace (match reference) ---------- */
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "en",
        ["common", "blog_universal"],
        i18nConfig
      )),
    },
  };
}