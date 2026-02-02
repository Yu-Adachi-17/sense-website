// src/pages/blog/introduction.js
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon"; // 左上のMinutes.AIアイコン

// ★ 追加：各種アイコン
import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

// ---- small UI components ----
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

// Accessible “expand full transcript”
function ExpandableTranscript({ preview, full }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("blog_introduction");
  return (
    <details
      className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="list-none cursor-pointer select-none px-4 py-3 text-sm text-indigo-100/90 flex items-center justify-between">
        <span>{open ? t("transcript.close") : t("transcript.expand")}</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.97l3.71-3.74a.75.75 0 111.08 1.04l-4.25 4.28a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
        </svg>
      </summary>
      <div className="px-5 pb-5 pt-1 text-indigo-100/90">
        <p className="whitespace-pre-wrap">{preview}</p>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <p className="mt-3 whitespace-pre-wrap">{full}</p>
      </div>
    </details>
  );
}

/* ---------- Pretty renderer (no emojis, heading-only hierarchy) ---------- */

function SectionLabel({ children }) {
  return (
    <h5 className="mt-4 mb-2 text-base sm:text-lg font-semibold tracking-wide text-indigo-100/90">
      {children}
    </h5>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-xs text-indigo-100/90">
      {children}
    </span>
  );
}

function ActionItemLine({ text }) {
  const match = text.match(/^\s*([^—-]+?)\s*[—-]\s*(.+)$/);
  if (match) {
    const owner = match[1].trim();
    const rest = match[2].trim();
    return (
      <li>
        <span className="font-semibold">{owner}</span> — {rest}
      </li>
    );
  }
  return <li>{text}</li>;
}

