// backend/services/emailTemplates.js

const fs = require("fs");
const path = require("path");

// ========== 基本ヘルパー ==========

// HTMLエスケープ
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// minutes がオブジェクトでも文字列でも安全に扱う（生文字列）
function normalizeMinutesRaw(minutes) {
  if (minutes == null) return "";
  if (typeof minutes === "string") return minutes;
  try {
    return JSON.stringify(minutes, null, 2);
  } catch {
    return String(minutes);
  }
}

// transcription 正規化
function normalizeTranscript(transcription) {
  if (!transcription) return "";
  if (typeof transcription === "string") return transcription;
  try {
    return JSON.stringify(transcription, null, 2);
  } catch {
    return String(transcription);
  }
}

// locale → 短縮コード (ja-JP / ja_jp → ja)
function getShortLocale(locale) {
  if (!locale) return "en";
  return String(locale).toLowerCase().split(/[-_]/)[0] || "en";
}

// ========== email ロケール読み込み ==========

const EMAIL_LOCALES_DIR = path.join(__dirname, "..", "locales", "email");

// 「メール本文で使うラベル」のマスタ
const BASE_LABELS_EN = {
  // 章タイトル
  minutesHeading: "Minutes",
  transcriptHeading: "Full Transcript",

  // メタ情報
  dateLabel: "Date",
  locationLabel: "Location",
  attendeesLabel: "Attendees",
  coreMessageLabel: "Core Message",

  // FlexibleNote / MeetingMinutes 共通
  date: "Date",
  summary: "Summary",
  summaryLabel: "Summary",
  section: "Section",
  sectionLabel: "Section",
  topic: "Topic",
  topicFallback: "Topic",

  // トピック内セクション
  discussionLabel: "Discussion",
  decisionsLabel: "Decisions",
  actionItemsLabel: "Action Items",
  concernsLabel: "Concerns",
  keyMessagesLabel: "Key Messages",
};

const labelsCache = {}; // shortLocale → labels

// locales/email/ja.json の巨大な JSON から、メールで使うラベルだけを抜き出す
function buildLabelsFromJson(root) {
  const labels = { ...BASE_LABELS_EN };
  if (!root || typeof root !== "object") return labels;

  // --- 1) トップレベル（"Minutes", "Full Transcript" など） ---
  if (typeof root["Minutes"] === "string") {
    labels.minutesHeading = root["Minutes"];
  }
  if (typeof root["Full Transcript"] === "string") {
    labels.transcriptHeading = root["Full Transcript"];
  }

  // Date / Summary / Topic / Section のトップレベルキー（あれば仮で採用）
  if (typeof root["Date"] === "string") {
    labels.date = root["Date"];
    labels.dateLabel = root["Date"];
  }
  if (typeof root["Summary"] === "string") {
    labels.summary = root["Summary"];
    labels.summaryLabel = root["Summary"];
  }
  if (typeof root["Topic"] === "string") {
    labels.topic = root["Topic"];
    labels.topicFallback = root["Topic"];
  }
  if (typeof root["Section"] === "string") {
    labels.section = root["Section"];
    labels.sectionLabel = root["Section"];
  }

  // --- 2) minutes ネームスペース配下を優先採用 ---
  const minutes =
    root.minutes && typeof root.minutes === "object" ? root.minutes : {};

  // メタ情報
  if (typeof minutes.date === "string") {
    labels.date = minutes.date;
    labels.dateLabel = minutes.date;
  }
  if (typeof minutes.location === "string") {
    labels.locationLabel = minutes.location;
  }
  if (typeof minutes.attendees === "string") {
    labels.attendeesLabel = minutes.attendees;
  }
  if (typeof minutes.coreMessage === "string") {
    labels.coreMessageLabel = minutes.coreMessage;
  }

  // トピック系の共通ラベル
  if (typeof minutes.topic === "string") {
    labels.topic = minutes.topic;
  }
  if (typeof minutes.topicFallback === "string") {
    labels.topicFallback = minutes.topicFallback;
  }
  if (typeof minutes.sections === "string") {
    labels.section = minutes.sections;
    labels.sectionLabel = minutes.sections;
  }
  if (typeof minutes.summary === "string") {
    labels.summary = minutes.summary;
    labels.summaryLabel = minutes.summary;
  }

  // セクション名（議論 / 決定 / TODO / 懸念 / 重要ポイント）
  if (typeof minutes.discussion === "string") {
    labels.discussionLabel = minutes.discussion;
  }
  if (typeof minutes.decisions === "string") {
    labels.decisionsLabel = minutes.decisions;
  }
  if (typeof minutes.actionItems === "string") {
    labels.actionItemsLabel = minutes.actionItems;
  }
  if (typeof minutes.concerns === "string") {
    labels.concernsLabel = minutes.concerns;
  }
  if (typeof minutes.keyMessages === "string") {
    labels.keyMessagesLabel = minutes.keyMessages;
  }

  // 将来の拡張用にそのまま持っておく（Brainstorm / Interview / Lecture など）
  labels.formats = root.formats || {};
  labels.minutesDict = minutes;

  return labels;
}

