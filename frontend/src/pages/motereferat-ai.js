// src/pages/motereferat-ai.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import i18nConfig from "../../next-i18next.config";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Norwegian-first fallback (i18nキーが未訳ならこれを出す) ---------- */
const NB_FALLBACK = {
  seo: {
    /* SEO関連のメタデータは、検索クエリと一致しているため意図的に変更しません */
    title: "Møtereferat AI — Få tydelige referater og neste steg (Minutes.AI)",
    description:
      "Søker du “møtereferat ai” eller “ai møtereferat”? Minutes.AI lager lesbare referater med eiere og frister, på iPhone og nett.",
    ogTitle: "Møtereferat AI som faktisk brukes",
    ogDescription:
      "Start opptak raskt, få strukturerte referater og neste steg. iOS & Web.",
    ld: {
      headline: "Møtereferat AI — landingsside",
      description:
        "Hva det er, hvordan det funker, formatene som støttes, og priser som faktisk passer bruksmønsteret.",
    },
  },
  aria: { home: "Til forsiden" },
  nav: { blog: "Blogg", current: "Møtereferat AI" },

  hero: {
    kicker: "Møtereferat på minutter, ikke timer", // [変更] 「何時間もじゃなく、数分で議事録を」
    h1: "Endelig en AI som skriver møtereferater du faktisk vil lese", // [変更] 「ついに登場、あなたが本当に読みたくなる議事録を書くAI」
    tagline:
      "Ta opp møtet (iPhone/nett), få et strukturert sammendrag, og se klare neste steg. Mindre admin, mer action.", // [変更] 「会議を録音（iPhone/Web）、構造化された要約と明確な次のステップを。管理作業を減らし、行動を増やす。」
  },

  intent: {
    h2: "Kjenner du deg igjen i jakten på “møtereferat ai”?", // [変更] 「“議事録AI”探しで、こんなことありませんか？」
    items: [
      "Finne et verktøy som lager *lesbare* referater, ikke bare en vegg av tekst.", // [変更] 「ただのテキストの壁ではなく、*本当に読める*議事録を作るツールを見つけたい。」
      "Se en ærlig pris (og prøve først) uten å måtte binde deg.", // [変更] 「縛られずに、正直な価格（とまずはお試し）を確認したい。」
      "Sikre at appen funker til *ulike* møter, ikke bare én standard mal.", // [変更] 「標準テンプレート1つだけでなく、*色々な*会議で使えるアプリか確かめたい。」
    ],
  },

  what: {
    h2: "Hva Minutes.AI gjør for deg", // [変更] 「Minutes.AIがあなたのためにすること」
    bullets: [
      "Lager et ryddig referat som zoomer inn på beslutninger og tiltak.", // [変更] 「決定事項とアクションアイテムに焦点を当てた、整理された議事録を作成します。」
      "Tildeler *eiere* og *frister* slik at alle vet hvem som gjør hva.", // [変更] 「*誰が*何をするのか全員が把握できるよう、*担当者*と*期限*を割り当てます。」
      "Fungerer sømløst på iPhone (ett-trykks opptak) og i nettleseren.", // [変更] 「iPhone（ワンタップ録音）とブラウザでシームレスに動作します。」
    ],
  },

  how: {
    h2: "Slik går du fra prat til handling (3 steg)", // [変更] 「会話から行動へ (3ステップ)」
    steps: [
      "1) Start opptaket (iPhone/nett).", // [変更] 「1) 録音開始（iPhone/Web）。」
      "2) Motta et strukturert, lettlest referat.", // [変更] 「2) 構造化された、読みやすい議事録を受け取る。」
      "3) Del referatet og følg opp de neste stegene.", // [変更] 「3) 議事録を共有し、次のステップをフォローアップ。」
    ],
  },

  formats: {
    h2: "Én app, mange møtetyper", // [変更] 「1つのアプリ、多くの会議タイプ」
    p: "En idémyldring er ikke det samme som et salgsmøte. Velg riktig format for å gjøre referatet mest mulig nyttig.", // [変更] 「ブレストは営業会議とは違います。最も有用な議事録にするために、正しいフォーマットを選んでください。」
    items: ["Generelt møte", "Forhandling/salg", "1–1", "Presentasjon/foredrag", "Idémyldring", "Intervju"],
  },

  pricing: {
    h2: "Priser som gir mening (Ingen skjulte bindinger)", // [変更] 「理にかなった価格（隠れた縛りなし）」
    note: "Gjestebrukere kan spille inn inntil 3 minutter per dag.",
    head: ["Plan", "Pris", "Opptakstid"],
    rows: [
      ["Trial", "$1.99", "120 minutter"],
      ["Light", "$11.99", "1200 minutter"],
      ["Månedlig abonnement", "$17.99", "Ubegrenset"],
      ["Årlig abonnement", "$149.99", "Ubegrenset"]
    ],
    foot: "Priser kan variere etter region/butikk.",
  },

  social: {
    h2: "Valgt av tusenvis verden over", // [変更] 「世界中の何千人もの人々に選ばれています」
    p: "Bare 6 måneder etter iOS-lanseringen, nådde Minutes.AI 15 000 nedlastinger i over 160 land. Vi er stolte av tilliten!", // [変更] 「iOSローンチからわずか6ヶ月で、Minutes.AIは160カ国以上で15,000ダウンロードを達成しました。この信頼を誇りに思います！」
  },

  faq: {
    h2: "Noe du lurer på? (FAQ)", // [変更] 「お困りですか？ (FAQ)」
    items: [
      { q: "Kan jeg bytte mellom iPhone og nett?", a: "Ja. Ta opp på iPhone når du er på farten, og rediger eller les i nettleseren senere." }, // [変更] Q&Aをより具体的に
      { q: "Må jeg binde meg til et abonnement?", a: "Nei. Du kan teste med en 'Trial' ($1.99 for 120 min) eller som gjest (3 min/dag) før du bestemmer deg." }, // [変更] Q&Aをより具体的に
      { q: "Støttes ulike møteformater?", a: "Ja. Du kan velge blant flere formater slik at referatet passer møtet." }
    ],
  },

  cta: { openBrowser: "Åpne nettapp", downloadIOS: "Last ned iOS-appen" },

  meta: { h2: "Meta", published: "Publisert", type: "Landingsside", category: "Møtereferat" },
};

