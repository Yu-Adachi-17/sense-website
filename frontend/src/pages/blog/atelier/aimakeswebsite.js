// src/pages/blog/atelier/aimakeswebsite.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../../next-i18next.config";
import HomeIcon from "../../homeIcon";
import * as React from "react";

import {
  FaAppStore,
  FaCheckCircle,
  FaMobileAlt,
  FaBolt,
  FaMagic,
  FaGlobe,
  FaEdit,
  FaRocket,
  FaTimesCircle,
  FaUserFriends,
} from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-03-27";
const APP_STORE_URL =
  "https://apps.apple.com/jp/app/atelier-ai-website-builder/id6760372324";
const PRIVACY_URL = "https://a-telier.ai/privacy-policy";
const TERMS_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

/* ---------- English Fallback ---------- */
const EN_FALLBACK = {
  seo: {
    title: "AI Makes Your Website — Why Hand-Coding Is Already Obsolete",
    description:
      "Stop spending weeks building a website by hand. Atelier uses AI to generate a complete, professional site in under 60 seconds — right from your iPhone. The future of web creation is here.",
    ogTitle: "AI Makes Your Website in Under 60 Seconds",
    ogDescription:
      "Describe your idea, and AI builds your website instantly. No coding, no templates, no designers. Atelier turns a single sentence into a live, stunning site.",
  },
  aria: { home: "Atelier Home" },
  nav: { blog: "Blog", category: "Atelier" },
  hero: {
    kicker: "The Future of Website Creation",
    h1: "Your Website.<br>Built by AI in 60 Seconds.",
    tagline:
      "Forget hiring designers. Forget drag-and-drop builders. Forget spending weeks on a website. Just describe what you want — and Atelier's AI creates a polished, live website before you finish your coffee.",
    badges: ["AI-Generated", "Under 60 Seconds", "No Code Required"],
  },
  opening: {
    h2: "The Era of Hand-Built Websites Is Over",
    p1: "Think about it. You need a website for your business, portfolio, or side project. What used to happen? You'd spend days researching builders, hours watching tutorials, and weeks tweaking templates that never quite looked right.",
    p2: "That entire process is now obsolete. AI doesn't just assist with web design — it replaces the entire workflow. From layout to copy, from color palette to responsive design, one prompt produces a complete website that's ready to publish.",
  },
  demo: {
    h2: "See It Happen — One Prompt, One Website",
    p: "We typed a single sentence into Atelier and watched AI build a fully designed, multi-section website in seconds. No templates. No drag-and-drop. No revisions. Just instant creation.",
    prompt_label: "The Prompt:",
    prompt_text:
      '"Create a website for an organic skincare brand based in Brooklyn. Modern, minimal, with product highlights, an about section, and a shop link."',
    output_label: "What AI Created:",
  },
  whyAI: {
    h2: "Why AI Beats Everything Else",
    items: [
      {
        icon: "bolt",
        title: "60 Seconds vs. 60 Days",
        desc: "A traditional website takes weeks to plan, design, and launch. With AI, the entire process collapses into a single minute. Describe your vision, and it's live.",
      },
      {
        icon: "magic",
        title: "No Skills Required — Seriously",
        desc: "You don't need to know HTML, CSS, design principles, or how hosting works. You don't even need a computer. If you can type a sentence, you can build a website.",
      },
      {
        icon: "edit",
        title: "AI Writes Your Content Too",
        desc: "Not sure what to put on your site? AI generates compelling headlines, descriptions, and section content tailored to your business — no copywriter needed.",
      },
      {
        icon: "mobile",
        title: "Build and Edit from Your Phone",
        desc: "Atelier runs entirely on your iPhone. Create a website on the train, update it at lunch, publish it before dinner. Your website studio fits in your pocket.",
      },
      {
        icon: "globe",
        title: "Publish Instantly — No Setup",
        desc: "No domain configuration, no hosting accounts, no FTP uploads. One tap and your site is live on a unique URL, accessible to anyone in the world.",
      },
    ],
  },
  oldWay: {
    h2: "The Old Way vs. The AI Way",
    old_title: "Building a Website the Old Way",
    old_items: [
      "Research website builders for hours",
      "Watch tutorials to learn the interface",
      "Pick a template (that 10,000 others are using)",
      "Manually drag, drop, and resize every element",
      "Write all your own content from scratch",
      "Struggle with mobile responsiveness",
      "Figure out hosting and domain setup",
      "Launch after weeks of frustration",
    ],
    new_title: "Building a Website with AI",
    new_items: [
      "Open Atelier on your iPhone",
      "Type one sentence describing your site",
      "AI generates a complete, beautiful website",
      "Tap to publish — you're live",
    ],
  },
  whoIsThisFor: {
    h2: "Who Is This For?",
    p: 'If you\'ve ever Googled "how to make a website" or "best website builder" — this is for you.',
    items: [
      {
        title: "First-Time Website Creators",
        desc: "You've never built a site before, and the thought of learning a website builder feels overwhelming. With AI, there's nothing to learn.",
      },
      {
        title: "Small Business Owners",
        desc: "You need a professional web presence but can't afford a designer or the time to DIY. AI gives you a polished site in minutes.",
      },
      {
        title: "Freelancers & Creators",
        desc: "You want a portfolio or landing page that actually looks good — without spending your creative energy on web design tools.",
      },
      {
        title: "Anyone Comparing Services",
        desc: "You're researching Wix, WordPress, Squarespace, and others. Before you commit to weeks of learning, try AI — your site will be done before you finish reading their pricing page.",
      },
    ],
  },
  cta: {
    h3: "Your Website Is One Sentence Away",
    p: "Download Atelier for free. Type what you want. Watch AI build it.",
    download: "Download on the App Store",
  },
  legal: {
    privacy: "Privacy Policy",
    terms: "Terms of Use",
  },
};

