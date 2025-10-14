// src/pages/fullscreenoverlay.js
import React, { useState, useEffect } from "react";
import { TbClipboardList, TbClipboardText } from "react-icons/tb";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoIosDownload } from "react-icons/io";
import { FaRegCopy } from "react-icons/fa";
// ✅ 直 import をやめて SSR 安全ユーティリティだけ import
import { getDb } from "../firebaseConfig";
// i18n は next-i18next に寄せる（_app で appWithTranslation 済み）
import { useTranslation } from "next-i18next";

// 汎用レンダリング（新規追加ファイル）
import MinutesDocumentView from "../components/MinutesDocumentView";
import { toUnifiedDoc } from "../lib/minutes-universal";

export default function FullScreenOverlay({
  setShowFullScreen,
  isExpanded,
  setIsExpanded,
  transcription,
  minutes,
  audioURL,
  docId,
}) {
  // ← ここを 'common' に固定
  const { t, i18n } = useTranslation("common");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 表示用に "何で来ても文字列に" するだけ（JSON→string整形）
  const toDisplayText = (value) => {
    if (value && typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    if (typeof value === "string") return value;
    return value == null ? "" : String(value);
  };

  // 編集テキスト: isExpanded に応じて初期値を決定
  const [editedText, setEditedText] = useState(
    isExpanded ? toDisplayText(transcription) : toDisplayText(minutes)
  );

  // dir 切替（RTL対応）
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // Firestore リアルタイム購読（非編集中のみ）
  useEffect(() => {
    let unsub;
    let mounted = true;

    (async () => {
      if (!docId || isEditing) return;
      const db = await getDb();
      if (!db || !mounted) return;

      const { doc, onSnapshot } = await import("firebase/firestore");
      const ref = doc(db, "meetingRecords", docId);
      unsub = onSnapshot(ref, (snap) => {
        if (!mounted || !snap.exists()) return;
        const data = snap.data();
        const incoming = isExpanded ? data.transcription : data.minutes;
        setEditedText(toDisplayText(incoming));
      });
    })();

    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, [docId, isExpanded, isEditing]);

  // 画面サイズ（モバイル閾値）
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // prop変更時の同期（非編集中のみ）
  useEffect(() => {
    if (!isEditing) {
      setEditedText(isExpanded ? toDisplayText(transcription) : toDisplayText(minutes));
    }
    if (!isExpanded && isEditing) setIsEditing(false);
  }, [isExpanded, transcription, minutes, isEditing]);

  // ダウンロード
  const handleDownload = () => {
    if (!audioURL) return alert(t("No downloadable audio data available."));
    const link = document.createElement("a");
    link.href = audioURL;
    link.download = "meeting_recording.webm";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSwitchView = () => {
    setIsExpanded(!isExpanded);
    setShowSideMenu(false);
    setIsEditing(false);
  };

  const handleSwitchToMinutes = () => {
    if (!isExpanded) return;
    setIsExpanded(false);
    setShowSideMenu(false);
    setIsEditing(false);
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(editedText)
      .then(() => alert(t("Copied to clipboard!")))
      .catch(() => alert(t("Failed to copy to clipboard.")));
  };

  // 保存（minutes/transcription は文字列で保存）
  const handleSave = async () => {
    if (!docId) return alert(t("No document ID available for saving."));
    try {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable (SSR or not initialized).");
      const { doc, updateDoc } = await import("firebase/firestore");
      const ref = doc(db, "meetingRecords", docId);
      if (isExpanded) {
        await updateDoc(ref, { transcription: editedText });
      } else {
        await updateDoc(ref, { minutes: editedText });
      }
      setIsEditing(false);
      alert(t("Save successful."));
    } catch (e) {
      console.error("Error saving document:", e);
      alert(t("Save failed: ") + (e?.message ?? String(e)));
    }
  };

  const stopPropagation = (e) => e.stopPropagation();

  const styles = {
    fullScreenOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "#FFFFFF",
      color: "#000000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      boxSizing: "border-box",
      transition: "opacity 0.5s ease, transform 0.5s ease",
      opacity: 1,
      transform: "translateY(0)",
      zIndex: 1000,
      pointerEvents: "auto",
    },
    closeButton: {
      position: "absolute",
      top: "20px",
      left: "30px",
      fontSize: "30px",
      background: "none",
      border: "none",
      color: "#000000",
      cursor: "pointer",
    },
    hamburgerButton: {
      position: "absolute",
      top: "20px",
      right: "30px",
      fontSize: "30px",
      background: "none",
      border: "none",
      color: "#000000",
      cursor: "pointer",
      zIndex: 1300,
    },
    fullScreenContent: {
      width: "90%",
      height: "85%",
      overflowY: "auto",
      backgroundColor: "#FFFFFF",
      padding: "20px",
      borderRadius: "10px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      textAlign: "left",
      transition: "max-height 0.5s ease",
      marginBottom: "20px",
      position: "relative",
      border: "none",
    },
    summaryText: { maxHeight: "none", overflowY: "auto" },
    fullText: { maxHeight: "none", overflowY: "auto" },
    titleContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    saveButton: {
      backgroundColor: "#000000",
      color: "#FFFFFF",
      border: "none",
      padding: "5px 10px",
      cursor: "pointer",
      marginLeft: "10px",
      borderRadius: "5px",
    },
    editButton: {
      backgroundColor: "transparent",
      color: "#000000",
      border: "1px solid #000000",
      padding: "5px 10px",
      cursor: "pointer",
      marginLeft: "10px",
      borderRadius: "5px",
    },
    textEditor: {
      width: "100%",
      height: "100%",
      backgroundColor: "#FFFFFF",
      color: "#000000",
      border: "1px solid #CCCCCC",
      borderRadius: "10px",
      padding: "20px",
      boxSizing: "border-box",
      fontSize: "16px",
      outline: "none",
      resize: "none",
    },
    sideMenuOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1100,
      display: showSideMenu ? "block" : "none",
      transition: "opacity 0.5s ease",
      opacity: showSideMenu ? 1 : 0,
    },
    sideMenu: {
      position: "fixed",
      top: 0,
      right: 0,
      width: isMobile ? "66.66%" : "33%",
      height: "100%",
      backgroundColor: "#FFFFFF",
      color: "#000000",
      padding: "20px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      zIndex: 1200,
      transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.5s ease-out",
      borderLeft: "1px solid #e5e5e5",
    },
    sideMenuButton: {
      background: "none",
      border: "none",
      color: "#000000",
      fontSize: "24px",
      cursor: "pointer",
      margin: "10px 0",
      display: "flex",
      alignItems: "center",
      fontWeight: "bold",
    },
    sideMenuClose: {
      position: "absolute",
      top: "20px",
      left: "20px",
      fontSize: "30px",
      background: "none",
      border: "none",
      color: "#000000",
      cursor: "pointer",
    },
    iconSpacing: { marginLeft: "10px", fontWeight: "bold", fontSize: "16px" },
  };

  return (
    <>
      <div style={styles.fullScreenOverlay}>
        <button style={styles.closeButton} onClick={() => setShowFullScreen(false)}>
          &times;
        </button>

        <button style={styles.hamburgerButton} onClick={() => setShowSideMenu(true)}>
          <GiHamburgerMenu size={24} />
        </button>

        <div style={styles.titleContainer}>
          {isExpanded &&
            (isEditing ? (
              <button style={styles.saveButton} onClick={handleSave}>
                {t("Save")}
              </button>
            ) : (
              <button style={styles.editButton} onClick={() => setIsEditing(true)}>
                {t("Edit")}
              </button>
            ))}
        </div>

        <div
          style={{
            ...styles.fullScreenContent,
            ...(isExpanded ? styles.fullText : styles.summaryText),
          }}
        >
          {isExpanded && isEditing ? (
            <textarea
              style={styles.textEditor}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          ) : (
            // ✅ ここが新ロジック：どんなフォーマットでも AST に正規化して汎用レンダリング
            <MinutesDocumentView
              doc={toUnifiedDoc(editedText, { t, ns: "common" })}
            />
          )}
        </div>
      </div>

      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {!isExpanded ? (
              <button style={styles.sideMenuButton} onClick={handleSwitchView}>
                <TbClipboardText size={24} />
                <span style={styles.iconSpacing}>{t("Show Full Transcript")}</span>
              </button>
            ) : (
              <button style={styles.sideMenuButton} onClick={handleSwitchToMinutes}>
                <TbClipboardList size={24} />
                <span style={styles.iconSpacing}>{t("Show Minutes")}</span>
              </button>
            )}

            <button style={styles.sideMenuButton} onClick={handleDownload}>
              <IoIosDownload size={24} />
              <span style={styles.iconSpacing}>{t("Download Audio Data")}</span>
            </button>

            <button style={styles.sideMenuButton} onClick={handleShare}>
              <FaRegCopy size={24} />
              <span style={styles.iconSpacing}>{t("Copy to Clipboard")}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
