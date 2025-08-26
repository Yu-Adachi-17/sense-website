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
    // full transcript以外（minutes表示）の場合は編集モードを解除
    if (!isExpanded && isEditing) {
      setIsEditing(false);
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

  // ===== JSON スキーマ判定（追記） =====
  const isFlexibleSchema = (obj) =>
    obj &&
    typeof obj === "object" &&
    typeof obj.meetingTitle === "string" &&
    typeof obj.summary === "string" &&
    Array.isArray(obj.sections);

  // 旧（レガシー）JSON互換: topics ベース
  const isLegacySchema = (obj) =>
    obj && typeof obj === "object" && Array.isArray(obj.topics);

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

        {/* タイトルと (全文表示時のみ) Edit/Save ボタン */}
        <div style={styles.titleContainer}>
          {isExpanded && (isEditing ? (
            <button style={styles.saveButton} onClick={handleSave}>
              {t("Save")}
            </button>
          ) : (
            <button style={styles.editButton} onClick={() => setIsEditing(true)}>
              {t("Edit")}
            </button>
          ))}
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

          {(isExpanded && isEditing) ? (
            <textarea
              style={styles.textEditor}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          ) : (
            // JSONのRawデータをパースし、Flexible or Legacy を綺麗に表示
            (() => {
              let parsed;
              try {
                parsed = JSON.parse(editedText);
              } catch (error) {
                // パースに失敗した場合はそのまま表示（従来動作）
                return <p style={{ whiteSpace: "pre-wrap" }}>{editedText}</p>;
              }

              // ---- Flexible(JSON) レンダリング ----
              if (isFlexibleSchema(parsed)) {
                const meeting = parsed;
                return (
                  <div style={{ whiteSpace: "normal", width: "100%" }}>
                    {/* タイトル／日付 */}
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
                          <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>{meeting.date}</p>
                        )}
                        {meeting.location && (
                          <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>{meeting.location}</p>
                        )}
                        {Array.isArray(meeting.attendees) && meeting.attendees.length > 0 && (
                          <p style={{ margin: 0, fontWeight: "bold" }}>
                            {meeting.attendees.join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* サマリー */}
                    {meeting.summary && (
                      <>
                        <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{meeting.summary}</p>
                        <hr
                          style={{
                            height: "1px",
                            backgroundColor: "rgba(255,255,255,0.3)",
                            border: "none",
                            margin: "16px 0",
                          }}
                        />
                      </>
                    )}

                    {/* セクション */}
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
                                backgroundColor: "rgba(255,255,255,0.2)",
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

              // ---- レガシー（topicsベース）JSON レンダリング（後方互換）----
              if (isLegacySchema(parsed)) {
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
                        {meeting.date && (
                          <p style={{ fontWeight: "bold", margin: 0 }}>{meeting.date}</p>
                        )}
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
                            backgroundColor: "rgba(255,255,255,0.3)",
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
                                {item.proposalReasons &&
                                  item.proposalReasons.length > 0 && (
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
                                {item.keyDiscussion &&
                                  item.keyDiscussion.length > 0 && (
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
                          {topic.decisionsAndTasks &&
                            topic.decisionsAndTasks.length > 0 && (
                              <div style={{ marginTop: "8px" }}>
                                <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                                  Decisions & Tasks
                                </h3>
                                {topic.decisionsAndTasks.map((task, i) => (
                                  <p key={i}>
                                    {i + 1}. {task}
                                  </p>
                                ))}
                              </div>
                            )}
                          {topicIndex < meeting.topics.length - 1 && (
                            <hr
                              style={{
                                height: "1px",
                                backgroundColor: "rgba(255,255,255,0.3)",
                                border: "none",
                                margin: "16px 0",
                              }}
                            />
                          )}
                        </div>
                      ))}
                    {meeting.coreMessage && meeting.coreMessage !== "" && (
                      <p
                        style={{
                          fontStyle: "italic",
                          fontWeight: "bold",
                          marginTop: "10px",
                        }}
                      >
                        {meeting.coreMessage}
                      </p>
                    )}
                  </div>
                );
              }

              // ---- 不明スキーマ：JSON をそのまま表示 ----
              return (
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : editedText}
                </pre>
              );
            })()
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
