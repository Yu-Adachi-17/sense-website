// src/pages/blog/aiedit.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

// Icons
import { TbWorld, TbWand, TbMessage, TbRefresh, TbPencilStar } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const PUBLISHED_DATE = "2026-03-28T10:00:00+09:00";
const MODIFIED_DATE = "2026-03-28T10:00:00+09:00";

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
  if (
    lang.startsWith("de") || lang.startsWith("fr") || lang.startsWith("es") ||
    lang.startsWith("it") || lang.startsWith("nl") || lang.startsWith("nb") ||
    lang.startsWith("pt") || lang.startsWith("fi") || lang.startsWith("pl")
  ) return "EUR";
  return "USD";
};

/* ---------- English-first fallback ---------- */
const EN_FALLBACK = {
  seo: {
    title: "AI Edit: Reshape Your Meeting Minutes with a Single Instruction | Minutes.AI",
    description: "Minutes.AI's new AI Edit feature lets you refine, restructure, and customize auto-generated meeting minutes with natural-language commands.",
    ogTitle: "AI Edit: Your Minutes, Your Way — Powered by AI",
    ogDescription: "Stop settling for generic meeting notes. AI Edit lets you reshape minutes with simple prompts.",
    ld: {
      headline: "AI Edit: Reshape Your Meeting Minutes with a Single Instruction",
      description: "An introduction to Minutes.AI's AI Edit feature that lets users refine auto-generated minutes with natural-language instructions.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", feature: "New Feature" },

  hero: {
    kicker: "New Feature",
    h1: "AI Edit: Your Minutes, Exactly the Way You Want Them",
    tagline:
      "Auto-generated meeting minutes are a great start — but they're rarely perfect on the first try. With AI Edit, you can now refine, restructure, and customize your minutes using simple natural-language instructions.",
    subtag:
      "No more tedious manual edits. A single prompt can turn raw minutes into a polished, purpose-built document.",
    badges: ["Natural-Language Editing", "Instant Refinement", "Context-Aware"],
  },

  problem: {
    h2: "The 'Almost Perfect' Problem",
    p1: "AI-generated meeting minutes are incredibly useful — they capture discussions, decisions, and action items automatically. But there's always been a gap between what the AI produces and what you actually need.",
    p2: "Maybe the format doesn't match your team's style. Maybe it's too verbose for a quick executive report, or too brief when you need granular action items. Until now, the only option was to manually rewrite sections.",
    quote: "\"The AI summary is good, but I always end up spending 15 minutes tweaking it.\"",
  },

  solution: {
    h2: "Just Tell the AI What You Want",
    p1: "**AI Edit** changes everything. Instead of manually editing your minutes line by line, you simply give the AI a natural-language instruction — and it restructures the entire document for you.",
    p2: "It's like having a personal editor who understands context, tone, and purpose. Whether you need a complete rewrite or a subtle adjustment, AI Edit handles it effortlessly.",
    highlights: [
      "**\"Make it executive-friendly\"** — Strips out details and highlights key decisions.",
      "**\"Make it more concise\"** — Removes redundancy while preserving every critical point.",
      "**\"Extract detailed action items\"** — Pulls out granular to-dos with owners and deadlines.",
      "**\"Rewrite for the engineering team\"** — Adjusts tone and focus for a technical audience.",
      "**\"Add a summary at the top\"** — Generates a brief overview without altering the body.",
    ],
  },

  usps: {
    h2: "Why AI Edit is a Game-Changer",
    items: [
      {
        icon: "wand",
        title: "The 'Itchy Spot' is Finally Scratched",
        desc: "Other AI minute services generate notes and leave you there. AI Edit goes further — it lets you keep refining until the output matches exactly what you had in mind.",
      },
      {
        icon: "message",
        title: "Natural Language, No Learning Curve",
        desc: "No templates. No dropdowns. No complicated settings. Just type what you want in plain language and AI Edit understands your intent.",
      },
      {
        icon: "refresh",
        title: "Iterate as Many Times as You Like",
        desc: "Not happy with the first edit? Give another instruction. You can refine the same document over and over until it's perfect.",
      },
    ],
  },

  pricing: {
    h2: "Simple, Transparent Pricing",
    p1: "AI Edit is available across all Minutes.AI plans. Choose the plan that fits your workflow.",
    trial: { name: "Trial Pack", detail: "120 min", foot: "$1.99 (No expiry)" },
    light: { name: "Light Pack", detail: "1200 min", foot: "$11.99 (No expiry)" },
    monthly: { name: "Monthly", detail: "Unlimited", foot: "$16.99 / mo" },
    annual: { name: "Annual", detail: "Unlimited", foot: "$149.99 / yr" },
    free: { badge: "Free Daily Ticket", text: "Try it free for 3 minutes every day." },
    bullets: [
      "**Time Packs**: Great for occasional use — minutes never expire.",
      "**Subscriptions**: Unlimited recording and editing for power users.",
      "**100+ Languages**: Record and edit minutes in over 100 languages.",
    ],
    foot: {
      pre: "* Prices shown in {currency}.",
      post: "Taxes may apply at checkout.",
    },
  },

  cta: {
    h2: "Try AI Edit Now",
    text: "Record a meeting, generate your minutes, and give AI Edit a spin. You'll wonder how you ever worked without it.",
    openBrowser: "Open Minutes.AI (Web)",
    downloadIOS: "Download iOS App",
  },

  meta: { h2: "Meta", published: "Published", type: "Feature", category: "Product Update" },
};

/* ---------- Utility Functions ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

function useTx(ns) {
  const { t } = useTranslation(ns);
  const txs = (key, options) => {
    const val = t(key, options);
    if (typeof val === "string" && val === key) {
      const fb = getPath(EN_FALLBACK, key);
      if (typeof fb === "string") {
        if (options && typeof options === "object") {
          return Object.entries(options).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), fb);
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
    if (typeof val === "object") return toArray(fb);
    return toArray(val);
  };
  return { txs, txa };
}

/* ---------- UI Components ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-block rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs tracking-wide text-emerald-200">
      {children}
    </span>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur " +
        "shadow-[0_10px_40px_rgba(16,185,129,0.10)] " +
        className
      }
    >
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
      {children}
    </section>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-xs text-emerald-100/90 border border-white/5">
      {children}
    </span>
  );
}

function Bullet({ children }) {
  return (
    <li className="pl-2 relative before:absolute before:left-0 before:top-2.5 before:h-[6px] before:w-[6px] before:rounded-full before:bg-emerald-400">
      {children}
    </li>
  );
}

function IconBox({ iconName }) {
  const size = 24;
  let Icon = TbWand;
  if (iconName === "message") Icon = TbMessage;
  if (iconName === "refresh") Icon = TbRefresh;

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
      <Icon size={size} />
    </div>
  );
}

function PricingCard({ name, price, detail, foot, highlight }) {
  return (
    <div className={`flex flex-col rounded-2xl border p-4 ${highlight ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-black/20"}`}>
      <div className="text-sm text-emerald-200/80">{name}</div>
      <div className="mt-1 text-xl font-bold text-white">{price}</div>
      <div className="text-xs font-medium text-emerald-300">{detail}</div>
      <div className="mt-2 text-[10px] text-white/40">{foot}</div>
    </div>
  );
}

/* ---------- CTA constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS = "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

/* ---------- Page ---------- */
export default function BlogAIEdit() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_aiedit");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/aiedit`;

  // Currency
  const [currency, setCurrency] = React.useState("USD");
  React.useEffect(() => { setCurrency(guessCurrency()); }, []);

  // SEO
  const locales = i18nConfig?.i18n?.locales || ["en"];
  const altLinks = [
    { href: `${siteUrl}/blog/aiedit`, lang: "x-default" },
    ...locales.map((lc) => ({
      href: `${siteUrl}${lc === i18nConfig.i18n.defaultLocale ? "" : `/${lc}`}/blog/aiedit`,
      lang: lc === "ja" ? "ja-JP" : lc,
    })),
  ];

  const heroBadges = txa("hero.badges");
  const solutionHighlights = txa("solution.highlights");
  const uspItems = txa("usps.items");
  const pricingBullets = txa("pricing.bullets");

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
        <meta property="og:image" content={`${siteUrl}/images/aiedit.jpeg`} />

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
              description: txs("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_50%_-20%,rgba(16,185,129,.15),transparent),radial-gradient(800px_600px_at_0%_100%,rgba(20,184,166,.15),transparent)]`}
      >
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href={LINK_HOME}
            aria-label={txs("aria.home")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-emerald-200/80">
            <Link href="/blog" className="hover:underline">
              {txs("nav.blog")}
            </Link>
            <span className="mx-2 text-emerald-300/50">/</span>
            <span className="text-emerald-100">{txs("nav.feature")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-14 sm:pb-8">
            <div className="flex justify-start">
              <Kicker>{txs("hero.kicker")}</Kicker>
            </div>
            <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-emerald-200 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-7 text-emerald-100/90 max-w-2xl">
              {txs("hero.tagline")}
            </p>
            <p className="mt-2 text-sm leading-7 text-emerald-200/70 max-w-2xl">
              {txs("hero.subtag")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {heroBadges.map((b, i) => (
                <Pill key={i}>{b}</Pill>
              ))}
            </div>
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">

          {/* Problem */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-red-400/80 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {txs("problem.h2")}
              </h2>
            </div>
            <p className="text-base leading-7 text-emerald-100/90">{txs("problem.p1")}</p>
            <p className="mt-4 text-base leading-7 text-emerald-100/90">{txs("problem.p2")}</p>
            <blockquote className="mt-6 border-l-2 border-emerald-500/30 pl-4 text-emerald-200 italic">
              {txs("problem.quote")}
            </blockquote>
          </SectionCard>

          {/* Solution */}
          <SectionCard className="mt-8 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                <TbPencilStar size={18} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {txs("solution.h2")}
              </h2>
            </div>
            <p className="text-base leading-7 text-emerald-100/90">{txs("solution.p1")}</p>
            <p className="mt-2 text-base leading-7 text-emerald-100/90">{txs("solution.p2")}</p>

            <ul className="mt-6 space-y-3 text-emerald-100/90">
              {solutionHighlights.map((h, i) => (
                <Bullet key={i}>
                  <span dangerouslySetInnerHTML={{ __html: h.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                </Bullet>
              ))}
            </ul>
          </SectionCard>

          {/* USPs Grid */}
          <SectionCard className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {txs("usps.h2")}
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-4">
              {uspItems.map((item, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-white/5 bg-black/20 p-4 transition hover:bg-black/30">
                  <div className="shrink-0">
                    <IconBox iconName={item.icon} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/90">{item.title}</h3>
                    <p className="mt-1 text-sm text-emerald-200/80 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Pricing Section */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">{txs("pricing.h2")}</h2>
              <p className="text-emerald-200/70 mt-2">{txs("pricing.p1")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <PricingCard
                name={txs("pricing.trial.name")}
                detail={txs("pricing.trial.detail")}
                price={formatMoney(1.99, currency)}
                foot={txs("pricing.trial.foot")}
              />
              <PricingCard
                name={txs("pricing.light.name")}
                detail={txs("pricing.light.detail")}
                price={formatMoney(11.99, currency)}
                foot={txs("pricing.light.foot")}
              />
              <PricingCard
                name={txs("pricing.monthly.name")}
                detail={txs("pricing.monthly.detail")}
                price={formatMoney(16.99, currency)}
                foot={txs("pricing.monthly.foot")}
                highlight={true}
              />
              <PricingCard
                name={txs("pricing.annual.name")}
                detail={txs("pricing.annual.detail")}
                price={formatMoney(149.99, currency)}
                foot={txs("pricing.annual.foot")}
                highlight={true}
              />
            </div>

            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <span className="block text-xs font-bold text-emerald-300 uppercase">{txs("pricing.free.badge")}</span>
              <span className="text-sm text-emerald-100">{txs("pricing.free.text")}</span>
            </div>

            <ul className="mt-6 space-y-2 px-4">
              {pricingBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-200/80">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                </li>
              ))}
            </ul>

            <p className="mt-4 text-center text-[10px] text-emerald-400/50">
              {txs("pricing.foot.pre", { currency })} {txs("pricing.foot.post")}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-white">{txs("cta.h2")}</h2>
            <p className="mt-2 text-emerald-200/80 max-w-lg mx-auto">{txs("cta.text")}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-6 py-3 text-base font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.5)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
              >
                <TbWorld className="text-xl text-emerald-200 group-hover:text-white" />
                <span>{txs("cta.openBrowser")}</span>
              </Link>

              <a
                href={LINK_IOS}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-6 py-3 text-base font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.5)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
              >
                <FaAppStore className="text-xl text-sky-200 group-hover:text-white" />
                <span>iOS</span>
              </a>

              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-6 py-3 text-base font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.5)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
              >
                <BsGooglePlay className="text-xl text-emerald-200 group-hover:text-white" />
                <span>Android</span>
              </a>
            </div>
          </div>

          {/* Meta */}
          <div className="mt-16 border-t border-white/10 pt-6 flex flex-wrap gap-2 text-xs text-emerald-200/50">
            <span>
              {txs("meta.published")}:{" "}
              {new Date(PUBLISHED_DATE).toLocaleDateString(router.locale || "ja-JP", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_aiedit"], i18nConfig)),
    },
  };
}
