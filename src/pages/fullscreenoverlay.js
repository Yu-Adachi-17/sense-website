import React, { useState, useEffect } from "react";
import { TbClipboardList, TbClipboardText } from "react-icons/tb";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoIosDownload } from "react-icons/io";
import { FaRegCopy } from "react-icons/fa";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";  // Firebase の初期化済み Firestore インスタンス
import { useTranslation } from "react-i18next";

export default function FullScreenOverlay({
  setShowFullScreen,
  isExpanded,
  setIsExpanded,
  transcription,
  minutes,
  audioURL,
  docId  // 更新対象のドキュメントID
}) {
  const { t, i18n } = useTranslation();
  const [showSideMenu, setShowSideMenu] = useState(false);
  // SSR対策：初回は false とし、useEffect で window.innerWidth の値をセット
  const [isMobile, setIsMobile] = useState(false);
  // 編集モードと、編集中のテキスト（isExpanded に応じて transcription または minutes）
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(isExpanded ? transcription : minutes);

  // アラビア語の場合に dir="rtl" を適用
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // Firestore のリアルタイム更新を反映（編集中でない場合）
  useEffect(() => {
    if (docId && !isEditing) {
      const docRef = doc(db, "meetingRecords", docId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // isExpanded の状態に応じて更新
          setEditedText(isExpanded ? data.transcription : data.minutes);
        }
      });
      return unsubscribe;
    }
  }, [docId, isExpanded, isEditing]);

  // 画面サイズの変化を監視
  useEffect(() => {
    // 初回のレンダリング後に window.innerWidth を取得
    setIsMobile(window.innerWidth <= 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // isExpanded や props の変更時に、編集中でなければ表示内容を更新
  useEffect(() => {
    if (!isEditing) {
      setEditedText(isExpanded ? transcription : minutes);
    }
  }, [isExpanded, transcription, minutes, isEditing]);

  // オーディオデータのダウンロード処理
  const handleDownload = () => {
    if (audioURL) {
      const link = document.createElement("a");
      link.href = audioURL;
      link.download = "meeting_recording.webm";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(t("No downloadable audio data available."));
    }
  };

  // 全文と議事録の切り替え（編集モード終了）
  const handleSwitchView = () => {
    setIsExpanded(!isExpanded);
    setShowSideMenu(false);
    setIsEditing(false);
  };

  // 議事録表示に切り替え（編集モード終了）
  const handleSwitchToMinutes = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setShowSideMenu(false);
      setIsEditing(false);
    }
  };

  // クリップボードにコピー
  const handleShare = () => {
    const content = editedText;
    navigator.clipboard
      .writeText(content)
      .then(() => {
        alert(t("Copied to clipboard!"));
      })
      .catch(() => {
        alert(t("Failed to copy to clipboard."));
      });
  };

  // Firebase に更新（isExpanded の状態に応じて transcription または minutes を更新）
  const handleSave = async () => {
    if (!docId) {
      alert(t("No document ID available for saving."));
      return;
    }
    try {
      const docRef = doc(db, "meetingRecords", docId);
      if (isExpanded) {
        await updateDoc(docRef, { transcription: editedText });
      } else {
        await updateDoc(docRef, { minutes: editedText });
      }
      setIsEditing(false);
      alert(t("Save successful."));
    } catch (error) {
      console.error("Error saving document: ", error);
      alert(t("Save failed: ") + error.message);
    }
  };

  // サイドメニュー内でクリックイベントがオーバーレイに伝播しないようにする
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // 以下、スタイル定義（元の定義をそのまま維持）
  const styles = {
    fullScreenOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.95)",
      color: "#FFFFFF",
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
      color: "#FFFFFF",
      cursor: "pointer",
    },
    hamburgerButton: {
      position: "absolute",
      top: "20px",
      right: "30px",
      fontSize: "30px",
      background: "none",
      border: "none",
      color: "#FFFFFF",
      cursor: "pointer",
      zIndex: 1300,
    },
    shareButton: {
      position: "absolute",
      top: "7px",
      right: "20px",
      fontSize: "20px",
      background: "none",
      border: "none",
      color: "#FFFFFF",
      cursor: "pointer",
      zIndex: 1300,
    },
    fullScreenContent: {
      width: "90%",
      height: "85%",
      overflowY: "auto",
      backgroundColor: "#222222",
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
    },
    summaryText: {
      maxHeight: "none",
      overflowY: "auto",
    },
    fullText: {
      maxHeight: "none",
      overflowY: "auto",
    },
    title: {
      marginBottom: "20px",
      paddingTop: "20px",
      fontSize: "30px",
      fontWeight: "bold",
    },
    titleContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    saveButton: {
      backgroundColor: "#FFFFFF",
      color: "#000000",
      border: "none",
      padding: "5px 10px",
      cursor: "pointer",
      marginLeft: "10px",
      borderRadius: "5px",
    },
    editButton: {
      backgroundColor: "transparent",
      color: "#FFFFFF",
      border: "1px solid #FFFFFF",
      padding: "5px 10px",
      cursor: "pointer",
      marginLeft: "10px",
      borderRadius: "5px",
    },
    textEditor: {
      width: "100%",
      height: "100%",
      backgroundColor: "#222222",
      color: "#FFFFFF",
      border: "1px solid #555",
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
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "#FFF",
      padding: "20px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      zIndex: 1200,
      transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.5s ease-out",
    },
    sideMenuButton: {
      background: "none",
      border: "none",
      color: "#FFFFFF",
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
      color: "#FFFFFF",
      cursor: "pointer",
    },
    iconSpacing: {
      marginLeft: "10px",
      fontWeight: "bold",
      fontSize: "16px",
    },
  };

  return (
    <>
      <div style={styles.fullScreenOverlay}>
        {/* Close ボタン */}
        <button style={styles.closeButton} onClick={() => setShowFullScreen(false)}>
          &times;
        </button>

        {/* ハンバーガーメニュー */}
        <button style={styles.hamburgerButton} onClick={() => setShowSideMenu(true)}>
          <GiHamburgerMenu size={24} />
        </button>

        {/* タイトルと Edit/Save ボタン */}
        <div style={styles.titleContainer}>
          <h2 style={styles.title}>
            {isExpanded ? t("Full Transcript") : t("Minutes")}
          </h2>
          {isEditing ? (
            <button style={styles.saveButton} onClick={handleSave}>
              {t("Save")}
            </button>
          ) : (
            <button style={styles.editButton} onClick={() => setIsEditing(true)}>
              {t("Edit")}
            </button>
          )}
        </div>

        {/* テキスト表示エリア */}
        <div
          style={{
            ...styles.fullScreenContent,
            ...(isExpanded ? styles.fullText : styles.summaryText),
          }}
        >
          {/* シェアボタン */}
          <button style={styles.shareButton} onClick={handleShare}>
            <FaRegCopy size={20} />
          </button>

          {/* 編集モードの場合は textarea、通常時は段落で表示 */}
          {isEditing ? (
            <textarea
              style={styles.textEditor}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          ) : (
            <p style={{ whiteSpace: "pre-wrap" }}>{editedText}</p>
          )}
        </div>
      </div>

      {/* サイドメニューオーバーレイ */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* 全文と議事録の切替ボタン */}
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

            {/* オーディオデータダウンロードボタン */}
            <button style={styles.sideMenuButton} onClick={handleDownload}>
              <IoIosDownload size={24} />
              <span style={styles.iconSpacing}>{t("Download Audio Data")}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
