// src/pages/meeting-formats.js
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { RxArrowLeft } from "react-icons/rx";
import { apiFetch } from "../lib/apiClient";

const SITE_URL = "https://www.sense-ai.world";

/* iOSライト風のカード影（minutes-listと同一） */
const cardShadow =
  "0 1px 1px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.06)";

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
  const { t, i18n } = useTranslation();

  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");

  // dir 切替（minutes-list と同一）
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

  // registry 読み込み（/api/formats → 配列/オブジェクト両対応）
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
            schemaId: f?.schemaId || f?.schema || "",
            deprecated: !!f?.deprecated,
          }));
        } else if (json?.formats && typeof json.formats === "object") {
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
    return () => {
      abort = true;
    };
  }, []);

  const pick = (id, meta) => {
    const selected = {
      id,
      displayName: meta?.displayName || DISPLAY_NAMES[id] || id,
      schemaId: meta?.schemaId || "",
      selected: true,
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

      {/* Minutes List と同じ基調（白 / 余白20 / 黒テキスト） */}
      <main
        style={{
          backgroundColor: "#ffffff",
          minHeight: "100vh",
          padding: 20,
          color: "#111111",
        }}
      >
        {/* Header（Back矢印含む） */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "none",
                border: "none",
                color: "#111111",
                fontSize: 24,
                cursor: "pointer",
                marginRight: 10,
              }}
              aria-label="Back"
            >
              <RxArrowLeft />
            </button>
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
          <div>
            <Link href="/" legacyBehavior>
              <a
                style={{
                  backgroundColor: "#F2F2F7",
                  color: "#111111",
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 16,
                  textDecoration: "none",
                }}
              >
                Home
              </a>
            </Link>
          </div>
        </div>

        {/* 現在の選択（カード調） */}
        {current?.id && (
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.04)",
              borderRadius: 16,
              padding: 14,
              backgroundColor: "#ffffff",
              marginBottom: 16,
              boxShadow: cardShadow,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 12,
                backgroundColor: "#F2F2F7",
                border: "1px solid rgba(0,0,0,0.08)",
                padding: "4px 8px",
                borderRadius: 999,
              }}
            >
              {t("Current")}
            </span>
            <div style={{ fontWeight: 700 }}>{current.displayName}</div>
            {current.schemaId ? (
              <div style={{ opacity: 0.7 }}>({current.schemaId})</div>
            ) : null}
          </div>
        )}

        {/* 状態表示（minutes-list と同じ白カード） */}
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

        {/* グリッド（minutes-list のレイアウト感に寄せる） */}
        {!loading && !error && Array.isArray(formats) && formats.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(23vw, 23vw))",
              gap: 16,
              marginTop: 6,
              justifyContent: "start",
            }}
          >
            {formats.map((meta) => {
              const id = meta?.id;
              const display = meta?.displayName || DISPLAY_NAMES[id] || id;
              const schema = meta?.schemaId || "—";
              const isDeprecated = !!meta?.deprecated;
              const isCurrent = current?.id === id;

              return (
                <button
                  key={id}
                  onClick={() => pick(id, meta)}
                  aria-disabled={isDeprecated}
                  title={isDeprecated ? "Deprecated format" : undefined}
                  style={{
                    backgroundColor: "#ffffff",
                    border: isCurrent
                      ? "2px solid #0A84FF"
                      : "1px solid rgba(0,0,0,0.04)",
                    borderRadius: 16,
                    padding: 16,
                    color: "#111111",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: cardShadow,
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    userSelect: "none",
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "start",
                    height: "clamp(140px, 18vh, 200px)",
                    rowGap: 6,
                    opacity: isDeprecated ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 2px 2px rgba(0,0,0,0.06), 0 10px 18px rgba(0,0,0,0.10), 0 18px 30px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = cardShadow;
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {display}{" "}
                    {isDeprecated ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginLeft: 6,
                          opacity: 0.7,
                        }}
                      >
                        (Deprecated)
                      </span>
                    ) : null}
                  </div>
                  {isCurrent && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        backgroundColor: "#F2F2F7",
                        border: "1px solid rgba(0,0,0,0.08)",
                        padding: "4px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {t("Selected")}
                    </div>
                  )}
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