/* ---------- ヘルパー ---------- */
const getPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);

const toArray = (v) =>
  Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];

/* i18n: 未訳キーは NB_FALLBACK を返す */
function useTx(ns) {
  const { t } = useTranslation(ns);
  const txs = (key) => {
    const val = t(key);
    if (typeof val === "string" && val === key) {
      const fb = getPath(NB_FALLBACK, key);
      return typeof fb === "string" ? fb : key;
    }
    return val;
  };
  const txa = (key) => {
    const val = t(key, { returnObjects: true });
    if (Array.isArray(val)) return val;
    const fb = getPath(NB_FALLBACK, key);
    return toArray(fb);
  };
  return { txs, txa };
}

/* ---------- 小さなUI ---------- */
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

/* ---------- 本文 ---------- */
export default function MotereferatAI() {
  const router = useRouter();
  const { txs, txa } = useTx("lp_motereferat");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical =
    siteUrl + (router.locale === i18nConfig.i18n.defaultLocale ? "" : `/${router.locale}`) + "/motereferat-ai";

  const intentItems = txa("intent.items");
  const whatBullets = txa("what.bullets");
  const howSteps = txa("how.steps");
  const formatItems = txa("formats.items");
  const faqItems = txa("faq.items");
  const priceHead = txa("pricing.head");
  const priceRows = txa("pricing.rows");

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
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        {/* 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: txs("seo.ld.headline"),
              description: txs("seo.ld.description"),
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
            }),
          }}
        />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <Link
            href="/home"
            aria-label={txs("aria.home")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          <nav className="mt-4 text-sm text-indigo-200/80">
            <span className="text-indigo-100">{txs("nav.current")}</span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>{txs("hero.kicker")}</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                {txs("hero.h1")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">{txs("hero.tagline")}</p>
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Intent match */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("intent.h2")}</h2>
            <ul className="mt-4 ml-5 list-disc space-y-1 text-indigo-100/90">
              {intentItems.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </SectionCard>

          {/* What it is */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("what.h2")}</h2>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-indigo-100/90">
              {whatBullets.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </SectionCard>

          {/* How it works */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("how.h2")}</h2>
            <ol className="mt-4 ml-5 list-decimal space-y-2 text-indigo-100/90">
              {howSteps.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ol>
          </SectionCard>

          {/* Formats */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("formats.h2")}</h2>
            <p className="mt-2 text-indigo-100/90">{txs("formats.p")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {formatItems.map((f, i) => (
                <Pill key={i}>{f}</Pill>
              ))}
            </div>
          </SectionCard>

          {/* Pricing */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("pricing.h2")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-indigo-200/80">
                    {priceHead.map((h, i) => (
                      <th key={i} className="px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((r, i) => (
                    <tr key={i} className="align-top">
                      <td className="px-3 py-3 rounded-l-xl bg-white/5 text-white/90">{r[0]}</td>
                      <td className="px-3 py-3 bg-white/5 text-indigo-100/90">{r[1]}</td>
                      <td className="px-3 py-3 rounded-r-xl bg-white/5 text-indigo-100/90">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-indigo-200/80">{txs("pricing.note")}</p>
            <p className="mt-1 text-xs text-indigo-200/60">{txs("pricing.foot")}</p>
            <div className="mt-4">
              <Link href="/blog/pricing" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                Se detaljer
              </Link>
            </div>
          </SectionCard>

          {/* Social proof */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("social.h2")}</h2>
            <p className="mt-2 text-indigo-100/90">{txs("social.p")}</p>
          </SectionCard>

          {/* FAQ */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("faq.h2")}</h2>
            <div className="mt-4 space-y-4">
              {faqItems.map((f, i) => (
                <div key={i}>
                  <h3 className="text-base font-semibold">{f.q}</h3>
                  <p className="mt-1 text-indigo-100/90">{f.a}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Meta */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{txs("meta.h2")}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-indigo-100/90">
              <Pill>
                {txs("meta.published")}:{" "}
                {new Date().toLocaleDateString(router.locale || "nb-NO", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </Pill>
              <Pill>{txs("meta.type")}</Pill>
              <Pill>{txs("meta.category")}</Pill>
            </div>
          </SectionCard>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              {txs("cta.openBrowser")}
            </Link>
            <a
              href="https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              {txs("cta.downloadIOS")}
            </a>
          </div>

          {/* 画像差し込みポイント（必要時のみ）
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Skjermbilder</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <img src="/images/mainscreen.png" alt="Hovedskjerm – ett-trykk opptak" className="rounded-xl" />
              <img src="/images/minutesimage.png" alt="Eksempel på referat" className="rounded-xl" />
            </div>
          </SectionCard>
          */}
        </main>
      </div>
    </>
  );
}

/* ---------- SSR: このページ専用の名前空間を読み込む ---------- */
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "no", ["common", "lp_motereferat"], i18nConfig)),
    },
  };
}
