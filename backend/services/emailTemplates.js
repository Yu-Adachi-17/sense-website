// services/emailTemplates.js

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

  // トピック内セクション（共通）
  discussionLabel: "Discussion",
  decisionsLabel: "Decisions",
  actionItemsLabel: "Action Items",
  concernsLabel: "Concerns",
  keyMessagesLabel: "Key Messages",

  // ===== Minutes 共通項目（拡張） =====
  minutesTitleFallback: "Minutes",
  noContentProvided: "No content provided",
  noContentProvidedTitle: "No content provided",

  proposal: "Proposal",
  background: "Background",
  discussionPoints: "Discussion points",
  decisionsAndTasks: "Decisions & tasks",
  coreProblem: "Core problem",
  expectedResult: "Expected result",
  overview: "Overview",

  sections: "Sections",
  topics: "Topics",
  items: "Items",
  content: "Content",
  body: "Body",

  meetingTitle: "Meeting title",
  location: "Location",
  attendees: "Attendees",
  coreMessage: "Core message",
  keyMessages: "Key messages",

  // ===== Brainstorming =====
  brainstorming: {
    problemToSolve: "Problem to solve",
    topIdea: "Top idea",
    meritsAndEffects: "Benefits & impact",
    drawbacksAndRisks: "Drawbacks & risks",
    runnerUpIdea: "Runner-up idea",
    allIdeas: "All ideas",
    ideaTitle: "Idea title",

    ideaDetail: "Idea details",
    benefitsAndEffects: "Benefits & impact",
    brainstormRunnerUps: "Runner-up ideas",
    brainstormIdeaTable: "Idea list",
    description: "Description",
    runnerUpIdeas: "Runner-up ideas",
    ideaTable: "Idea list"
  },

  // ===== Job Interview =====
  jobInterview: {
    motivation: "Motivation",
    careerSummary: "Career summary",
    successes: "Successes",
    failures: "Failures",
    strengths: "Strengths & skills",
    weaknesses: "Weaknesses & improvements",
    values: "Work values",
    careerVision: "Career vision",
    understandingOfCompany: "Understanding of the company",
    workStyleAndConditions: "Work style & conditions",
    applicantQuestions: "Questions from applicant (Q&A)",
    passionMessage: "Passion & message"
  },

  // ===== Lecture / Training =====
  lecture: {
    objectives: "Lecture objectives",
    procedures: "Operations",
    notesAndRemarks: "Notes & remarks",
    examplesAndScenarios: "Examples & scenarios",
    dos: "Dos",
    donts: "Don'ts",
    tipsAndInsights: "Tips & insights",

    attendees: "Attendees",
    lectureObjectives: "Lecture objectives",
    lectureProcedures: "Operations",
    section: "Section",
    steps: "Steps",
    lectureExamples: "Examples & scenarios",
    lectureDosAndDonts: "Dos & don'ts",
    lectureTips: "Tips",
    highlightedStatements: "Highlighted statements"
  },

  // ===== 1on1 =====
  oneonone: {
    title: "1on1",
    recentSuccess: "Recent success",
    contributingFactors: "Contributing factors",
    scalableAction: "Scalable action",
    managerFeedback: "Manager feedback",
    challengeFaced: "Challenge faced",
    bottleneck: "Bottleneck",
    improvementStrategy: "Improvement strategy",
    futureExpectation: "Future expectation",
    reasonForExpectation: "Reason for expectation",
    preparationForFuture: "Preparation for the future",
    concern: "Concern",
    reasonForConcern: "Reason for concern",
    mitigationIdeas: "Mitigation ideas",
    mentalAspects: "Mental aspects",
    feelingsAndBackground: "Feelings & background",
    emotionalChange: "Emotional change",
    nextAction: "Next action",
    coreEmotion: "Core emotion",
    topicGroup: "Topic group",
    expectation: "Expectation",
    worry: "Worry",
    why: "Why",
    whatCausedIt: "What caused it",
    nextTimeStrategy: "Strategy for next time",
    preparation: "Preparation",

    groupedOneOnOneTopics: "Grouped topics",
    topicNumber: "Topic number",
    groupTitle: "Group title",
    momentOfSuccess: "Recent success moment",
    yourContribution: "Your contribution",
    emotionAndBackground: "Emotion & background",
    solutionHint: "Hint for solution",
    forBetter: "Actions going forward"
  },

  // ===== 共通：提案・プレゼン =====
  proposals: "Proposals",
  proposalReasons: "Reasons for proposal",
  proposedBy: "Proposed by",
  keyDiscussion: "Key discussion",

  presentationPresenter: "Presenter",
  presentationCoreProblem: "Problem to solve",
  presentationProposal: "Proposal",
  presentationExpectedResult: "Expected result",
  presentationSpeakerPassion: "Closing message",
  presentationQandA: "Q&A",
  presentationDecisionsAndTasks: "Decisions & tasks",
  presentationFeedback: "Feedback"
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
    labels.coreMessage = minutes.coreMessage;
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
    labels.keyMessages = minutes.keyMessages;
  }

  // ===== Minutes 共通項目（スカラー系） =====
  const scalarMinutesKeys = [
    "minutesTitleFallback",
    "noContentProvided",
    "noContentProvidedTitle",
    "proposal",
    "background",
    "discussionPoints",
    "decisionsAndTasks",
    "coreProblem",
    "expectedResult",
    "overview",
    "sections",
    "topics",
    "items",
    "content",
    "body",
    "meetingTitle",
    "location",
    "attendees",
    "coreMessage",
    "keyMessages",
    "proposals",
    "proposalReasons",
    "proposedBy",
    "keyDiscussion",
    "presentationPresenter",
    "presentationCoreProblem",
    "presentationProposal",
    "presentationExpectedResult",
    "presentationSpeakerPassion",
    "presentationQandA",
    "presentationDecisionsAndTasks",
    "presentationFeedback"
  ];

  scalarMinutesKeys.forEach((key) => {
    if (typeof minutes[key] === "string") {
      labels[key] = minutes[key];
    }
  });

  // ===== ネストされた minutes セクション（brainstorming / jobInterview / lecture / oneonone） =====
  const nestedSections = ["brainstorming", "jobInterview", "lecture", "oneonone"];

  nestedSections.forEach((sectionName) => {
    const baseSection =
      labels[sectionName] && typeof labels[sectionName] === "object"
        ? labels[sectionName]
        : {};
    const localeSection =
      minutes[sectionName] && typeof minutes[sectionName] === "object"
        ? minutes[sectionName]
        : {};
    labels[sectionName] = { ...baseSection, ...localeSection };
  });

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

