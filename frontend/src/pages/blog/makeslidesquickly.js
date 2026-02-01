// src/pages/blog/makeslidesquickly.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

import { FaAppStore, FaArrowRight, FaMagic, FaBolt, FaEdit, FaCheckCircle } from "react-icons/fa";

// ★ Published Date: 2026-02-01
const PUBLISHED_DATE = "2026-02-01T10:00:00+09:00";
const MODIFIED_DATE = "2026-02-01T10:00:00+09:00";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Content Strategy: Viral / Product Launch ---------- */
const EN_FALLBACK = {
  seo: {
    title: "World's Fastest AI Slide Creation App: SlideAIPro",
    description: "Create professional presentation decks in under 60 seconds. Just enter a theme and hit create. The future of slide design is here on iOS.",
    ogTitle: "SlideAIPro: From Prompt to Presentation in Seconds",
    ogDescription: "The era of manual formatting is over. Experience the world's fastest AI slide generator.",
    ld: {
      headline: "How to Generate Presentation Slides Instantly with AI",
      description: "A guide to using SlideAIPro to create high-quality business slides from simple text prompts in seconds.",
    },
  },
  aria: { home: "Sense AI Home" },
  nav: { blog: "Blog", current: "SlideAIPro" },

  hero: {
    kicker: "Global Launch",
    h1: "The World's Fastest AI Slide App.",
    tagline: "Don't spend hours on layouts. Type your theme, press one button, and get a professional slide deck in less than a minute. Fast, beautiful, and effortless.",
    subtag: "Exclusively for iOS. Create on the go.",
  },

  step1: {
    h2: "One Prompt. One Tap.",
    p1: "SlideAIPro is designed for speed. Simply enter your desired theme or paste your rough notes into the prompt box. No complex settings required.",
    p2: "Once you hit the 'Create' button, our advanced AI engine starts structuring your narrative and designing the visuals simultaneously.",
    label: "Simple & Intuitive UI",
  },

  performance: {
    h2: "Quality Meets Velocity",
    p1: "Witness high-quality output delivered in under 60 seconds. Each slide is logically structured with appropriate layouts, icons, and focus points.",
    note: "Generated in approx. 45 seconds.",
  },

  editing: {
    h2: "Fine-tune with Ease",
    p1: "The AI gets it right, but you have the final say. Every word and every slide can be edited after generation, ensuring the message is uniquely yours.",
  },

  features: {
    h2: "Why Professionals Choose SlideAIPro",
    items: [
      {
        title: "Instant Structuring",
        desc: "AI analyzes your prompt and breaks it down into a logical flow of slides automatically.",
      },
      {
        title: "Stunning Layouts",
        desc: "Forget about alignment. Our engine applies professional design principles to every deck.",
      },
      {
        title: "Full Flexibility",
        desc: "Export your slides and make quick edits directly within the mobile app anytime.",
      },
    ],
  },

  cta: {
    h2: "Start Presenting, Stop Formatting.",
    sub: "Download SlideAIPro and experience the magic of instant slide creation.",
    button: "Download on the App Store",
  },

  meta: { published: "Published", category: "App Release" },
};

/* ---------- Helper Functions ---------- */
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
    if (Array.isArray(val) && val.length > 0) return val;
    const fb = getPath(EN_FALLBACK, key);
    return Array.isArray(fb) ? fb : toArray(fb);
  };
  return { txs, txa };
}

