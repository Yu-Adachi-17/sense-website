// src/pages/blog/language.js
import * as React from "react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

// CTA用アイコン
import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

const EN_FALLBACK = {
  seo: {
    title: "Why Minutes.AI is used worldwide — languages & Whisper support (2025)",
    description:
      'If you search "meeting-minutes AI app", here’s the reason Minutes.AI works globally: multilingual STT (Whisper), 100+ languages, clean minutes, and adoption in 153 countries with 30K users as of Nov 2025.',
    ogTitle: "Why Minutes.AI works for global teams",
    ogDescription:
      "Multilingual speech-to-text via Whisper (100+ languages), readable minutes, and simple UX — used in 153 countries.",
    keywords: "meeting-minutes AI app, Minutes.AI, Whisper, speech-to-text, multilingual, meeting minutes",
    ld: {
      headline: "Why Minutes.AI is used worldwide",
      description:
        "Minutes.AI uses Whisper for multilingual STT across 100+ languages, enabling clean, readable minutes for global teams.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", language: "Language" },
  hero: {
    kicker: "Global Adoption",
    h1: "Why Minutes.AI is used around the world",
    tagline:
      "Multilingual speech-to-text (Whisper) across 100+ languages delivers accurate transcripts and clean, readable minutes.",
  },
  intro: {
    h2: "Used in 153 countries by 30,000 users",
    p1: "Minutes.AI has grown to 30,000 users across 153 countries in just 15 months after launch (iOS downloads, Nov 2025).",
    p2: "You might wonder if your language is covered. The key is STT — speech-to-text. We use OpenAI’s Whisper, which supports 100+ languages. That’s why Minutes.AI works anywhere.",
  },
  stt: {
    h2: "Why Whisper matters",
    p1: "Whisper’s multilingual models recognize speech in a wide range of languages with robust accuracy, even for minority languages and accents.",
    p2: "Paired with Minutes.AI’s formatting pipeline, transcripts become action-ready minutes: decisions, owners, and next steps are clearly captured.",
  },
  langs: {
    h2: "Whisper-supported languages (selection)",
    note: "Find your language by code or name.",
    searchPlaceholder: "Filter by code or name…",
    list: [
      { code: "af", name: "Afrikaans" },
      { code: "am", name: "Amharic" },
      { code: "ar", name: "Arabic" },
      { code: "as", name: "Assamese" },
      { code: "az", name: "Azerbaijani" },
      { code: "ba", name: "Bashkir" },
      { code: "be", name: "Belarusian" },
      { code: "bg", name: "Bulgarian" },
      { code: "bn", name: "Bengali" },
      { code: "bo", name: "Tibetan" },
      { code: "br", name: "Breton" },
      { code: "bs", name: "Bosnian" },
      { code: "ca", name: "Catalan" },
      { code: "cs", name: "Czech" },
      { code: "cy", name: "Welsh" },
      { code: "da", name: "Danish" },
      { code: "de", name: "German" },
      { code: "el", name: "Greek" },
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "et", name: "Estonian" },
      { code: "eu", name: "Basque" },
      { code: "fa", name: "Persian" },
      { code: "fi", name: "Finnish" },
      { code: "fo", name: "Faroese" },
      { code: "fr", name: "French" },
      { code: "gl", name: "Galician" },
      { code: "gu", name: "Gujarati" },
      { code: "ha", name: "Hausa" },
      { code: "haw", name: "Hawaiian" },
      { code: "he", name: "Hebrew" },
      { code: "hi", name: "Hindi" },
      { code: "hr", name: "Croatian" },
      { code: "ht", name: "Haitian Creole" },
      { code: "hu", name: "Hungarian" },
      { code: "hy", name: "Armenian" },
      { code: "id", name: "Indonesian" },
      { code: "is", name: "Icelandic" },
      { code: "it", name: "Italian" },
      { code: "ja", name: "Japanese" },
      { code: "jw", name: "Javanese" },
      { code: "ka", name: "Georgian" },
      { code: "kk", name: "Kazakh" },
      { code: "km", name: "Khmer" },
      { code: "kn", name: "Kannada" },
      { code: "ko", name: "Korean" },
      { code: "la", name: "Latin" },
      { code: "lb", name: "Luxembourgish" },
      { code: "ln", name: "Lingala" },
      { code: "lo", name: "Lao" },
      { code: "lt", name: "Lithuanian" },
      { code: "lv", name: "Latvian" },
      { code: "mg", name: "Malagasy" },
      { code: "mi", name: "Maori" },
      { code: "mk", name: "Macedonian" },
      { code: "ml", name: "Malayalam" },
      { code: "mn", name: "Mongolian" },
      { code: "mr", name: "Marathi" },
      { code: "ms", name: "Malay" },
      { code: "mt", name: "Maltese" },
      { code: "my", name: "Myanmar" },
      { code: "ne", name: "Nepali" },
      { code: "nl", name: "Dutch" },
      { code: "nn", name: "Norwegian Nynorsk" },
      { code: "no", name: "Norwegian" },
      { code: "oc", name: "Occitan" },
      { code: "pa", name: "Punjabi" },
      { code: "pl", name: "Polish" },
      { code: "ps", name: "Pashto" },
      { code: "pt", name: "Portuguese" },
      { code: "ro", name: "Romanian" },
      { code: "ru", name: "Russian" },
      { code: "sa", name: "Sanskrit" },
      { code: "sd", name: "Sindhi" },
      { code: "si", name: "Sinhala" },
      { code: "sk", name: "Slovak" },
      { code: "sl", name: "Slovenian" },
      { code: "sn", name: "Shona" },
      { code: "so", name: "Somali" },
      { code: "sq", name: "Albanian" },
      { code: "sr", name: "Serbian" },
      { code: "su", name: "Sundanese" },
      { code: "sv", name: "Swedish" },
      { code: "sw", name: "Swahili" },
      { code: "ta", name: "Tamil" },
      { code: "te", name: "Telugu" },
      { code: "tg", name: "Tajik" },
      { code: "th", name: "Thai" },
      { code: "tk", name: "Turkmen" },
      { code: "tl", name: "Tagalog" },
      { code: "tr", name: "Turkish" },
      { code: "tt", name: "Tatar" },
      { code: "uk", name: "Ukrainian" },
      { code: "ur", name: "Urdu" },
      { code: "uz", name: "Uzbek" },
      { code: "vi", name: "Vietnamese" },
      { code: "yi", name: "Yiddish" },
      { code: "yo", name: "Yoruba" },
      { code: "zh", name: "Chinese" },
      { code: "yue", name: "Cantonese" },
    ],
  },
  meta: { h2: "Meta", published: "Published", type: "Article", category: "Language" },
  cta: { openBrowser: "Open in browser", downloadIOS: "Download iOS app" },
};