// セクション値をテキスト行配列に正規化
function normalizeSectionValueToLines(val) {
  if (val == null) return [];
  if (Array.isArray(val)) {
    const out = [];
    val.forEach((item) => {
      if (item == null) return;
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed) out.push(trimmed);
      } else {
        out.push(String(item));
      }
    });
    return out;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(val)];
}

function stringifyKeyDiscussionItem(item) {
  if (item == null) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item !== "object") return String(item);

  const speaker =
    item.speaker ||
    item.speakerName ||
    item.name ||
    item.role ||
    item.presenter ||
    null;
  const summary =
    item.summary ||
    item.content ||
    item.message ||
    item.text ||
    item.comment ||
    null;

  if (speaker && summary) return `${speaker}: ${summary}`;
  if (summary) return String(summary);
  if (speaker) return String(speaker);

  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
}

function appendSectionText(lines, label, value) {
  const rows = normalizeSectionValueToLines(value);
  if (!rows || rows.length === 0) return;

  if (label) {
    lines.push("");
    lines.push(String(label));
  }

  rows.forEach((row) => {
    if (row && row.trim().length > 0) {
      lines.push(`- ${row}`);
    }
  });
}

function appendSectionHTML(out, label, value) {
  const rows = normalizeSectionValueToLines(value);
  if (!rows || rows.length === 0) return;

  if (label) {
    out.push(`<h3>${escapeHtml(String(label))}</h3>`);
  }

  out.push("<ul>");
  rows.forEach((row) => {
    if (row && row.trim().length > 0) {
      out.push(`<li>${escapeHtml(row)}</li>`);
    }
  });
  out.push("</ul>");
}

// ========== MeetingMinutes レンダリング ==========
// MeetingMinutes 構造体を「共通フォーマット」で描画する

