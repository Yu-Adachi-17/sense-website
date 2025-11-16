// src/pages/blog/negotiation.js
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import HomeIcon from "../homeIcon";

// CTA icons
import { TbWorld } from "react-icons/tb";
import { BsGooglePlay } from "react-icons/bs";
import { FaAppStore } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

/* ---------- Small UI components ---------- */
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

function Byline() {
  return (
    <div className="mt-8 flex items-center gap-3 text-sm text-indigo-100/85">
      <div className="h-9 w-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
        <span className="text-xs font-bold">YA</span>
      </div>
      <div>
        <p className="font-semibold">Written by Yu Adachi</p>
        <p className="text-indigo-200/80">CEO, Sense G.K.</p>
      </div>
    </div>
  );
}

/* ---------- Constants ---------- */
const LINK_HOME = "/home";
const LINK_IOS =
  "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=world.senseai.minutes";

/* ---------- Page ---------- */
export default function BlogNegotiation() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  const canonical = `${siteUrl}/blog/negotiation`;

  return (
    <>
      <Head>
        <title>
          Why Minutes.AI helps you write the best negotiation minutes | Meeting
          minutes blog
        </title>
        <meta
          name="description"
          content="Negotiations need minutes that capture decisions, tasks, context, tone, and the history of concessions. A practical guide with Minutes.AI."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta
          property="og:title"
          content="Why Minutes.AI helps you write the best negotiation minutes"
        />
        <meta
          property="og:description"
          content="Goodbye thin minutes: preserve the exchange and the context to decide faster and better."
        />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />

        {/* Article structured data */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline:
                "Why Minutes.AI helps you write the best negotiation minutes",
              description:
                "The essence of negotiation in your minutes: demands, concessions, and context—with Minutes.AI.",
              datePublished: new Date().toISOString(),
              dateModified: new Date().toISOString(),
              mainEntityOfPage: canonical,
              author: {
                "@type": "Person",
                name: "Yu Adachi",
                jobTitle: "CEO",
                worksFor: { "@type": "Organization", name: "Sense G.K." },
              },
              publisher: {
                "@type": "Organization",
                name: "Minutes.AI",
                logo: {
                  "@type": "ImageObject",
                  url: `${siteUrl}/icon-master.png`,
                },
              },
              image: [`${siteUrl}/images/hero-phone.png`],
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
            aria-label="Back to Minutes.AI Home"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>

          {/* breadcrumbs */}
          <nav className="mt-4 text-sm text-indigo-200/80">
            <Link href="/blog" className="hover:underline">
              Blog
            </Link>
            <span className="mx-2 text-indigo-300/50">/</span>
            <span className="text-indigo-100">
              Why Minutes.AI helps you write the best negotiation minutes
            </span>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <Kicker>Minutes.AI Blog</Kicker>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-200 via-white to-fuchsia-200 bg-clip-text text-transparent drop-shadow">
                Why Minutes.AI helps you write the best negotiation minutes
              </span>
            </h1>
            <p className="mt-2 text-base leading-7 text-indigo-100/90 max-w-2xl">
              Negotiation is a contest of interests. Strong minutes don’t just
              list decisions and to-dos—they also capture context and tone.
              Here’s the approach and how to put it into practice with
              Minutes.AI.
            </p>
            <Byline />
          </div>
        </section>

        {/* Main */}
        <main className="mx-auto max-w-3xl px-6 pb-20">
          {/* Recap of previous article */}
          <SectionCard>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Quick recap
            </h2>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-7 text-indigo-100/90">
                Last time we showed how AI minutes can work for any kind of
                meeting. If you’re curious,{" "}
                <Link
                  href="/blog/universal-minutes"
                  className="underline underline-offset-2"
                >
                  read it here
                </Link>
                .
              </p>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                <li>
                  Meetings are diverse, so the optimal minutes format depends on
                  the goal.
                </li>
                <li>
                  Generic templates help, but the detail level should be tuned
                  to the use case.
                </li>
                <li>From a “record to read” to a “plan to act.”</li>
                <li>Minutes.AI adapts its output to the meeting’s objective.</li>
              </ul>
              <p className="mt-4 text-base font-bold text-indigo-100">
                This time, we dive deep into negotiation.
              </p>
            </div>
          </SectionCard>

          {/* Diversity of meetings */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Meetings are diverse—negotiation is all about bargaining
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/90">
                  Common meetings
                </h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>Regular stand-ups: review results, issues, actions</li>
                  <li>Brainstorm: diverge and converge on ideas</li>
                  <li>Negotiation: align interests and reach agreement</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-200/90">
                  “Meeting” in a wide sense
                </h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>1-on-1: results review, next goals, sharing challenges</li>
                  <li>Interview: align requirements and fit</li>
                  <li>Presentation: problem and solution</li>
                  <li>Training: transfer of processes/operations</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">
              Change the objective, and the valuable output changes too. In
              negotiation, the bargaining itself is the core.
            </p>
          </SectionCard>

          {/* What is negotiation */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              So, what is a negotiation?
            </h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">
              In short: protecting and growing your company’s interests. It
              isn’t a one-way announcement; you search for common ground by
              trading “demands” and “concessions” across terms like deadline,
              price, scope, and risk.
            </p>
          </SectionCard>

          {/* Limits of one-size-fits-all */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Why “decisions-only” minutes are weak
            </h2>
            <p className="mt-2 text-base leading-7 text-indigo-100/90">
              Sticking to “discussion/decisions/action items/open issues” often
              drops background, tone, and the history of concessions. The
              result: misunderstandings, extra back-and-forth, and the risk of
              “said/not said.”
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">
                  The typical thin minutes
                </h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>Lists decisions without reasons or storyline</li>
                  <li>
                    Unclear who asked for what and where concessions were made
                  </li>
                  <li>
                    Ambiguity around what’s unagreed or parked for later rounds
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold">
                  Minutes built for negotiation
                </h3>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-indigo-100/90">
                  <li>
                    A timeline of demands / concessions / term changes
                    (deadline / price / scope / responsibility)
                  </li>
                  <li>
                    Reasons, assumptions, and risks recorded close to each
                    decision
                  </li>
                  <li>
                    Clear split of agreed / not agreed / parked with owners and
                    due dates
                  </li>
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* Conversation example */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Example (keep key exchanges verbatim)
            </h2>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-indigo-100/90 font-mono">
{`Company A: Your previous product had a bug—it caused us real trouble. You owe us; deliver this by next week. Price is $1,000.
Our company: We’ll push internally to deliver by next week. In return, can we raise it to $1,200? Please consider.
Company A: If you can guarantee next-week delivery, we’ll consider it. Send a reply by email today.`}
              </pre>
            </div>
            <p className="mt-3 text-base leading-7 text-indigo-100/90">
              Keeping these “key rounds” in the original wording lets
              decision-makers judge reasonableness with full context.
            </p>
          </SectionCard>

          {/* Why Minutes.AI for negotiation */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Why Minutes.AI is strong for negotiation
            </h2>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-indigo-100/90">
              <li>
                Summarizes demand / concession exchanges and preserves key
                passages verbatim (avoids “said / not said”).
              </li>
              <li>
                Orders term changes chronologically
                (deadline / price / scope / responsibility).
              </li>
              <li>
                Documents reasons, assumptions, and risks right next to
                decisions.
              </li>
              <li>
                Separates agreed / not agreed / parked and assigns owners and
                deadlines.
              </li>
              <li>
                Maps counterpart requests to your commitments for clear
                tracking.
              </li>
            </ul>
          </SectionCard>

          {/* Wrap-up */}
          <SectionCard className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Wrap-up
            </h2>
            <p className="mt-4 text-base leading-7 text-indigo-100/90">
              Negotiation minutes are stronger when they keep the
              back-and-forth and the context—not just decisions. That speeds
              judgment and reduces rework. Make it your standard with
              Minutes.AI.
            </p>
          </SectionCard>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-4">
            {/* Browser */}
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-50/90 backdrop-blur shadow-[0_18px_50px_rgba(79,70,229,0.65)] transition hover:border-indigo-100/80 hover:bg-indigo-500/20 hover:text-white"
            >
              <TbWorld className="text-lg sm:text-xl text-indigo-200 group-hover:text-white" />
              <span>Browser</span>
            </Link>

            {/* App Store */}
            <a
              href={LINK_IOS}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-sky-300/45 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-50/90 backdrop-blur shadow-[0_18px_50px_rgba(56,189,248,0.65)] transition hover:border-sky-100/80 hover:bg-sky-500/20 hover:text-white"
            >
              <FaAppStore className="text-lg sm:text-xl text-sky-200 group-hover:text-white" />
              <span>App Store</span>
            </a>

            {/* Google Play */}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-50/90 backdrop-blur shadow-[0_18px_50px_rgba(16,185,129,0.7)] transition hover:border-emerald-100/80 hover:bg-emerald-500/20 hover:text-white"
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
