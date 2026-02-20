// src/pages/blog/slideai/iphone-app-presentation-era.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../../next-i18next.config";
import HomeIcon from "../../homeIcon";
import * as React from "react";

import { FaAppStore, FaCheckCircle, FaMobileAlt, FaWalking, FaCoffee, FaBolt, FaMagic } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-02-20";
const APP_STORE_URL = "https://apps.apple.com/jp/app/slideai-pro/id6739415399";

/* ---------- English Fallback Content (SEO Optimized) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Best iPhone App for Presentations: Create Pro Slides in 3 Minutes",
    description: "The era of creating presentations on smartphones is here. Stop starting from scratch in PowerPoint or Keynote. Use the SlideAI iPhone app to generate high-quality decks on the go with simple text prompts.",
    ogTitle: "SlideAI: The Ultimate iPhone App for Instant Presentation Creation",
    ogDescription: "Turn your iPhone into a powerful slide generator. 3 minutes, one prompt, stunning results. Try it for free today.",
  },
  aria: { home: "SlideAI Home" },
  nav: { blog: "Blog", category: "iPhone / App" },
  hero: {
    h1: "The Era of Building Slides<br>on Your iPhone is Here.",
    tagline: "On your commute, at a cafe, or the moment inspiration strikes. Simply enter a prompt on your iPhone and watch professional-grade slides appear in 3 minutes. No PC required.",
    badges: ["iOS & iPadOS", "3-Min Generation", "AI-Powered App"],
  },
  demo: {
    h2: "Professional Decks, Right in Your Pocket.",
    p1: "Forget the stress of opening PowerPoint or Keynote to face a blank white screen. With SlideAI, you just describe what you want. The AI handles the structure, design, and image selection instantly.",
    prompt_label: "Example Prompt Used:",
    prompt_text: "“Barcelona sightseeing tour proposal. With attractive visuals showcasing beautiful tourist spots and delicious local cuisine.”",
    output_label: "Generated Output (Mobile Preview):",
    image_captions: [
      "Stunning Title Slide for Barcelona Tour",
      "Visual-Rich Spot Highlights"
    ]
  },
  features: {
    h2: "Why SlideAI Changes Everything",
    items: [
      { 
        title: "Zero Manual Design", 
        desc: "AI manages layouts, alignment, and visuals. You never have to start from a blank slide again.",
        icon: <FaBolt className="text-yellow-400" />
      },
      { 
        title: "True Mobile Productivity", 
        desc: "Finish your presentation on the train or between meetings. It's ready by the time you arrive.",
        icon: <FaWalking className="text-sky-400" />
      },
      { 
        title: "Stunning Visual Hierarchy", 
        desc: "Optimized for beauty and clarity. Our AI ensures your slides look professional on any screen.",
        icon: <FaMagic className="text-fuchsia-400" />
      }
    ]
  },
  plans: {
    h2: "Start for 'free' Today",
    p_desc: "Experience the speed of AI. Even on the **free plan, you can generate up to 2 presentations per day.** See for yourself why thousands are switching to mobile-first slide creation.",
    pass7: { name: "7-Day Pass", price: "$9.99", desc: "For urgent, one-off projects." },
    monthly: { name: "Monthly", price: "$14.99", desc: "Most popular for active professionals." },
    yearly: { name: "Yearly", price: "$149.99", desc: "Best value for long-term efficiency." },
  },
  cta: {
    h3: "Master Your Presentations Anywhere",
    p: "Download SlideAI for iPhone and transform how you work.",
    download: "Download on the App Store"
  }
};

/* ---------- Helpers ---------- */
const getPath = (obj, path) => path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

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
    if (Array.isArray(val) && val.length > 0) return val;
    const fb = getPath(EN_FALLBACK, key);
    return Array.isArray(fb) ? fb : [];
  };
  return { txs, txa };
}

