// src/pages/blog/slideai/free-ai-slide-generator.js
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

/* ---------- English Content (SEO Optimized for "Free") ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Free AI Slide Generator: Create 2 Professional Decks Daily at No Cost",
    description: "Looking for a truly free AI slide generator? SlideAI allows anyone to create up to 2 professional presentations per day for free. No credit card required. Experience high-impact design instantly.",
    ogTitle: "SlideAI: The Best Free AI Tool for Instant Presentations",
    ogDescription: "High-quality slides don't have to be expensive. Use SlideAI's free tier to generate and edit 2 decks every single day using advanced AI.",
  },
  aria: { home: "SlideAI Home" },
  nav: { blog: "Blog", category: "Free Tools" },
  hero: {
    h1: "High-Impact Slides.<br>Zero Cost to Start.",
    tagline: "Stop paying for presentation tools before you've even tried them. SlideAI gives everyone 2 free generations every single day. Professional design, AI-powered editing, and zero friction.",
    badges: ["Free Daily Usage", "AI Edit Mode Included", "No Credit Card Needed"],
  },
  demo: {
    h2: "Visual Impact: The 'Guilty Burger' Campaign",
    p1: "Can a free tool handle complex, creative briefs? We challenged SlideAI to create a pitch for a decadent new McDonald's menu: The 'Guilty Burger'—the ultimate antithesis to the healthy salad trend. Here is the result generated for free.",
    prompt_label: "The Prompt (Try this yourself):",
    prompt_text: "“Create a high-impact marketing proposal for McDonald's new 'Guilty Burger' series. The concept is the polar opposite of healthy/salad menus—focusing on pure indulgence, stress relief, and 'guilty pleasures.' Include target audience analysis, visual descriptions of a triple-patty bacon burger with melting cheese, and a social media 'cheat day' campaign strategy.”",
    output_label: "Generated Output (Free Tier):",
  },
  features: {
    h2: "What You Get for Free",
    items: [
      { 
        title: "2 Decks Every Day", 
        desc: "Not a one-time trial. Every 24 hours, your limit resets. Perfect for students, freelancers, and quick business pitches." 
      },
      { 
        title: "AI Edit Mode", 
        desc: "Free users get full access to AI editing. Just tell the AI 'Make this more professional' or 'Add a slide about competitors' to refine your deck." 
      },
      { 
        title: "Premium Layouts", 
        desc: "We don't water down the quality for free users. You get the same high-fidelity design engine as our Pro members." 
      }
    ]
  },
  plans: {
    h2: "Ready to Remove All Limits?",
    p_desc: "While our free tier is generous, **SlideAI Pro** unlocks unlimited daily generations for those who create at the speed of thought. Experience the full power of AI productivity.",
    pass7: { name: "7-Day Pass", price: "$9.99", desc: "Full Pro access for a week of intensive work." },
    monthly: { name: "Monthly", price: "$14.99", desc: "Unlimited power for serious professionals." },
    yearly: { name: "Yearly", price: "$149.99", desc: "The ultimate value for power users." },
  },
  cta: {
    h3: "Create Your First Deck for Free",
    p: "Download SlideAI now and see the 'Guilty Burger' quality for yourself.",
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
export default function SlideAIFreeTool() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_slideai_free-ai-slide-generator");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/slideai/free-ai-slide-generator`;

  // ギルティバーガーのお題に基づいた画像パス
  const demoImages = [
    "/images/slideai/guilty-burger-1.jpg",
    "/images/slideai/guilty-burger-2.jpg",
    "/images/slideai/guilty-burger-3.jpg",
    "/images/slideai/guilty-burger-4.jpg",
    "/images/slideai/guilty-burger-5.jpg",
    "/images/slideai/guilty-burger-6.jpg",
  ];

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:image" content={`${siteUrl}/images/slideai/guilty-burger-1.jpg`} />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#05071c] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(56,189,248,0.15),transparent),radial-gradient(800px_600px_at_90%_10%,rgba(139,92,246,0.15),transparent)]`}>
        
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
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-200 mb-6 mx-auto">
              <FaGift size={12} className="text-emerald-400" /> <span>Free Plan Available Daily</span>
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

          {/* GUILTY BURGER DEMO */}
          <SectionCard className="mb-16" glow="fuchsia">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-300"><FaMagic size={24} /></div>
                <h2 className="text-3xl font-bold tracking-tight">{txs("demo.h2")}</h2>
            </div>
            <p className="text-indigo-100/90 leading-relaxed mb-10 text-lg">{txs("demo.p1")}</p>
            
            {/* Input Prompt */}
            <div className="mb-10">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {txs("demo.prompt_label")}
                </h3>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 italic text-indigo-100/90 font-mono text-sm leading-relaxed shadow-inner">
                    {txs("demo.prompt_text")}
                </div>
            </div>

            {/* Visual Gallery */}
            <div>
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    {txs("demo.output_label")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {demoImages.map((src, i) => (
                    <div key={i} className="group relative rounded-2xl border border-white/10 bg-black/50 shadow-2xl transition-all hover:border-indigo-500/40 hover:scale-[1.02] overflow-hidden">
                        <div className="aspect-video w-full bg-white/5 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="SlideAI generated free slide example" className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                    </div>
                ))}
                </div>
            </div>
          </SectionCard>

          {/* Features Section */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {txa("features.items").map((item, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur hover:bg-white/10 transition">
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

          {/* Final CTA */}
          <div className="flex flex-col items-center gap-8 text-center py-10">
            <div className="space-y-3">
              <h3 className="text-4xl font-extrabold text-white">{txs("cta.h3")}</h3>
              <p className="text-xl text-indigo-200/80">{txs("cta.p")}</p>
            </div>
            
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="relative group flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-600 to-indigo-600 px-10 py-5 text-xl font-bold text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(16,185,129,0.6)]">
              <FaAppStore size={32} />
              <span>{txs("cta.download")}</span>
              <div className="absolute inset-0 -z-10 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <p className="text-[10px] text-indigo-300/40 tracking-widest uppercase font-mono">
              Updated {LAST_UPDATED_ISO} • Free tier available for all users
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_slideai_free-ai-slide-generator"], i18nConfig)),
    },
  };
}