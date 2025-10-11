// src/pages/terms-of-use.js  （または pages/terms-of-use.js）
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Inter } from "next/font/google";
import HomeIcon from "./homeIcon";

const inter = Inter({ subsets: ["latin"] });

export default function TermsOfUse({ siteUrl }) {
  return (
    <>
      <Head>
        <title>Terms of Use — Minutes.AI</title>
        <meta
          name="description"
          content="Terms of Use for Minutes.AI. Please read these terms carefully before using the service."
        />
        <link rel="canonical" href={`${siteUrl}/terms-of-use`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Terms of Use — Minutes.AI" />
        <meta
          property="og:description"
          content="Terms of Use for Minutes.AI. Please read these terms carefully before using the service."
        />
        <meta property="og:url" content={`${siteUrl}/terms-of-use`} />
        <meta property="og:image" content={`${siteUrl}/images/hero-phone.png`} />
      </Head>

      {/* Background (same vibe as /company) */}
      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* HomeIcon (top-left, click to go Home) */}
        <div className="pointer-events-none fixed left-5 top-5 z-50">
          <Link
            href="/"
            aria-label="Back to Home"
            className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>
        </div>

        {/* Content card */}
        <main className="mx-auto max-w-3xl px-6 py-24">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
            <h1 className="text-4xl font-extrabold leading-tight text-white">Terms of Use</h1>

            <h2 className="mt-8 text-2xl font-bold">1. Introduction</h2>
            <p className="mt-2 text-indigo-100/90">
              These terms define the conditions for using the Meeting Minutes AI (hereinafter referred to as
              &quot;the Service&quot;). By using the Service, users agree to these terms.
            </p>

            <h2 className="mt-8 text-2xl font-bold">2. Usage Conditions</h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>The Service can be used by both individuals and corporations.</li>
              <li>Users must use the Service in a lawful and appropriate manner.</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">3. Prohibited Actions</h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>Illegally collecting or using other users’ personal information</li>
              <li>Unauthorized access to the Service’s system</li>
              <li>Interfering with the operation of the Service</li>
              <li>Actions that violate laws or public order and morals</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">4. Account Management</h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>Users may delete their accounts at any time.</li>
              <li>Users are responsible for managing their account information.</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">5. Disclaimer</h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-indigo-100/90">
              <li>
                As the Service uses AI for automatic generation, it does not guarantee the accuracy or completeness
                of the output.
              </li>
              <li>The Service provider is not responsible for any damages resulting from the use of the Service.</li>
              <li>The Service may be temporarily unavailable due to technical issues.</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold">6. Service Modification and Termination</h2>
            <p className="mt-2 text-indigo-100/90">
              The Service provider may change, suspend, or terminate the Service without prior notice to users.
            </p>

            <h2 className="mt-8 text-2xl font-bold">7. Governing Law and Jurisdiction</h2>
            <p className="mt-2 text-indigo-100/90">
              These terms are governed by the laws of the Service provider’s location. Any disputes will be under the
              exclusive jurisdiction of the courts at the provider’s location.
            </p>

            <h2 className="mt-8 text-2xl font-bold">8. Contact Information</h2>
            <p className="mt-2 text-indigo-100/90">
              For inquiries regarding these terms, please contact us at the following email address:
            </p>
            <p className="mt-1 font-bold text-indigo-50">[info@sense-ai.world]</p>
          </section>
        </main>
      </div>
    </>
  );
}

// ✅ getStaticProps（型注釈なし、ISR有効）
export const getStaticProps = async () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  return { props: { siteUrl }, revalidate: 600 };
};
