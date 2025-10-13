// src/pages/meeting-formats.js
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";

const SITE_URL = "https://www.sense-ai.world";

// 常用表示名（バックエンドの titleKey/schema の差異を吸収）
const DISPLAY_NAMES = {
  general: "General",
  negotiation: "Business Negotiation",
  presentation: "Presentation",
  logical1on1: "Logical 1-on-1",
  brainStorming: "Brainstorming",
  jobInterview: "Job Interview",
  lecture: "Lecture",
  flexible: "Flexible",
};

export default function MeetingFormatsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [formats, setFormats] = useState([]);  // ← 配列で保持
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

  // registry 読み込み（/api/formats → 配列/オブジェクト両対応）
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/formats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        let list = [];

        // バックエンド仕様：{ formats: [...] }（配列）を想定
        if (Array.isArray(json?.formats)) {
          list = json.formats.map((f) => ({
            id: f?.id,
            displayName: DISPLAY_NAMES[f?.id] || f?.displayName || f?.titleKey || f?.id,
            schemaId: f?.schemaId || f?.schema || "",
            deprecated: !!f?.deprecated,
          }));
        } else if (json?.formats && typeof json.formats === "object") {
          // 互換（オブジェクトの場合）
          list = Object.entries(json.formats).map(([id, meta]) => ({
            id,
            displayName: DISPLAY_NAMES[id] || meta?.displayName || id,
            schemaId: meta?.schemaId || meta?.schema || "",
            deprecated: !!meta?.deprecated,
          }));
        }

        // 廃止は後ろに・現役優先で並べ替え
        list.sort((a, b) => Number(a.deprecated) - Number(b.deprecated));

        if (!abort) setFormats(list);
      } catch (e) {
        if (!abort) setError(String(e?.message || e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  const pick = (id, meta) => {
    const selected = {
      id,
      displayName: meta?.displayName || DISPLAY_NAMES[id] || id,
      schemaId: meta?.schemaId || "",
      selected: true
    };
    localStorage.setItem("selectedMeetingFormat", JSON.stringify(selected));
    setCurrent(selected);
    router.push("/"); // 録音UIへ戻る
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
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
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

          {!loading && !error && Array.isArray(formats) && formats.length > 0 && (
            <div style={{
              display:'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16
            }}>
              {formats.map((meta) => {
                const id = meta?.id;
                const display = meta?.displayName || DISPLAY_NAMES[id] || id;
                const schema = meta?.schemaId || '—';
                const isDeprecated = !!meta?.deprecated;
                return (
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
                      gap:6,
                      opacity: isDeprecated ? 0.5 : 1
                    }}
                    aria-disabled={isDeprecated}
                    title={isDeprecated ? 'Deprecated format' : undefined}
                  >
                    <span style={{ fontWeight:700, fontSize:14 }}>
                      {display} {isDeprecated ? "(Deprecated)" : ""}
                    </span>
                    <span style={{ fontSize:12, opacity:0.7 }}>{schema}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && !error && Array.isArray(formats) && formats.length === 0 && (
            <div style={{
              padding: 24,
              background:'#fff',
              border:'1px solid rgba(0,0,0,0.08)',
              borderRadius: 12
            }}>
              No formats found.
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
