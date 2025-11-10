// src/pages/company.js  （または pages/company.js）
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

export default function Company({ siteUrl }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sense G.K.",
    legalName: "Sense G.K.",
    url: `${siteUrl}/company`,
    email: "support@sense-ai.world",
    founder: { "@type": "Person", name: "Yu Adachi" },
    address: {
      "@type": "PostalAddress",
      // Registered office with room number provided
      streetAddress: "Concieria Shiba-Koen 405",
      addressLocality: "Minato-ku",
      addressRegion: "Tokyo",
      addressCountry: "JP",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "support@sense-ai.world",
        telephone: "+817031057815",
        url: `${siteUrl}/support`,
        contactType: "customer support",
        areaServed: "JP",
        availableLanguage: ["en", "ja"],
      },
    ],
  };

  return (
    <>
      <Head>
        <title>Company — Sense G.K.</title>
        <meta
          name="description"
          content="Company information for Sense G.K. — registered address and public support contact."
        />
        <link rel="canonical" href={`${siteUrl}/company`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Company — Sense G.K." />
        <meta
          property="og:description"
          content="Company information for Sense G.K. — registered address and public support contact."
        />
        <meta property="og:url" content={`${siteUrl}/company`} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      {/* Background (keep original visual) */}
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

        {/* Content (keep original card) */}
        <main className="mx-auto max-w-3xl px-6 py-24">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
            <header className="mb-8">
              <p className="text-sm uppercase tracking-widest text-indigo-200/80">
                Company
              </p>
              <h1 className="mt-1 text-4xl font-extrabold leading-tight text-white">
                Sense G.K.
              </h1>
              <p className="mt-2 text-indigo-100/85">
                Building better meetings with thoughtful software.
              </p>
            </header>

            <dl className="divide-y divide-white/10">
              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Legal Name</dt>
                <dd className="sm:col-span-2 font-medium">Sense G.K.</dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Representative Director</dt>
                <dd className="sm:col-span-2 font-medium">Yu Adachi</dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Registered Address</dt>
                <dd className="sm:col-span-2">
                  <div className="font-medium">
                    Concieria Shiba-Koen 405, Minato-ku, Tokyo, Japan
                  </div>
                  {/* If you also want to show the former Shimbashi office, keep it here as "Mailing" etc. */}
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Support Contact</dt>
                <dd className="sm:col-span-2 space-y-1">
                  <div>
                    <Link
                      href="/support"
                      className="font-medium text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 hover:text-white hover:decoration-indigo-300"
                    >
                      https://www.sense-ai.world/support
                    </Link>
                  </div>
                  <div>
                    <a
                      href="mailto:support@sense-ai.world"
                      className="font-medium text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 hover:text-white hover:decoration-indigo-300"
                    >
                      support@sense-ai.world
                    </a>
                  </div>
                  <div>
                    <a
                      href="tel:+817031057815"
                      className="font-medium text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 hover:text-white hover:decoration-indigo-300"
                    >
                      +81 70 3105 7815
                    </a>
                  </div>
                </dd>
              </div>
            </dl>
          </section>

          {/* Footer links required previously (optional but handy) */}
          <nav className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-6 text-indigo-200/80">
            <Link href="/support" className="hover:text-white">/support</Link>
            <Link href="/privacy-policy" className="hover:text-white">/privacy-policy</Link>
            <Link href="/terms-of-use" className="hover:text-white">/terms-of-use</Link>
          </nav>

          {/* Footer note (subtle) */}
          <p className="mt-6 text-center text-xs text-indigo-200/70">
            © {new Date().getFullYear()} Sense G.K. All rights reserved.
          </p>
        </main>
      </div>
    </>
  );
}

// Build-time props for canonical/OG URLs
export async function getStaticProps() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  return { props: { siteUrl }, revalidate: 600 };
}
