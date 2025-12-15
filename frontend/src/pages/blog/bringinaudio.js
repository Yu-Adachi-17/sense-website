// src/pages/blog/bringinaudio.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import { TbWorld, TbFileMusic, TbMicrophoneOff } from "react-icons/tb";
import { BsGooglePlay, BsFileEarmarkMusic } from "react-icons/bs";
import { FaAppStore, FaFileAudio } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback (CONTENT CORE) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Import Audio to AI: Turn Voice Memos into Meeting Minutes (New Feature)",
    description:
      "Recorded a meeting on Voice Memos? Now you can import audio files (m4a, mp3, wav, mp4) directly into Minutes.AI to generate full transcripts and summaries.",
    ogTitle: "Import Audio Files to Minutes.AI — M4A, MP3, WAV Supported",
    ogDescription:
      "Finally, a way to turn those giant audio files into actionable minutes. Supports up to 200MB and diverse formats like m4a, mp3, and flac.",
    ld: {
      headline: "How to Create Meeting Minutes from Existing Audio Files",
      description:
        "A guide on using the new Import Audio feature in Minutes.AI. Solves the problem of restricted device usage during meetings by processing pre-recorded audio.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", current: "Import Audio Feature" },

  hero: {
    kicker: "New Feature Update",
    h1: "Recorded Elsewhere? No Problem. Turn Audio Files into AI Minutes.",
    tagline:
      "Whether it's a Voice Memo, a Zoom recording, or a file from a dedicated recorder—you can now import them directly into Minutes.AI for instant transcription and summarization.",
  },

  problem: {
    p1:
      "We've all been there. You're in a high-security meeting where 'cloud apps' are banned, but offline recording is allowed. Or maybe you simply forgot to open the AI app and hit record on Apple Voice Memos instead.",
    p2:
      "Until now, you were stuck with a 60-minute audio file and a blank page. Listening to the whole thing again just to type notes is painful. **That ends today.**",
  },

  solution: {
    h2: "Your Recordings, Now Actionable",
    intro:
      "We have updated the iOS app to support **'External Audio Import'**. You can now bring files from other apps, your iCloud Drive, or your device storage directly into our processing engine.",
    features: [
      {
        t: "200MB File Support",
        d: "Got a long meeting? No sweat. We currently support files up to 200MB, covering most standard lengthy sessions. (And we plan to expand this soon!)",
      },
      {
        t: "Full Transcript + Summary",
        d: "You don't just get a summary. You get the raw, time-stamped text of who said what, plus the structured minutes you know and love.",
      },
      {
        t: "Format Freedom",
        d: "M4A, MP3, WAV, MP4... we handle the conversion so you don't have to.",
      },
    ],
  },

  formats: {
    h2: "Supported File Formats",
    intro: "We've built our engine to recognize the most common audio and video containers used in business today:",
    list: [
      { ext: "m4a", type: "Apple Voice Memos / MPEG-4 Audio" },
      { ext: "mp3", type: "Standard Audio Layer III" },
      { ext: "wav", type: "High Quality Waveform" },
      { ext: "mp4", type: "Video Meeting Recordings" },
      { ext: "aac", type: "Advanced Audio Coding" },
      { ext: "flac", type: "Lossless Audio" },
      { ext: "ogg / webm", type: "Web Audio Formats" },
    ],
  },

  workflow: {
    h2: "How It Solves Your Workflow",
    items: [
      {
        title: "The 'Strict Security' Meeting",
        desc: "Some companies block internet access in boardrooms but allow offline dictaphones. Record there, then import the file later when you're back online.",
      },
      {
        title: "The 'Oops, I Forgot' Moment",
        desc: "Used the default recorder out of habit? Don't panic. Share the file from Voice Memos to Minutes.AI and save your evening.",
      },
      {
        title: "The Legacy Archive",
        desc: "Have a folder of old interviews or lectures on your drive? Import them to finally make them searchable and summarized.",
      },
    ],
  },

  meta: { h2: "Meta", published: "Updated", type: "Feature", category: "iOS / Productivity" },
  cta: { openBrowser: "Open in browser", downloadIOS: "Try Import Feature on iOS" },
};
/* ---------- end of fallback block ---------- */

/* ---------- tiny helpers ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

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
    <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs tracking-wide text-emerald-300 font-medium">
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
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
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

/* ---------- CTA link constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS =
  "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=world.senseai.minutes";

export default function BlogBringInAudio() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_bringinaudio");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/bringinaudio";

  const features = txa("solution.features");
  const formatList = txa("formats.list");
  const workflows = txa("workflow.items");

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
        {/* Ideally replace with an image showing the import UI */}
        <meta property="og:image" content={`${siteUrl}/images/audio-import-feature.png`} />

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
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(16,185,129,.15),transparent)]`}
      >
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href={LINK_HOME}
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
            <span className="text-indigo-100">{txs("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-200 via-white to-indigo-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">{txs("hero.tagline")}</p>
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          
          {/* The Problem */}
          <SectionCard>
            <div className="flex items-start gap-4">
               <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-200">
                  <TbMicrophoneOff size={20} />
               </div>
               <div>
                 <p className="text-base leading-7 text-indigo-100/90">{txs("problem.p1")}</p>
                 <p className="mt-4 text-base leading-7 text-indigo-100 font-medium border-l-2 border-red-400/50 pl-4">{txs("problem.p2")}</p>
               </div>
            </div>
          </SectionCard>
            
          

          {/* The Solution & Features */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("solution.h2")}</h2>
            <p className="mt-4 text-indigo-100/90">{txs("solution.intro")}</p>

            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {features.map((f, i) => (
                <div key={i} className="rounded-2xl bg-white/5 p-4 border border-white/5 hover:bg-white/10 transition">
                  <h3 className="font-semibold text-emerald-200">{f.t}</h3>
                  <p className="mt-2 text-sm text-indigo-100/70 leading-snug">{f.d}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Supported Formats */}
          <SectionCard className="mt-8">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <TbFileMusic className="text-fuchsia-300"/> 
                {txs("formats.h2")}
            </h2>
            <p className="mt-2 text-sm text-indigo-200/80 mb-6">{txs("formats.intro")}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {formatList.map((fmt, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-indigo-500/20 text-indigo-300 font-bold text-xs uppercase">
                            {fmt.ext.split(' / ')[0]}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white/90 uppercase">{fmt.ext}</span>
                            <span className="text-[10px] text-white/50">{fmt.type}</span>
                        </div>
                    </div>
                ))}
            </div>
          </SectionCard>

          

          {/* Workflow / Use Cases */}
          <SectionCard className="mt-8">
             <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">{txs("workflow.h2")}</h2>
             <div className="space-y-6">
                {workflows.map((item, i) => (
                    <div key={i} className="relative pl-6 border-l border-indigo-500/30">
                        <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-indigo-200/80">{item.desc}</p>
                    </div>
                ))}
             </div>
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
            {/* App Store */}
            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-5 py-3 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white w-full sm:w-auto justify-center"
            >
              <FaAppStore className="text-xl text-sky-200 group-hover:text-white" />
              <span>{txs("cta.downloadIOS")}</span>
            </a>

            {/* Google Play */}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white w-full sm:w-auto justify-center"
            >
              <BsGooglePlay className="text-xl text-emerald-200 group-hover:text-white" />
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
      // Ensure you add 'blog_bringinaudio' to your next-i18next.config.js if you want localization support
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_bringinaudio"], i18nConfig)),
    },
  };
}