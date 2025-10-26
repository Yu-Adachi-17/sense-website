// src/pages/blog/onlinemeeting.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../../next-i18next.config";
import HomeIcon from "../homeIcon";

const inter = Inter({ subsets: ["latin"] });

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

function Pill({ children }) {
  return (
    <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-xs text-indigo-100/90">
      {children}
    </span>
  );
}

export default function BlogOnlineMeeting() {
  const { t } = useTranslation("blog_onlinemeeting");
  const router = useRouter();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl +
    (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) +
    "/blog/onlinemeeting";

  // すべて i18n キー。配列は JSON 側で用意（未定義時は空配列で安全に）
const toArray = (v) =>
  Array.isArray(v) ? v : (v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : []);

const features = toArray(t("features.items", { returnObjects: true }));
const steps    = toArray(t("steps.items",    { returnObjects: true }));
const notes    = toArray(t("notes.items",    { returnObjects: true }));


  return (
    <>
      <Head>
        <title>{t("seo.title")}</title>
        <meta name="description" content={t("seo.description")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={t("seo.ogTitle")} />
        <meta property="og:description" content={t("seo.ogDescription")} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/LivekitMeeting.png`} />
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
              image: [`${siteUrl}/images/LivekitMeeting.png`],
              description: t("seo.ld.description"),
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href="/home"
            aria-label={t("aria.home")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              {t("nav.blog")}
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">{t("nav.onlinemeeting")}</span>
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
          {/* リリースノート */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("release.h2")}</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">{t("release.p1")}</p>
              <p className="text-base leading-7 text-indigo-100/90">{t("release.p2")}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src="/images/LivekitMeeting.png"
                  alt={t("image.alt")}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-indigo-200/70">{t("image.caption")}</p>
              </div>
            </div>
          </SectionCard>

          {/* はじめ方 */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("steps.h2")}</h2>
            <ol className="mt-4 space-y-2 text-indigo-100/90 list-decimal ml-5">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <div className="mt-3 text-xs text-indigo-200/70">
              <Pill>{t("steps.note")}</Pill>
            </div>
          </SectionCard>

          {/* 特長 */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("features.h2")}</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </SectionCard>

          {/* 注意事項・制限 */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("notes.h2")}</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/90 list-disc ml-5">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-indigo-200/80">{t("notes.foot")}</p>
          </SectionCard>

          {/* メタ情報 */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("meta.h2")}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-indigo-100/90">
              <Pill>
                {t("meta.published")}:{" "}
                {new Date().toLocaleDateString(router.locale || "ja-JP", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </Pill>
              <Pill>{t("meta.type")}</Pill>
              <Pill>{t("meta.category")}</Pill>
            </div>
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
              href="https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901"
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

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "en",
        ["common", "blog_onlinemeeting"],
        i18nConfig
      )),
    },
  };
}
