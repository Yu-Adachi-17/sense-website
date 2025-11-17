// src/pages/blog/businessnegotiation.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

// ★ 追加：各種アイコン
import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* * ---------- 
 * ★★★ 再構成された EN_FALLBACK ★★★
 * (前回分に加え、Pricingサマリーを "why" の後に追加)
 * ---------- 
 */
const EN_FALLBACK = {
  seo: {
    title: "Why Generic Minutes Fail Negotiations | Minutes.AI",
    description:
      "Generic templates miss the 'why' behind a deal. Negotiations are about trade-offs and context, not just decisions. Learn how Minutes.AI captures the nuance that generic minutes ignore.",
    ogTitle: "Minutes.AI for Business Negotiations",
    ogDescription:
      "Stop losing the 'why.' Capture the full context of objections, concessions, and commitments that generic summaries miss.",
    ld: {
      headline: "Business Negotiation Minutes that actually move deals",
      description:
        "Negotiations require specialized minutes that track objections, concessions, and the critical 'who-said-what' context.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", businessnegotiation: "Business Negotiation" },
  hero: {
    kicker: "The Negotiation Playbook",
    h1: "Generic Minutes Kill Deals. Negotiation Minutes Close Them.",
    tagline:
      "A simple list of 'decisions' is not enough. High-stakes negotiations are about context, trade-offs, and 'who-said-what.' Minutes.AI helps you capture the full story, not just a shallow summary.",
  },
  byline: { name: "Written by Yu Adachi", title: "CEO, Sense G.K." },

  recap: {
    h2: "Previously: The 'Universal Minutes' Mindset",
    p1: {
      pre: "In our previous article, we outlined the idea of",
      link: "universal minutes",
      post: "—a baseline format that works for most internal meetings.",
    },
    points: [
      "Keep goals explicit and measurable",
      "Record decisions and responsible owners",
      "Surface risks and blockers quickly",
      "Make next actions unambiguous",
    ],
    focus:
      "But negotiations are different. The structure must reflect conflicting interests, options, and trade-offs.",
  },

  diversity: {
    h2: "Meeting Diversity: Purpose Defines the Output",
    core: {
      h3: "Typical Meetings",
      items: [
        "Weekly Check-in: Track progress, issues, and fixes.",
        "Brainstorming: Diverge on ideas, then converge.",
        "Sales / Negotiation: Adjust interests and form agreements.",
      ],
    },
    wide: {
      h3: "Wider Spectrum (Still Meetings!)",
      items: [
        "1-on-1: Review performance, set goals, share concerns.",
        "Interview: Match requirements to a candidate's fit.",
        "Workshop / Lecture: Transfer knowledge or operations.",
      ],
    },
    p1: "If people talk for a common purpose, it's a meeting. Because purposes differ, the valuable output must adapt—especially for negotiations.",
  },

  negotiation: {
    h2: "What is a Negotiation, Really?",
    p1: "How is a negotiation different from an internal meeting? In one word: **Profit.** A negotiation is a 'battlefield' where two companies protect their own interests—price, scope, timeline. It's not a one-way street; it's a back-and-forth of concessions to find a path to agreement. A simple 'To-Do' list can't capture this.",
  },

  limits: {
    h2: "Why One-Size-Fits-All Fails",
    p1: "Using a generic template for a negotiation creates 'shallow' minutes. This loses critical context and forces costly follow-up meetings.",
    generic: {
      h3: "Generic 'Shallow' Minutes",
      items: [
        "Record a 'Decision' but miss the 'Why' (the concession).",
        "Force managers to ask, 'Why did we agree to this?'",
        "Lose the critical 'he-said-she-said' nuance.",
        "Blur who is responsible for what, stalling the deal.",
      ],
    },
    optimized: {
      h3: "Negotiation-Optimized Minutes",
      items: [
        "Track the Objection → Concession → Agreement flow.",
        "Give managers the 'atmosphere' and background to judge.",
        "Preserve key exchanges to prevent 'he-said-she-said' disputes.",
        "Bind every commitment to an owner and a deadline.",
      ],
    },
  },

  example: {
    h2: "From 'Dry' Data to Deal 'Context'",
    block:
      "Client: The price is too high for our Q4 budget.\nAE: I understand. If we limit seats to 40 and move SSO to Phase 2, we can meet your cap.\nClient: That could work. I need legal approval. Can we lock that pricing until 12/15?\nAE: Agreed. I'll send Proposal v3 today. Legal review by EOW, close by 12/15.",
    p1: "A generic minute might just say: 'Decision: Sell for $X.' A *negotiation-optimized* minute makes the progression explicit: **Objection** (price) → **Concession** (scope) → **Commitment** (deadline). This context is everything for the decision-makers who weren't in the room.",
  },

  why: {
    h2: "Why Minutes.AI for Negotiation",
    items: [
      "**Context-Rich Decisions:** We move beyond 'dry' action items. Our AI links decisions directly to the 'why'—the discussion, objections, and trade-offs that led to them.",
      "**Capture the 'Atmosphere':** Minutes.AI is trained to identify and preserve key 'he-said-she-said' exchanges, not just summarize them away. Give your boss the context, not just the data.",
      "**Track the Full 'Battle':** Our Objection Tracker follows an issue from the first 'no' to the final 'yes,' so you never lose the thread of the deal.",
      "**Clear Commitment Chains:** Automatically extract and assign every 'who, what, and when' to ensure the deal moves forward and never stalls.",
      "**Multilingual Outputs:** Close global deals with clear, accurate minutes for all stakeholders, in their language.",
    ],
  },

  /* ---------- ★★★ NEW PRICING SECTION ★★★ ---------- */
  pricing: {
    h2: "Simple, Flexible Pricing That Fits Your Rhythm",
    p1: "Your meeting schedule isn't 'one-size-fits-all,' so your pricing shouldn't be either. Choose the plan that makes sense for you.",
    timepacks: {
      h3: "One-Time Packs",
      note: "Buy once, use forever. Your minutes never expire.",
      items: ["Trial (120 min): $1.99", "Light (1200 min): $11.99"],
    },
    subs: {
      h3: "Unlimited Subscriptions",
      note: "Truly unlimited minutes. No caps, no monthly resets.",
      items: ["Monthly: $16.99", "Annual: $149.99 (Save ≈26%)"],
    },
    free: {
      h3: "Try It Free, Every Day",
      p1: "Every user gets a free 3-minute ticket to try Minutes.AI, every single day. No credit card required.",
    },
  },
  /* ---------- ★★★ END NEW SECTION ★★★ ---------- */

  wrap: {
    h2: "Wrap-up: Stop Settling for Shallow Minutes",
    p: "Negotiations are won or lost in the details. A summary that captures the *atmosphere*, *context*, and *concessions* is what empowers your team to make faster, smarter decisions. Structure isn't just about clarity; it's about capturing the reality of the deal.",
  },

  cta: { openBrowser: "Open in browser", downloadIOS: "Download iOS app" },
};

/* ---------- tiny helpers (same as reference) ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

/* i18n wrapper: if key is missing, use EN fallback */
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
function Byline() {
  const { txs } = useTx("blog_businessnegotiation");
  return (
    <div className="mt-8 flex items-center gap-3 text-sm text-indigo-100/85">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
        <span className="text-xs font-bold">YA</span>
      </div>
      <div>
        <p className="font-semibold">{txs("byline.name")}</p>
        <p className="text-indigo-200/80">{txs("byline.title")}</p>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function BlogBusinessNegotiation() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_businessnegotiation");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/businessnegotiation";

  const recapPoints = txa("recap.points");
  const diversityCore = txa("diversity.core.items");
  const diversityWide = txa("diversity.wide.items");
  const limitsGeneric = txa("limits.generic.items");
  const limitsOptimized = txa("limits.optimized.items");
  const whyItems = txa("why.items");
  
  // ★ NEW: Pricing data
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
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />

        {/* Article structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
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
            href="/home"
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
            <span className="text-indigo-100">{txs("nav.businessnegotiation")}</span>
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
            <p className="mt-2 max-w-2xl text-base leading-7 text-indigo-100/90">
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
                <Link href="/blog/universal-minutes" className="underline underline-offset-2">
                  {txs("recap.p1.link")}
                </Link>{" "}
                {txs("recap.p1.post")}
              </p>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                {recapPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <p className="mt-4 text-base font-bold text-indigo-100">{txs("recap.focus")}</p>
            </div>
          </SectionCard>

          {/* Diversity of meetings */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("diversity.h2")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/90">{txs("diversity.core.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {diversityCore.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/9Nothing0">{txs("diversity.wide.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {diversityWide.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("diversity.p1")}</p>
          </SectionCard>

          {/* What is negotiation */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("negotiation.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90" dangerouslySetInnerHTML={{ __html: txs("negotiation.p1") }} />
          </SectionCard>

          {/* Limits of one-size-fits-all */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("limits.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("limits.p1")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">{txs("limits.generic.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {limitsGeneric.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold">{txs("limits.optimized.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {limitsOptimized.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* Conversation example */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("example.h2")}</h2>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-6 text-indigo-100/90">
{txs("example.block")}
              </pre>
            </div>
            <p className="mt-3 text-base leading-7 text-indigo-100/90" dangerouslySetInnerHTML={{ __html: txs("example.p1") }} />
          </SectionCard>

          {/* Why Minutes.AI for negotiation */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("why.h2")}</h2>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-indigo-100/90">
              {whyItems.map((p, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </ul>
          </SectionCard>

          {/* ---------- ★★★ NEW PRICING SECTION ★★★ ---------- */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("pricing.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("pricing.p1")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Time Packs */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">{txs("pricing.timepacks.h3")}</h3>
                <p className="mt-1 text-sm text-indigo-200/80" dangerouslySetInnerHTML={{ __html: txs("pricing.timepacks.note") }} />
                <ul className="mt-3 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {pricingTimepackItems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              {/* Subscriptions */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold">{txs("pricing.subs.h3")}</h3>
                <p className="mt-1 text-sm text-indigo-200/80">{txs("pricing.subs.note")}</p>
                <ul className="mt-3 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {pricingSubItems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Free Offer */}
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
               <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">{txs("pricing.free.h3")}</h3>
               <p className="mt-1 text-sm text-emerald-100/90" dangerouslySetInnerHTML={{ __html: txs("pricing.free.p1") }} />
            </div>
          </SectionCard>
          {/* ---------- ★★★ END NEW SECTION ★★★ ---------- */}

          {/* Wrap-up */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("wrap.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90" dangerouslySetInnerHTML={{ __html: txs("wrap.p") }} />
          </SectionCard>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-4">
            {/* Browser */}
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:bg-indigo-500/20 hover:border-indigo-100/80 hover:text-white"
            >
              <TbWorld className="text-lg sm:text-xl text-indigo-200 group-hover:text-white" />
              <span>Browser</span>
            </Link>

            {/* App Store */}
            <a
              href="https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:bg-sky-500/20 hover:border-sky-100/80 hover:text-white"
            >
              <FaAppStore className="text-lg sm:text-xl text-sky-200 group-hover:text-white" />
              <span>App Store</span>
            </a>

            {/* Google Play */}
            <a
              href="https://play.google.com/store/apps/details?id=world.senseai.minutes"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:bg-emerald-500/20 hover:border-emerald-100/80 hover:text-white"
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

/* ---------- SSR: load this page's namespace (match reference) ---------- */
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "en",
        ["common", "blog_businessnegotiation"],
        i18nConfig
      )),
    },
  };
}