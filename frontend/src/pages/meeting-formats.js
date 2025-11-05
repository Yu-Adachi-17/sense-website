// src/pages/meeting-formats.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { apiFetch } from "../lib/apiClient";
import HomeIcon from "./homeIcon";

const SITE_URL = "https://www.sense-ai.world";

// 柔らかい多層シャドウ
const cardShadow =
  "0 1px 1px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.06)";

// 表示名（バックエンド差異を吸収）
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

// カード下に出す「主な主要項目」(英語ラベル)
// ※3つに絞って要点が伝わるものを選定
const FORMAT_FEATURES = {
  general: ["discussion", "decisions", "actionItems"],
  brainStorming: ["coreProblem", "topIdea", "ideaTable"],
  jobInterview: ["motivation", "careerSummary", "strengths"],
  lecture: ["procedures", "examples", "tips"],
  logical1on1: ["pastPositive", "pastNegative", "futurePositive"],
  negotiation: ["proposals", "keyDiscussion", "decisionsAndTasks"],
  presentation: ["coreProblem", "proposal", "expectedResult"],
  flexible: ["free-form", "sections", "summary"],
};

// “チップ”の見た目
const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  color: "#0A84FF",
  background:
    "linear-gradient(180deg, rgba(10,132,255,0.08) 0%, rgba(10,132,255,0.02) 100%)",
  border: "0.5px solid rgba(10,132,255,0.35)",
  backdropFilter: "saturate(180%) blur(2px)",
};

export default function MeetingFormatsPage() {
  const router = useRouter();
  const { i18n } = useTranslation();

  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");

  // dir 切替
  useEffect(() => {
    document.documentElement.setAttribute(
      "dir",
      i18n.language === "ar" ? "rtl" : "ltr"
    );
  }, [i18n.language]);

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
        const res = await apiFetch(`/api/formats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        let list = [];

        if (Array.isArray(json?.formats)) {
          list = json.formats.map((f) => ({
            id: f?.id,
            displayName:
              DISPLAY_NAMES[f?.id] || f?.displayName || f?.titleKey || f?.id,
            schemaId: "", // 表示しない
            deprecated: !!f?.deprecated,
          }));
        } else if (json?.formats && typeof json.formats === "object") {
          list = Object.entries(json.formats).map(([id, meta]) => ({
            id,
            displayName: DISPLAY_NAMES[id] || meta?.displayName || id,
            schemaId: "",
            deprecated: !!meta?.deprecated,
          }));
        }

        // 廃止は後ろ
        list.sort((a, b) => Number(a.deprecated) - Number(b.deprecated));
        if (!abort) setFormats(list);
      } catch (e) {
        if (!abort) setError(String(e?.message || e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const pick = (id, meta) => {
    const selected = {
      id,
      displayName: meta?.displayName || DISPLAY_NAMES[id] || id,
      schemaId: "",
      selected: true,
    };
    localStorage.setItem("selectedMeetingFormat", JSON.stringify(selected));
    setCurrent(selected);
    router.push("/"); // 録音UIへ戻る
  };

  const pageTitle = "Choose a Format";

  return (
    <>
      <Head>
        <title>{pageTitle} — Minutes.AI</title>
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={`${SITE_URL}/meeting-formats`} />
      </Head>

      <main
        style={{
          backgroundColor: "#ffffff",
          minHeight: "100vh",
          padding: 20,
          color: "#111111",
        }}
      >
        {/* ===== ヘッダー（縦スタック）: Icon → Title → Grid ===== */}
        <div style={{ display: "grid", rowGap: 12, marginBottom: 18 }}>
          {/* HomeIcon（参考のサイズ/シャドー） */}
          <button
            onClick={() => router.back()}
            aria-label="Back"
            title="Back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(0,0,0,0.04)",
              color: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              boxShadow:
                "0 1px 1px rgba(0,0,0,0.05), 0 6px 14px rgba(0,0,0,0.07)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 120ms ease, color 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.07)";
              e.currentTarget.style.color = "#111111";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.04)";
              e.currentTarget.style.color = "rgba(0,0,0,0.75)";
            }}
          >
            <HomeIcon size={28} />
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 3.2vw, 36px)",
              letterSpacing: "-0.02em",
              fontWeight: 800,
            }}
          >
            {pageTitle}
          </h1>
        </div>

        {loading && (
          <div
            style={{
              padding: 16,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              boxShadow: cardShadow,
              marginBottom: 16,
            }}
          >
            Loading…
          </div>
        )}

        {error && (
          <div
            style={{
              padding: 16,
              background: "#ffffff",
              border: "1px solid rgba(255,0,0,0.2)",
              borderRadius: 12,
              color: "#b00020",
              boxShadow: cardShadow,
              marginBottom: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            Failed to load formats: {error}
          </div>
        )}

        {!loading && !error && Array.isArray(formats) && formats.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginTop: 6,
              justifyContent: "start",
            }}
          >
            {formats.map((meta) => {
              const id = meta?.id;
              const display = meta?.displayName || DISPLAY_NAMES[id] || id;
              const isDeprecated = !!meta?.deprecated;
              const isCurrent = current?.id === id;
              const chips = FORMAT_FEATURES[id] || [];

              return (
                <button
                  key={id}
                  onClick={() => pick(id, meta)}
                  aria-disabled={isDeprecated}
                  aria-pressed={isCurrent}
                  title={isDeprecated ? "Deprecated format" : undefined}
                  style={{
                    position: "relative",
                    backgroundColor: "#ffffff",
                    border: isCurrent
                      ? "2px solid #0A84FF"
                      : "1px solid rgba(0,0,0,0.04)",
                    borderRadius: 16,
                    padding: 18,
                    color: "#111111",
                    textAlign: "left",
                    cursor: isDeprecated ? "not-allowed" : "pointer",
                    boxShadow: cardShadow,
                    transition:
                      "transform 120ms ease, box-shadow 120ms ease, border 120ms ease",
                    userSelect: "none",
                    display: "grid",
                    alignContent: "start",
                    justifyItems: "start",
                    height: "clamp(160px, 20vh, 220px)",
                    rowGap: 10,
                    opacity: isDeprecated ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 2px 2px rgba(0,0,0,0.06), 0 10px 18px rgba(0,0,0,0.10), 0 18px 30px rgba(0,0,0,0.08)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = cardShadow;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* タイトル（大きめ） */}
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{display}</div>

                  {/* 主な項目（3つのチップ） */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {chips.slice(0, 3).map((c) => (
                      <span key={c} style={chipStyle}>
                        {c}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {!loading && !error && Array.isArray(formats) && formats.length === 0 && (
          <div
            style={{
              padding: 16,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              boxShadow: cardShadow,
              marginTop: 6,
            }}
          >
            No formats found.
          </div>
        )}
      </main>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
    revalidate: 60,
  };
}
