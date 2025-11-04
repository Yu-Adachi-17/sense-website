// src/pages/blog/pricing.js
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
    title: "Minutes.AI Pricing — Honest Plans for Every Meeting Style",
    description:
      "Minutes.AI offers two one-time time packs with no expiry and truly unlimited subscriptions. See how it compares to Otter and Notta across price, quotas, and rollover.",
    ogTitle: "Minutes.AI Pricing",
    ogDescription:
      "Time packs with no expiry + unlimited subscriptions. Compare Minutes.AI vs. Otter & Notta.",
    ld: {
      headline: "Minutes.AI Pricing",
      description:
        "Four simple plans: two one-time time packs (no expiry) and two unlimited subscriptions. Includes a comparison vs. Otter and Notta.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", pricing: "Pricing" },

  hero: {
    kicker: "Pricing",
    h1: "Minutes.AI Pricing (2025)",
    tagline:
      "Two one-time time packs with no expiry. Or go fully unlimited with monthly/annual subscriptions.",
  },

  intro: {
    h2: "Which Minutes.AI plan fits you?",
    p1: "Minutes.AI provides four options optimized for how often you meet.",
  },

  plans: {
    h3_timepacks: "Time-Pack Type",
    timepacks_note: "Purchased time never expires. Generate AI minutes from recordings any time.",
    trial: { name: "Trial", detail: "120 min / $1.99" },
    light: { name: "Light", detail: "1200 min / $11.99" },

    h3_subs: "Subscription Type",
    subs_note: "Subscriptions are truly unlimited — no monthly caps.",
    monthly: { name: "Monthly", detail: "$16.99" },
    annual: { name: "Annual", detail: "$149.99" },

    free: {
      badge: "Daily Free Ticket",
      text: "Even without paying, you get a 3-minute free ticket every day to try Minutes.AI.",
    },
    bullets: [
      "No-expiry time packs: buy once, use anytime",
      "Unlimited usage on subscriptions (no minutes cap)",
      "iOS & Web, multilingual outputs",
    ],
  },

  compare: {
    h2: "Minutes.AI vs. Otter vs. Notta — Pricing at a Glance",
    note: "Key pricing and quotas (USD). ‘Annual’ denotes price per month when billed annually. Competitors typically reset monthly quotas with no carryover.",
    tableHead: ["Service", "Free Plan", "Cheapest Paid", "Unlimited Usage", "Notable Limits", "Billing Style"],
    // Rows are strings so that i18n can localize freely later
    rows: [
      {
        service: "Minutes.AI",
        free: "Daily 3-min ticket",
        cheapest: "Trial 120 min / $1.99 (no expiry)",
        unlimited: "Yes — $16.99/mo or $149.99/yr",
        limits: "Time packs have no expiry. Subscriptions are uncapped.",
        billing: "One-time time packs + subscriptions",
      },
      {
        service: "Otter",
        free: "300 min/mo, up to 30 min/conversation",
        cheapest: "Pro — $16.99/mo or $8.33/mo (annual)",
        unlimited: "No — Pro 1200 min/mo; Business 6000 import min/mo",
        limits: "Monthly minutes don’t roll over; per-meeting cap 90 min (Pro), 4h (Business)",
        billing: "Seat-based subscription",
      },
      {
        service: "Notta",
        free: "120 min/mo, up to 3 min/recording",
        cheapest: "Pro — $13.49/mo (monthly) or $8.17/mo (annual)",
        unlimited: "Business — Unlimited (annual $16.67/mo; monthly higher)",
        limits: "No carryover; up to 5h per recording; file upload quotas",
        billing: "Seat-based subscription",
      },
    ],
    foot: "Sources: official pricing pages for Otter and Notta; Notta monthly price reference from G2.",
    lastUpdated: "Last updated: Oct 31, 2025",
  },

  why: {
    h2: "Why we designed plans this way",
    items: [
      "People who meet daily: choose Unlimited for predictability.",
      "People who meet occasionally: buy a Light pack once and forget about expirations.",
      "Just trying it out: Trial pack + daily 3-minute ticket.",
    ],
  },

  meta: { h2: "Meta", published: "Published", type: "Guide", category: "Pricing" },

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

