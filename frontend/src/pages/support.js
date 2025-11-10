// src/pages/support.js  （または pages/support.js）
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

export default function Support({ siteUrl }) {
  const mailto = `mailto:support@sense-ai.world?subject=Support%20Request&body=Please%20describe%20your%20inquiry:%0D%0A%0D%0A- Name:%0D%0A- App/Plan:%0D%0A- Issue%20details:%0D%0A- Steps%20to%20reproduce:%0D%0A- Screenshot/Logs%20(optional):%0D%0A`;

  return (
    <>
      <Head>
        <title>Support — Sense G.K.</title>
        <meta
          name="description"
          content="Official support page for Sense G.K. — email and phone contact."
        />
        <link rel="canonical" href={`${siteUrl}/support`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Support — Sense G.K." />
        <meta
          property="og:description"
          content="Official support page for Sense G.K. — email and phone contact."
        />
        <meta property="og:url" content={`${siteUrl}/support`} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* Home icon (top-left) */}
        <div className="pointer-events-none fixed left-5 top-5 z-50">
          <Link
            href="/"
            aria-label="Back to Home"
            className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>
        </div>

        <main className="mx-auto max-w-3xl px-6 py-24">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
            <header className="mb-8">
              <p className="text-sm uppercase tracking-widest text-indigo-200/80">
                Support
              </p>
              <h1 className="mt-1 text-4xl font-extrabold leading-tight text-white">
                We're here to help.
              </h1>
              <p className="mt-2 text-indigo-100/85">
                Contact our support team via email or phone.
              </p>
            </header>

            <dl className="divide-y divide-white/10">
              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Email</dt>
                <dd className="sm:col-span-2">
                  <a
                    href="mailto:support@sense-ai.world"
                    className="font-medium text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 hover:text-white hover:decoration-indigo-300"
                  >
                    support@sense-ai.world
                  </a>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Phone</dt>
                <dd className="sm:col-span-2">
                  <a
                    href="tel:+817031057815"
                    className="font-medium text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 hover:text-white hover:decoration-indigo-300"
                  >
                    +81 70 3105 7815
                  </a>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Quick Action</dt>
                <dd className="sm:col-span-2">
                  <a
                    href={mailto}
                    className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-indigo-100/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  >
                    Compose Email
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <nav className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-6 text-indigo-200/80">
            <Link href="/company" className="hover:text-white">/company</Link>
            <Link href="/privacy-policy" className="hover:text-white">/privacy-policy</Link>
            <Link href="/terms-of-use" className="hover:text-white">/terms-of-use</Link>
          </nav>

          <p className="mt-6 text-center text-xs text-indigo-200/70">
            © {new Date().getFullYear()} Sense G.K. All rights reserved.
          </p>
        </main>
      </div>
    </>
  );
}

export async function getStaticProps() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  return { props: { siteUrl }, revalidate: 600 };
}
