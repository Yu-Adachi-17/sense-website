// src/pages/blog/atelier/introduction.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../../next-i18next.config";
import HomeIcon from "../../homeIcon";
import * as React from "react";

import { FaAppStore, FaCheckCircle, FaRocket, FaMobileAlt, FaPaintBrush, FaBolt, FaMagic, FaGlobe, FaEdit, FaLink } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-03-25";
const APP_STORE_URL = "https://apps.apple.com/us/app/atelier-ai-website-builder/id6760372324";
const PRIVACY_URL = "https://a-telier.ai/privacy-policy";
const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

/* ---------- English Content (SEO Optimized) ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Atelier: AI Website Builder — Build a Stunning Site from Your iPhone",
    description: "Atelier turns a simple prompt into a polished, live website in minutes. No coding, no desktop required. Build portfolios, business pages, booking sites and more — all from your phone.",
    ogTitle: "Atelier: Launch a Beautiful Website in Minutes with AI",
    ogDescription: "From idea to live site in minutes. Atelier is the AI website builder designed for your phone — create, edit, and publish without code.",
  },
  aria: { home: "Atelier Home" },
  nav: { blog: "Blog", category: "Atelier" },
  hero: {
    kicker: "Now Available on iOS",
    h1: "Your Next Website<br>Starts with a Sentence.",
    tagline: "Atelier is an AI website builder that turns a simple prompt into a polished, live website — all from your iPhone. No coding, no design tools, no setup headaches. Just describe what you want and publish.",
    badges: ["AI-Powered", "Mobile-First", "Instant Publish"],
  },
  demo: {
    h2: "From Prompt to Published — In Minutes",
    p1: "We asked Atelier to build a website for a brand-new café opening near Central Park, New York — with a beautiful spring-inspired design. Here is what it created, instantly, from a single prompt on an iPhone.",
    prompt_label: "The Prompt (Try this yourself):",
    prompt_text: "\"Build a homepage for a new café opening near Central Park, New York. Use a beautiful spring-inspired design with soft pastels, cherry blossoms, and an inviting atmosphere. Include a welcome section, menu highlights, location info, and a reservation button.\"",
    output_label: "Generated Website (Created Instantly):",
  },
  features: {
    h2: "Everything You Need, Nothing You Don't",
    items: [
      {
        icon: "magic",
        title: "Generate from a Prompt",
        desc: "Describe your business, portfolio, or idea — Atelier builds a complete, multi-section website with clean layouts and real content.",
      },
      {
        icon: "edit",
        title: "Edit Without Code",
        desc: "Tap to change text, rearrange sections, update images, and refine your design. Full creative control, zero technical knowledge required.",
      },
      {
        icon: "globe",
        title: "Publish Instantly",
        desc: "Go live on a unique Atelier URL with one tap. Your site is immediately accessible to anyone, anywhere in the world.",
      },
      {
        icon: "mobile",
        title: "Built for Mobile",
        desc: "The entire workflow — from creation to publishing — is designed for your phone. Update your site from anywhere, anytime.",
      },
      {
        icon: "bolt",
        title: "Perfect for Any Use Case",
        desc: "Salons, restaurants, portfolios, booking pages, link pages, personal brands — Atelier adapts to your vision.",
      },
    ],
  },
  useCases: {
    h2: "Built for Creators, Entrepreneurs & Small Businesses",
    items: [
      "Portfolio & personal branding sites",
      "Local businesses — cafés, salons, restaurants",
      "Freelancer & creator landing pages",
      "Booking & reservation pages",
      "Link-in-bio & social hub pages",
      "Event & launch pages",
    ],
  },
  cta: {
    h3: "Your Website Is One Prompt Away",
    p: "Download Atelier for free and launch your site today.",
    download: "Download on the App Store",
  },
  legal: {
    privacy: "Privacy Policy",
    terms: "Terms of Use",
  },
};

/* ---------- Helpers ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

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

function SectionCard({ children, className = "", glow = "rose" }) {
  const glowColor =
    glow === "emerald" ? "bg-emerald-500/10" :
    glow === "violet" ? "bg-violet-500/10" :
    "bg-rose-500/10";
  return (
    <section className={"relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.2)] " + className}>
      <div className={`pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full ${glowColor} blur-3xl`} />
      {children}
    </section>
  );
}

const FEATURE_ICONS = {
  magic: FaMagic,
  edit: FaEdit,
  globe: FaGlobe,
  mobile: FaMobileAlt,
  bolt: FaBolt,
};

/* ---------- Page Component ---------- */
export default function AtelierIntroduction() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_atelier_introduction");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/atelier/introduction`;

  const demoImages = [
    "/images/atelierintroduction1.jpeg",
    "/images/atelierintroduction2.jpeg",
    "/images/atelierintroduction3.jpeg",
    "/images/atelierintroduction4.jpeg",
  ];

  const featureItems = txa("features.items");
  const useCaseItems = txa("useCases.items");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta property="og:description" content={txs("seo.ogDescription")} />
        <meta property="og:image" content={`${siteUrl}/images/atelierintroduction3.jpeg`} />
        <meta property="og:type" content="article" />
      </Head>

      <div className={`${inter.className} min-h-screen bg-[#0a0a1a] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(244,114,182,0.12),transparent),radial-gradient(800px_600px_at_90%_10%,rgba(168,85,247,0.12),transparent)]`}>

        <header className="mx-auto max-w-7xl px-6 pt-10 relative z-10">
          <Link href="/home" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10">
            <HomeIcon size={28} />
          </Link>
          <nav className="mt-4 text-sm text-rose-200/80">
            <Link href="/blog" className="hover:underline">{txs("nav.blog")}</Link>
            <span className="mx-2 text-rose-300/50">/</span>
            <span className="text-rose-100">{txs("nav.category")}</span>
          </nav>
        </header>

        <main className="mx-auto max-w-4xl px-6 pb-20 pt-10 relative z-10">

          {/* Hero Section */}
          <section className="mb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-200 mb-6 mx-auto">
              <FaMobileAlt size={12} className="text-rose-400" />
              <span>{txs("hero.kicker")}</span>
            </div>
            <h1 className="bg-gradient-to-r from-white via-rose-100 to-violet-200 bg-clip-text text-5xl font-extrabold text-transparent sm:text-7xl leading-tight mb-6">
              <RenderHtmlText text={txs("hero.h1")} />
            </h1>
            <p className="text-xl text-rose-100/80 leading-relaxed max-w-2xl mx-auto">
              {txs("hero.tagline")}
            </p>
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {txa("hero.badges").map((badge, i) => (
                <span key={i} className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-rose-100 border border-white/10 backdrop-blur">
                  {badge}
                </span>
              ))}
            </div>
          </section>

          {/* Demo Section — Prompt + Generated Images */}
          <SectionCard className="mb-16" glow="violet">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300"><FaMagic size={24} /></div>
              <h2 className="text-3xl font-bold tracking-tight">{txs("demo.h2")}</h2>
            </div>
            <p className="text-rose-100/90 leading-relaxed mb-10 text-lg">{txs("demo.p1")}</p>

            {/* Prompt Input Image */}
            <div className="mb-10">
              <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                {txs("demo.prompt_label")}
              </h3>
              <div className="rounded-2xl border border-white/10 bg-black/50 shadow-2xl overflow-hidden">
                <div className="aspect-video w-full bg-white/5 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={demoImages[0]} alt="Atelier AI — entering a prompt to generate a website" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </div>
              <div className="mt-4 bg-black/40 border border-white/10 rounded-xl p-6 italic text-rose-100/90 font-mono text-sm leading-relaxed shadow-inner">
                {txs("demo.prompt_text")}
              </div>
            </div>

            {/* Generated Website Gallery */}
            <div>
              <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                {txs("demo.output_label")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {demoImages.slice(1).map((src, i) => (
                  <div key={i} className="group relative rounded-2xl border border-white/10 bg-black/50 shadow-2xl transition-all hover:border-rose-500/40 hover:scale-[1.02] overflow-hidden">
                    <div className="aspect-video w-full bg-white/5 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Atelier generated website screenshot ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Features Section */}
          <SectionCard className="mb-16" glow="emerald">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">{txs("features.h2")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {featureItems.map((item, i) => {
                const Icon = FEATURE_ICONS[item.icon] || FaCheckCircle;
                return (
                  <div key={i} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur hover:bg-white/10 transition">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                        <Icon size={20} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-rose-200/80 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Use Cases Section */}
          <SectionCard className="mb-16" glow="rose">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">{txs("useCases.h2")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {useCaseItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
                  <FaCheckCircle className="text-rose-400 flex-shrink-0" size={16} />
                  <span className="text-rose-100/90">{item}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Final CTA */}
          <div className="flex flex-col items-center gap-8 text-center py-10">
            <div className="space-y-3">
              <h3 className="text-4xl font-extrabold text-white">{txs("cta.h3")}</h3>
              <p className="text-xl text-rose-200/80">{txs("cta.p")}</p>
            </div>

            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group flex items-center gap-3 rounded-full bg-gradient-to-r from-rose-600 to-violet-600 px-10 py-5 text-xl font-bold text-white shadow-[0_0_40px_rgba(244,114,182,0.4)] transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(244,114,182,0.6)]"
            >
              <FaAppStore size={32} />
              <span>{txs("cta.download")}</span>
              <div className="absolute inset-0 -z-10 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* Legal Links */}
            <div className="flex gap-6 text-xs text-rose-300/50">
              <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-rose-300/80 transition">
                {txs("legal.privacy")}
              </a>
              <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-rose-300/80 transition">
                {txs("legal.terms")}
              </a>
            </div>

            <p className="text-[10px] text-rose-300/40 tracking-widest uppercase font-mono">
              Updated {LAST_UPDATED_ISO} • Available on iOS
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
      ...(await serverSideTranslations(locale ?? "en", ["common", "blog_atelier_introduction"], i18nConfig)),
    },
  };
}
