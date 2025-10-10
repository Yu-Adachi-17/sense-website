// src/pages/blog/introduction.js
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

// ---- 小さなUIパーツ ----
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
      {/* subtle glow */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      {children}
    </section>
  );
}

function StatFootnote({ children }) {
  return (
    <p className="mt-3 text-xs text-indigo-200/70">{children}</p>
  );
}

// アクセシブルな「全文を展開」コンポーネント
function ExpandableTranscript({ preview, full }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="list-none cursor-pointer select-none px-4 py-3 text-sm text-indigo-100/90 flex items-center justify-between">
        <span>{open ? "全文を閉じる" : "全文を展開"}</span>
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

export default function BlogIntroduction() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/introduction`;
  const LINK_HOME = "/";
  // 公式App Store（議事録AI）
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";

  return (
    <>
      <Head>
        <title>議事録AIとは何か？導入前に知っておくべき基礎とメリット | Minutes.AI Blog</title>
        <meta
          name="description"
          content="“ワンタッチで意味ある議事録” を。議事録AIの基本、他ツールとの違い、出力例をシンプルに解説。3万人以上が利用（2025年10月時点）。"
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="議事録AIとは何か？導入前に知っておくべき基礎とメリット" />
        <meta
          property="og:description"
          content="“ワンタッチで意味ある議事録”。議事録AIの基本と差分、出力例を最短で。"
        />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          // 構造化データ（Article）
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: "議事録AIとは何か？導入前に知っておくべき基礎とメリット",
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
              description:
                "“ワンタッチで意味ある議事録”。議事録AIの基本と差分、出力例を最短で。",
            }),
          }}
        />
      </Head>

      {/* 背景（/blog と同系統のネオン・グラデ） */}
      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        <header className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12">
          <nav className="text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              Blog
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">Introduction</span>
          </nav>
        </header>

        {/* ヒーロー */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>Minutes.AI</Kicker>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                議事録AIとは何か？導入前に知っておくべき基礎とメリット
              </span>
            </h1>
            <p className="mt-4 text-indigo-100/90">
              “ワンタッチで意味ある議事録”。読みやすさと本質に絞って解説します。
            </p>
          </div>
        </section>

        {/* 本文 */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* セクション1：あいさつ・共感 */}
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight">セクション1（あいさつ・共感）</h2>
            <div className="prose prose-invert mt-4 max-w-none">
              <p>
                みなさんこんにちは！本記事をご覧くださって、どうもありがとうございます。この記事をご覧になったということは、
                「議事録を書くのが面倒」「書き方はわかっていても時間がかかる」「最近流行の生成AIを使ったけど、微妙な違和感が残る」
                と感じている方が多いのではないでしょうか？
              </p>
              <p>
                もしくは読み手になった時に、「発言が漏れている」「決定事項がうやむや」「認識がズレている」など、モヤモヤを経験されたことはありませんか？
              </p>
              <p>
                本記事では、そんなお悩みを持つあなたに向けて、“ワンタッチで意味ある議事録を作る”ための議事録AIをできるだけシンプルにお伝えします。
              </p>
            </div>
          </SectionCard>

          {/* セクション2：定義・権威づけ */}
          <SectionCard className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">セクション2：議事録AIとは何か？（説明、権威付）</h2>
            <div className="prose prose-invert mt-4 max-w-none">
              <p>
                議事録AIは「AIによる全自動議事録作成ツール」です。全ての主要言語に対応し、全世界で<strong>3万ユーザー</strong>を突破※しています。
              </p>
              <StatFootnote>※ 2025年10月現在（iOS公式ストアの実績に基づく）</StatFootnote>
              <p className="mt-4">
                議事録AIを用いれば、「要約」「決定事項」「アクション項目」などを抽出し、「意味のある議事録」を自動生成することができます。
              </p>
            </div>

            {/* 比較（グラスカードの中に“表”を美しく） */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="bg-white/[0.03] px-4 py-3 text-sm text-indigo-100/90">
                文字起こしツール／汎用生成AI／議事録AI の違い
              </div>
              <div className="divide-y divide-white/10">
                <div className="grid grid-cols-4 gap-2 bg-white/[0.02] px-4 py-3 text-xs sm:text-sm">
                  <div className="text-indigo-200/90">機能</div>
                  <div className="text-indigo-200/90">単なる文字起こしツール</div>
                  <div className="text-indigo-200/90">生成AI（汎用）</div>
                  <div className="text-indigo-200/90">議事録AI（本サービス）</div>
                </div>
                {[
                  {
                    k: "音声インプット → テキスト化",
                    a: "○",
                    b: "×（入力を別途テキストに起こす必要あり）",
                    c: "○",
                  },
                  {
                    k: "要約・骨子化",
                    a: "×",
                    b: "○（ただし文脈がズレやすい）",
                    c: "○（会議特化で文脈理解を強化）",
                  },
                  {
                    k: "決定事項・アクション抽出",
                    a: "×",
                    b: "○（ただし曖昧になりがち）",
                    c: "○（明確な抽出＋タグ付けなど）",
                  },
                  {
                    k: "多言語対応",
                    a: "×",
                    b: "○（ただし構文ズレのリスク）",
                    c: "○（主要言語対応・会議文脈に最適化）",
                  },
                ].map((row) => (
                  <div key={row.k} className="grid grid-cols-4 gap-2 px-4 py-3 text-sm">
                    <div className="text-indigo-100/90">{row.k}</div>
                    <div className="text-indigo-50/90">{row.a}</div>
                    <div className="text-indigo-50/90">{row.b}</div>
                    <div className="text-indigo-50/90">{row.c}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* セクション3：原文＞出力例 */}
          <SectionCard className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">セクション3：原文（短く）＞出力例</h2>

            {/* 会議音声例（プレビュー＋全文展開） */}
            <div className="mt-4 space-y-3">
              <div className="text-sm text-indigo-200/90">会議音声例：</div>
              <ExpandableTranscript
                preview={
                  "はい、それでは時間になりましたので会議を始めましょう。まずは先週末の「スマートウォッチ」の販売実績から振り返っていきます。最初にオンラインチャネルの報告をお願いします。（ここで省略。しようと思えば全文を展開できるボタン）"
                }
                // full には将来、実録の長文をそのまま貼る想定
                full={
                  "（全文プレースホルダ）\n・オンライン：……\n・オフライン：……\n・次回までの宿題：……\n\n※ 実際の導入後、この領域に長文の原文トランスクリプトを掲載できます。"
                }
              />
            </div>

            {/* 出力例（プレースホルダのまま） */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-indigo-200/90">よくある生成AIの出力例：</div>
                <div className="mt-2 rounded-xl bg-black/30 p-3 text-indigo-100/90">
                  ＊＊＊＊
                </div>
                <p className="mt-3 text-sm text-indigo-200/80">
                  一見読みやすいが、「誰が・いつまでに・何をするか」が曖昧になりがち。
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-indigo-200/90">議事録AIの出力例：</div>
                <div className="mt-2 rounded-xl bg-black/30 p-3 text-indigo-100/90">
                  ＊＊＊＊
                </div>
                <p className="mt-3 text-sm text-indigo-200/80">
                  要約に加え、発言者ごとに決定事項・アクションが明確に整理される想定。
                </p>
              </div>
            </div>

            <p className="mt-6 text-indigo-100/90">
              いかがでしょうか。あなたが読み手になった時に、「あ、これを読んだ私は次にこのアクションをすればいいのね」とすぐに頭に入ってくると思います。では、気になる使い方を次のセクションで紹介していきます。
            </p>
          </SectionCard>

          {/* CTA（任意で活かす） */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={LINK_HOME}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              ブラウザ版をひらく
            </Link>
            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              iOS版をダウンロード
            </a>
          </div>
        </main>
      </div>
    </>
  );
}
