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
  const { date, summary, section /*, topic*/ } = getLabels(locale);
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
            // ★ ここを変更：「議題: 」を付けず、サブタイトルだけ出す
            lines.push(String(t.subTitle));
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
  const { date, summary, section /*, topic*/ } = getLabels(locale);
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
            // ★ ここを変更：「議題: 」を付けず、サブタイトルだけ見出しにする
            out.push(`<h3>${escapeHtml(t.subTitle)}</h3>`);
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
// ========== MeetingMinutes レンダリング（テキスト） ==========
// MeetingMinutes / TopicItem の Swift 構造体に厳密に沿った描画

function buildMeetingMinutesText(mm, locale) {
  const L = getLabels(locale);
  const lines = [];

  // ---- ローカルヘルパー ----
  function pick(...candidates) {
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) return c;
    }
    return null;
  }

  function hasValue(val) {
    if (val == null) return false;
    if (Array.isArray(val)) {
      return val.some((v) => v != null && String(v).trim().length > 0);
    }
    if (typeof val === "object") {
      return Object.keys(val).length > 0;
    }
    return String(val).trim().length > 0;
  }

  // ProposalItem[] → テキスト
  function appendProposalsText(proposals) {
    if (!Array.isArray(proposals) || proposals.length === 0) return;

    const label = pick(L.proposals, L.proposal, "Proposals");
    lines.push("");
    lines.push(label);

    proposals.forEach((p, idx) => {
      if (!p || typeof p !== "object") return;

      const baseTitle = p.proposal || `${label} ${idx + 1}`;
      const by = p.proposedBy ? ` (${p.proposedBy})` : "";
      lines.push(`- ${baseTitle}${by}`);

      if (hasValue(p.proposalReasons)) {
        const subLabel = pick(L.proposalReasons, "Reasons for proposal");
        const rows = normalizeSectionValueToLines(p.proposalReasons);
        if (rows.length > 0) {
          lines.push(`  ${subLabel}`);
          rows.forEach((r) => {
            if (r && r.trim().length > 0) {
              lines.push(`  - ${r}`);
            }
          });
        }
      }

      if (hasValue(p.keyDiscussion)) {
        const subLabel = pick(L.keyDiscussion, "Key discussion");
        const rows = normalizeSectionValueToLines(p.keyDiscussion);
        if (rows.length > 0) {
          lines.push(`  ${subLabel}`);
          rows.forEach((r) => {
            if (r && r.trim().length > 0) {
              lines.push(`  - ${r}`);
            }
          });
        }
      }

      if (hasValue(p.decisionsAndTasks)) {
        const subLabel = pick(L.decisionsAndTasks, "Decisions & tasks");
        const rows = normalizeSectionValueToLines(p.decisionsAndTasks);
        if (rows.length > 0) {
          lines.push(`  ${subLabel}`);
          rows.forEach((r) => {
            if (r && r.trim().length > 0) {
              lines.push(`  - ${r}`);
            }
          });
        }
      }
    });
  }

  // Brainstorm（TopicItem.*）→ テキスト
  function appendBrainstormForTopic(t) {
    const B = L.brainstorming || {};

    const hasBrainstorm =
      hasValue(t.brainstormCoreProblem) ||
      hasValue(t.brainstormTopIdea) ||
      hasValue(t.brainstormRunnerUps) ||
      hasValue(t.brainstormIdeaTable);

    if (!hasBrainstorm) return;

    // 問題意識
    appendSectionText(
      lines,
      pick(B.problemToSolve, "Problem to solve"),
      t.brainstormCoreProblem
    );

    // Top idea
    if (t.brainstormTopIdea && typeof t.brainstormTopIdea === "object") {
      const idea = t.brainstormTopIdea;
      const titleLabel = pick(B.topIdea, "Top idea");

      if (idea.title) {
        lines.push("");
        lines.push(titleLabel);
        lines.push(`- ${idea.title}`);
      } else {
        appendSectionText(lines, titleLabel, idea.title);
      }

      appendSectionText(
        lines,
        pick(B.ideaDetail, "Idea details"),
        idea.ideaDetail
      );
      appendSectionText(
        lines,
        pick(B.benefitsAndEffects, B.meritsAndEffects, "Benefits & impact"),
        idea.benefitsAndEffects
      );
      appendSectionText(
        lines,
        pick(B.drawbacksAndRisks, "Drawbacks & risks"),
        idea.drawbacksAndRisks
      );
      appendSectionText(
        lines,
        pick(L.decisionsAndTasks, "Decisions & tasks"),
        idea.decisionsAndTasks
      );
      appendSectionText(
        lines,
        pick(L.keyMessagesLabel, L.keyMessages, "Key messages"),
        idea.keyMessages
      );
    }

    // Runner-up ideas
    if (Array.isArray(t.brainstormRunnerUps) && t.brainstormRunnerUps.length > 0) {
      const ruLabel = pick(B.runnerUpIdeas, B.runnerUpIdea, "Runner-up ideas");
      lines.push("");
      lines.push(ruLabel);

      t.brainstormRunnerUps.forEach((idea, idx) => {
        if (!idea || typeof idea !== "object") return;
        const title = idea.title || `${ruLabel} ${idx + 1}`;
        lines.push(`- ${title}`);
        appendSectionText(
          lines,
          pick(B.ideaDetail, "Idea details"),
          idea.ideaDetail
        );
        appendSectionText(
          lines,
          pick(B.benefitsAndEffects, B.meritsAndEffects, "Benefits & impact"),
          idea.benefitsAndEffects
        );
        appendSectionText(
          lines,
          pick(B.drawbacksAndRisks, "Drawbacks & risks"),
          idea.drawbacksAndRisks
        );
      });
    }

    // Idea table
    if (Array.isArray(t.brainstormIdeaTable) && t.brainstormIdeaTable.length > 0) {
      const tableLabel = pick(B.ideaTable, B.brainstormIdeaTable, "Idea list");
      lines.push("");
      lines.push(tableLabel);

      t.brainstormIdeaTable.forEach((row) => {
        if (!row || typeof row !== "object") return;
        const title = row.title || "";
        const desc = row.description || "";
        if (title || desc) {
          const suffix = title && desc ? `: ${desc}` : desc;
          lines.push(`- ${title || ""}${suffix || ""}`);
        }
      });
    }
  }

  // Job Interview（TopicItem.*）→ テキスト
  function appendJobInterviewForTopic(t) {
    const J = L.jobInterview || {};

    const hasInterview =
      hasValue(t.motivation) ||
      hasValue(t.careerSummary) ||
      hasValue(t.successes) ||
      hasValue(t.failures) ||
      hasValue(t.strengths) ||
      hasValue(t.weaknesses) ||
      hasValue(t.values) ||
      hasValue(t.careerVision) ||
      hasValue(t.understandingOfCompany) ||
      hasValue(t.workStyleAndConditions) ||
      hasValue(t.applicantQuestions) ||
      hasValue(t.passionMessage);

    if (!hasInterview) return;

    appendSectionText(lines, pick(J.motivation, "Motivation"), t.motivation);
    appendSectionText(
      lines,
      pick(J.careerSummary, "Career summary"),
      t.careerSummary
    );
    appendSectionText(lines, pick(J.successes, "Successes"), t.successes);
    appendSectionText(lines, pick(J.failures, "Failures"), t.failures);
    appendSectionText(
      lines,
      pick(J.strengths, "Strengths & skills"),
      t.strengths
    );
    appendSectionText(
      lines,
      pick(J.weaknesses, "Weaknesses & improvements"),
      t.weaknesses
    );
    appendSectionText(lines, pick(J.values, "Work values"), t.values);
    appendSectionText(
      lines,
      pick(J.careerVision, "Career vision"),
      t.careerVision
    );
    appendSectionText(
      lines,
      pick(J.understandingOfCompany, "Understanding of the company"),
      t.understandingOfCompany
    );
    appendSectionText(
      lines,
      pick(J.workStyleAndConditions, "Work style & conditions"),
      t.workStyleAndConditions
    );
    appendSectionText(
      lines,
      pick(J.applicantQuestions, "Questions from applicant"),
      t.applicantQuestions
    );
    appendSectionText(
      lines,
      pick(J.passionMessage, "Passion & message"),
      t.passionMessage
    );
  }

  // Lecture（TopicItem.* & MeetingMinutes.lectureObjectives）→ テキスト
  function appendLectureForTopic(t) {
    const Lec = L.lecture || {};

    const hasLecture =
      hasValue(t.lectureProcedures) ||
      hasValue(t.lectureExamples) ||
      hasValue(t.lectureDosAndDonts) ||
      hasValue(t.lectureTips) ||
      hasValue(t.lectureSummary) ||
      hasValue(t.highlightedStatements);

    if (!hasLecture) return;

    // 手順
    if (Array.isArray(t.lectureProcedures) && t.lectureProcedures.length > 0) {
      const sectionLabel = pick(Lec.section, "Section");
      const stepsLabel = pick(Lec.steps, "Steps");
      const notesLabel = pick(Lec.notesAndRemarks, "Notes & remarks");

      t.lectureProcedures.forEach((proc, idx) => {
        if (!proc || typeof proc !== "object") return;

        if (proc.section) {
          lines.push("");
          lines.push(`${sectionLabel}: ${proc.section}`);
        } else if (idx === 0) {
          lines.push("");
          lines.push(sectionLabel);
        }

        appendSectionText(lines, stepsLabel, proc.steps);
        appendSectionText(lines, notesLabel, proc.notes);
      });
    }

    // 例・シナリオ
    appendSectionText(
      lines,
      pick(Lec.examplesAndScenarios, Lec.lectureExamples, "Examples & scenarios"),
      t.lectureExamples
    );

    // Dos / Don'ts
    if (t.lectureDosAndDonts && typeof t.lectureDosAndDonts === "object") {
      appendSectionText(
        lines,
        pick(Lec.dos, "Dos"),
        t.lectureDosAndDonts.dos
      );
      appendSectionText(
        lines,
        pick(Lec.donts, "Don'ts"),
        t.lectureDosAndDonts.donts
      );
    }

    // Tips
    appendSectionText(
      lines,
      pick(Lec.tipsAndInsights, Lec.lectureTips, "Tips & insights"),
      t.lectureTips
    );

    // サマリ
    appendSectionText(
      lines,
      pick(L.summaryLabel, L.summary, "Summary"),
      t.lectureSummary
    );

    // 強調フレーズ
    appendSectionText(
      lines,
      pick(Lec.highlightedStatements, "Highlighted statements"),
      t.highlightedStatements
    );
  }

  // ルート coreEmotion（OneOnOneEmotionalTopic）→ テキスト
  function appendCoreEmotion() {
    if (!mm.coreEmotion || typeof mm.coreEmotion !== "object") return;

    const O = L.oneonone || {};
    lines.push("");
    lines.push(pick(O.coreEmotion, "Core emotion"));

    appendSectionText(
      lines,
      pick(O.emotionAndBackground, "Feelings & background"),
      mm.coreEmotion.emotionAndBackground
    );
    appendSectionText(
      lines,
      pick(O.solutionHint, "Hint for solution"),
      mm.coreEmotion.solutionHint
    );
    appendSectionText(
      lines,
      pick(O.forBetter, "Actions going forward"),
      mm.coreEmotion.forBetter
    );
    appendSectionText(
      lines,
      pick(O.nextAction, "Next action"),
      mm.coreEmotion.nextAction
    );
    appendSectionText(
      lines,
      pick(O.managerFeedback, "Manager feedback"),
      mm.coreEmotion.managerFeedback
    );
  }

  // groupedOneOnOneTopics → テキスト
  function appendGroupedOneOnOne() {
    if (
      !Array.isArray(mm.groupedOneOnOneTopics) ||
      mm.groupedOneOnOneTopics.length === 0
    ) {
      return;
    }

    const O = L.oneonone || {};
    lines.push("");
    lines.push(pick(O.groupedOneOnOneTopics, "1on1 Topics"));

    mm.groupedOneOnOneTopics.forEach((g) => {
      if (!g || typeof g !== "object") return;

      const headPieces = [];
      if (g.groupTitle) headPieces.push(g.groupTitle);
      if (typeof g.topicNumber === "number") {
        const numLabel = pick(O.topicNumber, "Topic");
        headPieces.push(`${numLabel} ${g.topicNumber}`);
      }
      const header = headPieces.join(" - ");
      if (header) {
        lines.push("");
        lines.push(header);
      }

      if (g.pastPositive && typeof g.pastPositive === "object") {
        appendOneOnOnePastPositiveText(g.pastPositive);
      }
      if (g.pastNegative && typeof g.pastNegative === "object") {
        appendOneOnOnePastNegativeText(g.pastNegative);
      }
      if (g.futurePositive && typeof g.futurePositive === "object") {
        appendOneOnOneFuturePositiveText(g.futurePositive);
      }
      if (g.futureNegative && typeof g.futureNegative === "object") {
        appendOneOnOneFutureNegativeText(g.futureNegative);
      }
    });

    function appendOneOnOnePastPositiveText(sub) {
      const headerLabel = pick(sub.topic, O.recentSuccess, "Recent success");
      if (headerLabel) {
        lines.push("");
        lines.push(String(headerLabel));
      }

      appendSectionText(
        lines,
        pick(O.momentOfSuccess, "Recent success moment"),
        sub.momentOfSuccess
      );
      appendSectionText(
        lines,
        pick(O.yourContribution, "Your contribution"),
        sub.yourContribution
      );
      appendSectionText(
        lines,
        pick(O.scalableAction, "Scalable action"),
        sub.scalableAction
      );
      appendSectionText(
        lines,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }

    function appendOneOnOnePastNegativeText(sub) {
      const headerLabel = pick(sub.topic, O.challengeFaced, "Challenge faced");
      if (headerLabel) {
        lines.push("");
        lines.push(String(headerLabel));
      }

      appendSectionText(
        lines,
        pick(O.challengeFaced, "Challenge faced"),
        sub.challengeFaced
      );
      appendSectionText(
        lines,
        pick(O.whatCausedIt, "What caused it"),
        sub.whatCausedIt
      );
      appendSectionText(
        lines,
        pick(O.nextTimeStrategy, "Strategy for next time"),
        sub.nextTimeStrategy
      );
      appendSectionText(
        lines,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }

    function appendOneOnOneFuturePositiveText(sub) {
      const headerLabel = pick(sub.topic, O.futureExpectation, "Future expectation");
      if (headerLabel) {
        lines.push("");
        lines.push(String(headerLabel));
      }

      appendSectionText(
        lines,
        pick(O.futureExpectation, "Future expectation"),
        sub.expectation
      );
      appendSectionText(
        lines,
        pick(O.why, "Why"),
        sub.why
      );
      appendSectionText(
        lines,
        pick(O.preparation, "Preparation"),
        sub.preparation
      );
      appendSectionText(
        lines,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }

    function appendOneOnOneFutureNegativeText(sub) {
      const headerLabel = pick(sub.topic, O.concern, O.worry, "Concern");
      if (headerLabel) {
        lines.push("");
        lines.push(String(headerLabel));
      }

      appendSectionText(
        lines,
        pick(O.worry, "Worry"),
        sub.worry
      );
      appendSectionText(
        lines,
        pick(O.why, "Why"),
        sub.why
      );
      appendSectionText(
        lines,
        pick(O.mitigationIdeas, "Mitigation ideas"),
        sub.mitigationIdeas
      );
      appendSectionText(
        lines,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }
  }

  // ---- ここから本体処理 ----

  // 基本メタ情報
  if (mm.meetingTitle) lines.push(String(mm.meetingTitle));
  if (mm.date) lines.push(`${L.date}: ${mm.date}`);
  if (mm.location) lines.push(`${L.locationLabel}: ${mm.location}`);
  if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
    lines.push(`${L.attendeesLabel}: ${mm.attendees.join(", ")}`);
  }
  if (Array.isArray(mm.presenter) && mm.presenter.length > 0) {
    const presenterLabel = pick(L.presentationPresenter, "Presenter");
    lines.push(`${presenterLabel}: ${mm.presenter.join(", ")}`);
  }
  lines.push("");

  // コアメッセージ
  if (mm.coreMessage) {
    lines.push(L.coreMessageLabel || "Core message");
    lines.push("");
    lines.push(mm.coreMessage);
    lines.push("");
  }

  // ルート講義目標
  if (mm.lectureObjectives) {
    const Lec = L.lecture || {};
    const label = pick(
      Lec.objectives,
      Lec.lectureObjectives,
      L.lectureObjectives,
      "Lecture objectives"
    );
    lines.push(label);
    lines.push("");
    lines.push(mm.lectureObjectives);
    lines.push("");
  }

  // トーン / 雰囲気
  if (
    mm.toneInsights &&
    Array.isArray(mm.toneInsights.meetingAtmosphere) &&
    mm.toneInsights.meetingAtmosphere.length > 0
  ) {
    appendSectionText(
      lines,
      "Tone & sentiment",
      mm.toneInsights.meetingAtmosphere
    );
  }

  // ルート keyDiscussion（旧仕様サポート用・あれば）
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

  // トピックごとの内容
  if (Array.isArray(mm.topics)) {
    mm.topics.forEach((t, idx) => {
      if (!t || typeof t !== "object") return;

      const title =
        t.topic && String(t.topic).trim().length > 0
          ? String(t.topic)
          : `${L.topicFallback || L.topic} ${idx + 1}`;

      lines.push("");
      lines.push(title);

      // 汎用セクション
      appendSectionText(lines, L.discussionLabel, t.discussion);
      appendSectionText(lines, L.decisionsLabel, t.decisions);
      appendSectionText(lines, L.actionItemsLabel, t.actionItems);
      appendSectionText(lines, L.concernsLabel, t.concerns);
      appendSectionText(
        lines,
        pick(L.keyMessagesLabel, L.keyMessages, "Key messages"),
        t.keyMessages
      );
      appendSectionText(
        lines,
        pick(L.customerNeeds, "Customer needs"),
        t.customerNeeds
      );
      appendSectionText(
        lines,
        pick(L.decisionsAndTasks, "Decisions & tasks"),
        t.decisionsAndTasks
      );

      // 提案ブロック
      appendProposalsText(t.proposals);

      // Presentation 系フィールド
      appendSectionText(
        lines,
        L.presentationPresenter || "Presenter",
        t.presentationPresenter
      );
      appendSectionText(
        lines,
        L.presentationCoreProblem || L.coreProblem || "Problem to solve",
        t.presentationCoreProblem
      );
      appendSectionText(
        lines,
        L.presentationProposal || L.proposal || "Proposal",
        t.presentationProposal
      );
      appendSectionText(
        lines,
        L.presentationExpectedResult || L.expectedResult || "Expected result",
        t.presentationExpectedResult
      );
      appendSectionText(
        lines,
        L.presentationDecisionsAndTasks ||
          L.decisionsAndTasks ||
          "Decisions & tasks",
        t.presentationDecisionsAndTasks
      );
      appendSectionText(
        lines,
        L.presentationSpeakerPassion || "Closing message",
        t.presentationSpeakerPassion
      );
      appendSectionText(
        lines,
        L.presentationQandA || "Q&A",
        t.presentationQandA
      );
      appendSectionText(
        lines,
        L.presentationFeedback || "Feedback",
        t.presentationFeedback
      );

      // Brainstorm / Interview / Lecture
      appendBrainstormForTopic(t);
      appendJobInterviewForTopic(t);
      appendLectureForTopic(t);

      // トピック単位の keyDiscussion（旧仕様サポート）
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

  // 1on1 系
  appendCoreEmotion();
  appendGroupedOneOnOne();

  return lines.join("\n").trim();
}


// ========== MeetingMinutes レンダリング（HTML） ==========
// MeetingMinutes / TopicItem の Swift 構造体に厳密に沿った描画

function buildMeetingMinutesHTML(mm, locale) {
  const L = getLabels(locale);
  const out = [];

  // ---- ローカルヘルパー ----
  function pick(...candidates) {
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) return c;
    }
    return null;
  }

  function hasValue(val) {
    if (val == null) return false;
    if (Array.isArray(val)) {
      return val.some((v) => v != null && String(v).trim().length > 0);
    }
    if (typeof val === "object") {
      return Object.keys(val).length > 0;
    }
    return String(val).trim().length > 0;
  }

  function joinLines(val) {
    const rows = normalizeSectionValueToLines(val);
    return rows.join("; ");
  }

  // ProposalItem[] → HTML
  function appendProposalsHTML(proposals) {
    if (!Array.isArray(proposals) || proposals.length === 0) return;

    const label = pick(L.proposals, L.proposal, "Proposals");
    out.push(`<h3>${escapeHtml(label)}</h3>`);
    out.push("<ul>");

    proposals.forEach((p, idx) => {
      if (!p || typeof p !== "object") return;

      const baseTitle = p.proposal || `${label} ${idx + 1}`;
      const by = p.proposedBy ? ` (${escapeHtml(p.proposedBy)})` : "";

      const inner = [];
      inner.push(
        `<strong>${escapeHtml(baseTitle)}</strong>${by}`
      );

      if (hasValue(p.proposalReasons)) {
        const subLabel = pick(L.proposalReasons, "Reasons for proposal");
        inner.push(
          `<div><em>${escapeHtml(subLabel)}:</em> ${escapeHtml(
            joinLines(p.proposalReasons)
          )}</div>`
        );
      }

      if (hasValue(p.keyDiscussion)) {
        const subLabel = pick(L.keyDiscussion, "Key discussion");
        inner.push(
          `<div><em>${escapeHtml(subLabel)}:</em> ${escapeHtml(
            joinLines(p.keyDiscussion)
          )}</div>`
        );
      }

      if (hasValue(p.decisionsAndTasks)) {
        const subLabel = pick(L.decisionsAndTasks, "Decisions & tasks");
        inner.push(
          `<div><em>${escapeHtml(subLabel)}:</em> ${escapeHtml(
            joinLines(p.decisionsAndTasks)
          )}</div>`
        );
      }

      out.push(`<li>${inner.join("<br/>")}</li>`);
    });

    out.push("</ul>");
  }

  // Brainstorm（TopicItem.*）→ HTML
  function appendBrainstormHTMLForTopic(t) {
    const B = L.brainstorming || {};

    const hasBrainstorm =
      hasValue(t.brainstormCoreProblem) ||
      hasValue(t.brainstormTopIdea) ||
      hasValue(t.brainstormRunnerUps) ||
      hasValue(t.brainstormIdeaTable);

    if (!hasBrainstorm) return;

    // 問題意識
    appendSectionHTML(
      out,
      pick(B.problemToSolve, "Problem to solve"),
      t.brainstormCoreProblem
    );

    // Top idea
    if (t.brainstormTopIdea && typeof t.brainstormTopIdea === "object") {
      const idea = t.brainstormTopIdea;
      const titleLabel = pick(B.topIdea, "Top idea");

      out.push(`<h3>${escapeHtml(titleLabel)}</h3>`);
      out.push("<ul>");

      if (idea.title) {
        out.push(
          `<li><strong>${escapeHtml(idea.title)}</strong></li>`
        );
      }

      if (hasValue(idea.ideaDetail)) {
        out.push(
          `<li><em>${escapeHtml(
            pick(B.ideaDetail, "Idea details")
          )}:</em> ${escapeHtml(joinLines(idea.ideaDetail))}</li>`
        );
      }

      if (hasValue(idea.benefitsAndEffects)) {
        out.push(
          `<li><em>${escapeHtml(
            pick(B.benefitsAndEffects, B.meritsAndEffects, "Benefits & impact")
          )}:</em> ${escapeHtml(
            joinLines(idea.benefitsAndEffects)
          )}</li>`
        );
      }

      if (hasValue(idea.drawbacksAndRisks)) {
        out.push(
          `<li><em>${escapeHtml(
            pick(B.drawbacksAndRisks, "Drawbacks & risks")
          )}:</em> ${escapeHtml(
            joinLines(idea.drawbacksAndRisks)
          )}</li>`
        );
      }

      if (hasValue(idea.decisionsAndTasks)) {
        out.push(
          `<li><em>${escapeHtml(
            pick(L.decisionsAndTasks, "Decisions & tasks")
          )}:</em> ${escapeHtml(
            joinLines(idea.decisionsAndTasks)
          )}</li>`
        );
      }

      if (hasValue(idea.keyMessages)) {
        out.push(
          `<li><em>${escapeHtml(
            pick(L.keyMessagesLabel, L.keyMessages, "Key messages")
          )}:</em> ${escapeHtml(joinLines(idea.keyMessages))}</li>`
        );
      }

      out.push("</ul>");
    }

    // Runner-up ideas
    if (Array.isArray(t.brainstormRunnerUps) && t.brainstormRunnerUps.length > 0) {
      const ruLabel = pick(B.runnerUpIdeas, B.runnerUpIdea, "Runner-up ideas");
      out.push(`<h3>${escapeHtml(ruLabel)}</h3>`);
      out.push("<ul>");

      t.brainstormRunnerUps.forEach((idea, idx) => {
        if (!idea || typeof idea !== "object") return;
        const title = idea.title || `${ruLabel} ${idx + 1}`;
        const pieces = [`<strong>${escapeHtml(title)}</strong>`];

        if (hasValue(idea.ideaDetail)) {
          pieces.push(
            `<em>${escapeHtml(
              pick(B.ideaDetail, "Idea details")
            )}:</em> ${escapeHtml(joinLines(idea.ideaDetail))}`
          );
        }
        if (hasValue(idea.benefitsAndEffects)) {
          pieces.push(
            `<em>${escapeHtml(
              pick(B.benefitsAndEffects, B.meritsAndEffects, "Benefits & impact")
            )}:</em> ${escapeHtml(
              joinLines(idea.benefitsAndEffects)
            )}`
          );
        }
        if (hasValue(idea.drawbacksAndRisks)) {
          pieces.push(
            `<em>${escapeHtml(
              pick(B.drawbacksAndRisks, "Drawbacks & risks")
            )}:</em> ${escapeHtml(
              joinLines(idea.drawbacksAndRisks)
            )}`
          );
        }

        out.push(`<li>${pieces.join("<br/>")}</li>`);
      });

      out.push("</ul>");
    }

    // Idea table
    if (Array.isArray(t.brainstormIdeaTable) && t.brainstormIdeaTable.length > 0) {
      const tableLabel = pick(B.ideaTable, B.brainstormIdeaTable, "Idea list");
      out.push(`<h3>${escapeHtml(tableLabel)}</h3>`);
      out.push("<ul>");

      t.brainstormIdeaTable.forEach((row) => {
        if (!row || typeof row !== "object") return;
        const title = row.title || "";
        const desc = row.description || "";
        if (title || desc) {
          const suffix = title && desc ? `: ${desc}` : desc;
          out.push(
            `<li>${escapeHtml(title || "")}${suffix ? escapeHtml(suffix) : ""}</li>`
          );
        }
      });

      out.push("</ul>");
    }
  }

  // Job Interview（TopicItem.*）→ HTML
  function appendJobInterviewHTMLForTopic(t) {
    const J = L.jobInterview || {};

    const hasInterview =
      hasValue(t.motivation) ||
      hasValue(t.careerSummary) ||
      hasValue(t.successes) ||
      hasValue(t.failures) ||
      hasValue(t.strengths) ||
      hasValue(t.weaknesses) ||
      hasValue(t.values) ||
      hasValue(t.careerVision) ||
      hasValue(t.understandingOfCompany) ||
      hasValue(t.workStyleAndConditions) ||
      hasValue(t.applicantQuestions) ||
      hasValue(t.passionMessage);

    if (!hasInterview) return;

    appendSectionHTML(out, pick(J.motivation, "Motivation"), t.motivation);
    appendSectionHTML(
      out,
      pick(J.careerSummary, "Career summary"),
      t.careerSummary
    );
    appendSectionHTML(out, pick(J.successes, "Successes"), t.successes);
    appendSectionHTML(out, pick(J.failures, "Failures"), t.failures);
    appendSectionHTML(
      out,
      pick(J.strengths, "Strengths & skills"),
      t.strengths
    );
    appendSectionHTML(
      out,
      pick(J.weaknesses, "Weaknesses & improvements"),
      t.weaknesses
    );
    appendSectionHTML(out, pick(J.values, "Work values"), t.values);
    appendSectionHTML(
      out,
      pick(J.careerVision, "Career vision"),
      t.careerVision
    );
    appendSectionHTML(
      out,
      pick(J.understandingOfCompany, "Understanding of the company"),
      t.understandingOfCompany
    );
    appendSectionHTML(
      out,
      pick(J.workStyleAndConditions, "Work style & conditions"),
      t.workStyleAndConditions
    );
    appendSectionHTML(
      out,
      pick(J.applicantQuestions, "Questions from applicant"),
      t.applicantQuestions
    );
    appendSectionHTML(
      out,
      pick(J.passionMessage, "Passion & message"),
      t.passionMessage
    );
  }

  // Lecture（TopicItem.* & MeetingMinutes.lectureObjectives）→ HTML
  function appendLectureHTMLForTopic(t) {
    const Lec = L.lecture || {};

    const hasLecture =
      hasValue(t.lectureProcedures) ||
      hasValue(t.lectureExamples) ||
      hasValue(t.lectureDosAndDonts) ||
      hasValue(t.lectureTips) ||
      hasValue(t.lectureSummary) ||
      hasValue(t.highlightedStatements);

    if (!hasLecture) return;

    // 手順
    if (Array.isArray(t.lectureProcedures) && t.lectureProcedures.length > 0) {
      const sectionLabel = pick(Lec.section, "Section");
      const stepsLabel = pick(Lec.steps, "Steps");
      const notesLabel = pick(Lec.notesAndRemarks, "Notes & remarks");

      t.lectureProcedures.forEach((proc, idx) => {
        if (!proc || typeof proc !== "object") return;

        let heading = null;
        if (proc.section) {
          heading = `${sectionLabel}: ${proc.section}`;
        } else if (idx === 0) {
          heading = sectionLabel;
        }
        if (heading) {
          out.push(`<h3>${escapeHtml(heading)}</h3>`);
        }

        appendSectionHTML(out, stepsLabel, proc.steps);
        appendSectionHTML(out, notesLabel, proc.notes);
      });
    }

    // 例・シナリオ
    appendSectionHTML(
      out,
      pick(Lec.examplesAndScenarios, Lec.lectureExamples, "Examples & scenarios"),
      t.lectureExamples
    );

    // Dos / Don'ts
    if (t.lectureDosAndDonts && typeof t.lectureDosAndDonts === "object") {
      appendSectionHTML(
        out,
        pick(Lec.dos, "Dos"),
        t.lectureDosAndDonts.dos
      );
      appendSectionHTML(
        out,
        pick(Lec.donts, "Don'ts"),
        t.lectureDosAndDonts.donts
      );
    }

    // Tips
    appendSectionHTML(
      out,
      pick(Lec.tipsAndInsights, Lec.lectureTips, "Tips & insights"),
      t.lectureTips
    );

    // サマリ
    appendSectionHTML(
      out,
      pick(L.summaryLabel, L.summary, "Summary"),
      t.lectureSummary
    );

    // 強調フレーズ
    appendSectionHTML(
      out,
      pick(Lec.highlightedStatements, "Highlighted statements"),
      t.highlightedStatements
    );
  }

  // ルート coreEmotion（OneOnOneEmotionalTopic）→ HTML
  function appendCoreEmotionHTML() {
    if (!mm.coreEmotion || typeof mm.coreEmotion !== "object") return;

    const O = L.oneonone || {};
    const title = pick(O.coreEmotion, "Core emotion");
    out.push(`<h2>${escapeHtml(title)}</h2>`);

    appendSectionHTML(
      out,
      pick(O.emotionAndBackground, "Feelings & background"),
      mm.coreEmotion.emotionAndBackground
    );
    appendSectionHTML(
      out,
      pick(O.solutionHint, "Hint for solution"),
      mm.coreEmotion.solutionHint
    );
    appendSectionHTML(
      out,
      pick(O.forBetter, "Actions going forward"),
      mm.coreEmotion.forBetter
    );
    appendSectionHTML(
      out,
      pick(O.nextAction, "Next action"),
      mm.coreEmotion.nextAction
    );
    appendSectionHTML(
      out,
      pick(O.managerFeedback, "Manager feedback"),
      mm.coreEmotion.managerFeedback
    );
  }

  // groupedOneOnOneTopics → HTML
  function appendGroupedOneOnOneHTML() {
    if (
      !Array.isArray(mm.groupedOneOnOneTopics) ||
      mm.groupedOneOnOneTopics.length === 0
    ) {
      return;
    }

    const O = L.oneonone || {};
    const title = pick(O.groupedOneOnOneTopics, "1on1 Topics");
    out.push(`<h2>${escapeHtml(title)}</h2>`);

    mm.groupedOneOnOneTopics.forEach((g) => {
      if (!g || typeof g !== "object") return;

      const headPieces = [];
      if (g.groupTitle) headPieces.push(g.groupTitle);
      if (typeof g.topicNumber === "number") {
        const numLabel = pick(O.topicNumber, "Topic");
        headPieces.push(`${numLabel} ${g.topicNumber}`);
      }
      const header = headPieces.join(" - ");
      if (header) {
        out.push(`<h3>${escapeHtml(header)}</h3>`);
      }

      if (g.pastPositive && typeof g.pastPositive === "object") {
        appendOneOnOnePastPositiveHTML(g.pastPositive);
      }
      if (g.pastNegative && typeof g.pastNegative === "object") {
        appendOneOnOnePastNegativeHTML(g.pastNegative);
      }
      if (g.futurePositive && typeof g.futurePositive === "object") {
        appendOneOnOneFuturePositiveHTML(g.futurePositive);
      }
      if (g.futureNegative && typeof g.futureNegative === "object") {
        appendOneOnOneFutureNegativeHTML(g.futureNegative);
      }
    });

    function appendOneOnOnePastPositiveHTML(sub) {
      const headerLabel = pick(sub.topic, O.recentSuccess, "Recent success");
      if (headerLabel) {
        out.push(`<h4>${escapeHtml(String(headerLabel))}</h4>`);
      }

      appendSectionHTML(
        out,
        pick(O.momentOfSuccess, "Recent success moment"),
        sub.momentOfSuccess
      );
      appendSectionHTML(
        out,
        pick(O.yourContribution, "Your contribution"),
        sub.yourContribution
      );
      appendSectionHTML(
        out,
        pick(O.scalableAction, "Scalable action"),
        sub.scalableAction
      );
      appendSectionHTML(
        out,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }

    function appendOneOnOnePastNegativeHTML(sub) {
      const headerLabel = pick(sub.topic, O.challengeFaced, "Challenge faced");
      if (headerLabel) {
        out.push(`<h4>${escapeHtml(String(headerLabel))}</h4>`);
      }

      appendSectionHTML(
        out,
        pick(O.challengeFaced, "Challenge faced"),
        sub.challengeFaced
      );
      appendSectionHTML(
        out,
        pick(O.whatCausedIt, "What caused it"),
        sub.whatCausedIt
      );
      appendSectionHTML(
        out,
        pick(O.nextTimeStrategy, "Strategy for next time"),
        sub.nextTimeStrategy
      );
      appendSectionHTML(
        out,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }

    function appendOneOnOneFuturePositiveHTML(sub) {
      const headerLabel = pick(sub.topic, O.futureExpectation, "Future expectation");
      if (headerLabel) {
        out.push(`<h4>${escapeHtml(String(headerLabel))}</h4>`);
      }

      appendSectionHTML(
        out,
        pick(O.futureExpectation, "Future expectation"),
        sub.expectation
      );
      appendSectionHTML(
        out,
        pick(O.why, "Why"),
        sub.why
      );
      appendSectionHTML(
        out,
        pick(O.preparation, "Preparation"),
        sub.preparation
      );
      appendSectionHTML(
        out,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }

    function appendOneOnOneFutureNegativeHTML(sub) {
      const headerLabel = pick(sub.topic, O.concern, O.worry, "Concern");
      if (headerLabel) {
        out.push(`<h4>${escapeHtml(String(headerLabel))}</h4>`);
      }

      appendSectionHTML(
        out,
        pick(O.worry, "Worry"),
        sub.worry
      );
      appendSectionHTML(
        out,
        pick(O.why, "Why"),
        sub.why
      );
      appendSectionHTML(
        out,
        pick(O.mitigationIdeas, "Mitigation ideas"),
        sub.mitigationIdeas
      );
      appendSectionHTML(
        out,
        pick(O.managerFeedback, "Manager feedback"),
        sub.managerFeedback
      );
    }
  }

  // ---- ここから本体処理 ----

  // 基本メタ情報
  if (mm.meetingTitle) {
    out.push(`<h1>${escapeHtml(mm.meetingTitle)}</h1>`);
  }
  if (mm.date) {
    out.push(
      `<p><strong>${escapeHtml(L.date)}:</strong> ${escapeHtml(mm.date)}</p>`
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
  if (Array.isArray(mm.presenter) && mm.presenter.length > 0) {
    const presenterLabel = pick(L.presentationPresenter, "Presenter");
    out.push(
      `<p><strong>${escapeHtml(presenterLabel)}:</strong> ${escapeHtml(
        mm.presenter.join(", ")
      )}</p>`
    );
  }

  // コアメッセージ
  if (mm.coreMessage) {
    out.push(
      `<h2>${escapeHtml(L.coreMessageLabel || "Core message")}</h2>`
    );
    out.push(`<p>${escapeHtml(mm.coreMessage)}</p>`);
  }

  // ルート講義目標
  if (mm.lectureObjectives) {
    const Lec = L.lecture || {};
    const label = pick(
      Lec.objectives,
      Lec.lectureObjectives,
      L.lectureObjectives,
      "Lecture objectives"
    );
    out.push(`<h2>${escapeHtml(label)}</h2>`);
    out.push(`<p>${escapeHtml(mm.lectureObjectives)}</p>`);
  }

  // トーン / 雰囲気
  if (
    mm.toneInsights &&
    Array.isArray(mm.toneInsights.meetingAtmosphere) &&
    mm.toneInsights.meetingAtmosphere.length > 0
  ) {
    appendSectionHTML(
      out,
      "Tone & sentiment",
      mm.toneInsights.meetingAtmosphere
    );
  }

  // ルート keyDiscussion（旧仕様サポート）
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

      // 汎用セクション
      appendSectionHTML(out, L.discussionLabel, t.discussion);
      appendSectionHTML(out, L.decisionsLabel, t.decisions);
      appendSectionHTML(out, L.actionItemsLabel, t.actionItems);
      appendSectionHTML(out, L.concernsLabel, t.concerns);
      appendSectionHTML(
        out,
        pick(L.keyMessagesLabel, L.keyMessages, "Key messages"),
        t.keyMessages
      );
      appendSectionHTML(
        out,
        pick(L.customerNeeds, "Customer needs"),
        t.customerNeeds
      );
      appendSectionHTML(
        out,
        pick(L.decisionsAndTasks, "Decisions & tasks"),
        t.decisionsAndTasks
      );

      // 提案ブロック
      appendProposalsHTML(t.proposals);

      // Presentation 系フィールド
      appendSectionHTML(
        out,
        L.presentationPresenter || "Presenter",
        t.presentationPresenter
      );
      appendSectionHTML(
        out,
        L.presentationCoreProblem || L.coreProblem || "Problem to solve",
        t.presentationCoreProblem
      );
      appendSectionHTML(
        out,
        L.presentationProposal || L.proposal || "Proposal",
        t.presentationProposal
      );
      appendSectionHTML(
        out,
        L.presentationExpectedResult || L.expectedResult || "Expected result",
        t.presentationExpectedResult
      );
      appendSectionHTML(
        out,
        L.presentationDecisionsAndTasks ||
          L.decisionsAndTasks ||
          "Decisions & tasks",
        t.presentationDecisionsAndTasks
      );
      appendSectionHTML(
        out,
        L.presentationSpeakerPassion || "Closing message",
        t.presentationSpeakerPassion
      );
      appendSectionHTML(
        out,
        L.presentationQandA || "Q&A",
        t.presentationQandA
      );
      appendSectionHTML(
        out,
        L.presentationFeedback || "Feedback",
        t.presentationFeedback
      );

      // Brainstorm / Interview / Lecture
      appendBrainstormHTMLForTopic(t);
      appendJobInterviewHTMLForTopic(t);
      appendLectureHTMLForTopic(t);

      // トピック単位の keyDiscussion（旧仕様サポート）
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

  // 1on1 系
  appendCoreEmotionHTML();
  appendGroupedOneOnOneHTML();

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
