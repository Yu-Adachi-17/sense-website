// src/pages/company.js
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

const inter = Inter({ subsets: ["latin"] });

export default function Company({ siteUrl }) {
  const orgUrl = `${siteUrl}/company`;
  const supportUrl = `${siteUrl}/support`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sense G.K.",
    legalName: "Sense G.K.",
    url: orgUrl,
    email: "info@sense-ai.world",
    founder: { "@type": "Person", name: "Yu Adachi" },
    address: {
      "@type": "PostalAddress",
      streetAddress: "6-15-1 Shimbashi 4F Room 405",
      addressLocality: "Minato-ku",
      addressRegion: "Tokyo",
      addressCountry: "JP",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "info@sense-ai.world",
        telephone: "+817031057815",
        url: supportUrl,
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
          content="Company information for Sense G.K. — leadership, address, and contact details."
        />
        <link rel="canonical" href={orgUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Company — Sense G.K." />
        <meta
          property="og:description"
          content="Company information for Sense G.K. — leadership, address, and contact details."
        />
        <meta property="og:url" content={orgUrl} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      {/* Background */}
      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* Home icon */}
        <div className="pointer-events-none fixed left-5 top-5 z-50">
          <Link
            href="/"
            aria-label="Back to Home"
            className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>
        </div>

        {/* Content */}
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
                <dt className="text-indigo-200/80">Established</dt>
                <dd className="sm:col-span-2 font-medium">September 2025</dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Capital</dt>
                <dd className="sm:col-span-2 font-medium">JPY 100,000</dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Business Description</dt>
                <dd className="sm:col-span-2 font-medium">
                  Planning and development of software services.
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Address</dt>
                <dd className="sm:col-span-2">
                  <div className="font-medium">
                    4F Room 405, 6-15-1 Shimbashi, Minato-ku, Tokyo, Japan
                  </div>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Contact</dt>
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
                      href="mailto:info@sense-ai.world"
                      className="font-medium text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 hover:text-white hover:decoration-indigo-300"
                    >
                      info@sense-ai.world
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

          {/* Footer */}
          <footer className="pageFooter" role="contentinfo">
            <div className="footInner">
              <div className="legal">
                <a href="/terms-of-use" className="legalLink">Terms of Use</a>
                <span className="sep">·</span>
                <a href="/privacy-policy" className="legalLink">Privacy Policy</a>
                <span className="sep">·</span>
                <a href="/company" className="legalLink">Company</a>
              </div>
              <div className="copyright">
                &copy; {new Date().getFullYear()} Sense G.K. All Rights Reserved
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Scoped footer styles */}
      <style jsx>{`
        .pageFooter { position:relative; z-index:3; padding:20px 22px 28px; border-top:1px solid rgba(255,255,255,0.06); background: linear-gradient(0deg, rgba(10,14,28,0.6) 0%, rgba(10,14,28,0.3) 100%); color:#eaf4f7; margin-top:16px; }
        .footInner { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .legal { display:flex; gap:12px; align-items:center; font-size:13px; opacity:0.7; }
        .legalLink { color:#ffffff; text-decoration:none; }
        .legalLink:hover { text-decoration:underline; }
        .sep { opacity:0.55; }
        .copyright { font-size:13px; opacity:0.7; white-space:nowrap; }
        @media (max-width:640px) { .footInner { flex-direction:column; gap:8px; } }
      `}</style>
    </>
  );
}

// ✅ ローカライズ対応版 getStaticProps
export async function getStaticProps({ locale }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
      siteUrl,
    },
    revalidate: 60,
  };
}
