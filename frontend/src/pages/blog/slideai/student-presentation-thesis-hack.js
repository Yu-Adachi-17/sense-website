// src/pages/blog/slideai/student-thesis-seminar-hack.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../../next-i18next.config";
import HomeIcon from "../../homeIcon";
import * as React from "react";

import { FaAppStore, FaCheckCircle, FaGraduationCap, FaBed, FaGlassCheers, FaBolt, FaMagic, FaCalendarDay } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-02-20";
const APP_STORE_URL = "https://apps.apple.com/jp/app/slideai-pro/id6739415399";
// 統一した名前空間
const I18N_NAMESPACE = "blog_slideai_student-thesis-seminar-hack";

/* ---------- English Fallback Content (Relaxed & Flat Tone) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Finish Your Seminar & Thesis Slides in 3 Mins | SlideAI Pro",
    description: "Slide design is tedious. Whether it's for a weekly seminar or your final thesis presentation, let AI handle the formatting while you focus on the research. Try the student-favorite 7-Day Pass.",
    ogTitle: "Don't let your Thesis Presentation eat your weekend.",
    ogDescription: "From UN history to lab reports. One prompt, professional slides, zero stress.",
  },
  aria: { home: "SlideAI Home" },
  nav: { blog: "Blog", category: "For Students" },
  hero: {
    h1: "Slide design is tedious.<br>Focus on your research instead.",
    tagline: "Let’s be real: spending hours on PowerPoint alignment isn’t 'studying.' Whether it's for your weekly seminar or that final graduation thesis, SlideAI turns your topic into a clean deck in 3 minutes.",
    badges: ["Seminar Hack", "Thesis-Ready", "Zero All-Nighters"],
  },
  demo: {
    h2: "Example: UN History in a few clicks",
    p1: "Let’s say you have a seminar presentation on the United Nations. You know the facts, but you don't want to spend all night making it look 'academic.' You just type one sentence, and the AI does the rest.",
    prompt_label: "What the student typed:",
    prompt_text: "“Prepare a presentation document detailing the history of the United Nations and the current issues it faces.”",
    output_label: "The result (6 slides generated instantly):",
  },
  features: {
    h2: "Why students are switching",
    items: [
      { 
        title: "Actually Academic", 
        desc: "The AI understands the logic needed for a Thesis or Seminar. It’s not just pretty—it makes sense.",
        icon: <FaGraduationCap className="text-indigo-400" />
      },
      { 
        title: "Save Your Sleep", 
        desc: "Finish your slides in the time it takes to brew a cup of tea. No more 3 AM formatting hell.",
        icon: <FaBed className="text-sky-400" />
      },
      { 
        title: "Stay for the Fun", 
        desc: "Get your work done early and actually enjoy your weekend. The AI handles the 'boring' part.",
        icon: <FaGlassCheers className="text-fuchsia-400" />
      }
    ]
  },
  plans: {
    h2: "No commitment, just help.",
    p_desc: "We get it—you don't need another monthly bill. That’s why the **7-Day Pass** is our most popular choice for students during exam weeks or thesis deadlines.",
    pass7: { name: "7-Day Pass", price: "$9.99", desc: "One-time payment for that one busy week. No 'surprise' renewals." },
    monthly: { name: "Monthly", price: "$14.99", desc: "For those with a seminar every single week." },
    yearly: { name: "Yearly", price: "$149.99", desc: "Best if you're doing a deep-dive research year." },
  },
  cta: {
    h3: "Stop staring at a blank screen.",
    p: "Download SlideAI and get that presentation out of the way.",
    download: "Get it on App Store"
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
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-white">
            For Exam Week
        </div>
      )}
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
export default function SlideAIStudentThesisBlogEN() {
  const router = useRouter();
  const { txs, txa } = useTx(I18N_NAMESPACE);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/slideai/student-thesis-seminar-hack`;

  const demoImages = [
    "/images/slideai/un-history-slide-1.jpg",
    "/images/slideai/un-history-slide-2.jpg",
    "/images/slideai/un-history-slide-3.jpg",
    "/images/slideai/un-history-slide-4.jpg",
    "/images/slideai/un-history-slide-5.jpg",
    "/images/slideai/un-history-slide-6.jpg",
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
        <meta property="og:image" content={`${siteUrl}/images/slideai/un-history-slide-1.jpg`} />
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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-6 mx-auto">
               Efficiency over effort
            </div>
            <h1 className="bg-gradient-to-r from-white via-indigo-100 to-sky-100 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl leading-tight mb-6">
              <RenderHtmlText text={txs("hero.h1")} />
            </h1>
            <p className="text-xl text-indigo-200/70 leading-relaxed max-w-2xl mx-auto">{txs("hero.tagline")}</p>
            
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {txa("hero.badges").map((badge, i) => (
                <span key={i} className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-indigo-200 border border-white/10">{badge}</span>
              ))}
            </div>
          </section>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {featureItems.map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 transition group">
                <div className="mb-4 text-2xl group-hover:scale-110 transition-transform">
                  {i === 0 && <FaGraduationCap className="text-indigo-400" />}
                  {i === 1 && <FaBed className="text-sky-400" />}
                  {i === 2 && <FaGlassCheers className="text-fuchsia-400" />}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-indigo-200/70 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Proof Section */}
          <SectionCard className="mb-16" glow="fuchsia">
            <h2 className="text-2xl font-bold mb-4">{txs("demo.h2")}</h2>
            <p className="text-indigo-200/80 leading-relaxed mb-10">{txs("demo.p1")}</p>
            
            <div className="mb-10 p-6 bg-black/40 border border-white/10 rounded-2xl">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3">{txs("demo.prompt_label")}</h3>
                <div className="italic text-indigo-100/90 font-mono text-sm">
                    {txs("demo.prompt_text")}
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-6">{txs("demo.output_label")}</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {demoImages.map((src, i) => (
                    <div key={i} className="group relative">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-lg transition-all group-hover:border-indigo-500/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={src} 
                              alt={`Seminar slide example ${i+1}`} 
                              className="w-full h-auto block" 
                            />
                        </div>
                    </div>
                ))}
                </div>
            </div>
          </SectionCard>

          {/* Pricing - Focused on 7DayPass */}
          <SectionCard className="mb-16 border-indigo-500/20 bg-indigo-500/5" glow="indigo">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold">{txs("plans.h2")}</h2>
                <p className="mt-3 text-indigo-200/70">
                <RenderMarkdownText text={txs("plans.p_desc")} />
                </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 items-center">
              <PricingCard icon={FaCalendarDay} name={txs("plans.pass7.name")} price={txs("plans.pass7.price")} desc={txs("plans.pass7.desc")} highlight={true} />
              <PricingCard icon={FaBolt} name={txs("plans.monthly.name")} price={txs("plans.monthly.price")} desc={txs("plans.monthly.desc")} />
              <PricingCard icon={FaCheckCircle} name={txs("plans.yearly.name")} price={txs("plans.yearly.price")} desc={txs("plans.yearly.desc")} />
            </div>
          </SectionCard>

          {/* CTA */}
          <div className="flex flex-col items-center gap-6 text-center py-10">
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-white">{txs("cta.h3")}</h3>
              <p className="text-indigo-200/70">{txs("cta.p")}</p>
            </div>
            
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-full bg-white text-black px-8 py-4 text-lg font-bold transition-all hover:bg-indigo-100 active:scale-95 shadow-xl">
              <FaAppStore size={24} />
              <span>{txs("cta.download")}</span>
            </a>
            
            <p className="text-[10px] text-indigo-300/30 uppercase tracking-[0.2em] font-medium">
              Made for Students • No Hidden Subscriptions
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
      ...(await serverSideTranslations(locale ?? "en", ["common", I18N_NAMESPACE], i18nConfig)),
    },
  };
}