// src/pages/meeting-formats.js
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";

const SITE_URL = "https://www.sense-ai.world";

// API base（index.js と同一ロジック）
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE
  || (process.env.NODE_ENV === 'development'
      ? 'http://localhost:5001'
      : 'https://sense-website-production.up.railway.app');

export default function MeetingFormatsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");

  // 現在の選択（localStorage）
  useEffect(() => {
    try {
      const s = localStorage.getItem("selectedMeetingFormat");
      if (s) setCurrent(JSON.parse(s));
    } catch {}
  }, []);

  // registry 読み込み
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/formats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json(); // { formats: { id: {schemaId, displayName}, ... } }
        if (!abort) setRegistry(json?.formats || {});
      } catch (e) {
        if (!abort) setError(String(e?.message || e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  const pick = (id, meta) => {
    const selected = { id, displayName: meta?.displayName || id, schemaId: meta?.schemaId || "" , selected: true };
    localStorage.setItem("selectedMeetingFormat", JSON.stringify(selected));
    setCurrent(selected);
    // 遷移：ホームに戻る（録音UI側に反映）
    router.push("/");
  };

  const title = "Choose a Minutes Format";

  return (
    <>
      <Head>
        <title>{title} — Minutes.AI</title>
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={`${SITE_URL}/meeting-formats`} />
      </Head>

      <main
        style={{
          minHeight: '100vh',
          background: '#F8F7F4',
          padding: '40px 20px',
        }}
      >
        <div style={{
          maxWidth: 960,
          margin: '0 auto'
        }}>
          <div style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            marginBottom: 24
          }}>
            <h1 style={{ margin:0, fontSize: 24, letterSpacing: 0.2 }}>{title}</h1>
            <Link href="/" legacyBehavior>
              <a style={{ fontSize: 13, color:'#111', textDecoration:'none', opacity:0.8 }}>
                ← Back
              </a>
            </Link>
          </div>

          {current?.id && (
            <div style={{
              marginBottom: 24,
              padding:'10px 12px',
              borderRadius: 12,
              background:'#fff',
              border:'1px solid rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Current selection</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:14 }}>
                <strong>{current.displayName}</strong>
                <span style={{ opacity:0.6 }}>({current.schemaId || '—'})</span>
              </div>
            </div>
          )}

          {loading && (
            <div style={{
              padding: 24,
              background:'#fff',
              border:'1px solid rgba(0,0,0,0.08)',
              borderRadius: 12
            }}>Loading…</div>
          )}

          {error && (
            <div style={{
              padding: 24,
              background:'#fff',
              border:'1px solid rgba(255,0,0,0.2)',
              borderRadius: 12,
              color: '#b00020'
            }}>
              Failed to load formats: {error}
            </div>
          )}

          {!loading && !error && registry && (
            <div style={{
              display:'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16
            }}>
              {Object.entries(registry).map(([id, meta]) => (
                <button
                  key={id}
                  onClick={() => pick(id, meta)}
                  style={{
                    textAlign:'left',
                    padding:16,
                    borderRadius:16,
                    border:'1px solid rgba(0,0,0,0.08)',
                    background:'#fff',
                    cursor:'pointer',
                    display:'flex',
                    flexDirection:'column',
                    gap:6
                  }}
                >
                  <span style={{ fontWeight:700, fontSize:14 }}>{meta?.displayName || id}</span>
                  <span style={{ fontSize:12, opacity:0.7 }}>{meta?.schemaId || '—'}</span>
                </button>
              ))}
            </div>
          )}

          <p style={{ marginTop: 20, fontSize: 12, opacity: 0.6 }}>
            The selected format will be saved locally and used when generating minutes.
          </p>
        </div>
      </main>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
    revalidate: 60,
  };
}
