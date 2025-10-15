// src/pages/blog/universal-minutes.js
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Small UI components (introduction.js と同等) ---------- */
function Kicker({ children }) {
  return (
    <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs tracking-wide text-indigo-100/90">
      {children}
    </span>
  );
}
function SectionCard({ children, className = "" }) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8 backdrop-blur " +
        "shadow-[0_10px_40px_rgba(86,77,255,0.12)] " +
        className
      }
    >
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      {children}
    </section>
  );
}
function StatFootnote({ children }) {
  return <p className="mt-3 text-xs text-indigo-200/70">{children}</p>;
}

/* ---------- Author Byline ---------- */
function Byline() {
  const { t } = useTranslation("blog_universal");
  return (
    <div className="mt-8 flex items-center gap-3 text-sm text-indigo-100/85">
      <div className="h-9 w-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
        {/* simple initials */}
        <span className="text-xs font-bold">YA</span>
      </div>
      <div>
        <p className="font-semibold">{t("byline.name")}</p>
        <p className="text-indigo-200/80">{t("byline.title")}</p>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function BlogUniversalMinutes() {
  const { t } = useTranslation("blog_universal");
  const router = useRouter();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/universal-minutes";

  const LINK_HOME = "/home";

  return (
    <>
      <Head>
        <title>{t("seo.title")}</title>
        <meta
          name="description"
          content={t("seo.description", { users: "30,000+", date: "Oct 2025" })}
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={t("seo.ogTitle")} />
        <meta property="og:description" content={t("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />

        {/* Article structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: t("seo.ld.headline"),
              description: t("seo.ld.description"),
              datePublished: new Date().toISOString(),
              dateModified: new Date().toISOString(),
              mainEntityOfPage: canonical,
              author: {
                "@type": "Person",
                name: "Yu Adachi",
                jobTitle: "CEO",
                worksFor: { "@type": "Organization", name: "Sense G.K." }
              },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` }
              },
              image: [`${siteUrl}/images/hero-phone.png`]
            }),
          }}
        />
      </Head>

      {/* Background & Header */}
      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href={LINK_HOME}
            aria-label={t("a11y.home") || "Minutes.AI Home"}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          {/* breadcrumbs (非fixed/追従なし) */}
          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              {t("nav.blog")}
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{t("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>{t("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                {t("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">
              {t("hero.tagline")}
            </p>
            <Byline />
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Recap of previous article */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("recap.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">
                {t("recap.p1.pre")}{" "}
                <Link href="/blog/introduction" className="underline underline-offset-2">
                  {t("recap.p1.link")}
                </Link>{" "}
                {t("recap.p1.post")}
              </p>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                <li>{t("recap.points.0")}</li>
                <li>{t("recap.points.1")}</li>
                <li>{t("recap.points.2")}</li>
                <li>{t("recap.points.3")}</li>
              </ul>
              <StatFootnote>{t("recap.note")}</StatFootnote>
            </div>
          </SectionCard>

          {/* Diversity of meetings */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("diversity.h2")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/90">{t("diversity.core.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>{t("diversity.core.items.0")}</li>
                  <li>{t("diversity.core.items.1")}</li>
                  <li>{t("diversity.core.items.2")}</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/90">{t("diversity.wide.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>{t("diversity.wide.items.0")}</li>
                  <li>{t("diversity.wide.items.1")}</li>
                  <li>{t("diversity.wide.items.2")}</li>
                  <li>{t("diversity.wide.items.3")}</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{t("diversity.p1")}</p>
          </SectionCard>

          {/* Limits of one-size-fits-all */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("limits.h2")}</h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">{t("limits.p1")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">{t("limits.generic.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>{t("limits.generic.items.0")}</li>
                  <li>{t("limits.generic.items.1")}</li>
                  <li>{t("limits.generic.items.2")}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold">{t("limits.optimized.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>{t("limits.optimized.items.0")}</li>
                  <li>{t("limits.optimized.items.1")}</li>
                  <li>{t("limits.optimized.items.2")}</li>
                  <li>{t("limits.optimized.items.3")}</li>
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* 1on1 example (temperature/tones) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("oneonone.h2")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-indigo-200/90">{t("oneonone.generic.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>{t("oneonone.generic.items.0")}</li>
                  <li>{t("oneonone.generic.items.1")}</li>
                  <li>{t("oneonone.generic.items.2")}</li>
                  <li>{t("oneonone.generic.items.3")}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-indigo-200/90">{t("oneonone.optimized.h3")}</h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>{t("oneonone.optimized.items.0")}</li>
                  <li>{t("oneonone.optimized.items.1")}</li>
                  <li>{t("oneonone.optimized.items.2")}</li>
                  <li>{t("oneonone.optimized.items.3")}</li>
                  <li>{t("oneonone.optimized.items.4")}</li>
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* Why Minutes.AI works for every meeting */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("why.h2")}</h2>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-indigo-100/90">
              <li>{t("why.items.0")}</li>
              <li>{t("why.items.1")}</li>
              <li>{t("why.items.2")}</li>
              <li>{t("why.items.3")}</li>
              <li>{t("why.items.4")}</li>
            </ul>
          </SectionCard>

          {/* Wrap-up */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("wrap.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{t("wrap.p")}</p>
          </SectionCard>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              {t("cta.openBrowser")}
            </Link>
            <a
              href="https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              {t("cta.downloadIOS")}
            </a>
          </div>
        </main>
      </div>
    </>
  );
}

/* ---------- SSR: load this page's namespace ---------- */
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "en",
        ["common", "blog_universal"],
        i18nConfig
      )),
    },
  };
}
