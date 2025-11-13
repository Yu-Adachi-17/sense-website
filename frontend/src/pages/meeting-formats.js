// src/pages/meeting-formats.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { apiFetch } from "../lib/apiClient";
import HomeIcon from "./homeIcon";

const SITE_URL = "https://www.sense-ai.world";

/* iOSライト風のカード影（minutes-list と同じ） */
const cardShadow =
  "0 1px 1px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.06)";

/** 英語フォールバック表示名（翻訳が無い場合はこれ） */
const DISPLAY_NAME_FALLBACK = {
  general: "General",
  negotiation: "Business Negotiation",
  presentation: "Presentation",
  logical1on1: "Logical 1-on-1",
  brainstorming: "Brainstorming",
  jobInterview: "Job Interview",
  lecture: "Lecture",
  flexible: "Flexible",
};

/** API/過去資産由来の揺れを吸収 */
const normalizeId = (id) => {
  if (!id) return id;
  // brainStorming → brainstorming などの歴史的揺れを吸収
  if (id === "brainStorming") return "brainstorming";
  return id;
};

/** 中項目ラベル → できるだけ既存の minutes.* キーに寄せる */
const FEATURE_LABEL_KEYS = {
  general: ["minutes.discussion", "minutes.decisions", "minutes.actionItems"],
  brainstorming: [
    "minutes.brainstorming.problemToSolve",
    "minutes.brainstorming.topIdea",
    "minutes.brainstorming.allIdeas",
  ],
  jobInterview: [
    "minutes.jobInterview.motivation",
    "minutes.jobInterview.careerSummary",
    "minutes.jobInterview.strengths",
  ],
  lecture: [
    "minutes.lecture.procedures",
    "minutes.lecture.examplesAndScenarios",
    "minutes.lecture.tipsAndInsights",
  ],
  logical1on1: [
    "minutes.oneonone.recentSuccess",
    "minutes.oneonone.challengeFaced",
    "minutes.oneonone.futureExpectation",
  ],
  negotiation: [
    "minutes.proposals",
    "minutes.decisionsAndTasks",
    "minutes.keyDiscussion",
  ],
  presentation: [
    "minutes.coreProblem",
    "minutes.proposal",
    "minutes.expectedResult",
  ],
  flexible: ["minutes.overview", "minutes.sections", "minutes.summary"],
};

