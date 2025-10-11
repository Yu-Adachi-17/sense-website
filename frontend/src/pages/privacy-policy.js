// src/pages/privacy-policy.js  （または pages/privacy-policy.js）
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

export default function PrivacyPolicy({ siteUrl }) {
  return (
    <>
      <Head>
        <title>Privacy Policy — Minutes.AI</title>
        <meta
          name="description"
          content="Privacy Policy for Minutes.AI. Learn what data we collect, why we use it, and how we protect it."
        />
        <link rel="canonical" href={`${siteUrl}/privacy-policy`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Privacy Policy — Minutes.AI" />
        <meta
          property="og:description"
          content="Privacy Policy for Minutes.AI. Learn what data we collect, why we use it, and how we protect it."
        />
        <meta property="og:url" content={`${siteUrl}/privacy-policy`} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
      </Head>

      {/* Background (same look & feel as /company, /terms-of-use) */}
      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* HomeIcon (top-left, link to "/") */}
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
            <h1 className="text-4xl font-extrabold leading-tight text-white">Privacy Policy</h1>

            <h2 className="mt-8 text-2xl font-bold">1. Information We Collect</h2>
            <p className="mt-2 text-indigo-100/90">
              This service (hereinafter referred to as &quot;the Service&quot;) may collect the following
              information when users use the Service:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>User email address (for account authentication)</li>
              <li>
                Meeting minutes and full-text transcripts (to synchronize across all devices using cloud
                storage)
              </li>
              <li>Data related to service usage (for service improvement)</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">2. Purpose of Information Use</h2>
            <p className="mt-2 text-indigo-100/90">The collected information will be used for the following purposes:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>Storing and synchronizing meeting minutes and full-text transcripts</li>
              <li>Managing user accounts</li>
              <li>Improving the service and addressing issues</li>
              <li>Compliance with legal requirements</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">3. Provision of Information to Third Parties</h2>
            <p className="mt-2 text-indigo-100/90">
              The Service does not sell, rent, or share user personal information with third parties. However,
              information may be disclosed under the following circumstances:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>Compliance with legal obligations</li>
              <li>Requests from public authorities (police, courts, etc.)</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">4. Data Storage and Management</h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>User personal information is securely managed using cloud services.</li>
              <li>
                Meeting minutes and full-text transcripts are synchronized across all devices to enhance user
                convenience.
              </li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">5. User Rights</h2>
            <p className="mt-2 text-indigo-100/90">Users have the following rights:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>Deleting their account and personal information</li>
              <li>Reviewing and modifying stored data</li>
              <li>Requesting the cessation of data usage</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">6. Cookies and Tracking Technologies</h2>
            <p className="mt-2 text-indigo-100/90">
              The Service may use cookies to enhance user convenience.
            </p>

            <h2 className="mt-8 text-2xl font-bold">7. Contact Information</h2>
            <p className="mt-2 text-indigo-100/90">
              For inquiries regarding this privacy policy, please contact us at the following email address:
            </p>
            <p className="mt-1 font-bold text-indigo-50">[info@sense-ai.world]</p>
          </section>
        </main>
      </div>
    </>
  );
}

// ISR + canonical/OG base url
export const getStaticProps = async () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  return { props: { siteUrl }, revalidate: 600 };
};
