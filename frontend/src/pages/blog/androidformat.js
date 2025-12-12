// src/pages/blog/androidformat.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import { TbWorld, TbDeviceMobileMessage } from "react-icons/tb"; // Added icon
import { BsGooglePlay, BsLightningChargeFill } from "react-icons/bs"; // Added icon
import { FaAppStore, FaAndroid } from "react-icons/fa"; // Added icon

const inter = Inter({ subsets: ["latin"] });

/* ---------- Inline English fallback ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Android Update: Select Your Perfect Meeting Format | Minutes.AI",
    description:
      "Huge update for Android! Join 30,000 users in 150 countries. You can now select specific AI formats (Medical, Sales, General) directly on your Android device.",
    ogTitle: "Android Users: The 'Format Selection' Update is Here",
    ogDescription:
      "Stop settling for generic summaries. Minutes.AI for Android now lets you switch between Negotiation, Brainstorming, and Medical formats instantly.",
    ld: {
      headline: "Minutes.AI Android Update: Format Selection Now Live",
      description:
        "The feature iOS users love is now on Android. Select from multiple AI structures to fit your meeting context perfectly.",
    },
  },
  aria: { home: "Minutes.AI Home" },
  nav: { blog: "Blog", current: "Android Format Update" },

  hero: {
    kicker: "Product Update",
    h1: "Android Users: Unlock the Power of Context",
    tagline:
      "The wait is over. The feature loved by our iOS community is now live on Android. Choose the perfect structure for your conversation—instantly.",
  },

  stats: {
    users: "30,000+",
    countries: "150 Countries",
    label: "Trust Minutes.AI",
    desc: "Join the global community transforming how the world records meetings.",
  },

  byline: { name: "Written by Yu Adachi", title: "CEO, Sense G.K." },

  intro: {
    h2: "Why 'One Format' Wasn't Enough",
    p1: "Until today, our Android version offered a powerful—but singular—summary style. But as we discussed in our previous notes on 'Meaningful Minutes,' a doctor's appointment needs a different structure than a sales pitch.",
    p2: "We believe AI should adapt to *you*, not the other way around. That is why we are bringing Format Selection to the Google Play Store.",
  },

  formats: {
    h2: "New Formats Available on Android",
    p1: "With this update, you can tap a button to tell the AI exactly what kind of conversation you are recording. Here is what you get:",
    list: [
      {
        title: "Standard General",
        desc: "The classic. Perfect for internal syncs. Focuses on Decisions, To-Dos, and Risks.",
        icon: "General",
      },
      {
        title: "Sales & Negotiation",
        desc: "Tracks monetary figures, objections, client concerns, and closing commitments.",
        icon: "Sales",
      },
      {
        title: "Medical (SOAP)",
        desc: "Structured for healthcare professionals. Subjective, Objective, Assessment, and Plan.",
        icon: "Medical",
      },
      {
        title: "Brainstorming",
        desc: "Captures raw ideas, themes, and 'what-if' scenarios without filtering creativity.",
        icon: "Idea",
      },
    ],
  },

  demo: {
    h2: "See the Difference",
    context: "Context: A client discusses a budget concern.",
    old: {
      label: "Generic Mode",
      text: "User discussed price. User A said it is too high. User B offered a discount.",
    },
    new: {
      label: "New Sales Format",
      text: "**Objection:** Client flagged 15% budget variance.\n**Counter:** Proposed payment terms extension (Net 60).\n**Outcome:** Client agreed to review updated proposal by Friday.",
    },
  },

  wrap: {
    h2: "Update Today",
    p: "Don't let your meetings get lost in translation. Join the 30,000 professionals across 150 countries who have already upgraded their workflow.",
  },

  cta: {
    openBrowser: "Web Version",
    downloadIOS: "iOS App",
    downloadGooglePlay: "Update on Android",
  },
};

/* ---------- Helpers ---------- */
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

/* ---------- UI Components ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
      <FaAndroid className="text-sm" />
      {children}
    </span>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur " +
        "shadow-[0_10px_40px_rgba(16,185,129,0.08)] " + 
        className
      }
    >
      {/* Decorative blobs customized for Android theme (Green/Emerald) */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
      {children}
    </section>
  );
}

function Byline() {
  const { txs } = useTx("blog_androidformat");
  return (
    <div className="mt-8 flex items-center gap-3 text-sm text-indigo-100/85">
      <div className="h-9 w-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
        <span className="text-xs font-bold">YA</span>
      </div>
      <div>
        <p className="font-semibold">{txs("byline.name")}</p>
        <p className="text-indigo-200/80">{txs("byline.title")}</p>
      </div>
    </div>
  );
}

