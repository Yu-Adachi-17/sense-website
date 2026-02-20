// src/pages/blog/slideai/consultant-efficiency-tool.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../../next-i18next.config";
import HomeIcon from "../../homeIcon";
import * as React from "react";

import { FaAppStore, FaCheckCircle, FaRocket, FaClock, FaCalendarAlt, FaBolt, FaMagic } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
// 検索エンジンに「最新情報」であることを伝える日付
const LAST_UPDATED_ISO = "2026-02-20";
const APP_STORE_URL = "https://apps.apple.com/jp/app/slideai-pro/id6739415399";

/* ---------- English Fallback Content (SEO Optimized) ---------- */
const EN_FALLBACK = {
  seo: {
    // ターゲットキーワードをタイトルの前方に配置
    title: "Proposal Creation Speed Tool for Consultants: Save Hours with AI",
    // クリック率を高めるための具体的なメリットを記述
    description: "Stop wasting billable hours on PowerPoint formatting. See how freelancers and consultants create professional strategy decks in 3 minutes using a single text prompt with SlideAI.",
    ogTitle: "How Consultants Cut Presentation Time by 90% with SlideAI",
    ogDescription: "The ultimate efficiency hack for professionals. Turn strategy text into client-ready slides instantly. Unlimited generations.",
  },
  aria: { home: "SlideAI Home" },
  nav: { blog: "Blog", category: "Efficiency Tools" },
  hero: {
    // 直感的にメリットが伝わる見出し
    h1: "Your Strategy is Valuable.<br>Your Formatting Time Isn't.",
    // ターゲットの痛みに寄り添うサブテキスト
    tagline: "For consultants and freelancers who need efficiency. SlideAI turns your text into professional proposals instantly, so you can focus on billing for your expertise, not your slide design.",
    badges: ["For Consultants", "Proposal Automation", "Client-Ready Output"],
  },
  demo: {
    // 具体的な証拠を提示するセクション
    h2: "The Proof: From Simple Text to Full Deck in 3 Minutes",
    p1: "We don't just claim speed; we prove it. Below is an actual example of a DX strategy proposal generated from a single prompt. No manual layout adjustments were made.",
    prompt_label: "A. The Only Input Needed (Your Prompt):",
    // ユーザーが提示した具体的なプロンプト例
    prompt_text: "“You are a DX strategy consultant. Create a proposal for a mid-sized manufacturing client to shift from legacy systems to AI-driven productivity. Include current issues, the target smart factory model, a 3-year roadmap, expected ROI, and next steps. Ensure a logical, persuasive structure.”",
    output_label: "B. The Output (Generated in Under 180 Seconds):",
    image_captions: [
      "1. Title & Agenda",
      "2. Current Issues Analysis",
      "3. Target To-Be Model",
      "4. Execution Roadmap",
      "5. ROI Projection",
      "6. Immediate Next Steps"
    ]
  },
  benefits: {
    h2: "Why Professionals Choose SlideAI",
    items: [
      { title: "Zero Formatting Required", desc: "The AI handles all alignment, spacing, and visual hierarchy. You only supply the logic." },
      { title: "Unlimited Iterations", desc: "Not happy with the first draft? Regenerate instantly until the narrative flow is perfect." },
      { title: "Consultant-Grade Aesthetics", desc: "Clean, modern layouts designed to look professional in boardroom settings." }
    ]
  },
  plans: {
    // 費用対効果を強調する見出し
    h2: "An Investment That Pays for Itself in One Hour",
    p_desc: "How much is one hour of your billable time worth? SlideAI Pro costs less than a client lunch but saves you dozens of hours every month. **Truly unlimited generations.**",
    pass7: { name: "7-Day Pass", price: "$9.99", desc: "For a single urgent proposal." },
    monthly: { name: "Monthly", price: "$14.99", desc: "The most popular choice for active freelancers." },
    yearly: { name: "Yearly", price: "$149.99", desc: "Best value for long-term efficiency." },
  },
  cta: {
    h3: "Stop Building Slides manually.",
    p: "Try the tool that pays for itself with the first proposal you generate.",
    download: "Start Creating in Seconds"
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
export default function SlideAIConsultantTool() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_slideai_consultant-efficiency-tool");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/slideai/consultant-efficiency-tool`;

  // デモ画像のリスト（上記の構成に対応するファイル名）
  const demoImages = [
    "/images/slideai/dx-proposal-1-title.jpg",
    "/images/slideai/dx-proposal-2-issues.jpg",
    "/images/slideai/dx-proposal-3-tobe.jpg",
    "/images/slideai/dx-proposal-4-roadmap.jpg",
    "/images/slideai/dx-proposal-5-roi.jpg",
    "/images/slideai/dx-proposal-6-nextsteps.jpg",
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
        {/* SEO的に最も重要なファーストビューの画像をOGPに設定 */}
        <meta property="og:image" content={`${siteUrl}/images/slideai/dx-proposal-1-title.jpg`} />
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
          
          {/* Hero Section: Direct Benefit Focus */}
          <section className="mb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-200 mb-6 mx-auto">
              <FaBolt size={12} className="text-yellow-400" /> <span>The Ultimate Efficiency Tool</span>
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

          {/* THE PROOF: Prompt to Output Demo (Core SEO Content) */}
          <SectionCard className="mb-16" glow="fuchsia">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-300"><FaMagic size={24} /></div>
                <h2 className="text-3xl font-bold tracking-tight">{txs("demo.h2")}</h2>
            </div>
            <p className="text-indigo-100/90 leading-relaxed mb-10 text-lg">{txs("demo.p1")}</p>
            
            {/* A. The Input (Prompt) */}
            <div className="mb-10">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs">A</span> {txs("demo.prompt_label")}
                </h3>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 italic text-indigo-100/90 font-mono text-sm leading-relaxed shadow-inner">
                    {txs("demo.prompt_text")}
                </div>
            </div>

             {/* Down Arrow Divider */}
            <div className="flex justify-center mb-10">
                <div className="animate-bounce bg-white/10 p-2 rounded-full text-indigo-300 border border-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                    </svg>
                </div>
            </div>

            {/* B. The Output (Gallery) */}
            <div>
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="bg-fuchsia-500 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs">B</span> {txs("demo.output_label")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {demoImages.map((src, i) => (
                    <div key={i} className="group relative rounded-2xl border border-white/10 bg-black/50 shadow-2xl transition-all hover:border-indigo-500/40 hover:scale-[1.02] overflow-hidden">
                        <div className="aspect-video w-full bg-white/5 relative">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`SlideAI generated slide: ${imageCaptions[i]}`} className="absolute inset-0 h-full w-full object-cover" />
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

          {/* Benefits Section */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {txa("benefits.items").map((item, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur hover:bg-white/10 transition">
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-indigo-200/80 leading-relaxed">{item.desc}</p>
                </div>
            ))}
           </div>

          {/* Pricing as an Investment */}
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_slideai_consultant-efficiency-tool"], i18nConfig)),
    },
  };
}