function TopicBlock({ index, topic }) {
  const { t } = useTranslation("blog_introduction");
  const {
    topic: title,
    discussion = [],
    decisions,
    actionItems,
    concerns,
    keyMessages,
  } = topic || {};

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <h4 className="text-lg sm:text-xl font-bold text-white">
        {index}. {title}
      </h4>

      {discussion?.length > 0 && (
        <>
          <SectionLabel>{t("minutes.labels.discussion")}</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {discussion.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(decisions) && decisions.length > 0 && (
        <>
          <SectionLabel>{t("minutes.labels.decisions")}</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {decisions.map((d, i) => (
              <li key={i} className="font-medium text-white/95">{d}</li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(actionItems) && actionItems.length > 0 && (
        <>
          <SectionLabel>{t("minutes.labels.actionItems")}</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {actionItems.map((a, i) => (
              <ActionItemLine key={i} text={a} />
            ))}
          </ul>
        </>
      )}

      {Array.isArray(concerns) && concerns.length > 0 && (
        <>
          <SectionLabel>{t("minutes.labels.concerns")}</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(keyMessages) && keyMessages.length > 0 && (
        <>
          <SectionLabel>{t("minutes.labels.keyMessages")}</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {keyMessages.map((k, i) => (
              <li key={i} className="font-medium">{k}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function MinutesPrettyRender({ minutes }) {
  const { t } = useTranslation("blog_introduction");
  if (!minutes || typeof minutes !== "object" || Array.isArray(minutes)) return null;

  const { meetingTitle, date, location, attendees, coreMessage, topics = [] } = minutes;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      {/* Header */}
      <header className="mb-5">
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {meetingTitle}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-indigo-100/90">
          {date && <Pill>{date}</Pill>}
          {location && <Pill>{location}</Pill>}
        </div>
        {Array.isArray(attendees) && attendees.length > 0 && (
          <p className="mt-2 text-sm text-indigo-100/90">
            <span className="font-semibold text-indigo-200/90">{t("minutes.labels.attendees")}</span>{" "}
            {attendees.join(", ")}
          </p>
        )}
        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </header>

      {/* Topics */}
      <div className="space-y-4">
        {topics.map((tpc, i) => (
          <TopicBlock key={`${i}-${tpc.topic}`} index={i + 1} topic={tpc} />
        ))}
      </div>

      {/* Core message (closing) */}
      {coreMessage && (
        <aside className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <h5 className="mb-2 text-base sm:text-lg font-semibold tracking-wide text-indigo-200/90">
            {t("minutes.labels.closingMessage")}
          </h5>
          <blockquote className="text-indigo-100/90">“{coreMessage}”</blockquote>
        </aside>
      )}
    </section>
  );
}

export default function BlogIntroduction() {
  const { t } = useTranslation("blog_introduction");
  const router = useRouter();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/introduction";

  const LINK_HOME = "/home"; // スクロール追従なし（通常フロー内に配置）
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";

  // i18n objects
  const rawMinutes = t("minutes", { returnObjects: true });
  const minutes =
    rawMinutes && typeof rawMinutes === "object" && !Array.isArray(rawMinutes)
      ? rawMinutes
      : null;

  const rawRows = t("compare.rows", { returnObjects: true });
  const defaultRows = [
    { k: t("compare.fallback.0.k", "Audio → Text"), a: t("compare.fallback.0.a", "Yes"), b: t("compare.fallback.0.b", "No (requires manual input)"), c: t("compare.fallback.0.c", "Yes") },
    { k: t("compare.fallback.1.k", "Summarization / Outline"), a: t("compare.fallback.1.a", "No"), b: t("compare.fallback.1.b", "Yes (but context may shift)"), c: t("compare.fallback.1.c", "Yes (optimized for meetings)") },
    { k: t("compare.fallback.2.k", "Decision / Action Extraction"), a: t("compare.fallback.2.a", "No"), b: t("compare.fallback.2.b", "Yes (but often ambiguous)"), c: t("compare.fallback.2.c", "Yes (clear extraction + tagging)") },
    { k: t("compare.fallback.3.k", "Multi-language Support"), a: t("compare.fallback.3.a", "No"), b: t("compare.fallback.3.b", "Yes (risk of syntax drift)"), c: t("compare.fallback.3.c", "Yes (major languages + context-aware)") },
  ];
  const compareRows = Array.isArray(rawRows)
    ? rawRows
    : (rawRows && typeof rawRows === "object" && !Array.isArray(rawRows))
      ? Object.values(rawRows)
      : defaultRows;

  return (
    <>
      <Head>
        <title>{t("seo.title")}</title>
        <meta name="description" content={t("seo.description", { users: "30,000+", date: "Oct 2025" })} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={t("seo.ogTitle")} />
        <meta property="og:description" content={t("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: t("seo.ld.headline"),
              datePublished: new Date().toISOString(),
              dateModified: new Date().toISOString(),
              mainEntityOfPage: canonical,
              author: { "@type": "Organization", name: "Minutes.AI" },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: { "@type": "ImageObject", url: `${siteUrl}/icon-master.png` },
              },
              image: [`${siteUrl}/images/hero-phone.png`],
              description: t("seo.ld.description"),
            }),
          }}
        />
      </Head>

      {/* Background */}
      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* 左上アイコン（通常フロー・非fixed） */}
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href={LINK_HOME}
            aria-label={t("Minutes.AI Home") || "Minutes.AI Home"}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          {/* パンくずはアイコンの下に配置（スクロール追従しない） */}
          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              {t("nav.blog")}
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{t("nav.introduction")}</span>
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
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Introduction */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("intro.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{t("intro.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{t("intro.p2")}</p>
              <p className="text-base leading-7 text-indigo-100/90">
                {t("intro.p3.pre")} <span className="font-semibold">Minutes.AI</span>{" "}
                {t("intro.p3.mid")} <span className="font-semibold">{t("intro.p3.bold")}</span>{" "}
                {t("intro.p3.post")}
              </p>
            </div>
          </SectionCard>

          {/* What is Minutes.AI? */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("what.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{t("what.p1")}</p>
              <StatFootnote>{t("what.footnote", { date: "October 5" })}</StatFootnote>
              <p className="text-base leading-7 text-indigo-100/90">{t("what.p2")}</p>
            </div>

            {/* Comparison table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="bg-white/[0.03] px-4 py-3 text-sm text-indigo-100/90">
                {t("compare.title")}
              </div>
              <div className="divide-y divide-white/10">
                <div className="grid grid-cols-4 gap-2 bg-white/[0.02] px-4 py-3 text-xs sm:text-sm">
                  <div className="text-indigo-200/90">{t("compare.head.feature")}</div>
                  <div className="text-indigo-200/90">{t("compare.head.transcription")}</div>
                  <div className="text-indigo-200/90">{t("compare.head.generic")}</div>
                  <div className="text-indigo-200/90">{t("compare.head.minutes")}</div>
                </div>
                {Array.isArray(compareRows) &&
                  compareRows.map((row, idx) => (
                    <div key={`${row.k}-${idx}`} className="grid grid-cols-4 gap-2 px-4 py-3 text-sm">
                      <div className="text-indigo-100/90">{row.k}</div>
                      <div className="text-indigo-50/90">{row.a}</div>
                      <div className="text-indigo-50/90">{row.b}</div>
                      <div className="text-indigo-50/90">{row.c}</div>
                    </div>
                  ))}
              </div>
            </div>
          </SectionCard>

          {/* Source Text & Sample Outputs (stacked vertically) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("samples.h2")}</h2>

            {/* Meeting audio (preview + full expandable) */}
            <div className="mt-4 space-y-3">
              <h3 className="text-lg sm:text-xl font-semibold">{t("samples.meetingSample")}</h3>
              <ExpandableTranscript
                preview={t("samples.transcript.preview")}
                full={t("samples.transcript.full")}
              />
            </div>

            {/* Stacked: Generic AI then Minutes.AI */}
            <div className="mt-6 space-y-6">
              {/* Generic AI */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg sm:text-xl font-semibold">{t("samples.generic.h3")}</h3>
                <div className="mt-2 whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-indigo-100/90">
                  {t("samples.generic.body")}
                </div>
                <p className="mt-3 text-sm leading-6 text-indigo-200/80">{t("samples.generic.note")}</p>
              </div>

              {/* Minutes.AI — Pretty render */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold">{t("samples.pretty.h3")}</h3>
                <MinutesPrettyRender minutes={minutes} />
              </div>
            </div>
          </SectionCard>

          {/* Wrap-up (natural wording) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("wrap.h2")}</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">{t("wrap.p")}</p>
          </SectionCard>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-4">
            {/* Browser */}
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:bg-indigo-500/20 hover:border-indigo-100/80 hover:text-white"
            >
              <TbWorld className="text-lg sm:text-xl text-indigo-200 group-hover:text-white" />
              <span>Browser</span>
            </Link>

            {/* App Store */}
            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:bg-sky-500/20 hover:border-sky-100/80 hover:text-white"
            >
              <FaAppStore className="text-lg sm:text-xl text-sky-200 group-hover:text-white" />
              <span>App Store</span>
            </a>

            {/* Google Play */}
            <a
              href="https://play.google.com/store/apps/details?id=world.senseai.minutes"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:bg-emerald-500/20 hover:border-emerald-100/80 hover:text-white"
            >
              <BsGooglePlay className="text-lg sm:text-xl text-emerald-200 group-hover:text-white" />
              <span>Google Play</span>
            </a>
          </div>
        </main>
      </div>
    </>
  );
}

// SSR: load this page's namespace
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "en",
        ["common", "blog_introduction"],
        i18nConfig
      )),
    },
  };
}
