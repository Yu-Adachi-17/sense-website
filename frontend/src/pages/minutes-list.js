// src/pages/minutes-list.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { RxArrowLeft } from "react-icons/rx";
import { CiSearch } from "react-icons/ci";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

// ✅ Firebase（SSR安全化）
import { getClientAuth, getDb } from "../firebaseConfig";

/* iOSライト風のカード影 */
const cardShadow =
  "0 1px 1px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.06)";

/* 複数行を「…」でカットする共通スタイル（タイトルには使わない） */
const clampTextStyle = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

/* ---------------- JSON → タイトル/日付/トピック抽出 ---------------- */
const removeInvisibles = (text) =>
  text.replace(/\uFEFF/g, "").replace(/[\u0000-\u001F\u007F]/g, "");

const cleanJSON = (json) => {
  let s = removeInvisibles(json);
  s = s.replace(/```json/gi, "").replace(/```/g, "");
  s = s.replace(/^\s*\/\/.*$/gm, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s.trim();
};

const extractJSONCandidates = (text) => {
  const candidates = [];
  const blockRe = /```json\s*([\s\S]*?)\s*```/gi;
  let m;
  while ((m = blockRe.exec(text))) candidates.push(m[1]);
  if (!candidates.length) {
    const cleaned = cleanJSON(text);
    if (/}\s*json\s*{/i.test(cleaned)) {
      const parts = cleaned.split(/}\s*json\s*{/i);
      parts.forEach((p, i) => candidates.push(i === 0 ? p + "}" : "{" + p));
    } else {
      candidates.push(cleaned);
    }
  }
  return candidates;
};

const parseMinutesJSON = (minutes) => {
  if (minutes && typeof minutes === "object") return minutes;
  const text = String(minutes ?? "").trim();
  for (const c of extractJSONCandidates(text)) {
    try {
      const obj = JSON.parse(c);
      if (obj && (obj.meetingTitle || obj.meeting_name || obj.title)) return obj;
    } catch {}
  }
  return null;
};

const formatDate = (d) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d?.toString?.() ?? "";
  }
};

const renderFromMinutes = (minutes, createdAtDate) => {
  const obj = parseMinutesJSON(minutes);
  if (obj) {
    const title = obj.meetingTitle || obj.meeting_name || obj.title || "Meeting";
    const dateStr =
      obj.date || obj.meetingDate || (createdAtDate ? formatDate(createdAtDate) : "");
    const topicsArray = Array.isArray(obj.topics)
      ? obj.topics.map((t) => t?.topic).filter(Boolean)
      : [];

    // トピックは3件まで＋全体文字数も軽く制限
    const topicsLimited = topicsArray.slice(0, 3);
    let topicsText = topicsLimited.map((t) => `• ${t}`).join("\n");
    if (topicsText.length > 180) {
      topicsText = topicsText.slice(0, 180) + "…";
    }

    return {
      ok: true,
      title,
      date: dateStr,
      topicsText,
    };
  }
  const plain = String(minutes ?? "");
  return {
    ok: false,
    fallback: plain.length <= 100 ? plain : plain.slice(0, 100) + "…",
    title: "",
    date: "",
    topicsText: "",
  };
};