function buildMeetingMinutesText(mm, locale) {
  const L = getLabels(locale);
  const lines = [];

  // 基本メタ情報
  if (mm.meetingTitle) lines.push(String(mm.meetingTitle));
  if (mm.date)        lines.push(`${L.date}: ${mm.date}`);
  if (mm.location)    lines.push(`${L.locationLabel}: ${mm.location}`);
  if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
    lines.push(`${L.attendeesLabel}: ${mm.attendees.join(", ")}`);
  }
  lines.push("");

  // コアメッセージ
  if (mm.coreMessage) {
    lines.push(L.coreMessageLabel);
    lines.push("");
    lines.push(mm.coreMessage);
    lines.push("");
  }

  // ルートレベルの提案/プレゼン系フィールド（共通 + presentation 派生）
  const rootSections = [
    { key: "overview",             label: L.overview },
    { key: "coreProblem",          label: L.coreProblem },
    { key: "proposal",             label: L.proposal },
    { key: "expectedResult",       label: L.expectedResult },
    { key: "discussionPoints",     label: L.discussionPoints },
    { key: "decisionsAndTasks",    label: L.decisionsAndTasks },
    { key: "keyMessages",          label: L.keyMessagesLabel || L.keyMessages },

    // プレゼン系（ルート）
    { key: "presentationPresenter",           label: L.presentationPresenter },
    {
      key: "presentationCoreProblem",
      label: L.presentationCoreProblem || L.coreProblem,
    },
    {
      key: "presentationProposal",
      label: L.presentationProposal || L.proposal,
    },
    {
      key: "presentationExpectedResult",
      label: L.presentationExpectedResult || L.expectedResult,
    },
    {
      key: "presentationDecisionsAndTasks",
      label: L.presentationDecisionsAndTasks || L.decisionsAndTasks,
    },
    {
      key: "presentationSpeakerPassion",
      label: L.presentationSpeakerPassion,
    },
    { key: "presentationQandA",    label: L.presentationQandA },
    { key: "presentationFeedback", label: L.presentationFeedback },

    // 1on1 / 感情系（ルート）
    {
      key: "coreEmotion",
      label:
        (L.oneonone && (L.oneonone.coreEmotion || L.oneonone.title)) ||
        "Core emotion",
    },
    {
      key: "toneInsights",
      label: L.toneInsights || "Tone & sentiment",
    }
  ];

  rootSections.forEach(({ key, label }) => {
    if (mm[key] != null && label) {
      appendSectionText(lines, label, mm[key]);
    }
  });

  // ルートレベルの keyDiscussion（あれば）
  if (Array.isArray(mm.keyDiscussion) && mm.keyDiscussion.length > 0) {
    const kdLines = mm.keyDiscussion
      .map(stringifyKeyDiscussionItem)
      .filter((s) => s && s.trim().length > 0);

    if (kdLines.length > 0) {
      appendSectionText(
        lines,
        L.keyDiscussion || "Key discussion",
        kdLines
      );
    }
  }

  // トピックごとの内容（共通 + presentation）
  if (Array.isArray(mm.topics)) {
    mm.topics.forEach((t, idx) => {
      if (!t || typeof t !== "object") return;

      const title =
        t.topic && String(t.topic).trim().length > 0
          ? String(t.topic)
          : `${L.topicFallback || L.topic} ${idx + 1}`;

      lines.push("");
      lines.push(title);

      const topicSections = [
        { key: "overview",         label: L.overview },
        { key: "coreProblem",      label: L.coreProblem },
        { key: "proposal",         label: L.proposal },
        { key: "expectedResult",   label: L.expectedResult },
        { key: "discussionPoints", label: L.discussionPoints },
        { key: "decisionsAndTasks",label: L.decisionsAndTasks },
        { key: "discussion",       label: L.discussionLabel },
        { key: "decisions",        label: L.decisionsLabel },
        { key: "actionItems",      label: L.actionItemsLabel },
        { key: "concerns",         label: L.concernsLabel },
        { key: "keyMessages",      label: L.keyMessagesLabel },

        // プレゼン系（トピック単位）
        { key: "presentationPresenter",           label: L.presentationPresenter },
        {
          key: "presentationCoreProblem",
          label: L.presentationCoreProblem || L.coreProblem,
        },
        {
          key: "presentationProposal",
          label: L.presentationProposal || L.proposal,
        },
        {
          key: "presentationExpectedResult",
          label: L.presentationExpectedResult || L.expectedResult,
        },
        {
          key: "presentationDecisionsAndTasks",
          label: L.presentationDecisionsAndTasks || L.decisionsAndTasks,
        },
        {
          key: "presentationSpeakerPassion",
          label: L.presentationSpeakerPassion,
        },
        { key: "presentationQandA", label: L.presentationQandA },
        { key: "presentationFeedback", label: L.presentationFeedback },

        // 1on1 / 感情系（トピック単位に載せる場合用）
        {
          key: "coreEmotion",
          label:
            (L.oneonone && (L.oneonone.coreEmotion || L.oneonone.title)) ||
            "Core emotion",
        },
        {
          key: "toneInsights",
          label: L.toneInsights || "Tone & sentiment",
        }
      ];

      topicSections.forEach(({ key, label }) => {
        if (t[key] != null && label) {
          appendSectionText(lines, label, t[key]);
        }
      });

      // トピック単位の keyDiscussion
      if (Array.isArray(t.keyDiscussion) && t.keyDiscussion.length > 0) {
        const kdLines = t.keyDiscussion
          .map(stringifyKeyDiscussionItem)
          .filter((s) => s && s.trim().length > 0);

        if (kdLines.length > 0) {
          appendSectionText(
            lines,
            L.keyDiscussion || "Key discussion",
            kdLines
          );
        }
      }

      lines.push("");
    });
  }

  // ===== ここからフォーマット別の追加フィールド =====

  // === ブレスト（brainstorming） ===
  if (mm.brainstorming && typeof mm.brainstorming === "object") {
    const B = L.brainstorming || {};
    const b = mm.brainstorming;

    lines.push("");
    lines.push(B.title || B.problemToSolve || "Brainstorming");

    appendSectionText(lines, B.problemToSolve || "Problem to solve", b.problemToSolve);
    appendSectionText(lines, B.topIdea || "Top idea", b.topIdea);
    appendSectionText(lines, B.meritsAndEffects || "Benefits & impact", b.meritsAndEffects);
    appendSectionText(lines, B.drawbacksAndRisks || "Drawbacks & risks", b.drawbacksAndRisks);
    appendSectionText(lines, B.runnerUpIdea || "Runner-up idea", b.runnerUpIdea);
    appendSectionText(lines, B.allIdeas || "All ideas", b.allIdeas);
    appendSectionText(lines, B.ideaTitle || "Idea title", b.ideaTitle);
    appendSectionText(lines, B.ideaDetail || "Idea details", b.ideaDetail);
    appendSectionText(lines, B.benefitsAndEffects || "Benefits & impact", b.benefitsAndEffects);
  }

  // === 面接（jobInterview） ===
  if (mm.jobInterview && typeof mm.jobInterview === "object") {
    const J = L.jobInterview || {};
    const j = mm.jobInterview;

    lines.push("");
    lines.push(J.title || "Job interview");

    appendSectionText(lines, J.motivation || "Motivation", j.motivation);
    appendSectionText(lines, J.careerSummary || "Career summary", j.careerSummary);
    appendSectionText(lines, J.successes || "Successes", j.successes);
    appendSectionText(lines, J.failures || "Failures", j.failures);
    appendSectionText(lines, J.strengths || "Strengths & skills", j.strengths);
    appendSectionText(lines, J.weaknesses || "Weaknesses & improvements", j.weaknesses);
    appendSectionText(lines, J.values || "Work values", j.values);
    appendSectionText(lines, J.careerVision || "Career vision", j.careerVision);
    appendSectionText(lines, J.understandingOfCompany || "Understanding of the company", j.understandingOfCompany);
    appendSectionText(lines, J.workStyleAndConditions || "Work style & conditions", j.workStyleAndConditions);
    appendSectionText(lines, J.applicantQuestions || "Questions from applicant", j.applicantQuestions);
    appendSectionText(lines, J.passionMessage || "Passion & message", j.passionMessage);
  }

  // === 講義（lecture / training） ===
  if (mm.lecture && typeof mm.lecture === "object") {
    const Lec = L.lecture || {};
    const le = mm.lecture;

    lines.push("");
    lines.push(Lec.title || Lec.objectives || "Lecture / Training");

    appendSectionText(
      lines,
      Lec.objectives || Lec.lectureObjectives || "Lecture objectives",
      le.objectives || le.lectureObjectives
    );
    appendSectionText(
      lines,
      Lec.procedures || Lec.lectureProcedures || "Operations",
      le.procedures || le.lectureProcedures
    );
    appendSectionText(
      lines,
      Lec.notesAndRemarks || "Notes & remarks",
      le.notesAndRemarks
    );
    appendSectionText(
      lines,
      Lec.examplesAndScenarios || Lec.lectureExamples || "Examples & scenarios",
      le.examplesAndScenarios || le.lectureExamples
    );
    appendSectionText(
      lines,
      Lec.dos || "Dos",
      le.dos
    );
    appendSectionText(
      lines,
      Lec.donts || "Don'ts",
      le.donts
    );
    appendSectionText(
      lines,
      Lec.tipsAndInsights || Lec.lectureTips || "Tips & insights",
      le.tipsAndInsights || le.lectureTips
    );
    appendSectionText(
      lines,
      Lec.highlightedStatements || "Highlighted statements",
      le.highlightedStatements
    );
  }

  // === 1on1（oneonone） ===
  if (mm.oneonone && typeof mm.oneonone === "object") {
    const O = L.oneonone || {};
    const o = mm.oneonone;

    lines.push("");
    lines.push(O.title || "1on1");

    appendSectionText(lines, O.recentSuccess || "Recent success", o.recentSuccess);
    appendSectionText(lines, O.contributingFactors || "Contributing factors", o.contributingFactors);
    appendSectionText(lines, O.scalableAction || "Scalable action", o.scalableAction);
    appendSectionText(lines, O.managerFeedback || "Manager feedback", o.managerFeedback);
    appendSectionText(lines, O.challengeFaced || "Challenge faced", o.challengeFaced);
    appendSectionText(lines, O.bottleneck || "Bottleneck", o.bottleneck);
    appendSectionText(lines, O.improvementStrategy || "Improvement strategy", o.improvementStrategy);
    appendSectionText(lines, O.futureExpectation || "Future expectation", o.futureExpectation);
    appendSectionText(lines, O.reasonForExpectation || "Reason for expectation", o.reasonForExpectation);
    appendSectionText(lines, O.preparationForFuture || "Preparation for the future", o.preparationForFuture);
    appendSectionText(lines, O.concern || "Concern", o.concern);
    appendSectionText(lines, O.reasonForConcern || "Reason for concern", o.reasonForConcern);
    appendSectionText(lines, O.mitigationIdeas || "Mitigation ideas", o.mitigationIdeas);
    appendSectionText(lines, O.mentalAspects || "Mental aspects", o.mentalAspects);
    appendSectionText(lines, O.feelingsAndBackground || "Feelings & background", o.feelingsAndBackground);
    appendSectionText(lines, O.emotionalChange || "Emotional change", o.emotionalChange);
    appendSectionText(lines, O.nextAction || "Next action", o.nextAction);
  }

  // === 1on1 グルーピング（groupedOneOnOneTopics） ===
  if (Array.isArray(mm.groupedOneOnOneTopics) && mm.groupedOneOnOneTopics.length > 0) {
    const O = L.oneonone || {};

    lines.push("");
    lines.push(O.groupedOneOnOneTopics || "1on1 Topics");

    mm.groupedOneOnOneTopics.forEach((g, gIdx) => {
      if (!g || typeof g !== "object") return;

      const groupTitle =
        g.groupTitle ||
        g.title ||
        `${O.topicGroup || "Topic group"} ${gIdx + 1}`;

      lines.push("");
      lines.push(groupTitle);

      // グループ内のトピック配列（想定：g.topics）
      if (Array.isArray(g.topics)) {
        g.topics.forEach((t, tIdx) => {
          if (!t || typeof t !== "object") return;

          const topicHeader =
            `${O.topicNumber || "Topic"} ${tIdx + 1}`;
          lines.push("");
          lines.push(topicHeader);

          appendSectionText(
            lines,
            O.momentOfSuccess || "Recent success moment",
            t.momentOfSuccess
          );
          appendSectionText(
            lines,
            O.yourContribution || "Your contribution",
            t.yourContribution
          );
          appendSectionText(
            lines,
            O.emotionAndBackground || "Emotion & background",
            t.emotionAndBackground
          );
          appendSectionText(
            lines,
            O.solutionHint || "Hint for solution",
            t.solutionHint
          );
          appendSectionText(
            lines,
            O.forBetter || "Actions going forward",
            t.forBetter
          );
        });
      }
    });
  }

  return lines.join("\n").trim();
}

