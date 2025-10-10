// src/pages/blog/introduction.js
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { Inter } from "next/font/google";

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

// Accessible “expand full transcript” component
function ExpandableTranscript({ preview, full }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="list-none cursor-pointer select-none px-4 py-3 text-sm text-indigo-100/90 flex items-center justify-between">
        <span>{open ? "Close Full Text" : "Expand Full Text"}</span>
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
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901";

  return (
    <>
      <Head>
        <title>What is Meeting-Minutes AI? Basics & Benefits Before You Adopt | Minutes.AI Blog</title>
        <meta
          name="description"
          content="“One-tap for meaningful meeting minutes.” A simple intro to Minutes AI: basics, differences vs other tools, output examples; trusted by 30,000+ users (as of Oct 2025)."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="What is Meeting-Minutes AI? Basics & Benefits Before You Adopt" />
        <meta
          property="og:description"
          content="“One-tap for meaningful minutes.” Understand meeting-minutes AI, how it's different, and sample outputs."
        />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: "What is Meeting-Minutes AI? Basics & Benefits Before You Adopt",
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
                "“One-tap for meaningful meeting minutes.” A simple intro to meeting-minutes AI, its differences, and examples.",
            }),
          }}
        />
      </Head>

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

        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>Minutes.AI</Kicker>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                What is Meeting-Minutes AI? Basics & Benefits Before You Adopt
              </span>
            </h1>
            <p className="mt-4 text-indigo-100/90">
              “One-tap for meaningful meeting minutes.” Clear, essential explanations for those just getting started.
            </p>
          </div>
        </section>

        <main className="mx-auto max-w-3xl px-6 pb-20">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight">Section 1: Greeting & Empathy</h2>
            <div className="prose prose-invert mt-4 max-w-none">
              <p>
                Hello everyone! Thank you for visiting this article. If you’re reading this, chances are you’ve felt:
                “Taking meeting minutes is tedious,” “I know how to write them but it takes too much time,” or
                “I tried using popular generative AI but something felt off.”
              </p>
              <p>
                Or perhaps as a reader you’ve experienced: “Some remarks were missed,” “decisions are vague,” or “people’s understanding doesn’t match.”
              </p>
              <p>
                In this article, I’ll explain as simply as possible how a meeting-minutes AI can help you produce **meaningful minutes** with just one tap.
              </p>
            </div>
          </SectionCard>

          <SectionCard className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">Section 2: What Is Meeting-Minutes AI? (Definition & Authority)</h2>
            <div className="prose prose-invert mt-4 max-w-none">
              <p>
                Meeting-minutes AI is an **“AI-powered fully automated meeting minutes creation tool.”** It supports all major languages and has surpassed <strong>30,000 users worldwide</strong>.
              </p>
              <StatFootnote>※ As of October 2025 (based on iOS store data)</StatFootnote>
              <p className="mt-4">
                With meeting-minutes AI, you can automatically generate “summaries,” “decisions,” and “action items,” producing **meaningful meeting minutes** without manual effort.
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="bg-white/[0.03] px-4 py-3 text-sm text-indigo-100/90">
                Differences: Transcription Tools / Generic AI / Meeting-Minutes AI
              </div>
              <div className="divide-y divide-white/10">
                <div className="grid grid-cols-4 gap-2 bg-white/[0.02] px-4 py-3 text-xs sm:text-sm">
                  <div className="text-indigo-200/90">Feature</div>
                  <div className="text-indigo-200/90">Plain Transcription Tool</div>
                  <div className="text-indigo-200/90">Generic AI</div>
                  <div className="text-indigo-200/90">Meeting-Minutes AI (our product)</div>
                </div>
                {[
                  {
                    k: "Audio → Text",
                    a: "Yes",
                    b: "No (requires manual input)",
                    c: "Yes",
                  },
                  {
                    k: "Summarization / Outline",
                    a: "No",
                    b: "Yes (but context may shift)",
                    c: "Yes (optimized for meetings)",
                  },
                  {
                    k: "Decision / Action Extraction",
                    a: "No",
                    b: "Yes (but often ambiguous)",
                    c: "Yes (clear extraction + tagging)",
                  },
                  {
                    k: "Multi-language Support",
                    a: "No",
                    b: "Yes (but syntax drift risk)",
                    c: "Yes (major languages + context-aware)",
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

          <SectionCard className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">Section 3: Source Text & Sample Outputs</h2>
            <div className="mt-4 space-y-3">
              <div className="text-sm text-indigo-200/90">Meeting Audio Sample:</div>
              <ExpandableTranscript
                preview={
                  "“Alright, it’s time so let’s start the meeting. First, let’s look back at the ‘smartwatch’ sales performance from last weekend. Please begin with your online channel report.” (…preview, full text can be expanded)"
                }
                full={
                  "(Full placeholder transcript)\n• Online: …\n• Offline: …\n• To do for next time: …\n\n※ In production, the full transcript will be shown here."
                }
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div className="text-sm text-indigo-200/90">Generic AI Output Example:</div>
    <div className="mt-2 rounded-xl bg-black/30 p-3 text-indigo-100/90">
      “At last, we will review last week’s smartwatch sales. Please begin with the online channel report.”
    </div>
    <p className="mt-3 text-sm text-indigo-200/80">
      It looks tidy at first glance, but it tends to leave you asking, “Who is supposed to do what, by when?”
    </p>
  </div>
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div className="text-sm text-indigo-200/90">Meeting-Minutes AI Output Example:</div>
    <div className="mt-2 rounded-xl bg-black/30 p-3 text-indigo-100/90">
      “Review smartwatch sales. → Online: increase ad spend; Offline: restock units.  
      Decision: allocate budget by Wednesday.  
      Action: Marketing team to report actual spend by Friday.”
    </div>
    <p className="mt-3 text-sm text-indigo-200/80">
      In addition to summary, it clearly organizes decisions and next actions by speaker.
    </p>
  </div>
</div>


            <p className="mt-6 text-indigo-100/90">
              How does that feel? As a reader, you should be able to look at the output and think, “Oh, so after reading this, here’s what I do next.” Next, let’s see how to use it.
            </p>
          </SectionCard>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={LINK_HOME}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              Open Browser Version
            </Link>
            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            >
              Download iOS Version
            </a>
          </div>
        </main>
      </div>
    </>
  );
}
