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

/* ---------- Inline English fallback (match reference structure) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Negotiation Minutes: Why one-size-fits-all fails (Minutes.AI)",
    description:
      "Sales and negotiation meetings need tailored minutes. We explain why generic templates miss the point and how Minutes.AI structures decisions, objections, and next steps.",
    ogTitle: "Minutes.AI for Business Negotiations",
    ogDescription:
      "Move beyond generic minutes. Capture decisions, objections, trade-offs, and next steps precisely.",
    ld: {
      headline: "Business Negotiation Minutes that actually move deals",
      description:
        "Negotiations require specialized minutes that track objections, concessions, and commitments.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", businessnegotiation: "Business Negotiation" },
  hero: {
    kicker: "Playbook",
    h1: "Minutes that win negotiations",
    tagline:
      "Generic minutes are not enough. For negotiations, capture objections, alternatives, and commitments with clarity.",
  },
  byline: { name: "Written by Yu Adachi", title: "CEO, Sense G.K." },

  recap: {
    h2: "Previously: Universal minutes mindset",
    p1: {
      pre: "In the previous article we outlined the idea of",
      link: "universal minutes",
      post: "—a baseline format that works for most meetings.",
    },
    points: [
      "Keep goals explicit and measurable",
      "Record decisions and responsible owners",
      "Surface risks and blockers quickly",
      "Make next actions unambiguous",
    ],
    focus:
      "Negotiations are different: the structure must reflect conflict, options, and trade-offs.",
  },

  diversity: {
    h2: "Meeting diversity: purposes change outputs",
    core: {
      h3: "Typical meetings",
      items: ["Weekly check-in", "Brainstorming", "Sales / negotiation"],
    },
    wide: {
      h3: "Wider spectrum",
      items: ["1-on-1", "Interview", "Workshop", "Retrospective"],
    },
    p1: "Because purposes differ, the minute structure should adapt—especially for negotiations.",
  },

  negotiation: {
    h2: "What is negotiation?",
    p1: "Two or more parties reconcile interests under constraints—price, scope, timeline, risk. Good minutes clarify positions, proposals, and the path to agreement.",
  },

  limits: {
    h2: "Why one-size-fits-all fails",
    p1: "Generic minutes lose critical negotiation context and slow deals.",
    generic: {
      h3: "Generic minutes",
      items: [
        "Miss objections and their resolutions",
        "Blur alternatives and trade-offs",
        "Hide commitment owners and deadlines",
      ],
    },
    optimized: {
      h3: "Negotiation-optimized",
      items: [
        "Track each objection → response → status",
        "Compare alternatives with crisp criteria",
        "Bind decisions to owners and due dates",
      ],
    },
  },

  example: {
    h2: "Conversation snippet",
    block:
      "Client: Price is too high for Q4 budget.\nAE: If we limit seats to 40 and move SSO to Phase 2, we can meet your cap.\nClient: Need legal approval. Can we lock pricing until 12/15?\nAE: Agreed. Proposal v3 today. Legal review EOW. Close by 12/15.",
    p1: "Good minutes make this progression explicit: objection → concession → commitment → deadline.",
  },

  why: {
    h2: "Why Minutes.AI for negotiation",
    items: [
      "Objection tracker with resolution status",
      "Alternative comparison (price, scope, risk)",
      "Decision log with owners and deadlines",
      "Next-step chain until close",
      "Multilingual outputs for global stakeholders",
    ],
  },

  wrap: {
    h2: "Wrap-up",
    p: "Negotiations move when minutes reflect reality: conflict, options, and commitments. Structure drives clarity.",
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
                <h3 className="text-sm font-semibold text-indigo-200/90">{txs("diversity.wide.h3")}</h3>
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
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("negotiation.p1")}</p>
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
            <p className="mt-3 text-base leading-7 text-indigo-100/90">{txs("example.p1")}</p>
          </SectionCard>

          {/* Why Minutes.AI for negotiation */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("why.h2")}</h2>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-indigo-100/90">
              {whyItems.map((p, i) => (
                <li key={i}>{p}</li>
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