export default function MeetingFormatsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation("common");

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
            deprecated: !!f?.deprecated,
          }));
        } else if (json?.formats && typeof json.formats === "object") {
          list = Object.keys(json.formats).map((id) => ({
            id,
            deprecated: !!json.formats[id]?.deprecated,
          }));
        }

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
    const displayName = getDisplayName(id, t, i18n);
    const selected = { id, displayName, selected: true };
    localStorage.setItem("selectedMeetingFormat", JSON.stringify(selected));
    setCurrent(selected);
    router.push("/"); // 録音UIへ戻る
  };

  /** i18n優先の表示名（formats.{id} or formats.{normalized} → 無ければ英語フォールバック） */
  const getDisplayName = (id, tfn, i18nInst) => {
    const nid = normalizeId(id);
    const k1 = `formats.${id}`;
    const k2 = `formats.${nid}`;

    if (i18nInst?.exists?.(k1, { ns: "common" })) {
      return tfn(k1);
    }
    if (k2 !== k1 && i18nInst?.exists?.(k2, { ns: "common" })) {
      return tfn(k2);
    }
    return DISPLAY_NAME_FALLBACK[nid] || DISPLAY_NAME_FALLBACK[id] || nid || id;
  };

  /** 中項目3行を取得（各キーが無い場合は英語フォールバック単語にする） */
  const getFeatureLines = (id, tfn) => {
    const nid = normalizeId(id);
    const fallbacks = {
      negotiation: ["proposals", "decisions & tasks", "key discussion"],
      presentation: ["core problem", "proposal", "expected result"],
    };
    const keys = FEATURE_LABEL_KEYS[nid] || [];
    return keys.slice(0, 3).map((k, idx) => {
      if (!k) {
        const fb = (fallbacks[nid] || [])[idx] || "";
        return fb ? capitalize(fb) : "";
      }
      return tfn(k, { defaultValue: labelFallbackFromKey(k) });
    });
  };

  const labelFallbackFromKey = (k) => {
    // minutes.* の最後のセグメントを英語化
    const last = k.split(".").pop() || "";
    const map = {
      discussion: "Discussion",
      decisions: "Decisions",
      actionItems: "Action Items",
      problemToSolve: "Problem to Solve",
      topIdea: "Top Idea",
      allIdeas: "All Ideas",
      motivation: "Motivation",
      careerSummary: "Career Summary",
      strengths: "Strengths",
      procedures: "Procedures",
      examplesAndScenarios: "Examples",
      tipsAndInsights: "Tips",
      recentSuccess: "Recent Success",
      challengeFaced: "Challenge",
      futureExpectation: "Future Expectation",
      decisionsAndTasks: "Decisions & Tasks",
      summary: "Summary",
      overview: "Overview",
      sections: "Sections",
    };
    return map[last] || capitalize(last.replace(/([A-Z])/g, " $1"));
  };

  const capitalize = (s) =>
    (s || "").charAt(0).toUpperCase() + (s || "").slice(1);

  const pageTitle = t("Choose a Format", { defaultValue: "Choose a Format" });

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
        {/* ヘッダー（縦：Icon → Title） */}
        <div style={{ display: "grid", rowGap: 12, marginBottom: 18 }}>
          <button
            onClick={() => router.back()}
            aria-label={t("Home", { defaultValue: "Home" })}
            title={t("Home", { defaultValue: "Home" })}
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
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {t("Loading...", { defaultValue: "Loading..." })}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: 16,
              border: "1px solid rgba(255,0,0,0.2)",
              borderRadius: 12,
              color: "#b00020",
              marginBottom: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            {t("Load error", { defaultValue: "Load error" })}: {error}
          </div>
        )}

        {!loading && !error && Array.isArray(formats) && formats.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
              marginTop: 6,
              justifyContent: "start",
            }}
          >
            {formats.map((meta) => {
              const rawId = meta?.id;
              const id = normalizeId(rawId);
              const isDeprecated = !!meta?.deprecated;
              const isCurrent = current?.id === rawId || current?.id === id;
              const title = getDisplayName(rawId, t, i18n);
              const lines = getFeatureLines(rawId, t);

              return (
                <button
                  key={rawId || id}
                  onClick={() => pick(rawId, meta)}
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
                    padding: 16,
                    color: "#111111",
                    textAlign: "left",
                    cursor: isDeprecated ? "not-allowed" : "pointer",
                    boxShadow: cardShadow,
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    userSelect: "none",
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "start",
                    minHeight: "210px", // minutes-list のカードと合わせる
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
                  {/* タイトル */}
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 20,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      wordBreak: "break-word",
                    }}
                  >
                    {title}
                  </div>

                  {/* 中項目（3行） + “ … ” */}
                  <div style={{ display: "grid", rowGap: 6 }}>
                    {lines.map((label, i) =>
                      label ? (
                        <div
                          key={`${id}-${i}`}
                          style={{
                            fontSize: 15,
                            lineHeight: 1.35,
                            color: "rgba(0,0,0,0.72)",
                            fontWeight: 600,
                          }}
                        >
                          {label}
                        </div>
                      ) : null
                    )}
                    <div
                      style={{
                        fontSize: 14,
                        color: "rgba(0,0,0,0.45)",
                        fontWeight: 600,
                      }}
                    >
                      …
                    </div>
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
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              marginTop: 6,
            }}
          >
            {t("No data available", { defaultValue: "No data available" })}
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
