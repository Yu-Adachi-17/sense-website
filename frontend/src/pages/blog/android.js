// src/pages/blog/android.js
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
    title: "Minutes.AI Android release — Meeting minutes AI app for Android",
    description:
      "Minutes.AI, the meeting minutes AI app, is now available on Android. Start recording on your Android phone and let AI create clean, structured minutes automatically.",
    ogTitle: "Minutes.AI comes to Android",
    ogDescription:
      "Looking for a meeting minutes AI app on Android? Minutes.AI arrives on Google Play with Flexible minutes and more formats coming soon.",
    ld: {
      headline: "Minutes.AI launches Android app",
      description:
        "Minutes.AI, a meeting minutes AI app, is now on Google Play. Start meetings on Android and get automatic minutes with clear decisions and action items.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", android: "Android release" },
  hero: {
    kicker: "Release Note",
    h1: "Minutes.AI is now available on Android",
    tagline:
      "Minutes.AI, the meeting minutes AI app, has landed on Google Play. Start recording on Android and automatically generate clean, structured minutes. Flexible format first, more formats will follow.",
  },
  release: {
    h2: "What’s new on Android",
    p1: "Minutes.AI, our meeting minutes AI app trusted on iOS and web, is now available as an Android app on Google Play.",
    p2: "The initial Android release supports the Flexible minutes format. We will gradually add all other formats so you can use your favorite style of minutes on Android as well.",
    p3: "If you’ve been searching for a meeting minutes AI app for Android, this release is for you — record meetings on your Android device and let Minutes.AI handle the minutes.",
  },
  image: {
    alt: "Minutes.AI Android app UI on Google Play",
    caption: "Minutes.AI Android version is now available on Google Play. Start recording and get AI-generated minutes.",
  },
  steps: {
    h2: "How to get started on Android",
    items: [
      "Open Google Play on your Android device",
      "Search for “Minutes.AI” or tap the link on this page",
      "Install the app and sign in or create an account",
      "Start recording a meeting and let AI generate Flexible minutes",
    ],
    note: "We will continue to roll out more minutes formats on Android over time.",
  },
  features: {
    h2: "Why Minutes.AI is a great meeting minutes AI app for Android",
    items: [
      "Automatic, clean minutes from your Android recordings",
      "Flexible minutes format optimized for readability",
      "Time-pack and subscription plans to match your usage",
      "Works across Android, iOS and browser under one account",
      "Supports multiple languages for global teams",
    ],
  },
  notes: {
    h2: "Notes",
    items: [
      "The initial Android version supports the Flexible format only",
      "Other minutes formats will be added in future updates",
      "Meeting duration and available time depend on your plan and remaining quota",
      "Network conditions and device performance may affect recognition quality",
    ],
    foot: "You can also use Minutes.AI on the web and iOS. Try the combination that fits your workflow.",
  },
  meta: {
    h2: "Meta",
    published: "Published",
    type: "Release",
    category: "Android",
  },
  cta: {
    openBrowser: "Open in browser",
    downloadIOS: "Download iOS app",
    downloadAndroid: "Get Android app on Google Play",
  },
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

export default function BlogAndroid() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_android");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl + (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) + "/blog/android";

  const features = txa("features.items");
  const steps = txa("steps.items");
  const notes = txa("notes.items");

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
        <meta property="og:image" content={`${siteUrl}/images/AndroidRelease.png`} />
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
              image: [`${siteUrl}/images/AndroidRelease.png`],
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
            <span className="text-indigo-100">{txs("nav.android")}</span>
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
          {/* Release Note */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("release.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{txs("release.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{txs("release.p2")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{txs("release.p3")}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src="/images/AndroidRelease.png"
                  alt={txs("image.alt")}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-indigo-200/70">{txs("image.caption")}</p>
              </div>
            </div>
          </SectionCard>

          {/* How to start on Android */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("steps.h2")}</h2>
            <ol className="mt-4 space-y-2 text-indigo-100/90 list-decimal ml-5">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <div className="mt-3 text-xs text-indigo-200/70">
              <Pill>{txs("steps.note")}</Pill>
            </div>
          </SectionCard>

          {/* Features */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("features.h2")}</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </SectionCard>

          {/* Notes */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("notes.h2")}</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-indigo-200/80">{txs("notes.foot")}</p>
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
            <a
              href="https://play.google.com/store/apps/details?id=world.senseai.minutes"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              {txs("cta.downloadAndroid")}
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_android"], i18nConfig)),
    },
  };
}
