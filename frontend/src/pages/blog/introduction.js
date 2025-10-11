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
  const {
    topic: title,
    discussion = [],
    decisions,
    actionItems,
    concerns,
    keyMessages
  } = topic || {};

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <h4 className="text-lg sm:text-xl font-bold text-white">
        {index}. {title}
      </h4>

      {discussion?.length > 0 && (
        <>
          <SectionLabel>Discussion</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {discussion.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(decisions) && decisions.length > 0 && (
        <>
          <SectionLabel>Decisions</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {decisions.map((d, i) => (
              <li key={i} className="font-medium text-white/95">{d}</li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(actionItems) && actionItems.length > 0 && (
        <>
          <SectionLabel>Action Items</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {actionItems.map((a, i) => (
              <ActionItemLine key={i} text={a} />
            ))}
          </ul>
        </>
      )}

      {Array.isArray(concerns) && concerns.length > 0 && (
        <>
          <SectionLabel>Concerns</SectionLabel>
          <ul className="ml-4 list-disc space-y-1 text-indigo-100/90">
            {concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </>
      )}

      {Array.isArray(keyMessages) && keyMessages.length > 0 && (
        <>
          <SectionLabel>Key Messages</SectionLabel>
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
  if (!minutes) return null;
  const {
    meetingTitle,
    date,
    location,
    attendees,
    coreMessage,
    topics = []
  } = minutes;

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
            <span className="font-semibold text-indigo-200/90">Attendees:</span>{" "}
            {attendees.join(", ")}
          </p>
        )}
        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </header>

      {/* Topics */}
      <div className="space-y-4">
        {topics.map((t, i) => (
          <TopicBlock key={`${i}-${t.topic}`} index={i + 1} topic={t} />
        ))}
      </div>

      {/* Core message (closing) */}
      {coreMessage && (
        <aside className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <h5 className="mb-2 text-base sm:text-lg font-semibold tracking-wide text-indigo-200/90">
            Closing Message
          </h5>
          <blockquote className="text-indigo-100/90">
            “{coreMessage}”
          </blockquote>
        </aside>
      )}
    </section>
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
        <title>
          What is Minutes.AI? Basics & Benefits Before You Adopt | Minutes.AI Blog
        </title>
        <meta
          name="description"
          content="One-tap for meaningful minutes. A simple intro to Minutes.AI: basics, differences vs other tools, and output examples; trusted by 30,000+ users (as of Oct 2025)."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta
          property="og:title"
          content="What is Minutes.AI? Basics & Benefits Before You Adopt"
        />
        <meta
          property="og:description"
          content="One-tap for meaningful minutes. Understand Minutes.AI, how it's different, and sample outputs."
        />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline:
                "What is Minutes.AI? Basics & Benefits Before You Adopt",
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
                "One-tap for meaningful minutes. A simple intro to Minutes.AI, its differences, and examples.",
            }),
          }}
        />
      </Head>

      {/* Background */}
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

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>Minutes.AI</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                What is Minutes.AI? Basics & Benefits Before You Adopt
              </span>
            </h1>
            <p className="mt-4 text-base leading-7 text-indigo-100/90 max-w-2xl">
              “One-tap for meaningful meeting minutes.” Clear, essential explanations for those just getting started.
            </p>
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Introduction */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Introduction</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">
                Hello everyone! Thank you for visiting this article. If you’re reading this, chances are you’ve felt:
                “Taking meeting minutes is tedious,” “I know how to write them but it takes too much time,” or
                “I tried using popular generative AI but something felt off.”
              </p>
              <p className="text-base leading-7 text-indigo-100/90">
                Or perhaps as a reader you’ve experienced: “Some remarks were missed,” “decisions are vague,” or
                “people’s understanding doesn’t match.”
              </p>
              <p className="text-base leading-7 text-indigo-100/90">
                In this article, we’ll show how <span className="font-semibold">Minutes.AI</span> helps you produce
                <span className="font-semibold"> meaningful minutes </span>
                with just one tap — focusing on clarity and outcomes.
              </p>
            </div>
          </SectionCard>

          {/* What is Minutes.AI? */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What is Minutes.AI?</h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">
                <span className="font-semibold">Minutes.AI</span> is an AI-powered, fully automated meeting-minutes tool.
                It supports all major languages and has surpassed <span className="font-semibold">30,000 users worldwide</span>.
              </p>
              <StatFootnote>※ As of October 2025 (based on iOS store data)</StatFootnote>
              <p className="text-base leading-7 text-indigo-100/90">
                With Minutes.AI, you can automatically generate “summaries,” “decisions,” and “action items,”
                producing <span className="font-semibold">meaningful minutes</span> without manual effort.
              </p>
            </div>

            {/* Comparison table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="bg-white/[0.03] px-4 py-3 text-sm text-indigo-100/90">
                Differences: Transcription Tools / Generic AI / Minutes.AI
              </div>
              <div className="divide-y divide-white/10">
                <div className="grid grid-cols-4 gap-2 bg-white/[0.02] px-4 py-3 text-xs sm:text-sm">
                  <div className="text-indigo-200/90">Feature</div>
                  <div className="text-indigo-200/90">Plain Transcription Tool</div>
                  <div className="text-indigo-200/90">Generic AI</div>
                  <div className="text-indigo-200/90">Minutes.AI</div>
                </div>
                {[
                  { k: "Audio → Text", a: "Yes", b: "No (requires manual input)", c: "Yes" },
                  { k: "Summarization / Outline", a: "No", b: "Yes (but context may shift)", c: "Yes (optimized for meetings)" },
                  { k: "Decision / Action Extraction", a: "No", b: "Yes (but often ambiguous)", c: "Yes (clear extraction + tagging)" },
                  { k: "Multi-language Support", a: "No", b: "Yes (risk of syntax drift)", c: "Yes (major languages + context-aware)" },
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

          {/* Source Text & Sample Outputs (stacked vertically) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Source Text & Sample Outputs
            </h2>

            {/* Meeting audio (preview + full expandable) */}
            <div className="mt-4 space-y-3">
              <h3 className="text-lg sm:text-xl font-semibold">Meeting Audio Sample</h3>
              <ExpandableTranscript
                preview={
                  "Alright, it’s time so let’s start the meeting. First, let’s look back at the ‘smartwatch’ sales performance from last weekend. Please begin with your online channel report."
                }
                full={`Alex (Marketing Lead): Thanks for joining, everyone — Jordan (E-commerce), Sam (Retail Ops), Taylor (PM), and Riley (Data). Let’s review last weekend’s smartwatch performance. Jordan, please start with online.

Jordan (E-commerce): Week-over-week, sessions are up 18%. Conversion improved from 2.9% to 3.2%. Revenue rose 12%. The spike mainly came from the influencer tie-in on Saturday; ad spend was up 6%.

Riley (Data): CAC remains stable at around ¥2,400. However, retargeting CTR fell from 1.8% to 1.2%. I recommend a creative refresh and an A/B test with shorter headline copy. I can deliver a quick analysis deck by Friday (2025-10-17).

Alex: Sounds good. Decision: Increase online ad budget by 15% for the next two weeks. Action: Jordan, launch the A/B test on the accessories hero copy by Wednesday (2025-10-15). Action: Riley, deliver the creative CTR analysis deck by Friday (2025-10-17).

Sam (Retail Ops): For physical stores, we had stockouts at Shibuya, Umeda, and Sapporo. A restock of 500 units is scheduled for Monday. Foot traffic dropped 4% due to the typhoon, but average basket value was flat.

Alex: Decision: Proceed with the 500-unit restock across those three stores. Action: Sam, confirm supplier ETA and logistics by Tuesday (2025-10-14). Concern: lead-time risk if the supplier backlog grows.

Taylor (PM): Firmware v1.2 fixes the battery drain issue and improves step-count calibration. Release notes are ready. I propose a launch on Oct 20 with a Q4 bundle — “Watch + Band” at ¥2,000 off. Support will need to publish an FAQ.

Alex: Decision: Approve the Q4 bundle launch on 2025-10-20. Actions: Taylor, finalize the release schedule by Monday (2025-10-13). Support team, publish the FAQ by Thursday (2025-10-16). Marketing, prepare a Black Friday draft plan by Saturday (2025-10-25).

Alex (closing message): Let’s spend smart and keep our pace clear and steady — clarity over speed. Commit to “who does what by when,” and keep meetings within 30 minutes.
`}
              />
            </div>

            {/* Stacked: Generic AI then Minutes.AI */}
            <div className="mt-6 space-y-6">
              {/* Generic AI */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg sm:text-xl font-semibold">Generic AI Output Example</h3>
                <div className="mt-2 rounded-xl bg-black/30 p-3 text-indigo-100/90 whitespace-pre-wrap">
{`The team reviewed smartwatch sales performance. Online metrics were up (sessions, conversion).
Retail stores faced stockouts at several locations. There was mention of a firmware update and a seasonal bundle.
Overall outlook was positive, and several improvements were discussed.`}
                </div>
                <p className="mt-3 text-sm leading-6 text-indigo-200/80">
                  It reads clean, but it doesn’t clearly answer “who will do what by when.”
                </p>
              </div>

              {/* Minutes.AI — Pretty render */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold">Minutes.AI Output Example</h3>

                {(() => {
  const minutes = {
    meetingTitle: "Smartwatch Weekly Sales Review",
    date: "2025-10-11 10:00 JST",
    attendees: [
      "Alex (Marketing Lead)",
      "Jordan (E-commerce)",
      "Sam (Retail Ops)",
      "Taylor (PM)",
      "Riley (Data)"
    ],
    coreMessage:
      "Let’s spend smart — clarity over speed. Commit to ‘who does what by when,’ and keep meetings within 30 minutes.",
    topics: [
      {
        topic: "Online channel performance",
        discussion: [
          "Sessions +18% WoW; conversion 2.9% → 3.2%; revenue +12%",
          "Influencer tie-in drove Saturday spike; ad spend +6%",
          "Retargeting CTR fell 1.8% → 1.2%; propose creative refresh and A/B test"
        ],
        decisions: [
          "Increase online ad budget by 15% for the next two weeks"
        ],
        actionItems: [
          "Jordan — launch A/B test on accessories hero copy by 2025-10-15",
          "Riley — deliver creative CTR analysis deck by 2025-10-17"
        ],
        concerns: ["Ad fatigue if creatives are not refreshed"],
        keyMessages: ["Grow while maintaining stable CAC; test before scaling"]
      },
      {
        topic: "Offline stock & store operations",
        discussion: [
          "Stockouts at Shibuya, Umeda, Sapporo",
          "Restock of 500 units scheduled for Monday",
          "Foot traffic −4% due to typhoon; basket value flat"
        ],
        decisions: ["Proceed with 500-unit restock across three stores"],
        actionItems: ["Sam — confirm supplier ETA/logistics by 2025-10-14"],
        concerns: ["Supplier lead-time risk if backlog increases"],
        keyMessages: ["Avoid lost sales by stabilizing store inventory"]
      },
      {
        topic: "Firmware v1.2 & Q4 bundle launch",
        discussion: [
          "v1.2 fixes battery drain; improves step-count calibration",
          "Release notes ready; Support to publish FAQ",
          "Proposed Q4 bundle: Watch + Band, −¥2,000 from 2025-10-20"
        ],
        decisions: ["Approve Q4 bundle launch on 2025-10-20"],
        actionItems: [
          "Taylor — finalize release schedule by 2025-10-13",
          "Support — publish FAQ by 2025-10-16",
          "Marketing — prepare Black Friday draft plan by 2025-10-25"
        ],
        keyMessages: ["Pair product improvements with timely promotions"]
      }
    ]
  };
  return <MinutesPrettyRender minutes={minutes} />;
})()}

              </div>
            </div>
          </SectionCard>

          {/* Wrap-up (natural wording) */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Wrap-up</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">
              How does it look? With this structure, readers and teams can see at a glance what should happen next —
              the output becomes truly valuable and actionable. Give <span className="font-semibold">Minutes.AI</span> a try and experience it for yourself.
            </p>
          </SectionCard>

          {/* CTA */}
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