function RenderHtmlText({ text, className }) {
  if (!text) return null;
  return (
    <span className={className}>
      {text.split("<br>").map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < text.split("<br>").length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
}

function RenderMarkdownText({ text }) {
  if (!text) return null;
  return (
    <>
      {text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-white font-bold bg-white/10 px-1 rounded mx-0.5">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function SectionCard({ children, className = "", glow = "indigo" }) {
  const glowColor = glow === "fuchsia" ? "bg-fuchsia-500/10" : "bg-indigo-500/10";
  return (
    <section className={"relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.2)] " + className}>
      <div className={`pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full ${glowColor} blur-3xl`} />
      {children}
    </section>
  );
}

function PricingCard({ icon: Icon, name, price, desc, highlight = false }) {
  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 transition-all ${highlight ? "border-indigo-400 bg-indigo-500/10 scale-105 z-10 shadow-xl shadow-indigo-500/20" : "border-white/10 bg-black/30 hover:bg-white/5"}`}>
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-indigo-300"><Icon size={24} /></div>
      <h3 className="text-lg font-bold">{name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{price}</span>
      </div>
      <p className="mt-3 text-sm text-indigo-200/80 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ---------- Page Component ---------- */
export default function SlideAIIPhoneAppBlogEN() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_slideai_iphone-app-presentation-era");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/slideai/iphone-app-presentation-era`;

  const demoImages = [
    "/images/slideai/barcelona-slide-1.jpg",
    "/images/slideai/barcelona-slide-2.jpg",
  ];

  const featureItems = txa("features.items");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:image" content={`${siteUrl}/images/slideai/barcelona-slide-1.jpg`} />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#05071c] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(56,189,248,0.15),transparent),radial-gradient(800px_600px_at_90%_10%,rgba(139,92,246,0.15),transparent)]`}>
        
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10 relative z-10">
          <Link href="/home" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10">
            <HomeIcon size={28} />
          </Link>
          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">{txs("nav.blog")}</Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{txs("nav.category")}</span>
          </nav>
        </header>

        <main className="mx-auto max-w-4xl px-6 pb-20 pt-10 relative z-10">
          
          {/* Hero Section */}
          <section className="mb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-200 mb-6 mx-auto">
              <FaMobileAlt size={12} className="text-indigo-400" /> <span>iPhone / App Optimized</span>
            </div>
            <h1 className="bg-gradient-to-r from-white via-indigo-100 to-sky-100 bg-clip-text text-5xl font-extrabold text-transparent sm:text-7xl leading-tight mb-6">
              <RenderHtmlText text={txs("hero.h1")} />
            </h1>
            <p className="text-xl text-indigo-100/80 leading-relaxed max-w-2xl mx-auto">{txs("hero.tagline")}</p>
            
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {txa("hero.badges").map((badge, i) => (
                <span key={i} className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-indigo-100 border border-white/10 backdrop-blur">{badge}</span>
              ))}
            </div>
          </section>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {featureItems.map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur hover:bg-white/10 transition group">
                <div className="mb-4 flex justify-center text-3xl group-hover:scale-110 transition-transform">
                  {i === 0 && <FaBolt className="text-yellow-400" />}
                  {i === 1 && <FaWalking className="text-sky-400" />}
                  {i === 2 && <FaMagic className="text-fuchsia-400" />}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-indigo-200/80 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Proof Section */}
          <SectionCard className="mb-16" glow="fuchsia">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-300"><FaMagic size={24} /></div>
                <h2 className="text-3xl font-bold tracking-tight">{txs("demo.h2")}</h2>
            </div>
            <p className="text-indigo-100/90 leading-relaxed mb-10 text-lg">{txs("demo.p1")}</p>
            
            <div className="mb-10">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs">A</span> {txs("demo.prompt_label")}
                </h3>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 italic text-indigo-100/90 font-mono text-sm leading-relaxed shadow-inner">
                    {txs("demo.prompt_text")}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="bg-fuchsia-500 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs">B</span> {txs("demo.output_label")}
                </h3>
                
                {/* Simplified Image Gallery:
                  Removed simulated bezel. Added rounded corners and subtle shadow.
                  PC: Side-by-side (2 cols), Mobile: Vertical (1 col).
                */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {demoImages.map((src, i) => (
                    <div key={i} className="group relative rounded-2xl border border-white/10 bg-black/20 overflow-hidden shadow-2xl transition-all hover:scale-[1.02]">
                        <div className="aspect-[9/16] w-full relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`SlideAI generated slide ${i+1}`} className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                        
                        {/* Pagination Overlay - Small and clean */}
                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-white/90 border border-white/10">
                           Slide {i + 1} / 2
                        </div>
                    </div>
                ))}
                </div>
            </div>
          </SectionCard>

          {/* Free Tier */}
          <SectionCard className="mb-16 border-indigo-500/20 bg-indigo-500/5" glow="indigo">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold">{txs("plans.h2")}</h2>
                <p className="mt-4 text-lg text-indigo-200/80 max-w-2xl mx-auto">
                <RenderMarkdownText text={txs("plans.p_desc")} />
                </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <PricingCard icon={FaCoffee} name={txs("plans.pass7.name")} price={txs("plans.pass7.price")} desc={txs("plans.pass7.desc")} />
              <PricingCard icon={FaMobileAlt} name={txs("plans.monthly.name")} price={txs("plans.monthly.price")} desc={txs("plans.monthly.desc")} highlight={true} />
              <PricingCard icon={FaBolt} name={txs("plans.yearly.name")} price={txs("plans.yearly.price")} desc={txs("plans.yearly.desc")} />
            </div>
          </SectionCard>

          {/* CTA */}
          <div className="flex flex-col items-center gap-8 text-center py-10">
            <div className="space-y-3">
              <h3 className="text-4xl font-extrabold text-white">{txs("cta.h3")}</h3>
              <p className="text-xl text-indigo-200/80">{txs("cta.p")}</p>
            </div>
            
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="relative group flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-10 py-5 text-xl font-bold text-white shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(99,102,241,0.6)]">
              <FaAppStore size={32} />
              <span>{txs("cta.download")}</span>
              <div className="absolute inset-0 -z-10 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <p className="text-[10px] text-indigo-300/40 tracking-widest uppercase font-mono">
              Updated {LAST_UPDATED_ISO} • Available on iOS / iPadOS
            </p>
          </div>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_slideai_iphone-app-presentation-era"], i18nConfig)),
    },
  };
}