// src/pages/blog/strategy.js
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
    title: "Minutes.AI Strategy: From minutes to decisions (ChatGPT-5 & Gemini 2.5 Pro)",
    description:
      "Minutes.AI’s Strategy turns meeting minutes into next steps. Using ChatGPT-5 and Gemini 2.5 Pro, it provides Boost, Counter, Top Issue, and three thinking modes.",
    ogTitle: "Minutes.AI Strategy Feature",
    ogDescription:
      "Transform minutes into strategy with Boost, Counter, Top Issue, and Logical/Critical/Lateral Thinking.",
    ld: {
      headline: "Minutes.AI adds Strategy",
      description:
        "The Strategy feature elevates minutes to decision support using ChatGPT-5 and Gemini 2.5 Pro outputs.",
    },
    keywords:
      "Minutes.AI, meeting minutes AI, Strategy, ChatGPT-5, Gemini 2.5 Pro, decision support, Logical Thinking, Critical Thinking, Lateral Thinking, Boost, Counter, Top Issue",
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", strategy: "Strategy" },
  hero: {
    kicker: "Feature Deep Dive",
    h1: "Strategy for Minutes.AI",
    tagline:
      "Not just minutes. Strategy converts discussions into clear actions using ChatGPT-5 and Gemini 2.5 Pro.",
  },
  what: {
    h2: "What is Strategy?",
    p1: "Strategy is Minutes.AI’s decision-support layer on top of your minutes.",
    p2: "It produces: Boost (amplify what works), Counter (constructive opposition), Top Issue (the core problem), and three thinking modes for the Top Issue.",
    bullets: [
      "Boost — positives and how to scale them",
      "Counter — risks and how to fix them",
      "Top Issue — the key question to solve",
      "Logical Thinking — structured, stepwise solution",
      "Critical Thinking — challenge assumptions",
      "Lateral Thinking — leap beyond obvious ideas",
    ],
  },
  how: {
    h2: "How it works",
    steps: [
      "Generate minutes as usual (app or web).",
      "Tap “Strategy” to analyze with ChatGPT-5 & Gemini 2.5 Pro.",
      "Get Boost/Counter/Top Issue + three thinking modes.",
      "Share or copy results into your task system.",
    ],
    note: "Outputs adapt to language and domain; concision by default for quick reading.",
  },
  samples: {
    h2: "Short, readable examples",
    minutes: {
      h3: "Minutes (example)",
      lines: [
        "Topic: Summer limited blend “Solar Chill”",
        "Decisions: Proceed with Solar Chill; keep the name; finalize recipe.",
        "To-Dos: Design mockups; upload final recipe to shared folder.",
        "Risk: 15% feedback says “too sour”.",
      ],
    },
    strategy: {
      h3: "Strategy (example)",
      boost: [
        "Boost: High repeat-intent → pilot in 10 stores + social promo; measure re-order within 7 days.",
      ],
      counter: [
        "Counter: Address sourness → add ‘mild sweet’ option; A/B test syrup level for 2 weeks.",
      ],
      top: ["Top Issue: Balance flavor to widen appeal without losing brand distinctiveness."],
      modes: {
        logical: ["Logical: Define target segments → set success KPIs → run A/B → ship winning spec."],
        critical: ["Critical: Are we overfitting to ‘social buzz’? Validate with blind taste tests."],
        lateral: ["Lateral: Offer a scent/room-mist edition to extend the brand beyond beverages."],
      },
    },
  },
  platform: {
    h2: "Availability",
    p1: "Strategy is available on iOS. Use it to move from ‘notes’ to ‘decisions’.",
  },
  image: { alt: "Minutes.AI Strategy UI", caption: "Boost/Counter/Top Issue + three thinking modes at a glance." },
  meta: { h2: "Meta", published: "Published", type: "Feature", category: "Strategy" },
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

export default function BlogStrategy() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_strategy");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl + (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) + "/blog/strategy";

  const whatBullets = txa("what.bullets");
  const howSteps = txa("how.steps");

  const minutesLines = txa("samples.minutes.lines");
  const strategyBoost = txa("samples.strategy.boost");
  const strategyCounter = txa("samples.strategy.counter");
  const strategyTop = txa("samples.strategy.top");
  const strategyLogical = txa("samples.strategy.modes.logical");
  const strategyCritical = txa("samples.strategy.modes.critical");
  const strategyLateral = txa("samples.strategy.modes.lateral");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <meta name="keywords" content={txs("seo.keywords")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/StrategyFeature.png`} />
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
              image: [`${siteUrl}/images/StrategyFeature.png`],
              description: txs("seo.ld.description"),
              keywords: txs("seo.keywords"),
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
            <span className="text-indigo-100">{txs("nav.strategy")}</span>
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
          {/* What is Strategy */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("what.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{txs("what.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{txs("what.p2")}</p>
              <ul className="mt-2 space-y-2 text-indigo-100/90 list-disc ml-5">
                {whatBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src="/images/StrategyFeature.png"
                  alt={txs("image.alt")}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-indigo-200/70">{txs("image.caption")}</p>
              </div>
            </div>
          </SectionCard>

          {/* How it works */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("how.h2")}</h2>
            <ol className="mt-4 space-y-2 text-indigo-100/90 list-decimal ml-5">
              {howSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <div className="mt-3 text-xs text-indigo-200/70">
              <Pill>{txs("how.note")}</Pill>
            </div>
          </SectionCard>

          {/* Samples */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("samples.h2")}</h2>

            {/* Minutes sample */}
            <div className="mt-4">
              <h3 className="text-lg font-semibold">{txs("samples.minutes.h3")}</h3>
              <ul className="mt-2 space-y-1 text-indigo-100/90 list-disc ml-5">
                {minutesLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>

            {/* Strategy sample */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold">{txs("samples.strategy.h3")}</h3>

              <div className="mt-2 space-y-3">
                <div>
                  <Pill>Boost</Pill>
                  <ul className="mt-2 list-disc ml-5 space-y-1">
                    {strategyBoost.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Pill>Counter</Pill>
                  <ul className="mt-2 list-disc ml-5 space-y-1">
                    {strategyCounter.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Pill>Top Issue</Pill>
                  <ul className="mt-2 list-disc ml-5 space-y-1">
                    {strategyTop.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs uppercase tracking-wide text-indigo-200/70">Logical</div>
                    <ul className="mt-1 list-disc ml-5 text-sm space-y-1">
                      {strategyLogical.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs uppercase tracking-wide text-indigo-200/70">Critical</div>
                    <ul className="mt-1 list-disc ml-5 text-sm space-y-1">
                      {strategyCritical.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs uppercase tracking-wide text-indigo-200/70">Lateral</div>
                    <ul className="mt-1 list-disc ml-5 text-sm space-y-1">
                      {strategyLateral.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Availability */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("platform.h2")}</h2>
            <p className="mt-3 text-indigo-100/90">{txs("platform.p1")}</p>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_strategy"], i18nConfig)),
    },
  };
}
