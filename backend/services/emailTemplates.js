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

// locale → 短縮コード (ja-JP → ja)
function getShortLocale(locale) {
  if (!locale) return "en";
  return String(locale).toLowerCase().split(/[-_]/)[0] || "en";
}

// ========== email ロケール読み込み ==========

const EMAIL_LOCALES_DIR = path.join(__dirname, "..", "locales", "email");

// 英語のデフォルト（どの言語でも、足りないキーはここで補完）
const BASE_LABELS_EN = {
  minutesHeading: "Minutes",
  transcriptHeading: "Transcript",
  date: "Date",
  summary: "Summary",
  section: "Section",
  topic: "Topic",
};

const labelsCache = {}; // shortLocale → labels

function loadLabelsFromFile(locale) {
  const short = getShortLocale(locale);

  // 優先順:
  //   1) 完全なロケール名のファイル (例: pt-BR.json)
  //   2) 短縮ロケール名のファイル (例: pt.json)
  //   3) en.json
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

      // もし { "labels": { ... } } という構造にしていたら labels を優先
      const src =
        json && typeof json === "object" && json.labels ? json.labels : json;

      const merged = {
        ...BASE_LABELS_EN,
        ...src,
      };

      console.log(
        `[EMAIL_I18N] loaded labels for locale=${locale} (file=${file})`
      );
      return merged;
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
  return BASE_LABELS_EN;
}

// 呼び出し側は getLabels(locale) だけ使えば OK
function getLabels(locale) {
  const short = getShortLocale(locale);
  if (labelsCache[short]) {
    return labelsCache[short];
  }

  const labels = loadLabelsFromFile(locale);
  labelsCache[short] = labels;

  // ★ デバッグ用ログ
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
      `<p><strong>${escapeHtml(date)}:</strong> ${escapeHtml(note.date)}</p>`
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

// ========== MeetingMinutes レンダリング（簡易版） ==========
// ここは FlexibleNote ほどきっちりでなくてOKな前提

function buildMeetingMinutesText(mm, locale) {
  const labels = getLabels(locale);
  const lines = [];

  if (mm.meetingTitle) lines.push(String(mm.meetingTitle));
  if (mm.date) lines.push(`${labels.date}: ${mm.date}`);
  if (mm.location) lines.push(`Location: ${mm.location}`);
  if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
    lines.push(`Attendees: ${mm.attendees.join(", ")}`);
  }
  lines.push("");

  if (mm.coreMessage) {
    lines.push("Core Message");
    lines.push("");
    lines.push(mm.coreMessage);
    lines.push("");
  }

  if (Array.isArray(mm.topics)) {
    mm.topics.forEach((t, idx) => {
      const title =
        t.topic && String(t.topic).trim().length > 0
          ? String(t.topic)
          : `${labels.topic} ${idx + 1}`;
      lines.push(title);

      const sections = [
        { key: "discussion", label: "Discussion" },
        { key: "decisions", label: "Decisions" },
        { key: "actionItems", label: "Action Items" },
        { key: "concerns", label: "Concerns" },
        { key: "keyMessages", label: "Key Messages" },
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
  const labels = getLabels(locale);
  const out = [];

  if (mm.meetingTitle) {
    out.push(`<h1>${escapeHtml(mm.meetingTitle)}</h1>`);
  }
  if (mm.date) {
    out.push(
      `<p><strong>${escapeHtml(labels.date)}:</strong> ${escapeHtml(
        mm.date
      )}</p>`
    );
  }
  if (mm.location) {
    out.push(`<p><strong>Location:</strong> ${escapeHtml(mm.location)}</p>`);
  }
  if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
    out.push(
      `<p><strong>Attendees:</strong> ${escapeHtml(
        mm.attendees.join(", ")
      )}</p>`
    );
  }

  if (mm.coreMessage) {
    out.push("<h2>Core Message</h2>");
    out.push(`<p>${escapeHtml(mm.coreMessage)}</p>`);
  }

  if (Array.isArray(mm.topics)) {
    mm.topics.forEach((t, idx) => {
      const title =
        t.topic && String(t.topic).trim().length > 0
          ? String(t.topic)
          : `${labels.topic} ${idx + 1}`;
      out.push(`<h2>${escapeHtml(title)}</h2>`);

      const sections = [
        { key: "discussion", label: "Discussion" },
        { key: "decisions", label: "Decisions" },
        { key: "actionItems", label: "Action Items" },
        { key: "concerns", label: "Concerns" },
        { key: "keyMessages", label: "Key Messages" },
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
    // MeetingMinutes JSON → 簡易レイアウト
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

  // ★ デバッグ
  console.log(
    `[EMAIL_I18N] buildMinutesEmailBodies locale=${locale} ` +
      `(minutesHeading=${labels.minutesHeading})`
  );

  // テキスト版は「Minutes」のラベルをつけず、素の minutesText から始める
  const textParts = [
    minutesText || "(no minutes)",
  ];

  if (transcriptText) {
    textParts.push("");
    textParts.push(`=== ${labels.transcriptHeading} ===`);
    textParts.push("");
    textParts.push(transcriptText);
  }

  const textBody = textParts.join("\n");

  // HTML版も <h2>Minutes</h2> をつけずに、minutesHtml をそのまま使う
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
  const labels = getLabels(locale);
  const { minutesText, minutesHtml } = buildCoreMinutesBodies({
    minutes,
    locale,
  });

  // ★ デバッグ
  console.log(
    `[EMAIL_I18N] buildMinutesOnlyEmailBodies locale=${locale} ` +
      `(minutesHeading=${labels.minutesHeading})`
  );

  const textBody =
    minutesText && minutesText.trim().length > 0
      ? minutesText
      : "(no minutes)";

  // ここでも <h2>Minutes</h2> は付けず、生成済み minutesHtml をそのまま使う
  const htmlBody = minutesHtml;

  return { textBody, htmlBody };
}


module.exports = {
  buildMinutesEmailBodies, // ({ minutes, transcription, locale })
  buildMinutesOnlyEmailBodies, // ({ minutes, locale })
};
