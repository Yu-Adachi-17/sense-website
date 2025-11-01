// src/pages/transactions-law.js
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

export default function TransactionsLaw({ siteUrl }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Legal Notice — Act on Specified Commercial Transactions",
    url: `${siteUrl}/transactions-law`,
    isPartOf: {
      "@type": "Organization",
      name: "Sense G.K.",
      url: siteUrl,
      email: "info@sense-ai.world",
    },
  };

  return (
    <>
      <Head>
        <title>Legal Notice — Act on Specified Commercial Transactions</title>
        <meta
          name="description"
          content="Legal notice required by Japan’s Act on Specified Commercial Transactions for Sense G.K."
        />
        <link rel="canonical" href={`${siteUrl}/transactions-law`} />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Legal Notice — Act on Specified Commercial Transactions"
        />
        <meta
          property="og:description"
          content="Legal notice required by Japan’s Act on Specified Commercial Transactions for Sense G.K."
        />
        <meta property="og:url" content={`${siteUrl}/transactions-law`} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      {/* Background (match site look & feel) */}
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

        {/* Content */}
        <main className="mx-auto max-w-3xl px-6 py-24">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
            <header className="mb-8">
              <p className="text-sm uppercase tracking-widest text-indigo-200/80">
                Legal
              </p>
              <h1 className="mt-1 text-4xl font-extrabold leading-tight text-white">
                Legal Notice (Act on Specified Commercial Transactions — Japan)
              </h1>
              <p className="mt-2 text-indigo-100/85">
                This page provides the disclosures required under Japan’s Act on
                Specified Commercial Transactions.
              </p>
            </header>

            <dl className="divide-y divide-white/10">
              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Seller (Business Name)</dt>
                <dd className="sm:col-span-2 font-medium">Sense G.K.</dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Location</dt>
                <dd className="sm:col-span-2">
                  <div className="font-medium">
                    Disclosed without delay upon request.
                  </div>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Phone Number</dt>
                <dd className="sm:col-span-2">
                  <div className="font-medium">
                    Disclosed without delay upon request.
                  </div>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Email</dt>
                <dd className="sm:col-span-2">
                  <a
                    href="mailto:info@sense-ai.world"
                    className="font-medium text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 hover:text-white hover:decoration-indigo-300"
                  >
                    info@sense-ai.world
                  </a>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Responsible Officer</dt>
                <dd className="sm:col-span-2 font-medium">Yu Adachi</dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Accepted Payment Methods</dt>
                <dd className="sm:col-span-2 font-medium">Credit Card</dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Pricing</dt>
                <dd className="sm:col-span-2">
                  <ul className="list-disc pl-5">
                    <li className="font-medium">Trial: $1.99</li>
                    <li className="font-medium">Light: $11.99</li>
                    <li className="font-medium">Monthly Subscription: $17.99</li>
                    <li className="font-medium">Annual Subscription: $149.99</li>
                  </ul>
                  <p className="mt-2 text-sm text-indigo-200/80">
                    All prices are shown in USD.
                  </p>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">
                  Additional Fees or Charges
                </dt>
                <dd className="sm:col-span-2 font-medium">
                  No additional fees are charged.
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Returns / Refund Policy</dt>
                <dd className="sm:col-span-2">
                  <p className="font-medium">
                    Due to the nature of digital services, purchases are
                    generally non-refundable. However, we will address verified
                    technical issues on a case-by-case basis.
                  </p>
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Delivery Timing</dt>
                <dd className="sm:col-span-2 font-medium">
                  Service becomes available immediately after successful
                  payment.
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Payment Timing</dt>
                <dd className="sm:col-span-2 font-medium">
                  Credit card payments are processed immediately.
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-3">
                <dt className="text-indigo-200/80">Support Hours</dt>
                <dd className="sm:col-span-2 font-medium">
                  Email support: Weekdays 9:00–18:00 (JST)
                </dd>
              </div>
            </dl>
          </section>

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
