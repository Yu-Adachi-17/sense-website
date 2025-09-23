import React, { useState, useEffect } from "react";
import { TbClipboardList, TbClipboardText } from "react-icons/tb";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoIosDownload } from "react-icons/io";
import { FaRegCopy } from "react-icons/fa";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useTranslation } from "react-i18next";

export default function FullScreenOverlay({
  setShowFullScreen,
  isExpanded,
  setIsExpanded,
  transcription,
  minutes,
  audioURL,
  docId
}) {
  const { t, i18n } = useTranslation();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  /** ---------- 追加: ユーティリティ（安全にパース/整形） ---------- */
  const stripCodeFences = (raw) => {
    if (typeof raw !== "string") return raw;
    let s = raw.trim().replace(/^\uFEFF/, ""); // BOM除去
    // ```json ... ``` / ``` ... ``` の除去（全面/前後どちらでも）
    const fenced = s.match(/^```(?:json|javascript|js|ts)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) return fenced[1].trim();
    s = s.replace(/^```(?:json|javascript|js|ts)?\s*/i, "");
    s = s.replace(/```$/i, "");
    return s.trim();
  };

  const tryParseJSON = (value) => {
    // すでにオブジェクトならそのまま
    if (value && typeof value === "object") return value;
    if (typeof value !== "string") return null;
    const s = stripCodeFences(value);
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const toDisplayText = (value) => {
    // テキストエリア/内表示用は常に文字列に正規化
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

  // 編集テキスト: isExpanded に応じて transcription / minutes を文字列で保持
  const [editedText, setEditedText] = useState(
    isExpanded ? toDisplayText(transcription) : toDisplayText(minutes)
  );

  // アラビア語のdir切替
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // Firestore リアルタイム反映（非編集中のみ）
  useEffect(() => {
    if (docId && !isEditing) {
      const docRef = doc(db, "meetingRecords", docId);
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const incoming = isExpanded ? data.transcription : data.minutes;
          setEditedText(toDisplayText(incoming));
        }
      });
      return unsubscribe;
    }
  }, [docId, isExpanded, isEditing]);

  // 画面サイズ
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // prop変更・表示切替時の同期（非編集中のみ）
  useEffect(() => {
    if (!isEditing) {
      setEditedText(isExpanded ? toDisplayText(transcription) : toDisplayText(minutes));
    }
    if (!isExpanded && isEditing) {
      setIsEditing(false);
    }
  }, [isExpanded, transcription, minutes, isEditing]);

  // ダウンロード
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

  const handleSwitchView = () => {
    setIsExpanded(!isExpanded);
    setShowSideMenu(false);
    setIsEditing(false);
  };

  const handleSwitchToMinutes = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setShowSideMenu(false);
      setIsEditing(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(editedText)
      .then(() => alert(t("Copied to clipboard!")))
      .catch(() => alert(t("Failed to copy to clipboard.")));
  };

  // 保存（minutes/transcriptionは文字列で保存）
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

  const stopPropagation = (e) => e.stopPropagation();

  // スキーマ判定
  const isFlexibleSchema = (obj) =>
    obj &&
    typeof obj === "object" &&
    typeof obj.meetingTitle === "string" &&
    typeof obj.summary === "string" &&
    Array.isArray(obj.sections);

  const isLegacySchema = (obj) => obj && typeof obj === "object" && Array.isArray(obj.topics);

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
          {(isExpanded && isEditing) ? (
            <textarea
              style={styles.textEditor}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          ) : (
            (() => {
              // ここを安全化：コードフェンス除去 + 既オブジェ/文字列どちらでもOK
              const parsed = tryParseJSON(editedText);

              if (parsed && isFlexibleSchema(parsed)) {
                const meeting = parsed;
                return (
                  <div style={{ whiteSpace: "normal", width: "100%" }}>
                    {meeting.meetingTitle && (
                      <h1
                        style={{
                          fontSize: "30px",
                          fontWeight: "bold",
                          paddingTop: "4px",
                          paddingBottom: "8px",
                          margin: 0,
                        }}
                      >
                        {meeting.meetingTitle}
                      </h1>
                    )}

                    {(meeting.date || meeting.location || meeting.attendees) && (
                      <div style={{ opacity: 0.9, marginBottom: "12px" }}>
                        {meeting.date && (
                          <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
                            {meeting.date}
                          </p>
                        )}
                        {meeting.location && (
                          <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
                            {meeting.location}
                          </p>
                        )}
                        {Array.isArray(meeting.attendees) && meeting.attendees.length > 0 && (
                          <p style={{ margin: 0, fontWeight: "bold" }}>
                            {meeting.attendees.join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    {meeting.summary && (
                      <>
                        <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{meeting.summary}</p>
                        <hr
                          style={{
                            height: "1px",
                            backgroundColor: "#e5e5e5",
                            border: "none",
                            margin: "16px 0",
                          }}
                        />
                      </>
                    )}

                    {Array.isArray(meeting.sections) &&
                      meeting.sections.map((sec, sIdx) => (
                        <div key={sIdx} style={{ marginBottom: "18px" }}>
                          {sec.title && (
                            <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 6px 0" }}>
                              {sec.title}
                            </h2>
                          )}

                          {Array.isArray(sec.topics) &&
                            sec.topics.map((topic, tIdx) => (
                              <div key={tIdx} style={{ marginBottom: "10px" }}>
                                {topic.subTitle && (
                                  <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "6px 0 4px 0" }}>
                                    {topic.subTitle}
                                  </h3>
                                )}
                                {Array.isArray(topic.details) && topic.details.length > 0 && (
                                  <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                                    {topic.details.map((line, lIdx) => (
                                      <li key={lIdx} style={{ marginBottom: "4px" }}>
                                        {line}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          {sIdx < meeting.sections.length - 1 && (
                            <hr
                              style={{
                                height: "1px",
                                backgroundColor: "#e5e5e5",
                                border: "none",
                                margin: "14px 0",
                              }}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                );
              }

              if (parsed && isLegacySchema(parsed)) {
                const meeting = parsed;
                return (
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {meeting.meetingTitle && (
                      <>
                        <h1
                          style={{
                            fontSize: "30px",
                            fontWeight: "bold",
                            paddingTop: "20px",
                            paddingBottom: "8px",
                            margin: 0,
                          }}
                        >
                          {meeting.meetingTitle}
                        </h1>
                        {meeting.date && <p style={{ fontWeight: "bold", margin: 0 }}>{meeting.date}</p>}
                        {meeting.location && (
                          <p style={{ fontWeight: "bold", margin: 0 }}>{meeting.location}</p>
                        )}
                        {meeting.attendees &&
                          Array.isArray(meeting.attendees) &&
                          meeting.attendees.length > 0 && (
                            <p style={{ fontWeight: "bold", margin: 0 }}>
                              {meeting.attendees.join(", ")}
                            </p>
                          )}
                        <hr
                          style={{
                            height: "1px",
                            backgroundColor: "#e5e5e5",
                            border: "none",
                            margin: "16px 0",
                          }}
                        />
                      </>
                    )}
                    {meeting.topics &&
                      meeting.topics.length > 0 &&
                      meeting.topics.map((topic, topicIndex) => (
                        <div key={topicIndex} style={{ marginBottom: "16px" }}>
                          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                            {topicIndex + 1}. {topic.topic}
                          </h2>
                          {topic.discussion && topic.discussion.length > 0 && (
                            <div>
                              <h3 style={{ fontSize: "20px", fontWeight: "bold", marginTop: "8px" }}>
                                Discussion
                              </h3>
                              {topic.discussion.map((item, index) => (
                                <p key={index}>- {item}</p>
                              ))}
                            </div>
                          )}
                          {topic.proposals &&
                            topic.proposals.length > 0 &&
                            topic.proposals.map((item, index) => (
                              <div key={index} style={{ marginTop: "8px" }}>
                                <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                                  Proposal {item.proposedBy ? `(${item.proposedBy})` : ""}
                                </h3>
                                <p style={{ fontWeight: "bold", margin: 0 }}>{item.proposal}</p>
                                {item.proposalReasons && item.proposalReasons.length > 0 && (
                                  <div>
                                    <h4
                                      style={{
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                        marginTop: "8px",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      Background
                                    </h4>
                                    {item.proposalReasons.map((reason, i) => (
                                      <p key={i}>- {reason}</p>
                                    ))}
                                  </div>
                                )}
                                {item.keyDiscussion && item.keyDiscussion.length > 0 && (
                                  <div>
                                    <h4
                                      style={{
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                        marginTop: "8px",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      Discussion Points
                                      </h4>
                                      {item.keyDiscussion.map((point, i) => (
                                        <p key={i}>- {point}</p>
                                      ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          {topic.decisionsAndTasks && topic.decisionsAndTasks.length > 0 && (
                            <div style={{ marginTop: "8px" }}>
                              <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                                Decisions & Tasks
                              </h3>
                              {topic.decisionsAndTasks.map((task, i) => (
                                <p key={i}>{i + 1}. {task}</p>
                              ))}
                            </div>
                          )}
                          {topicIndex < meeting.topics.length - 1 && (
                            <hr
                              style={{
                                height: "1px",
                                backgroundColor: "#e5e5e5",
                                border: "none",
                                margin: "16px 0",
                              }}
                            />
                          )}
                        </div>
                      ))}
                    {meeting.coreMessage && meeting.coreMessage !== "" && (
                      <p style={{ fontStyle: "italic", fontWeight: "bold", marginTop: "10px" }}>
                        {meeting.coreMessage}
                      </p>
                    )}
                  </div>
                );
              }

              // パース不可/未知スキーマはそのまま（ただしコードフェンスは除去）
              const plain = typeof editedText === "string" ? stripCodeFences(editedText) : editedText;
              return <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{toDisplayText(plain)}</pre>;
            })()
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