/* ---------- Helpers ---------- */
const getPath = (obj, path) =>
  path
    .split(".")
    .reduce(
      (o, k) =>
        o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined,
      obj,
    );

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
    glow === "emerald"
      ? "bg-emerald-500/10"
      : glow === "violet"
        ? "bg-violet-500/10"
        : glow === "cyan"
          ? "bg-cyan-500/10"
          : "bg-rose-500/10";
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.2)] " +
        className
      }
    >
      <div
        className={`pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full ${glowColor} blur-3xl`}
      />
      {children}
    </section>
  );
}

const FEATURE_ICONS = {
  bolt: FaBolt,
  magic: FaMagic,
  edit: FaEdit,
  mobile: FaMobileAlt,
  globe: FaGlobe,
};

/* ---------- Page Component ---------- */
export default function AtelierAIMakesWebsite() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_atelier_aimakeswebsite");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/atelier/aimakeswebsite`;

  const demoImages = [
    "/images/aimakeswebsite1.jpeg",
    "/images/aimakeswebsite2.jpeg",
    "/images/aimakeswebsite3.jpeg",
  ];

  const whyItems = txa("whyAI.items");
  const oldItems = txa("oldWay.old_items");
  const newItems = txa("oldWay.new_items");
  const whoItems = txa("whoIsThisFor.items");

  return (
    <>
      <Head>
        <title>{txs("seo.title")}</title>
        <meta name="description" content={txs("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={txs("seo.ogTitle")} />
        <meta
          property="og:description"
          content={txs("seo.ogDescription")}
        />
        <meta
          property="og:image"
          content={`${siteUrl}/images/aimakeswebsite1.jpeg`}
        />
        <meta property="og:type" content="article" />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0a0a1a] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(244,114,182,0.12),transparent),radial-gradient(800px_600px_at_90%_10%,rgba(168,85,247,0.12),transparent)]`}
      >
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10 relative z-10">
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10"
          >
            <HomeIcon size={28} />
          </Link>
          <nav className="mt-4 text-sm text-rose-200/80">
            <Link href="/blog" className="hover:underline">
              {txs("nav.blog")}
            </Link>
            <span className="mx-2 text-rose-300/50">/</span>
            <span className="text-rose-100">{txs("nav.category")}</span>
          </nav>
        </header>

        <main className="mx-auto max-w-4xl px-6 pb-20 pt-10 relative z-10">
          {/* Hero Section */}
          <section className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-200 mb-6 mx-auto">
              <FaRocket size={12} className="text-cyan-400" />
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
                <span
                  key={i}
                  className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-rose-100 border border-white/10 backdrop-blur"
                >
                  {badge}
                </span>
              ))}
            </div>
          </section>

          {/* Hero Image */}
          <div className="mb-16 rounded-2xl border border-white/10 bg-black/50 shadow-2xl overflow-hidden">
            <div className="aspect-video w-full bg-white/5 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={demoImages[0]}
                alt="AI-generated website by Atelier"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Opening Section */}
          <SectionCard className="mb-16" glow="violet">
            <h2 className="text-3xl font-bold tracking-tight mb-6 text-center">
              {txs("opening.h2")}
            </h2>
            <div className="space-y-4 text-rose-100/90 leading-relaxed text-lg">
              <p>{txs("opening.p1")}</p>
              <p>{txs("opening.p2")}</p>
            </div>
          </SectionCard>

          {/* Demo Section */}
          <SectionCard className="mb-16" glow="cyan">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
                <FaMagic size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                {txs("demo.h2")}
              </h2>
            </div>
            <p className="text-rose-100/90 leading-relaxed mb-8 text-lg">
              {txs("demo.p")}
            </p>

            {/* Prompt */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider mb-3">
                {txs("demo.prompt_label")}
              </h3>
              <div className="bg-black/40 border border-white/10 rounded-xl p-6 italic text-rose-100/90 font-mono text-sm leading-relaxed shadow-inner">
                {txs("demo.prompt_text")}
              </div>
            </div>

            {/* Output Gallery */}
            <div>
              <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider mb-6">
                {txs("demo.output_label")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {demoImages.slice(1).map((src, i) => (
                  <div
                    key={i}
                    className="group relative rounded-2xl border border-white/10 bg-black/50 shadow-2xl transition-all hover:border-cyan-500/40 hover:scale-[1.02] overflow-hidden"
                  >
                    <div className="aspect-video w-full bg-white/5 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`AI-generated website screenshot ${i + 1}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Why AI Section */}
          <SectionCard className="mb-16" glow="emerald">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">
              {txs("whyAI.h2")}
            </h2>
            <div className="space-y-6">
              {whyItems.map((item, i) => {
                const Icon = FEATURE_ICONS[item.icon] || FaCheckCircle;
                return (
                  <div
                    key={i}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 transition"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                        <Icon size={24} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-rose-200/80 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Old Way vs AI Way */}
          <SectionCard className="mb-16" glow="rose">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">
              {txs("oldWay.h2")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Old Way */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                <h3 className="text-lg font-bold text-red-300 mb-4">
                  {txs("oldWay.old_title")}
                </h3>
                <div className="space-y-3">
                  {oldItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <FaTimesCircle
                        className="text-red-400/60 flex-shrink-0 mt-0.5"
                        size={14}
                      />
                      <span className="text-sm text-rose-200/70 leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Way */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <h3 className="text-lg font-bold text-emerald-300 mb-4">
                  {txs("oldWay.new_title")}
                </h3>
                <div className="space-y-3">
                  {newItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <FaCheckCircle
                        className="text-emerald-400 flex-shrink-0 mt-0.5"
                        size={14}
                      />
                      <span className="text-sm text-emerald-100/90 leading-relaxed font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Who Is This For */}
          <SectionCard className="mb-16" glow="violet">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300">
                <FaUserFriends size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                {txs("whoIsThisFor.h2")}
              </h2>
            </div>
            <p className="text-rose-100/80 leading-relaxed mb-8 text-lg">
              {txs("whoIsThisFor.p")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {whoItems.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur hover:bg-white/10 transition"
                >
                  <h3 className="text-base font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-rose-200/80 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Final CTA */}
          <div className="flex flex-col items-center gap-8 text-center py-10">
            <div className="space-y-3">
              <h3 className="text-4xl font-extrabold text-white">
                {txs("cta.h3")}
              </h3>
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
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose-300/80 transition"
              >
                {txs("legal.privacy")}
              </a>
              <a
                href={TERMS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose-300/80 transition"
              >
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
      ...(await serverSideTranslations(
        locale ?? "en",
        ["common", "blog_atelier_aimakeswebsite"],
        i18nConfig,
      )),
    },
  };
}
