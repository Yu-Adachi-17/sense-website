// src/pages/blog/pricing.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2025-11-12";
const FX = {
  // editable reference rates; checkout remains USD
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
  // Map common European locales to EUR, otherwise default to USD
  if (
    lang.startsWith("de") || lang.startsWith("fr") || lang.startsWith("es") ||
    lang.startsWith("it") || lang.startsWith("nl") || lang.startsWith("nb") ||
    lang.startsWith("pt") || lang.startsWith("fi") || lang.startsWith("sv") ||
    lang.startsWith("da") || lang.startsWith("pl") || lang.startsWith("cs") ||
    lang.startsWith("sk") || lang.startsWith("hu") || lang.startsWith("ro") ||
    lang.startsWith("el")
  ) return "EUR";
  return "USD";
};

/* ---------- English-first fallback (keys missing -> EN) ---------- */
const EN_FALLBACK = {
  seo: {
    title:
      "Minutes.AI Pricing (2025) — Simple, Flexible Plans, No-Expiry Packs & Truly Unlimited Subscriptions (USD/EUR)",
    description:
      "Explore four simple pricing options to match your meeting style. Choose a one-time pack (they never expire!) or go truly unlimited. Supports 100+ languages. Plus, you can try Minutes.AI free for 3 minutes every single day.",
    ogTitle: "Minutes.AI Pricing (2025): Simple, Flexible Plans",
    ogDescription:
      "Find the perfect plan: Time packs that never expire or truly unlimited subscriptions. Get 3 free minutes every day!",
    ld: {
      headline: "Minutes.AI Pricing (2025)",
      description:
        "Two no-expiry time packs (Trial/Light) and two unlimited subscriptions (Monthly/Annual). 100+ languages.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", pricing: "Pricing" },

  hero: {
    kicker: "Pricing",
    h1: "Minutes.AI Pricing (2025)",
    tagline:
      "Whether you have meetings daily or just occasionally, find a plan that fits. Choose from time packs that never expire or go fully unlimited. It's pricing that bends to *your* meeting rhythm.",
    subtag:
      "Join teams worldwide who love our “ultra-readable minutes.” Minutes.AI works seamlessly across iOS and Web in over 100 languages.",
    badges: ["100+ languages", "iOS & Web", "3-minute free ticket every day"],
  },

  intro: {
    h2: "Which plan fits you?",
    p1: "Daily meetings, occasional catch-ups, or just testing the waters? We've got a simple plan that gets you right to what you need.",
  },

  /* ---- Plans ---- */
  plans: {
    h2_queryHub: "Minutes AI pricing / Minutes AI app pricing / Minutes AI free plan",
    queryHub_p: "Minutes AI pricing / Minutes AI app pricing / Minutes AI free plan / meeting note taker pricing",
    h3_timepacks: "One-time time packs (no expiry)",
    timepacks_note:
      "Buy once, use forever. Your purchased minutes **never expire**. Use them to generate AI minutes from recordings whenever you need to—no rush.",
    trial: {
      name: "Trial",
      detail: "120 min",
      foot: "Fastest way to try — no expiry.",
    },
    light: {
      name: "Light",
      detail: "1200 min",
      foot: "Buy once, keep it forever.",
    },

    h3_subs: "Subscriptions (truly unlimited)",
    subs_note:
      "Forget about monthly caps. With our subscriptions, you get **truly unlimited** minutes. Focus on your work, not on watching the clock or waiting for a reset.",
    monthly: {
      name: "Monthly",
      detail: "",
      foot: "Great for busy months.",
    },
    annual: {
      name: "Annual",
      detail: "≈26% off vs monthly",
      foot: "Monthly $16.99 × 12 = $203.88 vs Annual $149.99.",
    },

    free: {
      badge: "Daily Free Ticket",
      text: "Get 3 free minutes to use Minutes.AI every single day! It's on us—no credit card required.",
    },
    bullets: [
      "**No-expiry time packs**: Buy once, use them anytime.",
      "**Truly unlimited subscriptions**: Zero caps, zero worries.",
      "**Readable AI Minutes**: 100+ languages, crystal clear on iOS & Web.",
    ],
    foot: {
      pre: "* Prices shown in {currency}.",
      post_usd: "Checkout is processed in USD; taxes/VAT may apply at checkout.",
      post_other: "Checkout is processed in USD; converted amounts are estimates.",
    },
  },

  vibe: {
    h2: "Beyond facts — minutes that move teams",
    p1: "We designed Minutes.AI so that the moment you reopen your notes, your next step is obvious. No more hunting for action items.",
    p2: "Our smart, clean formats automatically highlight decisions and follow-ups. This makes your notes incredibly easy to scan, so you can find what matters in seconds.",
    highlights: [
      "**Flexible for you**: Choose no-expiry packs or unlimited subs.",
      "**Easy to read**: Decisions and action items always stand out.",
      "**Works everywhere**: A seamless experience on both Web and iOS.",
    ],
    noteNb:
      "Norwegian (møtereferat) pricing landing is being rolled out as a dedicated page.",
  },

  compare: {
    h2: "Minutes.AI vs. Otter vs. Notta — Pricing at a Glance",
    note:
      "All prices in USD. The “Annual” price shows the equivalent cost per month, billed once a year. **Heads up:** Most competitors' plans reset your minute quota every month, and unused minutes don't roll over.",
    tableHead: ["Service", "Free Plan", "Cheapest Paid", "Unlimited", "Notable Limits", "Billing Style"],
    rows: [
      {
        service: "Minutes.AI",
        free: "A free 3-minute ticket, every day",
        cheapest: "Trial: 120 min for $1.99 (never expires)",
        unlimited: "Yes! $16.99/mo or $149.99/yr",
        limits: "Our time packs never expire. Our subs are truly uncapped.",
        billing: "Flexible: One-time packs or subscriptions",
      },
      {
        service: "Otter",
        free: "300 min/mo, up to 30 min/conv",
        cheapest: "Pro — $16.99/mo or $8.33/mo (annual)",
        unlimited: "No — Pro 1200 min/mo; Business 6000 import min/mo",
        limits: "No rollover; meeting cap 90 min (Pro), 4h (Business)",
        billing: "Seat-based subscription",
      },
      {
        service: "Notta",
        free: "120 min/mo, up to 3 min/recording",
        cheapest: "Pro — $13.49/mo (monthly) or $8.17/mo (annual)",
        unlimited: "Business — Unlimited (annual $16.67/mo)",
        limits: "No carryover; up to 5h/recording; upload quotas",
        billing: "Seat-based subscription",
      },
    ],
    foot: "Sources: official pricing pages (Otter, Notta).",
    lastUpdated: "Last updated: Nov 12, 2025",
  },

  faq: {
    h2: "FAQ — Minutes AI free plan / meeting note taker pricing",
    items: [
      {
        q: "Is there a free plan?",
        a: "Yes! You get a free 'daily ticket' that gives you 3 minutes of use, every single day.",
      },
      {
        q: "Do time packs expire?",
        a: "Nope! Purchased minutes in our time packs **never expire**. Buy them now, use them next year—it's totally up to you.",
      },
      {
        q: "How much do I save with Annual?",
        a: "You save about 26%! The monthly plan costs $16.99 (which is $203.88 for 12 months), while the annual plan is just $149.99.",
      },
      {
        q: "Are prices tax-inclusive?",
        a: "Our prices are listed in USD (US Dollars). Depending on where you live, local taxes (like VAT) may be added during the final checkout process.",
      },
      {
        q: "How many languages are supported?",
        a: "We support over 100 languages, both for understanding your speech and for formatting the final minutes.",
      },
    ],
  },

  meta: { h2: "Meta", published: "Published", type: "Guide", category: "Pricing" },
  cta: { openBrowser: "Open in browser", downloadIOS: "Download iOS app" },
};

const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

// useTx hook with EN fallback when key is missing
function useTx(ns) {
  const { t } = useTranslation(ns);

  const txs = (key, options) => {
    const val = t(key, options);
    if (typeof val === "string" && val === key) {
      const fb = getPath(EN_FALLBACK, key);
      if (typeof fb === "string") {
        if (options && typeof options === "object") {
          return Object.entries(options).reduce(
            (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
            fb
          );
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

    if (typeof val === "string" && val === key) return toArray(fb);
    if (typeof val === "object" && !Array.isArray(val)) return toArray(fb);

    return toArray(val);
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

/* ---------- Currency Toggle (USD/EUR only) ---------- */
function CurrencyToggle({ currency, setCurrency }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
      {["USD", "EUR"].map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-3 py-1.5 text-xs rounded-lg transition ${
            currency === c ? "bg-white/20 text-white" : "text-indigo-100/90 hover:bg-white/10"
          }`}
          aria-label={`Show prices in ${c}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ---------- Comparison table ---------- */
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
export default function BlogPricing({ canonicalPath = "/pricing" }) {
  const router = useRouter();
  const { txs, txa } = useTx("blog_pricing");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";

  // canonical: allow override via prop (for /nb/motereferat-ai-priser wrapper)
  const canonical = `${siteUrl}${canonicalPath || "/pricing"}`;

  // hreflang (all locales -> /pricing) + nb-NO special to /nb/motereferat-ai-priser
  const locales = i18nConfig?.i18n?.locales || ["en"];
  const altLinks = [
    { href: `${siteUrl}/pricing`, lang: "x-default" },
    ...locales.map((lc) => ({
      href: `${siteUrl}${lc === i18nConfig.i18n.defaultLocale ? "" : `/${lc}`}/pricing`,
      lang: lc === "ja" ? "ja-JP" : lc,
    })),
    { href: `${siteUrl}/nb/motereferat-ai-priser`, lang: "nb-NO" },
  ];

  // currency state
  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => {
    setCurrency(guessCurrency());
  }, []);

  // USD base prices
  const P = { TRIAL: 1.99, LIGHT: 11.99, MONTHLY: 16.99, ANNUAL: 149.99 };

  const bullets = txa("plans.bullets");
  const compareHead = txa("compare.tableHead");
  const compareRows = txa("compare.rows");
  const heroBadges = txa("hero.badges");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        {altLinks.map((l, i) => (
          <link key={i} rel="alternate" href={l.href} hrefLang={l.lang} />
        ))}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/pricing-hero.png`} />

        {/* FAQ structured data (incl. tax/VAT) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                { "@type": "Question", name: "Is there a free plan?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can use Minutes.AI free for 3 minutes every day via a daily ticket." } },
                { "@type": "Question", name: "Do time packs expire?", acceptedAnswer: { "@type": "Answer", text: "No. Purchased minutes never expire — use them whenever you need." } },
                { "@type": "Question", name: "How much do I save with Annual?", acceptedAnswer: { "@type": "Answer", text: "Monthly $16.99 × 12 = $203.88 vs Annual $149.99 — about 26% off." } },
                { "@type": "Question", name: "Are prices tax-inclusive?", acceptedAnswer: { "@type": "Answer", text: "Prices are shown in USD. Taxes/VAT may apply depending on your region at checkout." } }
              ],
            }),
          }}
        />
        {/* Article structured data */}
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
              publisher: { "@type": "Organization", name: "Minutes.AI", logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` } },
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
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-3 sm:pt-12 sm:pb-4">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">{txs("hero.tagline")}</p>
            <p className="mt-2 text-sm leading-7 text-indigo-200/90 max-w-2xl">{txs("hero.subtag")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {heroBadges.map((b, i) => <Pill key={i}>{b}</Pill>)}
            </div>

            {/* Last updated badge (visible at top) */}
            <div className="mt-4">
              <Pill>
                Last updated:{" "}
                {new Date(LAST_UPDATED_ISO).toLocaleDateString(router.locale || "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </Pill>
            </div>

            {/* Currency toggle (USD/EUR) */}
            <CurrencyToggle currency={currency} setCurrency={setCurrency} />
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Intro */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("intro.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("intro.p1")}</p>
          </SectionCard>

          {/* Query-intent hub */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-semibold">{txs("plans.h2_queryHub")}</h2>
            <p className="mt-2 text-sm text-indigo-200/80">
              {txs("plans.queryHub_p")}
            </p>
          </SectionCard>

          {/* Plans */}
          <SectionCard className="mt-8">
            <h3 className="text-xl sm:text-2xl font-semibold">{txs("plans.h3_timepacks")}</h3>
            <p className="mt-2 text-sm text-indigo-200/80">{txs("plans.timepacks_note")}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.trial.name")}</div>
                <div className="mt-1 text-xl font-bold">
                  {txs("plans.trial.detail")} / {formatMoney(1.99, currency)}
                </div>
                <p className="mt-2 text-xs text-indigo-200/80">{txs("plans.trial.foot")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.light.name")}</div>
                <div className="mt-1 text-xl font-bold">
                  {txs("plans.light.detail")} / {formatMoney(11.99, currency)}
                </div>
                <p className="mt-2 text-xs text-indigo-200/80">{txs("plans.light.foot")}</p>
              </div>
            </div>

            <h3 className="mt-8 text-xl sm:text-2xl font-semibold">{txs("plans.h3_subs")}</h3>
            <p className="mt-2 text-sm text-indigo-200/80">{txs("plans.subs_note")}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.monthly.name")}</div>
                <div className="mt-1 text-xl font-bold">{formatMoney(16.99, currency)}</div>
                <p className="mt-2 text-xs text-indigo-200/80">{txs("plans.monthly.foot")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-indigo-200/90">{txs("plans.annual.name")}</div>
                <div className="mt-1 text-xl font-bold">{formatMoney(149.99, currency)}</div>
                <p className="mt-2 text-xs text-indigo-200/80">{txs("plans.annual.foot")}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                {txs("plans.free.badge")}
              </div>
              <p className="mt-1 text-sm text-emerald-100/90">{txs("plans.free.text")}</p>
            </div>

            <ul className="mt-6 space-y-2 text-indigo-100/90">
              {txa("plans.bullets").map((b, i) => (
                <Bullet key={i}>{b}</Bullet>
              ))}
            </ul>

            <p className="mt-4 text-[12px] text-indigo-200/70">
              * {txs("plans.foot.pre", { currency })}{" "}
              {currency !== "USD"
                ? txs("plans.foot.post_other")
                : txs("plans.foot.post_usd")}
            </p>
          </SectionCard>

          {/* Vibe */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("vibe.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("vibe.p1")}</p>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("vibe.p2")}</p>
            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 text-indigo-100/90">
              {txa("vibe.highlights").map((h, i) => (
                <li key={i} className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm">
                  {h}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-indigo-200/80">{txs("vibe.noteNb")}</p>
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
          </SectionCard>

          {/* FAQ */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("faq.h2")}</h2>
            <div className="mt-4 space-y-4">
              {txa("faq.items").map((f, i) => (
                <details key={i} className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-white/90">
                    {f.q || ""}
                  </summary>
                  <p className="mt-2 text-sm text-indigo-100/90">{f.a || ""}</p>
                </details>
              ))}
            </div>
          </SectionCard>

          {/* Meta */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("meta.h2")}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-indigo-100/90">
              <Pill>
                {txs("meta.published")}:{" "}
                {new Date().toLocaleDateString(router.locale || "en-US", {
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
              <span>Browser</span>
            </Link>

            {/* App Store */}
            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
            >
              <FaAppStore className="text-lg sm:text-xl text-sky-200 group-hover:text-white" />
              <span>App Store</span>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_pricing"], i18nConfig)),
    },
  };
}