/* ---------------- Item ---------------- */
const PaperItem = ({ paper, selectionMode, isSelected, toggleSelect }) => {
  const router = useRouter();
  const createdDate = paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
  const { ok, title, date, topicsText, fallback } = renderFromMinutes(
    paper.minutes,
    createdDate
  );

  const handleClick = () => {
    if (selectionMode) toggleSelect(paper.id);
    else router.push(`/minutes/${paper.id}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: "#ffffff",
        border: isSelected ? "2px solid #0A84FF" : "1px solid rgba(0,0,0,0.04)",
        borderRadius: 16,
        padding: 16,
        color: "#111111",
        textAlign: "left",
        cursor: "pointer",
        boxShadow: cardShadow,
        transition: "transform 120ms ease, box-shadow 120ms ease",
        userSelect: "none",
        lineHeight: 1.45,
        display: "grid",
        alignContent: "center",
        justifyItems: "start",
        minHeight: "210px", // 以前(140px)の約1.5倍
        rowGap: 6,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 2px 2px rgba(0,0,0,0.06), 0 10px 18px rgba(0,0,0,0.10), 0 18px 30px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = cardShadow;
      }}
    >
      {ok ? (
        <>
          {/* タイトルはフル表示（行制限なし） */}
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
          {date && (
            <div
              style={{
                fontSize: 13,
                opacity: 0.7,
              }}
            >
              {date}
            </div>
          )}
          {topicsText && (
            <div
              style={{
                fontSize: 13,
                opacity: 0.95,
                whiteSpace: "pre-wrap",
                ...clampTextStyle(4), // トピックだけは最大4行に制限
              }}
            >
              {topicsText}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            fontWeight: 700,
            whiteSpace: "pre-wrap",
            ...clampTextStyle(6), // fallbackは最大6行
          }}
        >
          {fallback}
        </div>
      )}
    </div>
  );
};

export default function MinutesList() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [papers, setPapers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // dir 切替
  useEffect(() => {
    document.documentElement.setAttribute(
      "dir",
      i18n.language === "ar" ? "rtl" : "ltr"
    );
  }, [i18n.language]);

  // 認証監視＋ユーザーの meetingRecords を購読（SSR安全）
  useEffect(() => {
    let unsubAuth;
    let unsubSnap;
    let mounted = true;

    (async () => {
      const auth = await getClientAuth(); // SSRならnull
      if (!mounted || !auth) return;

      const { onAuthStateChanged } = await import("firebase/auth");
      const { collection, query, where, orderBy, onSnapshot } = await import(
        "firebase/firestore"
      );

      unsubAuth = onAuthStateChanged(auth, async (user) => {
        // 既存購読をクリア
        if (typeof unsubSnap === "function") {
          unsubSnap();
          unsubSnap = undefined;
        }

        if (user) {
          const db = await getDb();
          if (!db) return;
          const q = query(
            collection(db, "meetingRecords"),
            where("uid", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          unsubSnap = onSnapshot(
            q,
            (qs) => {
              if (!mounted) return;
              setPapers(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
            },
            (err) => console.error("Firestore error:", err)
          );
        } else {
          setPapers([]);
        }
      });
    })();

    return () => {
      mounted = false;
      if (typeof unsubSnap === "function") unsubSnap();
      if (typeof unsubAuth === "function") unsubAuth();
    };
  }, []);

  const filteredPapers = papers.filter((p) =>
    String(p.minutes || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const groupedPapers = filteredPapers.reduce((acc, p) => {
    const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
    const key = d.toLocaleDateString();
    (acc[key] ||= []).push(p);
    return acc;
  }, {});
  const sortedDateKeys = Object.keys(groupedPapers).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleDelete = async () => {
    if (!selectedIds.length) {
      alert(t("Please select meeting records to delete."));
      return;
    }
    if (
      !window.confirm(
        t("Are you sure you want to delete? This action cannot be undone.")
      )
    )
      return;

    try {
      const db = await getDb();
      if (!db) return;
      const { deleteDoc, doc } = await import("firebase/firestore");
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "meetingRecords", id));
      }
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (e) {
      console.error(e);
      alert(t("An error occurred during deletion"));
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        padding: 20,
        color: "#111111",
      }}
    >
      {/* Header */}
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
          <h2 style={{ margin: 0 }}></h2>
        </div>
        <div>
          {selectionMode ? (
            <>
              <button
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds([]);
                }}
                style={{
                  backgroundColor: "#F2F2F7",
                  color: "#111111",
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginRight: 10,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: "#FF3B30",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 700,
                  boxShadow: "0 6px 12px rgba(255,59,48,0.2)",
                }}
              >
                {t("Delete")}
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectionMode(true)}
              style={{
                backgroundColor: "#F2F2F7",
                color: "#111111",
                border: "1px solid rgba(0,0,0,0.08)",
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              {t("Select")}
            </button>
          )}
        </div>
      </div>

      {/* Search（下線のみ / react-icons） */}
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid rgba(0,0,0,0.22)",
            paddingBottom: 8,
          }}
        >
          <CiSearch aria-hidden style={{ opacity: 0.55, fontSize: 18 }} />
          <input
            type="text"
            placeholder={t("Search...")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 0",
              borderRadius: 0,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: "#111111",
              fontSize: 16,
            }}
          />
        </div>
      </div>

      {/* List */}
      {sortedDateKeys.length === 0 ? (
        <p style={{ color: "rgba(0,0,0,0.35)", textAlign: "center" }}>
          {t("No meeting records available")}
        </p>
      ) : (
        sortedDateKeys.map((dateKey) => (
          <div key={dateKey} style={{ marginBottom: 28 }}>
            <h2
              style={{
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                paddingBottom: 6,
                margin: "0 0 10px 0",
                fontSize: 18,
                color: "#111111",
                fontWeight: 700,
              }}
            >
              {dateKey}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(23vw, 23vw))",
                gap: 16,
                marginTop: 6,
                justifyContent: "start",
              }}
            >
              {groupedPapers[dateKey].map((paper) => (
                <PaperItem
                  key={paper.id}
                  paper={paper}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.includes(paper.id)}
                  toggleSelect={toggleSelect}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
    revalidate: 60,
  };
}