/* ---------- Page Component ---------- */
export default function BlogAndroidFormat() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_androidformat");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/androidformat";

  const formatList = txa("formats.list");

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
        <meta property="og:image" content={`${siteUrl}/images/android-update-hero.png`} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: txs("seo.ld.headline"),
              description: txs("seo.ld.description"),
              datePublished: new Date().toISOString(),
              author: {
                "@type": "Person",
                name: "Yu Adachi",
                jobTitle: "CEO",
              },
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
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(16,185,129,0.15),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(79,70,229,0.15),transparent)]`}
      >
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href="/home"
            aria-label={txs("aria.home")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              {txs("nav.blog")}
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-emerald-300">{txs("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-200 via-white to-teal-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-lg leading-8 text-indigo-100/90 max-w-2xl">
              {txs("hero.tagline")}
            </p>
            
            {/* Social Proof Badge */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 border-t border-white/10 pt-6">
                <div className="flex -space-x-2">
                   {[...Array(4)].map((_,i) => (
                       <div key={i} className={`h-8 w-8 rounded-full border-2 border-[#0b0e2e] bg-indigo-${300 + (i*100)}`} />
                   ))}
                </div>
                <div className="text-sm">
                    <p className="font-bold text-white">
                        {txs("stats.users")} <span className="text-indigo-300 mx-1">/</span> {txs("stats.countries")}
                    </p>
                    <p className="text-indigo-200/70">{txs("stats.desc")}</p>
                </div>
            </div>

            <Byline />
          </div>
        </section>

        <main className="mx-auto max-w-3xl px-6 pb-20">
            
          {/* Introduction */}
          <SectionCard>
            <h2 className="text-2xl font-bold tracking-tight text-white">{txs("intro.h2")}</h2>
            <div className="mt-4 space-y-4 text-indigo-100/90 leading-7">
              <p>{txs("intro.p1")}</p>
              <p className="font-medium text-emerald-200">{txs("intro.p2")}</p>
            </div>
          </SectionCard>

          {/* New Formats Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
             <div className="col-span-1 sm:col-span-2 mb-2">
                 <h2 className="text-2xl font-bold tracking-tight">{txs("formats.h2")}</h2>
                 <p className="mt-2 text-indigo-200/80">{txs("formats.p1")}</p>
             </div>
             
             {formatList.map((fmt, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-500/30 hover:bg-emerald-500/5">
                    <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
                        {/* Simple icon logic based on index or key */}
                        <BsLightningChargeFill />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{fmt.title}</h3>
                    <p className="mt-2 text-sm text-indigo-200/70">{fmt.desc}</p>
                </div>
             ))}
          </div>

          {/* Comparative Demo */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl font-bold tracking-tight">{txs("demo.h2")}</h2>
            <p className="mt-2 text-sm text-indigo-300/60 font-mono mb-6">{txs("demo.context")}</p>
            
            <div className="grid gap-6 sm:grid-cols-2">
                {/* Old way */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-red-300 opacity-70">{txs("demo.old.label")}</div>
                    <p className="text-sm text-indigo-100/60 leading-relaxed">
                        {txs("demo.old.text")}
                    </p>
                </div>
                
                {/* New way */}
                <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">{txs("demo.new.label")}</div>
                    <p className="text-sm text-white leading-relaxed whitespace-pre-line">
                        {txs("demo.new.text")}
                    </p>
                </div>
            </div>
          </SectionCard>

          {/* CTA Section */}
          <SectionCard className="mt-8 text-center bg-gradient-to-b from-emerald-900/20 to-transparent">
            <h2 className="text-2xl font-bold tracking-tight">{txs("wrap.h2")}</h2>
            <p className="mt-4 text-indigo-100/80 max-w-lg mx-auto">{txs("wrap.p")}</p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-4">
                 {/* Google Play (Primary) */}
                <a
                  href="https://play.google.com/store/apps/details?id=world.senseai.minutes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-500 text-white px-6 py-3 text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] transition hover:scale-105 hover:bg-emerald-400"
                >
                  <BsGooglePlay className="text-xl" />
                  <span>{txs("cta.downloadGooglePlay")}</span>
                </a>

                {/* iOS */}
                <a
                  href="https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  <FaAppStore className="text-xl" />
                  <span>{txs("cta.downloadIOS")}</span>
                </a>
            </div>
          </SectionCard>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "en",
        ["common", "blog_androidformat"], // Make sure to add this NS to your config if using real files
        i18nConfig
      )),
    },
  };
}