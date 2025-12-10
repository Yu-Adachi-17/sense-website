// src/pages/blog/slideaipro.js

import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";
import * as React from "react";

import { FaAppStore, FaArrowRight, FaMagic } from "react-icons/fa";

// ★ 公開日設定
const PUBLISHED_DATE = "2025-12-10T10:00:00+09:00";
const MODIFIED_DATE = "2025-12-10T10:00:00+09:00";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Content Strategy: Viral / Product Launch / How-to ---------- */
const EN_FALLBACK = {
  seo: {
    title: "SlideAIPro: The End of Manual PowerPoint Creation (iOS)",
    description:
      "Stop formatting slides manually. SlideAIPro generates professional presentations from simple text prompts in seconds. Available now on iOS.",
    ogTitle: "Generate Professional Slides from Text in Seconds | SlideAIPro",
    ogDescription:
      "Don't spend hours on PowerPoint. Just paste your text, and let AI design the deck. See the demo inside.",
    ld: {
      headline: "How to Create Presentation Slides from Text with AI (2025)",
      description:
        "A guide to using SlideAIPro to generate business presentations instantly using raw text prompts.",
    },
  },
  aria: { home: "Sense AI Home" },
  nav: { blog: "Blog", current: "SlideAIPro Launch" },

  hero: {
    kicker: "Product Launch",
    h1: "The Era of Manual PowerPoint Creation is Over.",
    tagline:
      "Why spend hours adjusting fonts and aligning boxes? SlideAIPro turns your raw text into professional, ready-to-present slides instantly. Mobile-first, for the modern leader.",
    subtag: "Available exclusively on iOS.",
  },

  problem: {
    h2: "Your ideas are fast. Slide design is slow.",
    p1: "The biggest bottleneck in business isn't 'thinking'—it's formatting. You have the strategy in your head, or written in a memo, but turning that into a 10-slide deck takes 2 hours of tedious work.",
    p2: "We built **SlideAIPro** to reclaim that time. It's not just a template engine; it understands your text and structures the logic visually.",
  },

  demo: {
    h2: "Seeing is Believing: A Real World Example",
    lead: "Let's put it to the test. Below is a raw, unstructured business plan. We pasted this exact text into the app.",
    inputLabel: "The Prompt (Input)",
    inputText: `Sales Targets and Performance for 2025
The sales targets for the first four months of 2025 were set at $50,000 per month. Actual sales were $45,000 in January, $32,000 in February, $52,000 in March, and $68,000 in April.

Category-wise Sales Analysis for 2025
Sales analysis by category for the four months revealed that Product A accounted for 40%, Product B for 30%, and Product C for 20%.

Sales Goal Trends for 2025
The sales goals for 2025 are set as follows: $50,000 in January, $30,000 in February, $60,000 in March, and $70,000 in April.

Strategies for Achieving Goals
* January: Expansion of the customer base and strengthening of promotions.
* February: Enhancement of sales promotion and measures to improve repeat purchase rates.
* March: Performance analysis and final push strategies.

Task Assignments
A’s Tasks:
* By January 10: Schedule meetings with key clients and prepare proposal materials.
* By February 5: Complete approaches to the new customer list and report progress on follow-ups.
B’s Tasks:
* By January 15: Create advertising creatives and launch social media campaigns.
* By February 1: Plan Product A’s launch event and prepare the operation manual.
C’s Tasks:
* By January 20: Develop FAQs and support guides for new customers.
* By February 15: Compile customer feedback and submit improvement proposals.

New Ideas and Goals
Ideas for Growth:
1. Introduce a subscription model to increase recurring revenue.
2. Develop Product D targeting high-end users to expand the premium market.
3. Launch partnership programs to reach new customer segments.
Goals:
* Increase customer acquisition by 20% in Q2.
* Boost repeat purchases by 15% through promotions.
* Generate $10,000 in sales from Product D by Q4.

Final Decisions and Background
Key Decisions:
1. Focus on Product A’s premium model to attract high-value customers.
2. Allocate 15% of the budget to digital ads and influencer marketing.
3. Enhance customer support and loyalty programs to improve retention.
Background:
These decisions are based on 2025 sales trends showing demand for premium products and customer interest in personalized experiences.`,
    outputLabel: "The Result (Output)",
    outputNote: "Generated in approx 15 seconds on iPhone 15 Pro.",
  },

  features: {
    h2: "Why SlideAIPro?",
    items: [
      {
        title: "Prompt to Professional",
        desc: "No need to separate slides manually. The AI analyzes context and breaks down your text into logical slides automatically.",
      },
      {
        title: "Mobile First Workflow",
        desc: "Create your presentation in the taxi on the way to the client. Designed specifically for iOS (iPhone/iPad).",
      },
      {
        title: "Export & Edit",
        desc: "Need final tweaks? Export directly to PDF or editable formats compatible with major presentation software.",
      },
    ],
  },

  cta: {
    h2: "Stop Formatting. Start Presenting.",
    sub: "Download SlideAIPro today and save 5 hours this week.",
    button: "Download on the App Store",
  },

  meta: { published: "Published", category: "Product News" },
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
    <span className="inline-block rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs tracking-wide text-indigo-200 font-semibold shadow-[0_0_10px_rgba(99,102,241,0.2)]">
      {children}
    </span>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-10 backdrop-blur-md " +
        "shadow-[0_10px_40px_rgba(0,0,0,0.2)] " +
        className
      }
    >
      {children}
    </section>
  );
}

