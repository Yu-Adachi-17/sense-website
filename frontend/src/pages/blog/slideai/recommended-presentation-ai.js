// src/pages/blog/slideai/recommended-presentation-ai.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../../next-i18next.config";
import HomeIcon from "../../homeIcon";
import * as React from "react";

import { FaAppStore, FaCheckCircle, FaRocket, FaClock, FaCalendarAlt, FaBolt, FaMagic, FaGift } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-02-20";
const APP_STORE_URL = "https://apps.apple.com/jp/app/slideai-pro/id6739415399";

/* ---------- English Fallback Content (SEO Optimized for "Recommend") ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Why SlideAI Pro is the Most Recommended AI Slide Generator in 2026",
    description: "Looking for the best AI presentation tool? Compare SlideAI Pro with Gamma and Beautiful.ai. See why we recommend SlideAI for high-speed, 3-minute professional decks.",
    ogTitle: "SlideAI Pro: The Recommended Choice for Instant Presentations",
    ogDescription: "Discover why professionals recommend SlideAI Pro over Gamma or Beautiful.ai for 3-minute high-quality slide generation. Start for free today.",
  },
  aria: { home: "SlideAI Home" },
  nav: { blog: "Blog", category: "AI Recommendations" },
  hero: {
    h1: "Why SlideAI Pro is the <br>#1 Recommended Tool for AI Slides",
    tagline: "Efficiency meets elegance. While there are many options like Gamma and Beautiful.ai, SlideAI Pro is highly recommended for users who value professional aesthetics and 3-minute delivery.",
    badges: ["Top Recommended", "Best for Speed", "Free Tier Available"],
  },
  demo: {
    h2: "The Visual Edge: A 3-Minute Masterpiece",
    p1: "To show why SlideAI Pro is the recommended choice, we tested a high-visual prompt. While other tools might take longer to format, SlideAI Pro delivers a cohesive brand story in under 180 seconds.",
    prompt_label: "The Creative Prompt:",
    prompt_text: "“Create a professional business proposal for 'Flora Central,' a new luxury seasonal flower shop located in New York's Central Park. Focus on high-end visual aesthetics, seasonal rotation strategies, and architectural integration with the park's natural landscape. Ensure the design feels organic yet sophisticated.”",
    output_label: "B. The Visual Results (Generated in 3 Minutes):",
    image_captions: [
      "1. Concept & Vision",
      "2. Central Park Location Strategy",
      "3. Seasonal Bloom Collection",
      "4. Store Architecture & Design",
      "5. Target Audience & Experience",
      "6. Revenue & Growth Roadmap"
    ]
  },
  benefits: {
    h2: "Why We Recommend SlideAI Pro Over Others",
    items: [
      { 
        title: "Speed That Outpaces Gamma", 
        desc: "While Gamma and Beautiful.ai are powerful, SlideAI Pro is optimized for pure speed. Go from a single prompt to a finished 10+ slide deck in just 3 minutes." 
      },
      { 
        title: "Daily Free Usage", 
        desc: "We believe in accessibility. You can generate slides up to 2 times a day for **free**, making it the recommended starting point for any presentation project." 
      },
      { 
        title: "Aesthetic-First Intelligence", 
        desc: "Our AI doesn't just place text; it understands design hierarchy. Perfect for high-stakes proposals like our Central Park flower shop example." 
      }
    ]
  },
  plans: {
    h2: "Ready to Go Pro? Simple Pricing.",
    p_desc: "SlideAI Pro is the recommended investment for professionals who value their time. **Truly unlimited generations** to keep your creativity flowing without limits.",
    pass7: { name: "7-Day Pass", price: "$9.99", desc: "For a single high-impact presentation." },
    monthly: { name: "Monthly", price: "$14.99", desc: "The recommended choice for consistent creators." },
    yearly: { name: "Yearly", price: "$149.99", desc: "Best value for long-term efficiency." },
  },
  cta: {
    h3: "Experience the Recommended AI Tool.",
    p: "Start with 2 free generations today and see why the world is switching to SlideAI Pro.",
    download: "Get Started for Free"
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
export default function SlideAIRecommended() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_slideai_recommended-presentation-ai");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/slideai/recommended-presentation-ai`;

  // デモ画像（セントラルパークのフラワーショップ案）
  const demoImages = [
    "/images/slideai/flower-shop-1-concept.jpg",
    "/images/slideai/flower-shop-2-location.jpg",
    "/images/slideai/flower-shop-3-seasonal.jpg",
    "/images/slideai/flower-shop-4-design.jpg",
    "/images/slideai/flower-shop-5-audience.jpg",
    "/images/slideai/flower-shop-6-roadmap.jpg",
  ];
  const imageCaptions = txa("demo.image_captions");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:image" content={`${siteUrl}/images/slideai/flower-shop-1-concept.jpg`} />
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
              <FaCheckCircle size={12} className="text-green-400" /> <span>Highly Recommended by Designers</span>
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

          {/* Feature: Prompt to Output */}
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

            <div className="flex justify-center mb-10">
                <div className="animate-bounce bg-white/10 p-2 rounded-full text-indigo-300 border border-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                    </svg>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="bg-fuchsia-500 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs">B</span> {txs("demo.output_label")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {demoImages.map((src, i) => (
                    <div key={i} className="group relative rounded-2xl border border-white/10 bg-black/50 shadow-2xl transition-all hover:border-indigo-500/40 hover:scale-[1.02] overflow-hidden">
                        <div className="aspect-video w-full bg-white/5 relative">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`SlideAI recommendation demo: ${imageCaptions[i]}`} className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                        <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs font-medium text-indigo-200">{imageCaptions[i]}</span>
                            <FaCheckCircle size={14} className="text-indigo-400" />
                        </div>
                    </div>
                ))}
                </div>
            </div>
          </SectionCard>

          {/* Comparison/Benefits Section */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {txa("benefits.items").map((item, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur hover:bg-white/10 transition">
                    {i === 1 ? <FaGift className="mx-auto mb-4 text-fuchsia-400" size={24} /> : <FaBolt className="mx-auto mb-4 text-yellow-400" size={24} />}
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-indigo-200/80 leading-relaxed">{item.desc}</p>
                </div>
            ))}
           </div>

          {/* Pricing Section */}
          <SectionCard className="mb-16 border-indigo-500/20 bg-indigo-500/5" glow="indigo">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold">{txs("plans.h2")}</h2>
                <p className="mt-4 text-lg text-indigo-200/80 max-w-2xl mx-auto">
                <RenderMarkdownText text={txs("plans.p_desc")} />
                </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <PricingCard icon={FaClock} name={txs("plans.pass7.name")} price={txs("plans.pass7.price")} desc={txs("plans.pass7.desc")} />
              <PricingCard icon={FaCalendarAlt} name={txs("plans.monthly.name")} price={txs("plans.monthly.price")} desc={txs("plans.monthly.desc")} highlight={true} />
              <PricingCard icon={FaRocket} name={txs("plans.yearly.name")} price={txs("plans.yearly.price")} desc={txs("plans.yearly.desc")} />
            </div>
          </SectionCard>

          {/* CTA Section */}
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
              Updated {LAST_UPDATED_ISO} • iOS / iPadOS / macOS (Apple Silicon)
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_slideai_recommended-presentation-ai"], i18nConfig)),
    },
  };
}