function Bullet({ children }) {
  return (
    <li className="pl-2 before:mr-2 before:inline-block before:h-[6px] before:w-[6px] before:rounded-full before:bg-indigo-300/80">
      {children}
    </li>
  );
}

/* ---------- Table component ---------- */
function CompareTable({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-sm text-indigo-200/80">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top text-sm">
              <td className="px-3 py-3 rounded-l-xl bg-white/5 text-white/90">{r.service}</td>
              <td className="px-3 py-3 bg-white/5 text-indigo-100/90">{r.free}</td>
              <td className="px-3 py-3 bg-white/5 text-indigo-100/90">{r.cheapest}</td>
              <td className="px-3 py-3 bg-white/5 text-indigo-100/90">{r.unlimited}</td>
              <td className="px-3 py-3 bg-white/5 text-indigo-100/90">{r.limits}</td>
              <td className="px-3 py-3 rounded-r-xl bg-white/5 text-indigo-100/90">{r.billing}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Page ---------- */
export default function BlogPricing() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_pricing");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl + (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) + "/blog/pricing";

  const bullets = txa("plans.bullets");
  const compareHead = txa("compare.tableHead");
  const compareRows = txa("compare.rows");

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
        <meta property="og:image" content={`${siteUrl}/images/pricing-hero.png`} />
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
              image: [`${siteUrl}/images/pricing-hero.png`],
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
            <span className="text-indigo-100">{txs("nav.pricing")}</span>
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
          {/* Intro */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("intro.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("intro.p1")}</p>
          </SectionCard>

          {/* Plans */}
          <SectionCard className="mt-8">
            <h3 className="text-xl sm:text-2xl font-semibold">{txs("plans.h3_timepacks")}</h3>
            <p className="mt-2 text-sm text-indigo-200/80">{txs("plans.timepacks_note")}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.trial.name")}</div>
                <div className="mt-1 text-xl font-bold">{txs("plans.trial.detail")}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.light.name")}</div>
                <div className="mt-1 text-xl font-bold">{txs("plans.light.detail")}</div>
              </div>
            </div>

            <h3 className="mt-8 text-xl sm:text-2xl font-semibold">{txs("plans.h3_subs")}</h3>
            <p className="mt-2 text-sm text-indigo-200/80">{txs("plans.subs_note")}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.monthly.name")}</div>
                <div className="mt-1 text-xl font-bold">{txs("plans.monthly.detail")}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.annual.name")}</div>
                <div className="mt-1 text-xl font-bold">{txs("plans.annual.detail")}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                {txs("plans.free.badge")}
              </div>
              <p className="mt-1 text-sm text-emerald-100/90">{txs("plans.free.text")}</p>
            </div>

            <ul className="mt-6 space-y-2 text-indigo-100/90">
              {bullets.map((b, i) => (
                <Bullet key={i}>{b}</Bullet>
              ))}
            </ul>
          </SectionCard>

          {/* Compare */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("compare.h2")}</h2>
            <p className="mt-2 text-sm text-indigo-200/80">{txs("compare.note")}</p>

            <div className="mt-4">
              <CompareTable head={compareHead} rows={compareRows} />
            </div>

            <div className="mt-4 text-xs text-indigo-200/70">
              <Pill>{txs("compare.lastUpdated")}</Pill>
            </div>

            <p className="mt-3 text-xs text-indigo-200/70">{txs("compare.foot")}</p>

            {/* Hard facts inline (kept simple for SEO robots) */}
            <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-3 text-[12px] leading-6 text-indigo-200/80">
              <strong>Facts snapshot:</strong>
              <ul className="list-disc pl-5">
                <li>Otter Pro: $16.99/month or $8.33/month (annual). 1200 min/month. No rollover.</li>
                <li>Otter Business: $30/month or $19.99/month (annual). Import 6000 min/month. No rollover.</li>
                <li>Notta Free: 120 min/month; up to 3 min/recording. No carryover.</li>
                <li>Notta Pro: $8.17/month (annual) or about $13.49/month (monthly reference). 1800 min/month.</li>
                <li>Notta Business: $16.67/month (annual). Unlimited transcription; 5h/recording; file quotas apply.</li>
              </ul>
            </div>
          </SectionCard>

          {/* Why */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("why.h2")}</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {txa("why.items").map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
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
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_pricing"], i18nConfig)),
    },
  };
}