function buildMeetingMinutesHTML(mm, locale) {
  const L = getLabels(locale);
  const out = [];

  // 基本メタ情報
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

  // ルートレベルの提案/プレゼン系フィールド
  const rootSections = [
    { key: "overview",             label: L.overview },
    { key: "coreProblem",          label: L.coreProblem },
    { key: "proposal",             label: L.proposal },
    { key: "expectedResult",       label: L.expectedResult },
    { key: "discussionPoints",     label: L.discussionPoints },
    { key: "decisionsAndTasks",    label: L.decisionsAndTasks },
    { key: "keyMessages",          label: L.keyMessagesLabel || L.keyMessages },

    // プレゼン系
    { key: "presentationPresenter",           label: L.presentationPresenter },
    {
      key: "presentationCoreProblem",
      label: L.presentationCoreProblem || L.coreProblem,
    },
    {
      key: "presentationProposal",
      label: L.presentationProposal || L.proposal,
    },
    {
      key: "presentationExpectedResult",
      label: L.presentationExpectedResult || L.expectedResult,
    },
    {
      key: "presentationDecisionsAndTasks",
      label: L.presentationDecisionsAndTasks || L.decisionsAndTasks,
    },
    {
      key: "presentationSpeakerPassion",
      label: L.presentationSpeakerPassion,
    },
    { key: "presentationQandA",    label: L.presentationQandA },
    { key: "presentationFeedback", label: L.presentationFeedback },

    // 1on1 / 感情系
    {
      key: "coreEmotion",
      label:
        (L.oneonone && (L.oneonone.coreEmotion || L.oneonone.title)) ||
        "Core emotion",
    },
    {
      key: "toneInsights",
      label: L.toneInsights || "Tone & sentiment",
    }
  ];

  rootSections.forEach(({ key, label }) => {
    if (mm[key] != null && label) {
      appendSectionHTML(out, label, mm[key]);
    }
  });

  // ルートレベルの keyDiscussion
  if (Array.isArray(mm.keyDiscussion) && mm.keyDiscussion.length > 0) {
    const kdLines = mm.keyDiscussion
      .map(stringifyKeyDiscussionItem)
      .filter((s) => s && s.trim().length > 0);

    if (kdLines.length > 0) {
      appendSectionHTML(
        out,
        L.keyDiscussion || "Key discussion",
        kdLines
      );
    }
  }

  // トピックごとの内容
  if (Array.isArray(mm.topics)) {
    mm.topics.forEach((t, idx) => {
      if (!t || typeof t !== "object") return;

      const title =
        t.topic && String(t.topic).trim().length > 0
          ? String(t.topic)
          : `${L.topicFallback || L.topic} ${idx + 1}`;
      out.push(`<h2>${escapeHtml(title)}</h2>`);

      const topicSections = [
        { key: "overview",         label: L.overview },
        { key: "coreProblem",      label: L.coreProblem },
        { key: "proposal",         label: L.proposal },
        { key: "expectedResult",   label: L.expectedResult },
        { key: "discussionPoints", label: L.discussionPoints },
        { key: "decisionsAndTasks",label: L.decisionsAndTasks },
        { key: "discussion",       label: L.discussionLabel },
        { key: "decisions",        label: L.decisionsLabel },
        { key: "actionItems",      label: L.actionItemsLabel },
        { key: "concerns",         label: L.concernsLabel },
        { key: "keyMessages",      label: L.keyMessagesLabel },

        // プレゼン系
        { key: "presentationPresenter",           label: L.presentationPresenter },
        {
          key: "presentationCoreProblem",
          label: L.presentationCoreProblem || L.coreProblem,
        },
        {
          key: "presentationProposal",
          label: L.presentationProposal || L.proposal,
        },
        {
          key: "presentationExpectedResult",
          label: L.presentationExpectedResult || L.expectedResult,
        },
        {
          key: "presentationDecisionsAndTasks",
          label: L.presentationDecisionsAndTasks || L.decisionsAndTasks,
        },
        {
          key: "presentationSpeakerPassion",
          label: L.presentationSpeakerPassion,
        },
        { key: "presentationQandA", label: L.presentationQandA },
        { key: "presentationFeedback", label: L.presentationFeedback },

        // 1on1 / 感情系
        {
          key: "coreEmotion",
          label:
            (L.oneonone && (L.oneonone.coreEmotion || L.oneonone.title)) ||
            "Core emotion",
        },
        {
          key: "toneInsights",
          label: L.toneInsights || "Tone & sentiment",
        }
      ];

      topicSections.forEach(({ key, label }) => {
        if (t[key] != null && label) {
          appendSectionHTML(out, label, t[key]);
        }
      });

      if (Array.isArray(t.keyDiscussion) && t.keyDiscussion.length > 0) {
        const kdLines = t.keyDiscussion
          .map(stringifyKeyDiscussionItem)
          .filter((s) => s && s.trim().length > 0);

        if (kdLines.length > 0) {
          appendSectionHTML(
            out,
            L.keyDiscussion || "Key discussion",
            kdLines
          );
        }
      }
    });
  }

  // === ブレスト（brainstorming） ===
  if (mm.brainstorming && typeof mm.brainstorming === "object") {
    const B = L.brainstorming || {};
    const b = mm.brainstorming;

    out.push(`<h2>${escapeHtml(B.title || B.problemToSolve || "Brainstorming")}</h2>`);

    appendSectionHTML(out, B.problemToSolve || "Problem to solve", b.problemToSolve);
    appendSectionHTML(out, B.topIdea || "Top idea", b.topIdea);
    appendSectionHTML(out, B.meritsAndEffects || "Benefits & impact", b.meritsAndEffects);
    appendSectionHTML(out, B.drawbacksAndRisks || "Drawbacks & risks", b.drawbacksAndRisks);
    appendSectionHTML(out, B.runnerUpIdea || "Runner-up idea", b.runnerUpIdea);
    appendSectionHTML(out, B.allIdeas || "All ideas", b.allIdeas);
    appendSectionHTML(out, B.ideaTitle || "Idea title", b.ideaTitle);
    appendSectionHTML(out, B.ideaDetail || "Idea details", b.ideaDetail);
    appendSectionHTML(out, B.benefitsAndEffects || "Benefits & impact", b.benefitsAndEffects);
  }

  // === 面接（jobInterview） ===
  if (mm.jobInterview && typeof mm.jobInterview === "object") {
    const J = L.jobInterview || {};
    const j = mm.jobInterview;

    out.push(`<h2>${escapeHtml(J.title || "Job interview")}</h2>`);

    appendSectionHTML(out, J.motivation || "Motivation", j.motivation);
    appendSectionHTML(out, J.careerSummary || "Career summary", j.careerSummary);
    appendSectionHTML(out, J.successes || "Successes", j.successes);
    appendSectionHTML(out, J.failures || "Failures", j.failures);
    appendSectionHTML(out, J.strengths || "Strengths & skills", j.strengths);
    appendSectionHTML(out, J.weaknesses || "Weaknesses & improvements", j.weaknesses);
    appendSectionHTML(out, J.values || "Work values", j.values);
    appendSectionHTML(out, J.careerVision || "Career vision", j.careerVision);
    appendSectionHTML(out, J.understandingOfCompany || "Understanding of the company", j.understandingOfCompany);
    appendSectionHTML(out, J.workStyleAndConditions || "Work style & conditions", j.workStyleAndConditions);
    appendSectionHTML(out, J.applicantQuestions || "Questions from applicant", j.applicantQuestions);
    appendSectionHTML(out, J.passionMessage || "Passion & message", j.passionMessage);
  }

  // === 講義（lecture） ===
  if (mm.lecture && typeof mm.lecture === "object") {
    const Lec = L.lecture || {};
    const le = mm.lecture;

    out.push(
      `<h2>${escapeHtml(
        Lec.title || Lec.objectives || "Lecture / Training"
      )}</h2>`
    );

    appendSectionHTML(
      out,
      Lec.objectives || Lec.lectureObjectives || "Lecture objectives",
      le.objectives || le.lectureObjectives
    );
    appendSectionHTML(
      out,
      Lec.procedures || Lec.lectureProcedures || "Operations",
      le.procedures || le.lectureProcedures
    );
    appendSectionHTML(
      out,
      Lec.notesAndRemarks || "Notes & remarks",
      le.notesAndRemarks
    );
    appendSectionHTML(
      out,
      Lec.examplesAndScenarios || Lec.lectureExamples || "Examples & scenarios",
      le.examplesAndScenarios || le.lectureExamples
    );
    appendSectionHTML(out, Lec.dos || "Dos", le.dos);
    appendSectionHTML(out, Lec.donts || "Don'ts", le.donts);
    appendSectionHTML(
      out,
      Lec.tipsAndInsights || Lec.lectureTips || "Tips & insights",
      le.tipsAndInsights || le.lectureTips
    );
    appendSectionHTML(
      out,
      Lec.highlightedStatements || "Highlighted statements",
      le.highlightedStatements
    );
  }

  // === 1on1（oneonone） ===
  if (mm.oneonone && typeof mm.oneonone === "object") {
    const O = L.oneonone || {};
    const o = mm.oneonone;

    out.push(`<h2>${escapeHtml(O.title || "1on1")}</h2>`);

    appendSectionHTML(out, O.recentSuccess || "Recent success", o.recentSuccess);
    appendSectionHTML(out, O.contributingFactors || "Contributing factors", o.contributingFactors);
    appendSectionHTML(out, O.scalableAction || "Scalable action", o.scalableAction);
    appendSectionHTML(out, O.managerFeedback || "Manager feedback", o.managerFeedback);
    appendSectionHTML(out, O.challengeFaced || "Challenge faced", o.challengeFaced);
    appendSectionHTML(out, O.bottleneck || "Bottleneck", o.bottleneck);
    appendSectionHTML(out, O.improvementStrategy || "Improvement strategy", o.improvementStrategy);
    appendSectionHTML(out, O.futureExpectation || "Future expectation", o.futureExpectation);
    appendSectionHTML(out, O.reasonForExpectation || "Reason for expectation", o.reasonForExpectation);
    appendSectionHTML(out, O.preparationForFuture || "Preparation for the future", o.preparationForFuture);
    appendSectionHTML(out, O.concern || "Concern", o.concern);
    appendSectionHTML(out, O.reasonForConcern || "Reason for concern", o.reasonForConcern);
    appendSectionHTML(out, O.mitigationIdeas || "Mitigation ideas", o.mitigationIdeas);
    appendSectionHTML(out, O.mentalAspects || "Mental aspects", o.mentalAspects);
    appendSectionHTML(out, O.feelingsAndBackground || "Feelings & background", o.feelingsAndBackground);
    appendSectionHTML(out, O.emotionalChange || "Emotional change", o.emotionalChange);
    appendSectionHTML(out, O.nextAction || "Next action", o.nextAction);
  }

  // === 1on1 グルーピング（groupedOneOnOneTopics） ===
  if (Array.isArray(mm.groupedOneOnOneTopics) && mm.groupedOneOnOneTopics.length > 0) {
    const O = L.oneonone || {};

    out.push(
      `<h2>${escapeHtml(
        O.groupedOneOnOneTopics || "1on1 Topics"
      )}</h2>`
    );

    mm.groupedOneOnOneTopics.forEach((g, gIdx) => {
      if (!g || typeof g !== "object") return;

      const groupTitle =
        g.groupTitle ||
        g.title ||
        `${O.topicGroup || "Topic group"} ${gIdx + 1}`;

      out.push(`<h3>${escapeHtml(groupTitle)}</h3>`);

      if (Array.isArray(g.topics)) {
        g.topics.forEach((t, tIdx) => {
          if (!t || typeof t !== "object") return;

          const topicHeader =
            `${O.topicNumber || "Topic"} ${tIdx + 1}`;
          out.push(`<h4>${escapeHtml(topicHeader)}</h4>`);

          appendSectionHTML(
            out,
            O.momentOfSuccess || "Recent success moment",
            t.momentOfSuccess
          );
          appendSectionHTML(
            out,
            O.yourContribution || "Your contribution",
            t.yourContribution
          );
          appendSectionHTML(
            out,
            O.emotionAndBackground || "Emotion & background",
            t.emotionAndBackground
          );
          appendSectionHTML(
            out,
            O.solutionHint || "Hint for solution",
            t.solutionHint
          );
          appendSectionHTML(
            out,
            O.forBetter || "Actions going forward",
            t.forBetter
          );
        });
      }
    });
  }

  return out.join("\n");
}