function loadLabelsFromFile(locale) {
  const short = getShortLocale(locale);

  // 優先順: 完全ロケール → 短縮ロケール → en
  const candidates = [];
  if (locale) {
    candidates.push(`${locale}.json`);
  }
  if (!candidates.includes(`${short}.json`)) {
    candidates.push(`${short}.json`);
  }
  candidates.push("en.json");

  for (const file of candidates) {
    const fullPath = path.join(EMAIL_LOCALES_DIR, file);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const raw = fs.readFileSync(fullPath, "utf8");
      const json = JSON.parse(raw);
      const labels = buildLabelsFromJson(json);

      console.log(
        `[EMAIL_I18N] loaded labels for locale=${locale} (file=${file}) ` +
          `minutesHeading=${labels.minutesHeading}, date=${labels.date}, summary=${labels.summary}, topic=${labels.topic}`
      );

      return labels;
    } catch (e) {
      console.error(
        "[EMAIL_I18N] Failed to load locale file:",
        fullPath,
        e.message
      );
    }
  }

  console.warn(
    `[EMAIL_I18N] No locale file found for ${locale}. Fallback to BASE_LABELS_EN`
  );
  return { ...BASE_LABELS_EN };
}

// 呼び出し側は getLabels(locale) だけ使えば OK
function getLabels(locale) {
  const short = getShortLocale(locale);
  if (!labelsCache[short]) {
    labelsCache[short] = loadLabelsFromFile(locale);
  }
  const labels = labelsCache[short];

  console.log(
    `[EMAIL_I18N] getLabels locale=${locale} short=${short} -> ` +
      `minutesHeading=${labels.minutesHeading}, date=${labels.date}, summary=${labels.summary}, topic=${labels.topic}`
  );

  return labels;
}

// ========== JSON 判定ヘルパー ==========

function safeParseJSON(maybeJson) {
  if (maybeJson == null) return null;
  if (typeof maybeJson !== "string") return maybeJson;
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

function isFlexibleNoteShape(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.meetingTitle === "string" &&
    typeof obj.summary === "string" &&
    Array.isArray(obj.sections)
  );
}

function isMeetingMinutesShape(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.meetingTitle === "string" &&
    typeof obj.date === "string" &&
    Array.isArray(obj.topics)
  );
}

// ========== FlexibleNote レンダリング ==========

function buildFlexibleNoteText(note, locale) {
  const { date, summary, section, topic } = getLabels(locale);
  const lines = [];

  if (note.meetingTitle) lines.push(String(note.meetingTitle));
  if (note.date) lines.push(`${date}: ${note.date}`);
  lines.push("");

  if (note.summary) {
    lines.push(summary);
    lines.push("");
    lines.push(note.summary);
    lines.push("");
  }

  if (Array.isArray(note.sections)) {
    note.sections.forEach((sec, idx) => {
      const sectionTitle =
        sec.title && String(sec.title).trim().length > 0
          ? String(sec.title)
          : `${section} ${idx + 1}`;
      lines.push(sectionTitle);
      lines.push("");

      if (Array.isArray(sec.topics)) {
        sec.topics.forEach((t) => {
          if (t.subTitle) {
            lines.push(`${topic}: ${t.subTitle}`);
          }
          if (Array.isArray(t.details) && t.details.length > 0) {
            t.details.forEach((d) => {
              lines.push(`- ${d}`);
            });
          }
          lines.push("");
        });
      }
    });
  }

  return lines.join("\n").trim();
}

