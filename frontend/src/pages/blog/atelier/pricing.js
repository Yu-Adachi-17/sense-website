// src/pages/blog/atelier/pricing.js
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
  FaCrown,
  FaSearch,
  FaStar,
} from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Constants ---------- */
const LAST_UPDATED_ISO = "2026-03-26";
const APP_STORE_URL =
  "https://apps.apple.com/jp/app/atelier-ai-website-builder/id6760372324";
const PRIVACY_URL = "https://a-telier.ai/privacy-policy";
const TERMS_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

/* ---------- English Fallback ---------- */
const EN_FALLBACK = {
  seo: {
    title: "Atelier Pricing — $99/Year for Unlimited AI Website Building",
    description:
      "Build up to 10 professional websites for just $99/year. Atelier's AI-powered builder lets you create, edit, and publish from your iPhone — no Wix or WordPress complexity needed.",
    ogTitle: "Atelier Pricing: $99/Year — Build Up to 10 AI-Powered Websites",
    ogDescription:
      "Unlimited AI website creation for $99/year. Edit anywhere from your iPhone, manage up to 10 sites, and skip the complexity of traditional builders.",
  },
  aria: { home: "Atelier Home" },
  nav: { blog: "Blog", category: "Atelier" },
  hero: {
    kicker: "Simple, Transparent Pricing",
    h1: "One Plan.<br>Unlimited Creativity.",
    tagline:
      "Everything you need to build, edit, and publish stunning websites — for less than the cost of a single dinner out per year.",
  },
  price: {
    amount: "$99",
    period: "/year",
    perMonth: "That's just $8.25/month",
    badge: "Best Value",
  },
  heroImage: {
    alt: "Atelier pricing — build beautiful AI websites from your iPhone",
  },
  value: {
    h2: "Why $99/Year Is a No-Brainer",
    items: [
      {
        icon: "mobile",
        title: "Edit Anytime, Anywhere — Right from Your iPhone",
        desc: "Your website studio lives in your pocket. Update text, swap images, rearrange sections, and publish changes on the go — from the train, the café, or your couch at midnight. No laptop required, ever.",
      },
      {
        icon: "magic",
        title: "100% AI-Powered — No Drag-and-Drop Headaches",
        desc: "Traditional builders like Wix and WordPress force you through clunky editors, endless templates, and plugin nightmares. Atelier skips all of that. Describe what you want in plain language and AI builds it — beautifully, instantly, and optimized for search engines out of the box.",
      },
      {
        icon: "globe",
        title: "Up to 10 Websites Under One Plan",
        desc: "Run a salon and a personal blog? A restaurant and a booking page? With Atelier, you can create and manage up to 10 completely independent websites — all from a single $99/year subscription.",
      },
    ],
  },
  comparison: {
    h2: "How Atelier Stacks Up",
    headers: ["Feature", "Atelier", "Wix", "WordPress"],
    rows: [
      ["Annual Cost", "$99/year", "$197+/year", "$300+/year"],
      [
        "AI Website Generation",
        "Full AI — prompt to site",
        "Limited AI features",
        "Requires plugins",
      ],
      [
        "Mobile Editing",
        "iPhone-native, anytime",
        "Desktop-focused",
        "Desktop-focused",
      ],
      [
        "SEO Optimization",
        "Built-in, automatic",
        "Manual setup required",
        "Requires plugins & expertise",
      ],
      ["Number of Sites", "Up to 10", "1 per plan", "1 per hosting"],
      [
        "Learning Curve",
        "Zero — just type",
        "Hours of tutorials",
        "Weeks of setup",
      ],
    ],
  },
  seoSection: {
    h2: "Built-In SEO That Actually Works",
    p: "With Wix or WordPress, getting your site to rank on Google means wrestling with SEO plugins, meta tag editors, sitemap generators, and technical configurations most people never finish. Atelier handles it all automatically — clean HTML structure, optimized metadata, fast loading, and mobile-first design that search engines love. Your site is born ready to rank.",
    items: [
      "Clean, semantic HTML for search engine crawlers",
      "Auto-generated meta titles and descriptions",
      "Mobile-first design — a key Google ranking factor",
      "Lightning-fast load times with no bloated plugins",
      "No SEO plugins or manual configuration needed",
    ],
  },
  cta: {
    h3: "Start Building for $99/Year",
    p: "Download Atelier and launch your first website today.",
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
        : glow === "amber"
          ? "bg-amber-500/10"
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

const VALUE_ICONS = {
  mobile: FaMobileAlt,
  magic: FaMagic,
  globe: FaGlobe,
  bolt: FaBolt,
};

/* ---------- Page Component ---------- */
export default function AtelierPricing() {
  const router = useRouter();
  const { txs, txa } = useTx("blog_atelier_pricing");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/atelier/pricing`;

  const valueItems = txa("value.items");
  const compHeaders = txa("comparison.headers");
  const compRows = txa("comparison.rows");
  const seoItems = txa("seoSection.items");

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
          content={`${siteUrl}/images/atelierpricing.jpeg`}
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
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-200 mb-6 mx-auto">
              <FaCrown size={12} className="text-amber-400" />
              <span>{txs("hero.kicker")}</span>
            </div>
            <h1 className="bg-gradient-to-r from-white via-rose-100 to-violet-200 bg-clip-text text-5xl font-extrabold text-transparent sm:text-7xl leading-tight mb-6">
              <RenderHtmlText text={txs("hero.h1")} />
            </h1>
            <p className="text-xl text-rose-100/80 leading-relaxed max-w-2xl mx-auto mb-10">
              {txs("hero.tagline")}
            </p>

            {/* Price Card */}
            <div className="relative inline-block">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-rose-500 via-violet-500 to-amber-500 opacity-50 blur-lg" />
              <div className="relative rounded-3xl border border-white/20 bg-[#12122a] px-12 py-10 shadow-2xl">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-1 text-xs font-bold text-black uppercase tracking-wider">
                    {txs("price.badge")}
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-6xl sm:text-7xl font-black bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
                    {txs("price.amount")}
                  </span>
                  <span className="text-2xl text-rose-200/60 font-medium">
                    {txs("price.period")}
                  </span>
                </div>
                <p className="text-rose-200/70 text-sm">
                  {txs("price.perMonth")}
                </p>
              </div>
            </div>
          </section>

          {/* Hero Image */}
          <div className="mb-16 rounded-2xl border border-white/10 bg-black/50 shadow-2xl overflow-hidden">
            <div className="aspect-video w-full bg-white/5 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/atelierpricing.jpeg"
                alt={txs("heroImage.alt")}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Value Propositions */}
          <SectionCard className="mb-16" glow="emerald">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">
              {txs("value.h2")}
            </h2>
            <div className="space-y-6">
              {valueItems.map((item, i) => {
                const Icon = VALUE_ICONS[item.icon] || FaCheckCircle;
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

          {/* Comparison Table */}
          <SectionCard className="mb-16" glow="violet">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">
              {txs("comparison.h2")}
            </h2>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {compHeaders.map((h, i) => (
                      <th
                        key={i}
                        className={`px-4 py-3 text-left font-semibold ${i === 1 ? "text-rose-300" : "text-rose-200/60"} ${i === 0 ? "w-1/4" : ""}`}
                      >
                        {i === 1 ? (
                          <span className="flex items-center gap-2">
                            <FaStar
                              size={12}
                              className="text-amber-400"
                            />
                            {h}
                          </span>
                        ) : (
                          h
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compRows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-t border-white/5 hover:bg-white/[0.03] transition"
                    >
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`px-4 py-3 ${ci === 1 ? "text-white font-medium" : "text-rose-200/70"}`}
                        >
                          {ci === 1 && (
                            <FaCheckCircle
                              size={10}
                              className="inline mr-2 text-emerald-400"
                            />
                          )}
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* SEO Section */}
          <SectionCard className="mb-16" glow="amber">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                <FaSearch size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                {txs("seoSection.h2")}
              </h2>
            </div>
            <p className="text-rose-100/90 leading-relaxed mb-8 text-lg">
              {txs("seoSection.p")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {seoItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur"
                >
                  <FaCheckCircle
                    className="text-amber-400 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-rose-100/90">{item}</span>
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
        ["common", "blog_atelier_pricing"],
        i18nConfig,
      )),
    },
  };
}
