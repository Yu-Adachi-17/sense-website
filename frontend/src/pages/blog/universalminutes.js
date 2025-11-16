// src/pages/blog/universalminutes.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback (match reference structure) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Universal Minutes: A baseline that works (Minutes.AI)",
    description:
      "A simple, universal minutes structure that scales across most meetings. Clear goals, decisions, risks, and next actions.",
    ogTitle: "Universal Minutes for real-world teams",
    ogDescription:
      "Use a baseline minutes template that captures goals, decisions, risks, and next steps.",
    ld: {
      headline: "Universal Minutes you can actually use",
      description:
        "A pragmatic baseline for meeting minutes that works across formats and teams.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", current: "Universal Minutes" },

  hero: {
    kicker: "Playbook",
    h1: "A universal minutes baseline",
    tagline:
      "Keep it consistent: explicit goals, crisp decisions, surfaced risks, and unambiguous next actions.",
  },

  byline: { name: "Written by Yu Adachi", title: "CEO, Sense G.K." },

  recap: {
    h2: "Previously: Introduction",
    p1: { pre: "Previously we discussed", link: "an introduction", post: "to Minutes.AI." },
    points: [
      "Make goals explicit and measurable",
      "Record decisions with owners",
      "Surface risks and blockers early",
      "Turn outcomes into next actions",
    ],
    note: "This article proposes a baseline format before we specialize for specific meeting types.",
  },

  diversity: {
    h2: "Meeting diversity: purpose changes the output",
    core: {
      h3: "Typical meetings",
      items: ["Weekly check-in", "Brainstorming", "Sales / negotiation"],
    },
    wide: {
      h3: "Wider spectrum",
      items: ["1-on-1", "Interview", "Workshop", "Retrospective"],
    },
    p1: "A universal baseline helps teams stay consistent before adding specialties.",
  },

  limits: {
    h2: "Limits of one-size-fits-all",
    p1: "A baseline is great, but some meetings need specialization.",
    generic: {
      h3: "Generic minutes (baseline)",
      items: [
        "Capture goals, decisions, risks, actions",
        "Easy to adopt across teams",
        "Consistent and searchable",
      ],
    },
    optimized: {
      h3: "Optimized by purpose",
      items: [
        "Negotiation: objections, alternatives, commitments",
        "1-on-1: past vs future positives/negatives",
        "Workshop: hypotheses, experiments, learnings",
        "Retrospective: themes, actions, owners, due dates",
      ],
    },
  },

  oneonone: {
    h2: "1-on-1 example (tone & temperature)",
    generic: {
      h3: "Generic baseline",
      items: [
        "Goals and agenda",
        "Highlights and risks",
        "Decisions and owners",
        "Next actions",
      ],
    },
    optimized: {
      h3: "Optimized 1-on-1",
      items: [
        "Past positives / past negatives",
        "Future positives / future negatives",
        "Core emotion and context",
        "Agreements and expectations",
        "Follow-up cadence",
      ],
    },
  },

  why: {
    h2: "Why Minutes.AI works as a baseline",
    items: [
      "Readable, structured outputs",
      "Works across meeting types",
      "Easy to specialize later",
      "Searchable and comparable",
      "Multilingual across teams",
    ],
  },

  wrap: {
    h2: "Wrap-up",
    p: "Start universal, then specialize where needed. Consistency first, precision next.",
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
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              {txs("cta.openBrowser")}
            </Link>
            <a
              href="https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901"
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
