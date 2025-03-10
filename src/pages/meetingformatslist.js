import React, { useState, useEffect, useRef } from "react";
import HomeIcon from './homeIcon';
import { useTranslation } from "react-i18next";
import Head from "next/head";

const MeetingFormatsList = () => {
  const { t, i18n } = useTranslation();

  // アラビア語の場合に `dir="rtl"` を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // デフォルトの議事録フォーマット
  const defaultMeetingFormats = [
    {
      id: "general",
      title: t("General"),
      template: `【${t("Meeting Name")}】
【${t("Date")}】
【${t("Location")}】
【${t("Attendees")}】
【${t("Agenda(1)")}】⚫︎${t("Discussion")}⚫︎${t("Decision items")}⚫︎${t("Pending problem")}
【${t("Agenda(2)")}】⚫︎${t("Discussion")}⚫︎${t("Decision items")}⚫︎${t("Pending problem")}
【${t("Agenda(3)")}】⚫︎${t("Discussion")}⚫︎${t("Decision items")}⚫︎${t("Pending problem")}
（${t("Repeat the agenda items if necessary.")}）`
    },
    {
      id: "1on1",
      title: t("1on1"),
      template: `【${t("Meeting Name")}】
【${t("Date")}】
【${t("Location")}】
【${t("Attendees")}】
【${t("Agenda")}】（${t("Purpose & Key Points")}）
【${t("Review")}】
⚫︎ ${t("Previous Initiatives (Achievements & Challenges)")}
⚫︎ ${t("Self-Assessment")}
【${t("Feedback")}】
⚫︎ ${t("Strengths & Positive Points")}
⚫︎ ${t("Areas for Improvement & Growth Points")}
【${t("Future Goals & Actions")}】
⚫︎ ${t("Specific Growth Plan")}
⚫︎ ${t("Support & Follow-up Actions")}`
    },
  ];

  const [formats, setFormats] = useState([]);
  const [searchText, setSearchText] = useState("");
  const dbRef = useRef(null);

  // IndexedDBを開く
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open("MeetingFormatsDB", 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("formats")) {
          db.createObjectStore("formats", { keyPath: "id" });
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  };

  const getAllFormats = (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("formats", "readonly");
      const store = transaction.objectStore("formats");
      const request = store.getAll();
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  };

  useEffect(() => {
    let isMounted = true;
    openDB()
      .then((db) => {
        dbRef.current = db;
        return getAllFormats(db);
      })
      .then((savedFormats) => {
        if (isMounted) {
          setFormats(savedFormats.length > 0 ? savedFormats : defaultMeetingFormats);
        }
      })
      .catch((err) => console.error("Error opening IndexedDB:", err));

    return () => {
      isMounted = false;
    };
  }, [t]);

  const filteredFormats = formats.filter(
    (format) =>
      format.title.toLowerCase().includes(searchText.toLowerCase()) ||
      format.template.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>{t("Meeting Formats List")}</title>
      </Head>

      <div style={{ backgroundColor: "#000", minHeight: "100vh", padding: 20, color: "white" }}>
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "70px",
            padding: "0 20px",
            backgroundColor: "#000",
            zIndex: 1500,
          }}
        >
          <div style={{ width: "70px" }}>
            <HomeIcon size={30} color="white" />
          </div>
          <div style={{ flexGrow: 1, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: "38px" }}>{t("Meeting Formats")}</h1>
          </div>
        </div>

        {/* 検索ボックス */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <input
            type="text"
            placeholder={t("Search...")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "none",
              fontSize: 16,
              backgroundColor: "#1e1e1e",
              color: "white",
              outline: "none",
              textAlign: "left",
            }}
          />
        </div>

        {/* フォーマット一覧 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 15,
          }}
        >
          {filteredFormats.map((format) => (
            <div key={format.id} style={{ cursor: "pointer" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "28px",
                  textAlign: "center",
                  width: "100%",
                }}
              >
                {format.title}
              </h3>
              <div
                style={{
                  backgroundColor: "#1e1e1e",
                  borderRadius: 10,
                  padding: 10,
                  minHeight: 150,
                  marginTop: 5,
                }}
              >
                <div
                  style={{
                    color: "#ccc",
                    fontSize: 14,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "pre-line",
                  }}
                >
                  {format.template}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MeetingFormatsList;
