// src/pages/fullscreenoverlay.js
import React, { useState, useEffect } from "react";
import { TbClipboardList, TbClipboardText } from "react-icons/tb";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoIosDownload } from "react-icons/io";
import { FaRegCopy, FaRegEdit } from "react-icons/fa"; // 編集アイコンをインポート
import { getDb } from "../firebaseConfig";
import { useTranslation } from "next-i18next";

import MinutesDocumentView from "../components/MinutesDocumentView";
import MinutesDocumentEditorView from "../components/MinutesDocumentEditorView";
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
  const { t, i18n } = useTranslation("common");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  // ```json ... ``` にも対応した JSON 判定
  const normalizeForJsonDetection = (raw) => {
    if (typeof raw !== "string") return "";
    let text = raw.trim();
    if (!text.startsWith("```")) return text;
    const lines = text.split("\n");
    const first = lines[0].trim();
    if (!first.startsWith("```")) return text;
    let endIndex = lines.length;
    if (lines[lines.length - 1].trim() === "```") {
      endIndex = lines.length - 1;
    }
    return lines.slice(1, endIndex).join("\n");
  };

  const looksLikeJsonObject = (text) => {
    const cleaned = normalizeForJsonDetection(text);
    const trimmed = cleaned.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  };

  const [editedText, setEditedText] = useState(
    isExpanded ? toDisplayText(transcription) : toDisplayText(minutes)
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "dir",
      i18n.language === "ar" ? "rtl" : "ltr"
    );
  }, [i18n.language]);

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

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setEditedText(
        isExpanded ? toDisplayText(transcription) : toDisplayText(minutes)
      );
    }
  }, [isExpanded, transcription, minutes, isEditing]);

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

  // 2枚目のビジュアルに合わせたスタイルの定義をここに追加
  const ui = {
    chipBgLight: "#E3F2FD",
    cardShadow: "0 8px 28px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.06)",
    base: {
      zTop: 2147483647,
      radius: 16,
      ease: "cubic-bezier(.2,.7,.2,1)",
    },
    sideMenu: {
      position: "fixed", top: 0, right: 0,
      width: isMobile ? "66.66%" : "30%", maxWidth: 560, minWidth: 320,
      height: "100%",
      color: "#0A0F1B",
      padding: "22px 18px", boxSizing: "border-box",
      display: "flex", flexDirection: "column", alignItems: "stretch",
      zIndex: 1200, // Z-indexを調整
      transition: `transform .30s cubic-bezier(.2,.7,.2,1)`,
      transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
      background: "#FFFFFF",
      boxShadow: showSideMenu ? "0 18px 42px rgba(0,0,0,0.10), 0 10px 20px rgba(0,0,0,0.06)" : "none",
      pointerEvents: showSideMenu ? "auto" : "none",
      borderLeft: "1px solid rgba(0,0,0,0.08)", // subtle border
    },
    rowCard: {
      borderRadius: 16, // base.radius
      background: "#FFFFFF",
      border: "1px solid rgba(0,0,0,0.04)", padding: "12px 10px",
      margin: "10px 6px 12px 6px",
      boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
      transform: "translateZ(0)", transition: "transform .2s ease, box-shadow .2s ease",
      cursor: "pointer",
    },
    rowCardHover: { transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(0,0,0,0.08)" },
    iconBadge: { width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "#E3F2FD", border: "1px solid rgba(0,0,0,0.04)", flex: "0 0 44px" }, // chipBgLight
    rowTitle: { fontSize: 14, fontWeight: 600, color: "#0A0F1B" },
    blankOverlay: { // SideMenuが表示されているときに背後を暗くするオーバーレイ
      position: "fixed", inset: 0,
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 1100, // SideMenuより低いZ-index
      display: showSideMenu ? "block" : "none",
      opacity: showSideMenu ? 1 : 0,
      transition: "opacity 0.3s ease",
    },
    // その他のスタイルも必要に応じてここに定義します
  };


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
      // "Edit"ボタンがなくなったため、"Save"ボタンのみになった
      // 高さを確保するため、最小高さを設定（ボタンの高さに合わせるなど）
      minHeight: "31px", // (padding 5px * 2 + text 10px + border 1px * 2) 
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
    editButton: { // このスタイルはSideMenuでは使用しなくなりましたが、念のため残します
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
    // sideMenuOverlay は ui.blankOverlay に置き換える
    // sideMenu は ui.sideMenu に置き換える
    // sideMenuButton は MenuRow コンポーネントに置き換える
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

  const isJsonMinutes = !isExpanded && looksLikeJsonObject(editedText);

  // 2枚目の MenuRow コンポーネントを参考に、FullScreenOverlay 用に調整
  const MenuRow = ({ icon, iconColor, title, onClick, trailing, disabled }) => {
    const [hover, setHover] = useState(false);
    return (
      <div
        role="button" tabIndex={0} aria-disabled={!!disabled}
        onClick={() => !disabled && onClick?.()}
        onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) onClick?.(); }}
        style={{
          ...ui.rowCard,
          ...(hover && !disabled ? ui.rowCardHover : null),
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={ui.iconBadge}>{icon({ size: 22, color: iconColor })}</div>
          <div style={ui.rowTitle}>{title}</div>
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>{trailing}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={styles.fullScreenOverlay}>
        <button
          style={styles.closeButton}
          onClick={() => setShowFullScreen(false)}
        >
          &times;
        </button>

        <button
          style={styles.hamburgerButton}
          onClick={() => setShowSideMenu(true)}
        >
          <GiHamburgerMenu size={24} />
        </button>

        <div style={styles.titleContainer}>
          {/* "Edit" ボタンは SideMenu に移動しました */}
          {/* "Save" ボタンは編集中にここに表示されます */}
          {isEditing && (
            <button style={styles.saveButton} onClick={handleSave}>
              {t("Save")}
            </button>
          )}
        </div>

        <div
          style={{
            ...styles.fullScreenContent,
            ...(isExpanded ? styles.fullText : styles.summaryText),
          }}
        >
          {isEditing ? (
            isExpanded ? (
              // transcript 編集はこれまで通りプレーンテキスト
              <textarea
                style={styles.textEditor}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
            ) : isJsonMinutes ? (
              // ✅ JSON minutes は構造化エディタ
              <MinutesDocumentEditorView
                text={editedText}
                onChangeText={setEditedText}
                t={t}           // ← これを追加
              />
            ) : (
              // 非JSON minutes はプレーンテキスト
              <textarea
                style={styles.textEditor}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
            )
          ) : (
            <MinutesDocumentView
              doc={toUnifiedDoc(editedText, { t, ns: "common" })}
            />
          )}
        </div>
      </div>

      {showSideMenu && (
        <div
          style={ui.blankOverlay} // 新しいリッチなスタイルを適用
          onClick={() => setShowSideMenu(false)}
        >
          <div style={ui.sideMenu} onClick={stopPropagation}>
            <button
              style={styles.sideMenuClose} // 閉じるボタンは既存のスタイルを流用
              onClick={() => setShowSideMenu(false)}
              aria-label="Close"
              title="Close"
            >
              &times;
            </button>

            {/* ----- 修正：ここに "Edit" ボタンを移動 ----- */}
            {!isEditing && (
              <MenuRow
                icon={(p) => <FaRegEdit {...p} />}
                iconColor={"#2196F3"} // アイコンの色（Blue）
                title={t("Edit")}
                onClick={() => {
                  setIsEditing(true);
                  setShowSideMenu(false);
                }}
              />
            )}
            {/* ------------------------------------- */}

            {!isExpanded ? (
              <MenuRow
                icon={(p) => <TbClipboardText {...p} />}
                iconColor={"#0D47A1"} // アイコンの色は適宜調整
                title={t("Show Full Transcript")}
                onClick={handleSwitchView}
              />
            ) : (
              <MenuRow
                icon={(p) => <TbClipboardList {...p} />}
                iconColor={"#0D47A1"} // アイコンの色は適宜調整
                title={t("Show Minutes")}
                onClick={handleSwitchToMinutes}
              />
            )}

            <MenuRow
              icon={(p) => <IoIosDownload {...p} />}
              iconColor={"#4CAF50"} // アイコンの色は適宜調整
              title={t("Download Audio Data")}
              onClick={handleDownload}
            />

            <MenuRow
              icon={(p) => <FaRegCopy {...p} />}
              iconColor={"#FF9800"} // アイコンの色は適宜調整
              title={t("Copy to Clipboard")}
              onClick={handleShare}
            />
          </div>
        </div>
      )}
    </>
  );
}