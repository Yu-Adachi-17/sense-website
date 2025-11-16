// src/pages/blog/aimodel.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

// ★ 追加：各種アイコン
import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback (used when i18n returns keys) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "The AI Models Behind Minutes.AI (ChatGPT-5, Gemini 2.5 Pro)",
    description:
      "Why Minutes.AI produces professional minutes: our model policy and the exact LLMs we adopt — ChatGPT-5 and Gemini 2.5 Pro at the time of writing.",
    ogTitle: "Minutes.AI — AI Models We Use",
    ogDescription:
      "We prioritize output quality over cost. As of now, we adopt ChatGPT-5 and Gemini 2.5 Pro for generation.",
    ld: {
      headline: "AI Models We Use at Minutes.AI",
      description:
        "Our stance on model selection and why it matters for action-oriented, professional minutes.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", aimodel: "AI Models We Use" },

  hero: {
    kicker: "Inside Minutes.AI",
    h1: "The AI models we use at Minutes.AI",
    tagline:
      "We disclose our model policy and adopted models so you know what powers your minutes.",
  },

  intro: {
    h2: "Why Minutes.AI delivers professional-grade minutes",
    p1:
      'Although our current focus is iOS, we’ve received global reviews like "beautiful minutes" and "outstanding accuracy".',
    p2pre:
      "Our minutes are not left to AI alone — we consistently pursue a philosophy of making the next actions crystal-clear for the reader. See",
    p2link1: "Product introduction",
    p2mid: "and",
    p2link2: "Business negotiation minutes",
    p2post: "for details.",
    focus:
      "Philosophy alone doesn’t guarantee the best output. Like cuisine, you need ingredients × tools × a great chef — i.e., the right model.",
  },

  market: {
    h2: "Common market choice vs. our stance",
    p1:
      "Many products choose ChatGPT-4o mainly for cost. We put output quality first, even if it costs more.",
    common: {
      h3: "Typical selection",
      items: [
        "Lower operating cost",
        "Easy vendor lock-in and maintenance",
        "Uniform, one-size-fits-all experience",
      ],
    },
    ours: {
      h3: "Minutes.AI’s selection",
      items: [
        "Adopt the best models available at the time",
        "Prioritize task fit and output quality over price",
        "Do not adopt models that fail our quality bar",
      ],
    },
  },

  models: {
    h2: "Adopted models (at time of writing)",
    p1:
      "We currently adopt the following highest-quality models to maximize clarity and decision-readiness.",
    items: [
      {
        h3: "ChatGPT-5 (OpenAI)",
        p:
          "Excellent reasoning and consistent tone control — ideal for minutes that must drive decisions.",
      },
      {
        h3: "Gemini 2.5 Pro (Google)",
        p:
          "Strong long-context coherence and key-point extraction — stable quality even in specialized domains.",
      },
    ],
    note:
      "Note: These are our current generation models. We will continue to switch if a model fails our quality standard.",
  },

  philosophy: {
    h2: "Not AI-only: action-oriented minutes by design",
    p1:
      "Models are tools. Our goal is minutes that enable action. We select models around reproducible results.",
    points: [
      "Clear roles, action owners, and deadlines",
      "Structures optimized per meeting type (negotiation / regular / lecture, etc.)",
      "Priority on contextual consistency and factual alignment",
    ],
  },

  quality: {
    h2: "Quality over cost — because it pays off",
    p1:
      "Higher-end models cost more, but they reduce on-site burden and raise satisfaction — value that pays for itself.",
    p2:
      "We choose the optimal, not the cheapest. That is the Minutes.AI principle.",
  },

  wrap: {
    h2: "Experience professional minutes",
    p:
      "Try Minutes.AI and feel the difference. Uncompromising model selection accelerates daily decisions.",
  },

  cta: {
    openBrowser: "Open in browser",
    downloadIOS: "Download iOS app",
    // downloadAndroid: "Get Android app on Google Play", // 今回は文言は固定表示にする想定
  },
};

/* ---------- tiny helpers ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

/* If i18n returns the key (missing), use EN fallback (string / array) */
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

/* ---------- Page ---------- */
export default function BlogAIModel() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_aimodel");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl + (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) + "/blog/aimodel";

  const commonItems = txa("market.common.items");
  const ourItems = txa("market.ours.items");
  const modelItems = txa("models.items");
  const philosophyPoints = txa("philosophy.points");

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
              image: [`${siteUrl}/images/hero-phone.png`],
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
            <span className="text-indigo-100">{txs("nav.aimodel")}</span>
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
            <p className="mt-4 max-w-2xl text-base leading-7 text-indigo-100/90">{txs("hero.tagline")}</p>
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Intro */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("intro.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{txs("intro.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">
                {txs("intro.p2pre")}{" "}
                <Link href="/introduction" className="underline underline-offset-2">
                  {txs("intro.p2link1")}
                </Link>{" "}
                {txs("intro.p2mid")}{" "}
                <Link href="/businessnegotiation" className="underline underline-offset-2">
                  {txs("intro.p2link2")}
                </Link>{" "}
                {txs("intro.p2post")}
              </p>
              <p className="font-semibold text-indigo-100">{txs("intro.focus")}</p>
            </div>
          </SectionCard>

          {/* Market stance */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("market.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("market.p1")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">{txs("market.common.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {commonItems.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold">{txs("market.ours.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  {ourItems.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* Models */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("models.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("models.p1")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              {modelItems.map((m, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg font-semibold">{m.h3}</h3>
                  <p className="mt-1 text-sm text-indigo-100/90">{m.p}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-indigo-200/80">{txs("models.note")}</p>
          </SectionCard>

          {/* Philosophy */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("philosophy.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("philosophy.p1")}</p>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-indigo-100/90">
              {philosophyPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </SectionCard>

          {/* Quality vs Cost */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("quality.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("quality.p1")}</p>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{txs("quality.p2")}</p>
          </SectionCard>

          {/* Wrap */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("wrap.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{txs("wrap.p")}</p>
          </SectionCard>

          {/* Meta */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Meta</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-indigo-100/90">
              <Pill>
                Published:{" "}
                {new Date().toLocaleDateString(router.locale || "ja-JP", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </Pill>
              <Pill>Type: Article</Pill>
              <Pill>Category: AI Models</Pill>
            </div>
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

/* ---------- SSR: load this page's namespace ---------- */
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_aimodel"], i18nConfig)),
    },
  };
}