function buildFlexibleNoteHTML(note, locale) {
  const { date, summary, section, topic } = getLabels(locale);
  const out = [];

  if (note.meetingTitle) {
    out.push(`<h1>${escapeHtml(note.meetingTitle)}</h1>`);
  }
  if (note.date) {
    out.push(
      `<p><strong>${escapeHtml(date)}:</strong> ${escapeHtml(
        note.date
      )}</p>`
    );
  }

  if (note.summary) {
    out.push(`<h2>${escapeHtml(summary)}</h2>`);
    out.push(`<p>${escapeHtml(note.summary)}</p>`);
  }

  if (Array.isArray(note.sections)) {
    note.sections.forEach((sec, idx) => {
      const sectionTitle =
        sec.title && String(sec.title).trim().length > 0
          ? String(sec.title)
          : `${section} ${idx + 1}`;
      out.push(`<h2>${escapeHtml(sectionTitle)}</h2>`);

      if (Array.isArray(sec.topics)) {
        sec.topics.forEach((t) => {
          if (t.subTitle) {
            out.push(
              `<h3>${escapeHtml(topic)}: ${escapeHtml(t.subTitle)}</h3>`
            );
          }
          if (Array.isArray(t.details) && t.details.length > 0) {
            out.push("<ul>");
            t.details.forEach((d) => {
              out.push(`<li>${escapeHtml(d)}</li>`);
            });
            out.push("</ul>");
          }
        });
      }
    });
  }

  return out.join("\n");
}

// ========== MeetingMinutes レンダリング ==========
// MeetingMinutes 構造体を「共通フォーマット」で描画する