/* ---------- Page Component ---------- */
export default function BlogSlideAI({ canonicalPath = "/blog/slideaipro" }) {
  const router = useRouter();
  const { txs, txa } = useTx("blog_slideaipro");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}${canonicalPath}`;

  // Image Placeholders (Replace these paths with your actual uploaded images)
  // Ensure you upload images to public/images/slideai/
  const screenshots = [
    "/images/slideai/demo-1.jpg", 
    "/images/slideai/demo-2.jpg",
    "/images/slideai/demo-3.jpg",
    "/images/slideai/demo-4.jpg"
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
        {/* Set a hero image for social sharing */}
        // 例：トップページと同じ画像にしておく、または削除する
<meta property="og:image" content={`${siteUrl}/images/slideai/hero.jpg`} />

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

      <div className={`${inter.className} min-h-screen bg-[#050511] text-white selection:bg-indigo-500/30 selection:text-indigo-200`}>
        
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
            <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link href="/home" aria-label={txs("aria.home")} className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white">
            <HomeIcon size={28} />
          </Link>
          <nav className="mt-4 text-sm text-indigo-200/60 font-medium">
            <Link href="/blog" className="hover:text-indigo-100 transition-colors">{txs("nav.blog")}</Link>
            <span className="mx-2 text-indigo-300/30">/</span>
            <span className="text-white">{txs("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-16 sm:pt-20 sm:pb-20 text-center">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="bg-gradient-to-br from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100/80 leading-relaxed">
              {txs("hero.tagline")}
            </p>
            <div className="mt-8 flex justify-center">
                <a 
                    href="https://apps.apple.com/jp/app/slideai-pro/id6739415399" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-3 rounded-full bg-white text-indigo-950 px-8 py-4 text-lg font-bold transition hover:bg-indigo-50 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                >
                    <FaAppStore className="text-2xl" />
                    <span>Download on App Store</span>
                </a>
            </div>
            <p className="mt-4 text-sm text-indigo-300/50">{txs("hero.subtag")}</p>
        </section>

        {/* Main Content */}
        <main className="relative z-10 mx-auto max-w-4xl px-6 pb-20 space-y-12">
          
          {/* 1. Problem Statement */}
          <SectionCard>
            <div className="sm:flex gap-8 items-start">
                <div className="flex-shrink-0 mb-4 sm:mb-0">
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                        <FaMagic size={24} />
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">{txs("problem.h2")}</h2>
                    <p className="text-indigo-100/80 leading-relaxed mb-4">{txs("problem.p1")}</p>
                    <p className="text-indigo-100/80 leading-relaxed">{txs("problem.p2")}</p>
                </div>
            </div>
          </SectionCard>

          {/* 2. DEMO SECTION (The Core) */}
          <div className="scroll-mt-20">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">{txs("demo.h2")}</h2>
            <p className="text-center text-indigo-200/70 mb-10 max-w-2xl mx-auto">{txs("demo.lead")}</p>
            
            <div className="grid lg:grid-cols-2 gap-6 items-stretch">
                {/* Left: Input */}
                <div className="rounded-3xl border border-white/10 bg-black/40 p-6 flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{txs("demo.inputLabel")}</span>
                        <div className="flex gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-red-500/50" />
                            <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
                            <div className="h-2 w-2 rounded-full bg-green-500/50" />
                        </div>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/5 p-4 overflow-y-auto max-h-[500px] font-mono text-xs sm:text-sm text-indigo-100/70 leading-relaxed border border-white/5 shadow-inner">
                        {/* Preserve whitespace/formatting */}
                        <pre className="whitespace-pre-wrap font-sans">{txs("demo.inputText")}</pre>
                    </div>
                </div>

                {/* Right: Output (Images) */}
                <div className="flex flex-col justify-center items-center">
                   <div className="hidden lg:block text-indigo-500/50 mb-4 rotate-0">
                        <FaArrowRight size={30} />
                   </div>
                   <div className="lg:hidden text-indigo-500/50 my-4 rotate-90">
                        <FaArrowRight size={30} />
                   </div>

                   <div className="w-full rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-black/40 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                             <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 shadow-black drop-shadow-md">{txs("demo.outputLabel")}</span>
                        </div>
                        
                        {/* 4 Images Grid */}
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            {screenshots.map((src, i) => (
                                <div key={i} className="aspect-video rounded-lg bg-indigo-900/50 border border-white/10 overflow-hidden relative group">
                                    {/* Placeholder if image missing, or actual image */}
                                    <div className="absolute inset-0 flex items-center justify-center text-indigo-300/30 text-xs">
                                        {/* NOTE: Replace with actual <img /> or Next.js <Image /> */}
                                        <img 
                                            src={src} 
                                            alt={`Slide generated by AI ${i+1}`} 
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            // Fallback for demo purposes only (remove in prod if images exist)
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.style.display = 'none'; 
                                                e.target.parentNode.classList.add("bg-indigo-800"); 
                                            }}
                                        />
                                        <span className="absolute z-[-1]">Slide {i+1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-center text-xs text-indigo-300/60 font-medium">{txs("demo.outputNote")}</p>
                   </div>
                </div>
            </div>
          </div>

          {/* 3. Features Grid */}
          <div className="grid sm:grid-cols-3 gap-6 pt-10">
            {txa("features.items").map((item, i) => (
                <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.05] transition">
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-indigo-200/60 leading-relaxed">{item.desc}</p>
                </div>
            ))}
          </div>

          {/* CTA / Meta */}
          <div className="mt-20 rounded-3xl bg-gradient-to-r from-indigo-600 to-blue-600 p-8 sm:p-12 text-center shadow-2xl shadow-indigo-500/20">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">{txs("cta.h2")}</h3>
            <p className="text-indigo-100 mb-8 font-medium">{txs("cta.sub")}</p>
            <a
              href="https://apps.apple.com/jp/app/slideai-pro/id6739415399"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-bold text-indigo-700 transition hover:bg-indigo-50 active:scale-95"
            >
              <FaAppStore className="text-xl" />
              {txs("cta.button")}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4 text-xs text-indigo-300/40">
             <span>{txs("meta.published")}: {new Date(PUBLISHED_DATE).toLocaleDateString()}</span>
             <span>•</span>
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