import React, { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from "firebase/firestore";
import { useRouter } from "next/router";
import { RxArrowLeft } from "react-icons/rx";
import { useTranslation } from "react-i18next";

// iOSライト風のカード影（多層）
const cardShadow =
  "0 1px 1px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.06)";

// Meeting Record Item Component (Selection Mode Version)
const PaperItem = ({ paper, selectionMode, isSelected, toggleSelect }) => {
  const router = useRouter();

  // paper.createdAt が Timestamp の場合は toDate() を利用
  const createdDate = paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
  const truncatedText =
    paper.minutes.length <= 100 ? paper.minutes : paper.minutes.slice(0, 100) + "…";

  // 選択モードの場合は選択状態を切り替え、通常時は詳細画面へ遷移（paper 情報は query で渡す）
  const handleClick = () => {
    if (selectionMode) {
      toggleSelect(paper.id);
    } else {
      router.push(`/minutes/${paper.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: "#ffffff",
        border: isSelected ? "2px solid #0A84FF" : "1px solid rgba(0,0,0,0.04)",
        borderRadius: 16,
        padding: 14,
        color: "#111111",
        textAlign: "left",
        cursor: "pointer",
        boxShadow: cardShadow,
        transition: "transform 120ms ease, box-shadow 120ms ease",
        userSelect: "none"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 2px 2px rgba(0,0,0,0.06), 0 10px 18px rgba(0,0,0,0.10), 0 18px 30px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = cardShadow;
      }}
    >
      <div style={{ fontWeight: 700, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
        {truncatedText}
      </div>
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

  // アラビア語の場合に dir="rtl" を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  useEffect(() => {
    console.log("🟡 [DEBUG] MinutesList mounted");

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🟢 [DEBUG] Logged in user:", user.uid);

        const q = query(
          collection(db, "meetingRecords"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        console.log("🟡 [DEBUG] Executing Firestore query");

        const unsubscribeSnapshot = onSnapshot(
          q,
          (querySnapshot) => {
            console.log(`🟢 [DEBUG] Retrieved ${querySnapshot.size} documents from Firestore`);
            const fetchedPapers = [];
            querySnapshot.forEach((docSnapshot) => {
              console.log("🟢 [DEBUG] Retrieved document:", docSnapshot.id, docSnapshot.data());
              fetchedPapers.push({ id: docSnapshot.id, ...docSnapshot.data() });
            });

            if (fetchedPapers.length === 0) {
              console.warn("⚠️ [WARNING] No data in Firestore");
            }

            setPapers(fetchedPapers);
          },
          (error) => {
            console.error("🔴 [ERROR] Failed to retrieve data from Firestore:", error);
          }
        );

        return () => {
          console.log("🟡 [DEBUG] Unsubscribing Firestore listener");
          unsubscribeSnapshot();
        };
      } else {
        console.warn("⚠️ [WARNING] User is not logged in");
      }
    });

    return () => {
      console.log("🟡 [DEBUG] Unsubscribing onAuthStateChanged listener");
      unsubscribeAuth();
    };
  }, []);

  // 検索によるフィルタリング
  const filteredPapers = papers.filter((paper) =>
    (paper.minutes || "").toLowerCase().includes(searchText.toLowerCase())
  );

  // 日付ごとにグループ化
  const groupedPapers = filteredPapers.reduce((groups, paper) => {
    const date = paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
    const key = date.toLocaleDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(paper);
    return groups;
  }, {});

  const sortedDateKeys = Object.keys(groupedPapers).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  // 選択状態の切り替え
  const toggleSelect = (id) => {
    setSelectedIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((item) => item !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // 選択中の meeting record の削除処理
  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert(t("Please select meeting records to delete."));
      return;
    }
    const confirmed = window.confirm(t("Are you sure you want to delete? This action cannot be undone."));
    if (!confirmed) return;

    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "meetingRecords", id));
      }
      // 削除後、選択状態をリセットし選択モードを終了
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (error) {
      console.error("An error occurred during deletion", error);
      alert(t("An error occurred during deletion"));
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",   // 全面白背景
        minHeight: "100vh",
        padding: 20,
        color: "#111111"              // テキストは黒
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
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
              marginRight: 10
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
                  backgroundColor: "#F2F2F7", // iOSのsystemGray6っぽい
                  color: "#111111",
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginRight: 10,
                  cursor: "pointer",
                  fontSize: 16
                }}
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: "#FF3B30", // iOS Red
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 700,
                  boxShadow: "0 6px 12px rgba(255,59,48,0.2)"
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
                fontSize: 16
              }}
            >
              {t("Select")}
            </button>
          )}
        </div>
      </div>

      {/* Search Field（下線のみ） */}
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid rgba(0,0,0,0.22)", // 下線のみ
            paddingBottom: 8
          }}
        >
          <span
            aria-hidden
            style={{ color: "rgba(0,0,0,0.35)", fontSize: 18, lineHeight: 1 }}
          >
            🔍
          </span>
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
              fontSize: 16
            }}
          />
        </div>
      </div>

      {/* List of meeting records */}
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
                fontWeight: 700
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
                justifyContent: "start"
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