const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

// i18n helper
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

/* ---- small UI components ---- */
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

const LINK_IOS =
  "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=world.senseai.minutes";

export default function BlogLanguages() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_language");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl + (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) + "/blog/language";

  const langs = txa("langs.list");
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const query = (q || "").trim().toLowerCase();
    if (!query) return langs;
    return langs.filter(
      (l) =>
        (l.code || "").toLowerCase().includes(query) ||
        (l.name || "").toLowerCase().includes(query)
    );
  }, [q, langs]);

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
        <meta property="og:image" content={`${siteUrl}/icon-master.png`} />
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
              image: [`${siteUrl}/icon-master.png`],
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
            <span className="text-indigo-100">{txs("nav.language")}</span>
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
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Intro */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("intro.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{txs("intro.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{txs("intro.p2")}</p>
            </div>
          </SectionCard>

          {/* STT / Whisper */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("stt.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{txs("stt.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{txs("stt.p2")}</p>
            </div>
          </SectionCard>

          {/* Language list */}
          <SectionCard className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("langs.h2")}</h2>
              <Pill>{txs("langs.note")}</Pill>
            </div>

            <div className="mt-4">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={txs("langs.searchPlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400/60"
              />
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-2 text-indigo-100/90 sm:grid-cols-2">
              {filtered.map((l) => (
                <li
                  key={`${l.code}-${l.name}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="font-mono text-indigo-200">{l.code}</span>
                  <span className="mx-2 text-indigo-300/50">—</span>
                  <span>{l.name}</span>
                </li>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_language"], i18nConfig)),
    },
  };
}