function buildMeetingMinutesText(mm, locale) {
  const L = getLabels(locale);
  const lines = [];

  if (mm.meetingTitle) lines.push(String(mm.meetingTitle));
  if (mm.date) lines.push(`${L.date}: ${mm.date}`);
  if (mm.location) lines.push(`${L.locationLabel}: ${mm.location}`);
  if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
    lines.push(`${L.attendeesLabel}: ${mm.attendees.join(", ")}`);
  }
  lines.push("");

  if (mm.coreMessage) {
    lines.push(L.coreMessageLabel);
    lines.push("");
    lines.push(mm.coreMessage);
    lines.push("");
  }

  if (Array.isArray(mm.topics)) {
    mm.topics.forEach((t, idx) => {
      const title =
        t.topic && String(t.topic).trim().length > 0
          ? String(t.topic)
          : `${L.topicFallback || L.topic} ${idx + 1}`;
      lines.push(title);

      const sections = [
        { key: "discussion", label: L.discussionLabel },
        { key: "decisions", label: L.decisionsLabel },
        { key: "actionItems", label: L.actionItemsLabel },
        { key: "concerns", label: L.concernsLabel },
        { key: "keyMessages", label: L.keyMessagesLabel },
      ];

      sections.forEach(({ key, label }) => {
        const val = t[key];
        if (Array.isArray(val) && val.length > 0) {
          lines.push("");
          lines.push(label);
          val.forEach((d) => {
            lines.push(`- ${d}`);
          });
        }
      });

      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

function buildMeetingMinutesHTML(mm, locale) {
  const L = getLabels(locale);
  const out = [];

  if (mm.meetingTitle) {
    out.push(`<h1>${escapeHtml(mm.meetingTitle)}</h1>`);
  }
  if (mm.date) {
    out.push(
      `<p><strong>${escapeHtml(L.date)}:</strong> ${escapeHtml(
        mm.date
      )}</p>`
    );
  }
  if (mm.location) {
    out.push(
      `<p><strong>${escapeHtml(L.locationLabel)}:</strong> ${escapeHtml(
        mm.location
      )}</p>`
    );
  }
  if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
    out.push(
      `<p><strong>${escapeHtml(L.attendeesLabel)}:</strong> ${escapeHtml(
        mm.attendees.join(", ")
      )}</p>`
    );
  }

  if (mm.coreMessage) {
    out.push(`<h2>${escapeHtml(L.coreMessageLabel)}</h2>`);
    out.push(`<p>${escapeHtml(mm.coreMessage)}</p>`);
  }

  if (Array.isArray(mm.topics)) {
    mm.topics.forEach((t, idx) => {
      const title =
        t.topic && String(t.topic).trim().length > 0
          ? String(t.topic)
          : `${L.topicFallback || L.topic} ${idx + 1}`;
      out.push(`<h2>${escapeHtml(title)}</h2>`);

      const sections = [
        { key: "discussion", label: L.discussionLabel },
        { key: "decisions", label: L.decisionsLabel },
        { key: "actionItems", label: L.actionItemsLabel },
        { key: "concerns", label: L.concernsLabel },
        { key: "keyMessages", label: L.keyMessagesLabel },
      ];

      sections.forEach(({ key, label }) => {
        const val = t[key];
        if (Array.isArray(val) && val.length > 0) {
          out.push(`<h3>${escapeHtml(label)}</h3>`);
          out.push("<ul>");
          val.forEach((d) => {
            out.push(`<li>${escapeHtml(d)}</li>`);
          });
          out.push("</ul>");
        }
      });
    });
  }

  return out.join("\n");
}

// ========== Core: JSON かどうかを見て minutes 本文を作る ==========

function buildCoreMinutesBodies({ minutes, locale }) {
  const obj = safeParseJSON(minutes);
  let minutesText;
  let minutesHtml;

  if (isFlexibleNoteShape(obj)) {
    // FlexibleNote JSON → 人間可読テキスト/HTML
    minutesText = buildFlexibleNoteText(obj, locale);
    minutesHtml = buildFlexibleNoteHTML(obj, locale);
  } else if (isMeetingMinutesShape(obj)) {
    // MeetingMinutes JSON → 共通レイアウト
    minutesText = buildMeetingMinutesText(obj, locale);
    minutesHtml = buildMeetingMinutesHTML(obj, locale);
  } else {
    // どの形式でもなければ「生文字列」として扱う
    const raw = normalizeMinutesRaw(minutes);
    minutesText = raw || "(no minutes)";
    minutesHtml =
      "<pre style=\"white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\">" +
      escapeHtml(raw || "(no minutes)") +
      "</pre>";
  }

  return { minutesText, minutesHtml };
}

/**
 * Minutes + Transcript 両方を含んだメール本文
 * - /api/transcribe
 * - /api/send-minutes-email
 */
function buildMinutesEmailBodies({ minutes, transcription, locale }) {
  const labels = getLabels(locale);
  const { minutesText, minutesHtml } = buildCoreMinutesBodies({
    minutes,
    locale,
  });
  const transcriptText = normalizeTranscript(transcription);

  // テキスト版（上に Minutes 見出しは付けない）
  const parts = [];

  if (minutesText && minutesText.trim().length > 0) {
    parts.push(minutesText);
  } else {
    parts.push("(no minutes)");
  }

  if (transcriptText) {
    parts.push("");
    parts.push(`=== ${labels.transcriptHeading} ===`);
    parts.push("");
    parts.push(transcriptText);
  }

  const textBody = parts.join("\n");

  // HTML 版（こちらも Minutes 見出しは付けずに、そのまま本文から）
  let htmlBody = minutesHtml;

  if (transcriptText) {
    htmlBody +=
      "\n<hr/>" +
      `<h3>${escapeHtml(labels.transcriptHeading)}</h3>` +
      `<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">` +
      escapeHtml(transcriptText) +
      "</pre>";
  }

  return { textBody, htmlBody };
}

/**
 * Minutes だけを送るメール本文
 * - /api/minutes-email-from-audio で使用（Transcriptは付けない）
 */
function buildMinutesOnlyEmailBodies({ minutes, locale }) {
  const { minutesText, minutesHtml } = buildCoreMinutesBodies({
    minutes,
    locale,
  });

  const textBody =
    minutesText && minutesText.trim().length > 0
      ? minutesText
      : "(no minutes)";

  const htmlBody = minutesHtml;

  console.log(
    `[EMAIL_I18N] buildMinutesOnlyEmailBodies locale=${locale}`
  );

  return { textBody, htmlBody };
}

module.exports = {
  buildMinutesEmailBodies, // ({ minutes, transcription, locale })
  buildMinutesOnlyEmailBodies, // ({ minutes, locale })
};