/* ---------- Components ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-block rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs tracking-widest text-indigo-300 font-bold uppercase shadow-[0_0_15px_rgba(99,102,241,0.2)]">
      {children}
    </span>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <section className={"relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-10 backdrop-blur-xl shadow-2xl " + className}>
      {children}
    </section>
  );
}

/* ---------- Page Component ---------- */
export default function BlogSlideAIQuick({ canonicalPath = "/blog/makeslidesquickly" }) {
  const router = useRouter();
  const { txs, txa } = useTx("blog_slideaipro");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}${canonicalPath}`;

  // 6 Slide output images
  const screenshots = [
    "/images/slideai/generated-slide-1.jpg",
    "/images/slideai/generated-slide-2.jpg",
    "/images/slideai/generated-slide-3.jpg",
    "/images/slideai/generated-slide-4.jpg",
    "/images/slideai/generated-slide-5.jpg",
    "/images/slideai/generated-slide-6.jpg",
    "/images/slideai/generated-slide-7.jpg",
  ];

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
        <meta property="og:image" content={`${siteUrl}/images/slideai/hero-ogp.jpg`} />

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
              author: { "@type": "Organization", name: "Sense AI" },
              publisher: { "@type": "Organization", name: "Sense AI", logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` } },
              description: txs("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#030308] text-white selection:bg-indigo-500/40 selection:text-white`}>
        
        {/* Animated Background */}
        <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-[-5%] left-[-5%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[700px] h-[700px] rounded-full bg-indigo-500/5 blur-[140px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 mx-auto max-w-7xl px-6 pt-10">
          <Link href="/home" aria-label={txs("aria.home")} className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10">
            <HomeIcon size={28} />
          </Link>
          <nav className="mt-4 text-xs tracking-widest text-indigo-300/50 font-bold uppercase">
            <Link href="/blog" className="hover:text-indigo-200 transition-colors">{txs("nav.blog")}</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{txs("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-8 text-5xl sm:text-7xl font-black tracking-tighter leading-none">
              <span className="bg-gradient-to-b from-white via-white to-indigo-500 bg-clip-text text-transparent">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-indigo-100/60 leading-relaxed font-medium">
              {txs("hero.tagline")}
            </p>
            <div className="mt-12">
                <a 
                    href="https://apps.apple.com/jp/app/slideai-pro/id6739415399" 
                    className="group inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-5 text-xl font-black text-indigo-950 transition hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                >
                    <FaAppStore className="text-2xl" />
                    <span>App Store</span>
                </a>
            </div>
            <p className="mt-6 text-xs font-bold text-indigo-400/40 tracking-widest uppercase">{txs("hero.subtag")}</p>
        </section>

        <main className="relative z-10 mx-auto max-w-5xl px-6 pb-32 space-y-24">
          
          {/* 1. Prompt UI Section */}
          <SectionCard>
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                    <div className="inline-flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider mb-4">
                        <FaBolt /> {txs("step1.label")}
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 leading-tight">{txs("step1.h2")}</h2>
                    <p className="text-indigo-100/70 leading-relaxed mb-6 text-lg">{txs("step1.p1")}</p>
                    <p className="text-indigo-100/70 leading-relaxed text-lg">{txs("step1.p2")}</p>
                </div>
                <div className="order-1 md:order-2 relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                    <img src="/images/slideai/ui-prompt-screen.jpg" alt="UI Prompt Screen" className="w-full h-auto transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-transparent" />
                </div>
            </div>
          </SectionCard>

          {/* 2. Speed & 6 Slide Results */}
          <div className="text-center">
            <h2 className="text-4xl font-black mb-6">{txs("performance.h2")}</h2>
            <p className="text-indigo-200/50 mb-12 max-w-2xl mx-auto text-lg">{txs("performance.p1")}</p>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {screenshots.map((src, i) => (
                    <div key={i} className="aspect-[16/9] rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden group relative shadow-lg">
                        <img 
                            src={src} 
                            alt={`Generated Slide ${i+1}`} 
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.classList.add("bg-indigo-900/20"); }}
                        />
                        <div className="absolute bottom-3 left-3">
                           <span className="bg-black/60 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-tighter">Slide {i+1}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-emerald-400 font-bold tracking-widest text-xs uppercase">
                <FaCheckCircle /> {txs("performance.note")}
            </div>
          </div>

          {/* 3. Editing Power */}
          <SectionCard className="text-center py-16">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <FaEdit size={32} />
                    </div>
                </div>
                <h2 className="text-3xl font-black mb-6">{txs("editing.h2")}</h2>
                <p className="text-indigo-100/70 text-lg leading-relaxed">{txs("editing.p1")}</p>
            </div>
          </SectionCard>

          {/* 4. Feature Grid */}
          <div className="grid sm:grid-cols-3 gap-6">
            {txa("features.items").map((item, i) => (
                <div key={i} className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {item.title}
                    </h3>
                    <p className="text-indigo-200/50 leading-relaxed text-sm">{item.desc}</p>
                </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="relative rounded-[40px] bg-indigo-600 p-12 sm:p-20 text-center overflow-hidden shadow-[0_40px_100px_rgba(79,70,229,0.3)]">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <h3 className="relative z-10 text-4xl sm:text-5xl font-black text-white mb-6 tracking-tighter">{txs("cta.h2")}</h3>
            <p className="relative z-10 text-indigo-100 mb-12 text-lg font-medium">{txs("cta.sub")}</p>
            <a
              href="https://apps.apple.com/jp/app/slideai-pro/id6739415399"
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 inline-flex items-center gap-3 rounded-2xl bg-white px-12 py-5 text-xl font-black text-indigo-600 transition hover:bg-indigo-50 active:scale-95"
            >
              <FaAppStore className="text-2xl" />
              {txs("cta.button")}
            </a>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-[10px] font-bold text-indigo-300/20 uppercase tracking-[0.2em]">
            <span>{txs("meta.published")}: 2026.02.01</span>
            <span className="hidden sm:inline">•</span>
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_slideaipro"], i18nConfig)),
    },
  };
}