// ========== Core: JSON かどうかを見て minutes 本文を作る ==========

function buildCoreMinutesBodies({ minutes, locale }) {
  // 1) 生の minutes を「文字列」に正規化（JSONでも文字列でもOKにする）
  const raw = normalizeMinutesRaw(minutes);

  // 2) デバッグ用：環境変数 LOG_RAW_MINUTES=1 のときだけ、Railwayログに「NLP生出力」を吐く
  if (process.env.LOG_RAW_MINUTES === "1") {
    try {
      const chunkSize = 4000; // 1ログあたりの最大文字数（多すぎるときは分割）
      console.log(
        `[EMAIL_RAW_MINUTES] locale=${locale} length=${raw.length}`
      );
      for (let i = 0; i < raw.length; i += chunkSize) {
        const chunk = raw.slice(i, i + chunkSize);
        console.log(
          `[EMAIL_RAW_MINUTES] [${i}-${Math.min(
            i + chunkSize,
            raw.length
          )}]\n${chunk}`
        );
      }
    } catch (e) {
      console.error(
        "[EMAIL_RAW_MINUTES] failed to log raw minutes:",
        e.message
      );
    }
  }

  // 3) ここから先は従来通り：JSONならパースしてFlexibleNote/MeetingMinutesとして扱う
  const obj = safeParseJSON(raw);
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
    const fallback = raw || "(no minutes)";
    minutesText = fallback;
    minutesHtml =
      '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
      escapeHtml(fallback) +
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
    locale
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
    locale
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
  buildMinutesOnlyEmailBodies // ({ minutes, locale })
};
