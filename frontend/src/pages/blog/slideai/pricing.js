// src/pages/blog/slideai/pricing.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../../next-i18next.config";
import HomeIcon from "../../homeIcon";
import * as React from "react";

import { TbWorld } from "react-icons/tb";
import { FaAppStore, FaCheckCircle, FaRocket, FaClock, FaCalendarAlt } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-02-17";
const APP_STORE_URL = "https://apps.apple.com/jp/app/slideai-pro/id6739415399";

/* ---------- English Fallback Content ---------- */
const EN_FALLBACK = {
  seo: {
    title: "SlideAI Pricing (2026) — Unlimited Pro Slides from a Single Prompt",
    description: "Transform ideas into professional presentations instantly. Compare our 7-Day Pass, Monthly, and Yearly plans. Truly unlimited generations for professionals.",
    ogTitle: "SlideAI Pricing: Create Professional Decks Instantly",
    ogDescription: "Unlimited slides, zero effort. Choose the plan that fits your workflow. 7-Day Pass available for one-off projects.",
  },
  aria: { home: "SlideAI Home" },
  nav: { blog: "Blog", pricing: "Pricing" },
  hero: {
    kicker: "Plans & Pricing",
    h1: "Unlimited Creativity, One Simple Price.",
    tagline: "Forget about 'credits' or 'per-slide' costs. SlideAI gives you the freedom to iterate until it's perfect. From a single prompt to a boardroom-ready masterpiece.",
    badges: ["Unlimited Generations", "No Hidden Fees", "Professional Layouts"],
  },
  intro: {
    h2: "One Prompt, Infinite Possibilities",
    p1: "Whether you're pitching a new cafe menu or presenting a quarterly report, SlideAI handles the heavy lifting. Simply describe your vision, and watch as high-fidelity slides appear in seconds.",
  },
  plans: {
    h2: "Choose Your Path to Speed",
    p_desc: "All paid plans grant you full access to our AI engine with **zero limits** on how many presentations you can create.",
    
    pass7: {
      name: "7-Day Pass",
      price: "$9.99",
      desc: "Perfect for one-off projects or short-term use. Auto-expires in 7 days.",
    },
    monthly: {
      name: "Monthly",
      price: "$14.99",
      desc: "A flexible monthly plan for when you need it. Cancel anytime.",
    },
    yearly: {
      name: "Yearly",
      price: "$149.99",
      desc: "The best value plan, chosen by professionals. Unlimited freedom for one year.",
      save: "Save ~17%"
    },
    features: [
      "Truly Unlimited Slide Generations",
      "One-Prompt Full Deck Creation",
      "Professional-Grade Aesthetics",
      "Export to PDF & Images",
      "Commercial Usage Rights"
    ]
  },
  faq: {
    h2: "Common Questions",
    items: [
      { q: "Is 'Unlimited' really unlimited?", a: "Yes. We don't believe in stifling creativity with tokens. Create as many drafts as you need to get the perfect result." },
      { q: "What happens after the 7-Day Pass?", a: "It simply expires. No recurring charges. It's the ultimate 'trial' for a big project." },
      { q: "Can I use SlideAI for commercial work?", a: "Absolutely. All paid subscribers own the rights to the presentations they generate." }
    ]
  },
  cta: { download: "Get SlideAI on App Store" }
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

function SectionCard({ children, className = "" }) {
  return (
    <section className={"relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur shadow-[0_10px_40px_rgba(139,92,246,0.15)] " + className}>
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />
      {children}
    </section>
  );
}

function PricingCard({ icon: Icon, name, price, desc, highlight = false, badge = "" }) {
  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 transition-all ${highlight ? "border-indigo-400 bg-indigo-500/10 scale-105 z-10" : "border-white/10 bg-black/30"}`}>
      {badge && <span className="absolute -top-3 right-4 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-bold uppercase text-white">{badge}</span>}
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
export default function SlideAIPricing() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_slideai_pricing");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/slideai/pricing`;

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:image" content={`${siteUrl}/images/slideai/hero.jpg`} />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#0b0e3d] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(99,102,241,0.2),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(168,85,247,0.15),transparent)]`}>
        
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10">
          <Link href="/home" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10">
            <HomeIcon size={28} />
          </Link>
          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">{txs("nav.blog")}</Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{txs("nav.pricing")}</span>
          </nav>
        </header>

        <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
          
          {/* Hero */}
          <section className="mb-12">
            <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">{txs("hero.kicker")}</span>
            <h1 className="mt-6 bg-gradient-to-r from-white via-indigo-100 to-fuchsia-100 bg-clip-text text-4xl font-extrabold text-transparent sm:text-6xl">{txs("hero.h1")}</h1>
            <p className="mt-6 text-lg text-indigo-100/90 leading-relaxed">{txs("hero.tagline")}</p>
          </section>

          {/* Magic of One-Shot */}
          
          <SectionCard className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{txs("intro.h2")}</h2>
            <p className="mt-4 text-indigo-100/90 leading-relaxed">{txs("intro.p1")}</p>
          </SectionCard>
          [Image showing the AI transformation process from text prompt to 6 beautiful slides]

          {/* Pricing Grid */}
          <SectionCard className="mb-8 border-indigo-500/30 bg-indigo-500/5">
            <h2 className="text-2xl font-bold">{txs("plans.h2")}</h2>
            <p className="mt-2 text-sm text-indigo-200/80">
  {txs("plans.p_desc").split(/(\*\*.*?\*\*)/g).map((part, i) => 
    part.startsWith("**") && part.endsWith("**") 
      ? <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong> 
      : part
  )}
</p>
            
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <PricingCard icon={FaClock} name={txs("plans.pass7.name")} price={txs("plans.pass7.price")} desc={txs("plans.pass7.desc")} />
              <PricingCard icon={FaCalendarAlt} name={txs("plans.monthly.name")} price={txs("plans.monthly.price")} desc={txs("plans.monthly.desc")} highlight={true} />
              <PricingCard icon={FaRocket} name={txs("plans.yearly.name")} price={txs("plans.yearly.price")} desc={txs("plans.yearly.desc")} badge={txs("plans.yearly.save")} />
            </div>

            <div className="mt-10 rounded-2xl bg-white/5 p-6 border border-white/5">
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {txa("plans.features").map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-indigo-100/90">
                    <FaCheckCircle className="text-indigo-400" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>

          

          {/* FAQ */}
          <SectionCard className="mb-8">
            <h2 className="text-2xl font-bold">{txs("faq.h2")}</h2>
            <div className="mt-6 space-y-4">
              {txa("faq.items").map((item, i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <h4 className="font-bold text-white/90">Q: {item.q}</h4>
                  <p className="mt-2 text-sm text-indigo-100/80 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-6">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-full bg-white px-8 py-4 text-lg font-bold text-indigo-900 shadow-2xl transition-all hover:scale-105 active:scale-95">
              <FaAppStore size={24} />
              <span>{txs("cta.download")}</span>
            </a>
            <p className="text-xs text-indigo-300/60 tracking-widest uppercase">Last Updated: {LAST_UPDATED_ISO}</p>
          </div>

        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_slideai_pricing"], i18nConfig)),
    },
  };
}