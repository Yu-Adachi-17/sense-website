// src/lib/minutes-universal.js
// あらゆる minutes JSON を UnifiedDoc(AST) に正規化するユーティリティ
// 変更点: toUnifiedDoc 第二引数 options に { t, ns } を受け取り、すべての表示ラベルをi18n化。

/** ====== 型メモ（JSなのでコメントで） ======
UnifiedDoc = {
  title: string,
  meta?: { date?: string, location?: string, attendees?: string[] },
  summary?: string,
  blocks: Block[]
}
Block =
  | { type: "heading", level: 1|2|3, text: string }
  | { type: "paragraph", text: string }
  | { type: "list", ordered?: boolean, items: string[] }
  | { type: "table", rows: string[][], header?: string[] }
  | { type: "keyValue", pairs: [string, string][] }
  | { type: "quote", text: string }
  | { type: "divider" }
  | { type: "callout", title?: string, text?: string, tone?: "info"|"warn"|"success" }
*/

const DROP_META_KEYS = new Set([
  "formatId","schemaId","locale","language","version","_meta","meta","id","uid","type"
]);

/** ====== i18n ヘルパ ======
 * options.t に next-i18next の t を渡す。ns はデフォルト 'common'。
 * キーは `${ns}:minutes.<key>` を見る。見つからなければ fallback。
 */
function createLabeler(options) {
  const t = options?.t;
  const ns = options?.ns || "common";
  return function L(key, fallback) {
    if (typeof t === "function") {
      const k = `minutes.${key}`;
      const translated = t(k);
      if (translated && translated !== k) return translated;
      // ns 指定が無視されるケースに備えて明示呼び出しも試す
      try {
        const explicit = t(`${ns}:minutes.${key}`);
        if (explicit && explicit !== `minutes.${key}`) return explicit;
      } catch {}
    }
    return fallback;
  };
}

export function stripCodeFences(raw) {
  if (typeof raw !== "string") return raw;
  let s = raw.trim().replace(/^\uFEFF/, "");
  const m = s.match(/^```(?:json|javascript|js|ts)?\s*([\s\S]*?)\s*```$/i);
  if (m) return m[1].trim();
  s = s.replace(/^```(?:json|javascript|js|ts)?\s*/i, "");
  s = s.replace(/```$/i, "");
  return s.trim();
}

export function splitMultipleJSONObjects(text) {
  // "}json{" のような連結を分割（Swift側の実装に合わせた簡易版）
  const pattern = /\}\s*json\s*\{/g;
  if (!pattern.test(text)) return [text];
  const pieces = [];
  let last = 0;
  text.replace(pattern, (match, offset) => {
    pieces.push(text.slice(last, offset + 1)); // 現在の } まで
    last = offset + match.length - 1; // 次の { の直前に合わせる
    return match;
  });
  pieces.push(text.slice(last));
  return pieces.map(p => {
    const t = p.trim();
    return t.startsWith("{") ? t : "{" + t;
  });
}

function safeParse(jsonish) {
  if (!jsonish) return null;
  if (typeof jsonish === "object") return jsonish;
  if (typeof jsonish !== "string") return null;
  const s = stripCodeFences(jsonish);
  // 複数JSONが来たら最初に parse 成功したものを採用
  const candidates = splitMultipleJSONObjects(s);
  for (const c of candidates) {
    try { return JSON.parse(c); } catch {}
  }
  try { return JSON.parse(s); } catch { return null; }
}

/** ================= Known schema detection & mappers ================= */

function isFlexible(o) {
  return o && typeof o === "object"
    && typeof o.meetingTitle === "string"
    && Array.isArray(o.sections);
}

function isLegacy(o) {
  return o && typeof o === "object" && Array.isArray(o.topics);
}

// 1on1スキーマ検出
function isOneOnOne(o) {
  return o && typeof o === "object" && Array.isArray(o.groupedOneOnOneTopics);
}

function pickMeta(o) {
  const meta = {};
  if (typeof o?.date === "string") meta.date = o.date;
  if (typeof o?.location === "string") meta.location = o.location;
  if (Array.isArray(o?.attendees)) meta.attendees = o.attendees.filter(x => typeof x === "string");
  return meta;
}

function mapFlexible(o, L) {
  /** o: {meetingTitle, summary, sections:[{title, topics:[{subTitle, details[]}] }]} */
  const doc = {
    title: o.meetingTitle || "",
    meta: pickMeta(o),
    summary: typeof o.summary === "string" ? o.summary : undefined,
    blocks: []
  };
  if (doc.summary) {
    doc.blocks.push({ type: "paragraph", text: doc.summary });
    doc.blocks.push({ type: "divider" });
  }
  for (const sec of o.sections || []) {
    if (sec?.title) doc.blocks.push({ type: "heading", level: 2, text: sec.title });
    if (Array.isArray(sec?.topics)) {
      for (const t of sec.topics) {
        if (t?.subTitle) doc.blocks.push({ type: "heading", level: 3, text: t.subTitle });
        if (Array.isArray(t?.details) && t.details.length) {
          doc.blocks.push({ type: "list", ordered: false, items: t.details.map(String) });
        }
      }
    }
    doc.blocks.push({ type: "divider" });
  }
  return doc;
}

function mapLegacy(o, L) {
  /** topics: [{ topic, discussion[], proposals[], decisionsAndTasks[] ...}] */
  const doc = {
    title: typeof o.meetingTitle === "string" ? o.meetingTitle : "",
    meta: pickMeta(o),
    blocks: []
  };

  const topics = Array.isArray(o.topics) ? o.topics : [];

  // ヘルパ
  const pushList = (items, label, ordered = false) => {
    if (!Array.isArray(items) || !items.length) return;
    doc.blocks.push({ type: "heading", level: 3, text: label });
    doc.blocks.push({ type: "list", ordered, items: items.map(String) });
  };
  const pushParagraph = (text, label) => {
    if (!text || typeof text !== "string") return;
    if (label) doc.blocks.push({ type: "heading", level: 3, text: label });
    doc.blocks.push({ type: "paragraph", text });
  };
  const pushAuto = (val, label, ordered = false) => {
    if (val == null) return;
    if (typeof val === "string") {
      if (val.trim()) pushParagraph(val, label);
    } else if (Array.isArray(val)) {
      if (val.length) {
        if (val.every(x => typeof x === "string")) {
          pushList(val, label, ordered);
        } else {
          doc.blocks.push({ type: "heading", level: 3, text: label });
          doc.blocks.push({ type: "paragraph", text: JSON.stringify(val, null, 2) });
        }
      }
    } else if (typeof val === "object") {
      const entries = Object.entries(val);
      if (entries.length) {
        const onlyPrimitives = entries.every(([_, v]) =>
          v == null || typeof v === "string" || typeof v === "number" || typeof v === "boolean"
        );
        doc.blocks.push({ type: "heading", level: 3, text: label });
        if (onlyPrimitives) {
          const pairs = entries
            .filter(([k]) => !DROP_META_KEYS.has(k))
            .map(([k, v]) => [labelize(k), String(v ?? "")]);
          if (pairs.length) doc.blocks.push({ type: "keyValue", pairs });
        } else {
          doc.blocks.push({ type: "paragraph", text: JSON.stringify(val, null, 2) });
        }
      }
    }
  };

  topics.forEach((tp, i) => {
    const head = `${i + 1}. ${tp.topic ?? L("topicFallback","Topic")}`;
    doc.blocks.push({ type: "heading", level: 2, text: head });

    // --- 旧キー（従来互換） ---
    if (Array.isArray(tp.discussion) && tp.discussion.length) {
      pushList(tp.discussion, L("discussion","Discussion"));
    }

    if (Array.isArray(tp.proposals) && tp.proposals.length) {
      tp.proposals.forEach((p) => {
        const label = `${L("proposal","Proposal")}${p?.proposedBy ? ` (${p.proposedBy})` : ""}`;
        if (p?.proposal) {
          doc.blocks.push({ type: "heading", level: 3, text: label });
          doc.blocks.push({ type: "paragraph", text: String(p.proposal) });
        }
        if (Array.isArray(p?.proposalReasons) && p.proposalReasons.length) {
          pushList(p.proposalReasons, L("background","Background"));
        }
        if (Array.isArray(p?.keyDiscussion) && p.keyDiscussion.length) {
          pushList(p.keyDiscussion, L("discussionPoints","Discussion Points"));
        }
      });
    }

    const legacyAgg = tp.decisionsAndTasks || tp.aggregatedDecisionsAndTasks;
    if (Array.isArray(legacyAgg) && legacyAgg.length) {
      pushList(legacyAgg, L("decisionsAndTasks","Decisions & Tasks"), true);
    }

    // --- 新キー（presentation* 系）---
    pushParagraph(tp.presentationCoreProblem, L("coreProblem","Core Problem"));
    pushList(tp.presentationProposal, L("proposal","Proposal"));
    pushList(tp.presentationExpectedResult, L("expectedResult","Expected Result"));
    pushList(tp.presentationDecisionsAndTasks, L("decisionsAndTasks","Decisions & Tasks"), true);

    // ========== 拡張マッピング ==========
    // 1) formatted_* 系
    pushAuto(tp.formatted_discussion, L("discussion","Discussion"));
    pushAuto(tp.formatted_decisions, L("decisions","Decisions"), true);
    pushAuto(tp.formatted_todolist, L("actionItems","Action Items"), true);
    pushAuto(tp.formatted_concerns, L("concerns","Concerns"));
    pushAuto(tp.formatted_summary, L("summary","Summary"));

    // 2) negotiation_*
    pushAuto(tp.negotiation_proposal, L("proposal","Proposal"));
    pushAuto(tp.negotiation_background, L("background","Background"));
    pushAuto(tp.negotiation_discussionPoints, L("discussionPoints","Discussion Points"));
    pushAuto(tp.negotiation_decisions, L("decisions","Decisions"), true);

    // 3) brainstorming_*（snake / camel）
    pushAuto(tp.brainstorming_problemToSolve ?? tp.brainstormingProblemToSolve, L("brainstorming.problemToSolve","Problem to solve"));
    pushAuto(tp.brainstorming_topIdea ?? tp.brainstormingTopIdea, L("brainstorming.topIdea","Top Idea"));
    pushAuto(tp.brainstorming_summary ?? tp.brainstormingSummary, L("summary","Summary"));
    pushAuto(tp.brainstorming_meritAndEffects ?? tp.brainstormingMeritAndEffects, L("brainstorming.meritsAndEffects","Merits and Effects"));
    pushAuto(tp.brainstorming_drawbacksAndRisks ?? tp.brainstormingDrawbacksAndRisks, L("brainstorming.drawbacksAndRisks","Drawbacks and Risks"));
    pushAuto(tp.brainstorming_decisionsAndTasks ?? tp.brainstormingDecisionsAndTasks, L("decisionsAndTasks","Decisions and Tasks"), true);
    pushAuto(tp.brainstorming_RunnerUpIdea ?? tp.brainstormingRunnerUpIdea, L("brainstorming.runnerUpIdea","Runner-up Idea"));
    pushAuto(tp.brainstorming_allIdeas ?? tp.brainstormingAllIdeas, L("brainstorming.allIdeas","All Ideas"));
    pushAuto(tp.brainstorming_title ?? tp.brainstormingTitle, L("brainstorming.ideaTitle","Idea Title"));

    // 4) jobInterview_* 系
    pushAuto(tp.jobInterview_motivation, L("jobInterview.motivation","Motivation"));
    pushAuto(tp.jobInterview_careerSummary, L("jobInterview.careerSummary","Career Summary"));
    pushAuto(tp.jobInterview_successes, L("jobInterview.successes","Successes"));
    pushAuto(tp.jobInterview_failures, L("jobInterview.failures","Failures"));
    pushAuto(tp.jobInterview_strengths, L("jobInterview.strengths","Strengths and Skills"));
    pushAuto(tp.jobInterview_weaknesses, L("jobInterview.weaknesses","Weaknesses and Areas for Improvement"));
    pushAuto(tp.jobInterview_values, L("jobInterview.values","Values at Work"));
    pushAuto(tp.jobInterview_careerVision, L("jobInterview.careerVision","Career Vision"));
    pushAuto(tp.jobInterview_understandingOfCompany, L("jobInterview.understandingOfCompany","Understanding of the Company"));
    pushAuto(tp.jobInterview_workStyleAndConditions, L("jobInterview.workStyleAndConditions","Work Style and Conditions"));
    pushAuto(tp.jobInterview_applicantQuestions, L("jobInterview.applicantQuestions","Questions from the Applicant (Q&A)"));
    pushAuto(tp.jobInterview_passionMessage, L("jobInterview.passionMessage","Passion and Message"));

    // 5) 1on1_* 系
    pushAuto(tp["1on1_momentOfSuccess"], L("oneonone.recentSuccess","Recent Success"));
    pushAuto(tp["1on1_yourContribution"], L("oneonone.contributingFactors","Contributing Factors"));
    pushAuto(tp["1on1_scalableAction"], L("oneonone.scalableAction","Scalable Action"));
    pushAuto(tp["1on1_managerFeedback"], L("oneonone.managerFeedback","Manager Feedback"));
    pushAuto(tp["1on1_challengeFaced"], L("oneonone.challengeFaced","Challenge Faced"));
    pushAuto(tp["1on1_whatCausedIt"] ?? tp["1on1_bottleneck"], L("oneonone.bottleneck","Bottleneck"));
    pushAuto(tp["1on1_nextTimeStrategy"], L("oneonone.improvementStrategy","Improvement Strategy"));
    pushAuto(tp["1on1_expectation"], L("oneonone.futureExpectation","Future Expectation"));
    pushAuto(tp["1on1_whyExpectation"], L("oneonone.reasonForExpectation","Reason for Expectation"));
    pushAuto(tp["1on1_preparation"], L("oneonone.preparationForFuture","Preparation for the Future"));
    pushAuto(tp["1on1_worry"], L("oneonone.concern","Concern"));
    pushAuto(tp["1on1_whyWorry"], L("oneonone.reasonForConcern","Reason for Concern"));
    pushAuto(tp["1on1_mitigationIdeas"], L("oneonone.mitigationIdeas","Mitigation Ideas"));
    pushAuto(tp["1on1_mental"], L("oneonone.mentalAspects","Mental Aspects"));
    pushAuto(tp["1on1_emotionAndBackground"], L("oneonone.feelingsAndBackground","Feelings and Background"));
    pushAuto(tp["1on1_emotionChange"], L("oneonone.emotionalChange","Emotional Change"));
    pushAuto(tp["1on1_forBetter"], L("oneonone.nextAction","Next Action"));

    // 6) lecture_* 系
    pushAuto(tp.lecture_lectureObjectives, L("lecture.objectives","Lecture Objectives"));
    pushAuto(tp.lecture_lectureProcedures, L("lecture.procedures","Procedures"));
    pushAuto(tp.lecture_notes, L("lecture.notesAndRemarks","Notes & Remarks"));
    pushAuto(tp.lecture_lectureExamples, L("lecture.examplesAndScenarios","Examples & Scenarios"));
    pushAuto(tp.lecture_dos, L("lecture.dos","Dos"));
    pushAuto(tp.lecture_donts, L("lecture.donts","Don'ts"));
    pushAuto(tp.lecture_lectureTips, L("lecture.tipsAndInsights","Tips & Insights"));

    // 7) 汎用
    pushList(tp.actionItems, L("actionItems","Action Items"), true);
    pushList(tp.decisions, L("decisions","Decisions"), true);
    pushList(tp.concerns, L("concerns","Concerns"));
    pushList(tp.keyMessages, L("summary","Summary"));
    // ========== 拡張ここまで ==========

    // --- 未対応フィールドを汎用描画で救済 ---
    const handled = new Set([
      "topic","discussion","proposals","decisionsAndTasks","aggregatedDecisionsAndTasks",
      "presentationCoreProblem","presentationProposal","presentationExpectedResult","presentationDecisionsAndTasks",
      "actionItems","decisions","concerns","keyMessages",
      "formatted_discussion","formatted_decisions","formatted_todolist","formatted_concerns","formatted_summary",
      "negotiation_proposal","negotiation_background","negotiation_discussionPoints","negotiation_decisions",
      "brainstorming_problemToSolve","brainstorming_topIdea","brainstorming_summary","brainstorming_meritAndEffects",
      "brainstorming_drawbacksAndRisks","brainstorming_decisionsAndTasks","brainstorming_RunnerUpIdea",
      "brainstorming_allIdeas","brainstorming_title",
      "brainstormingProblemToSolve","brainstormingTopIdea","brainstormingSummary","brainstormingMeritAndEffects",
      "brainstormingDrawbacksAndRisks","brainstormingDecisionsAndTasks","brainstormingRunnerUpIdea",
      "brainstormingAllIdeas","brainstormingTitle",
      "jobInterview_motivation","jobInterview_careerSummary","jobInterview_successes","jobInterview_failures",
      "jobInterview_strengths","jobInterview_weaknesses","jobInterview_values","jobInterview_careerVision",
      "jobInterview_understandingOfCompany","jobInterview_workStyleAndConditions","jobInterview_applicantQuestions",
      "jobInterview_passionMessage",
      "1on1_momentOfSuccess","1on1_yourContribution","1on1_scalableAction","1on1_managerFeedback",
      "1on1_challengeFaced","1on1_whatCausedIt","1on1_bottleneck","1on1_nextTimeStrategy","1on1_expectation",
      "1on1_whyExpectation","1on1_preparation","1on1_worry","1on1_whyWorry","1on1_mitigationIdeas","1on1_mental",
      "1on1_emotionAndBackground","1on1_emotionChange","1on1_forBetter",
      "lecture_lectureObjectives","lecture_lectureProcedures","lecture_notes","lecture_lectureExamples",
      "lecture_dos","lecture_donts","lecture_lectureTips",
    ]);

    Object.keys(tp || {}).forEach((k) => {
      if (handled.has(k)) return;
      const v = tp[k];
      if (v == null) return;
      if (DROP_META_KEYS.has(k)) return;

      if (typeof v === "string" && v.trim()) {
        pushParagraph(v, labelize(k));
      } else if (Array.isArray(v) && v.length) {
        if (v.every(x => typeof x === "string")) {
          pushList(v, labelize(k));
        } else if (v.every(x => x && typeof x === "object" && !Array.isArray(x))) {
          const table = arrayOfObjectsToTable(v);
          doc.blocks.push({ type: "heading", level: 3, text: labelize(k) });
          doc.blocks.push({ type: "table", header: table.header, rows: table.rows });
        } else {
          doc.blocks.push({ type: "heading", level: 3, text: labelize(k) });
          doc.blocks.push({ type: "paragraph", text: JSON.stringify(v, null, 2) });
        }
      } else if (typeof v === "object") {
        const kv = objectToKeyValuePairs(v);
        if (kv.length) {
          doc.blocks.push({ type: "heading", level: 3, text: labelize(k) });
          doc.blocks.push({ type: "keyValue", pairs: kv });
        }
      }
    });

    if (i < topics.length - 1) doc.blocks.push({ type: "divider" });
  });

  if (typeof o.coreMessage === "string" && o.coreMessage.trim()) {
    doc.blocks.push({ type: "quote", text: o.coreMessage.trim() });
  }
  if (!doc.title) doc.title = L("minutesTitleFallback","Minutes");
  return doc;
}

// 1on1スキーマ用マッパ
function mapOneOnOne(o, L) {
  const doc = {
    title: typeof o.meetingTitle === "string" ? o.meetingTitle : L("oneonone.title","1on1"),
    meta: pickMeta(o),
    blocks: []
  };

  // coreEmotion を先頭にコールアウト表示
  if (o.coreEmotion && typeof o.coreEmotion === "object") {
    const emo = [];
    if (typeof o.coreEmotion.emotionAndBackground === "string" && o.coreEmotion.emotionAndBackground.trim()) {
      emo.push(`${L("oneonone.feelingsAndBackground","Feelings and Background")}: ${o.coreEmotion.emotionAndBackground.trim()}`);
    }
    if (typeof o.coreEmotion.managerFeedback === "string" && o.coreEmotion.managerFeedback.trim()) {
      emo.push(`${L("oneonone.managerFeedback","Manager Feedback")}: ${o.coreEmotion.managerFeedback.trim()}`);
    }
    if (emo.length) {
      doc.blocks.push({ type: "callout", title: L("oneonone.coreEmotion","Core Emotion"), text: emo.join("\n"), tone: "info" });
      doc.blocks.push({ type: "divider" });
    }
  }

  const groups = Array.isArray(o.groupedOneOnOneTopics) ? o.groupedOneOnOneTopics : [];
  const pushList = (items, label, ordered = false) => {
    if (!Array.isArray(items) || !items.length) return;
    doc.blocks.push({ type: "heading", level: 3, text: label });
    doc.blocks.push({ type: "list", ordered, items: items.map(String) });
  };
  const pushParagraph = (text, label) => {
    if (!text || typeof text !== "string" || !text.trim()) return;
    if (label) doc.blocks.push({ type: "heading", level: 3, text: label });
    doc.blocks.push({ type: "paragraph", text: text.trim() });
  };

  const renderNode = (node, label) => {
    if (!node || typeof node !== "object") return;
    if (label) doc.blocks.push({ type: "heading", level: 2, text: label });

    // よく出るキーを優先表示
    pushParagraph(node.topic, L("topic","Topic"));
    pushParagraph(node.challengeFaced, L("oneonone.challengeFaced","Challenge Faced"));
    pushParagraph(node.expectation, L("oneonone.expectation","Expectation"));
    pushParagraph(node.worry, L("oneonone.worry","Worry"));

    pushList(node.why, L("oneonone.why","Why"));
    pushList(node.whatCausedIt, L("oneonone.whatCausedIt","What Caused It"));
    pushList(node.nextTimeStrategy, L("oneonone.nextTimeStrategy","Next Time Strategy"));
    pushList(node.preparation, L("oneonone.preparation","Preparation"));
    pushList(node.mitigationIdeas, L("oneonone.mitigationIdeas","Mitigation Ideas"));

    if (typeof node.managerFeedback === "string" && node.managerFeedback.trim()) {
      doc.blocks.push({ type: "callout", title: L("oneonone.managerFeedback","Manager Feedback"), text: node.managerFeedback.trim(), tone: "success" });
    }

    // 未表示フィールド（プリミティブ/文字列配列のみ）を救済
    const handled = new Set([
      "topic","challengeFaced","expectation","worry",
      "why","whatCausedIt","nextTimeStrategy","preparation","mitigationIdeas",
      "managerFeedback"
    ]);
    Object.keys(node).forEach(k => {
      if (handled.has(k) || DROP_META_KEYS.has(k)) return;
      const v = node[k];
      if (v == null) return;
      if (typeof v === "string") {
        pushParagraph(v, labelize(k));
      } else if (Array.isArray(v) && v.length && v.every(x => typeof x === "string")) {
        pushList(v, labelize(k));
      }
    });
  };

  groups.forEach((g, idx) => {
    const head = `${idx + 1}. ${g?.groupTitle || L("oneonone.topicGroup","Topic Group")}`;
    doc.blocks.push({ type: "heading", level: 2, text: head });

    if (g.pastPositive)  renderNode(g.pastPositive,  L("oneonone.pastPositive","Past Positive"));
    if (g.pastNegative)  renderNode(g.pastNegative,  L("oneonone.pastNegative","Past Negative"));
    if (g.futurePositive)renderNode(g.futurePositive,L("oneonone.futurePositive","Future Positive"));
    if (g.futureNegative)renderNode(g.futureNegative,L("oneonone.futureNegative","Future Negative"));

    if (idx < groups.length - 1) doc.blocks.push({ type: "divider" });
  });

  return doc;
}

/** ===================== Heuristic generic mapper ===================== */

function objectToKeyValuePairs(o) {
  const pairs = [];
  for (const k of Object.keys(o)) {
    if (DROP_META_KEYS.has(k)) continue;
    const v = o[k];
    if (v == null) continue;

    // 文字列はそのまま
    if (typeof v === "string") {
      if (v.trim()) pairs.push([labelize(k), v]);
      continue;
    }
    // プリミティブ
    if (typeof v === "number" || typeof v === "boolean") {
      pairs.push([labelize(k), String(v)]);
      continue;
    }
    // 配列: 文字列の配列だけ許可（オブジェクト配列は KeyValue では表示しない）
    if (Array.isArray(v)) {
      if (v.length && v.every(x => typeof x === "string")) {
        pairs.push([labelize(k), v.join(", ")]);
      }
      continue;
    }
    // オブジェクトは KeyValue では冗長になりやすいのでスキップ（専用マッパへ任せる）
  }
  return pairs;
}

function labelize(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function arrayOfObjectsToTable(arr) {
  const allKeys = Array.from(
    arr.reduce((set, it) => {
      Object.keys(it || {}).forEach(k => { if (!DROP_META_KEYS.has(k)) set.add(k); });
      return set;
    }, new Set())
  );
  const header = allKeys.map(labelize);
  const rows = arr.map(obj => allKeys.map(k => {
    const v = obj?.[k];
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.every(x => typeof x === "string") ? v.join(", ") : JSON.stringify(v);
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v ?? "");
  }));
  return { header, rows };
}

function genericMap(o, L) {
  const title = (typeof o?.meetingTitle === "string" && o.meetingTitle)
    || (typeof o?.title === "string" && o.title)
    || L("noContentProvided","No Content Provided");

  const meta = pickMeta(o);
  const doc = { title, meta, blocks: [] };

  // 主要キーを優先
  const PRIORITY = [
    ["summary", L("summary","Summary")],
    ["overview", L("overview","Overview")],
    ["sections", L("sections","Sections")],
    ["topics", L("topics","Topics")],
    ["items", L("items","Items")],
    ["content", L("content","Content")],
    ["body", L("body","Body")]
  ];

  for (const [k, label] of PRIORITY) {
    if (!(k in o)) continue;
    const v = o[k];
    if (typeof v === "string") {
      doc.blocks.push({ type: "heading", level: 2, text: label });
      doc.blocks.push({ type: "paragraph", text: v });
      doc.blocks.push({ type: "divider" });
    } else if (Array.isArray(v)) {
      doc.blocks.push({ type: "heading", level: 2, text: label });
      if (v.every(x => typeof x === "string")) {
        doc.blocks.push({ type: "list", items: v.map(String) });
      } else if (v.every(x => x && typeof x === "object" && !Array.isArray(x))) {
        const table = arrayOfObjectsToTable(v);
        doc.blocks.push({ type: "table", header: table.header, rows: table.rows });
      } else {
        doc.blocks.push({ type: "paragraph", text: JSON.stringify(v, null, 2) });
      }
      doc.blocks.push({ type: "divider" });
    } else if (v && typeof v === "object") {
      doc.blocks.push({ type: "heading", level: 2, text: label });
      const kv = objectToKeyValuePairs(v);
      if (kv.length) doc.blocks.push({ type: "keyValue", pairs: kv });
      else doc.blocks.push({ type: "paragraph", text: JSON.stringify(v, null, 2) });
      doc.blocks.push({ type: "divider" });
    }
  }

  // 残りは KeyValue（ただし配列オブジェクト等はスキップされる）
  const restPairs = objectToKeyValuePairs(o);
  if (restPairs.length) doc.blocks.push({ type: "keyValue", pairs: restPairs });

  return doc;
}

/** ===================== Public API ===================== */

export function toUnifiedDoc(rawOrObject, options = {}) {
  const L = createLabeler(options);
  const obj = safeParse(rawOrObject);
  if (!obj) {
    // JSONじゃなければプレーンテキスト扱いのASTを返す
    return {
      title: L("noContentProvidedTitle","No Content Provided"),
      blocks: [{ type: "paragraph", text: typeof rawOrObject === "string" ? stripCodeFences(rawOrObject) : "" }]
    };
  }
  if (isFlexible(obj)) return mapFlexible(obj, L);
  if (isLegacy(obj)) return mapLegacy(obj, L);
  if (isOneOnOne(obj)) return mapOneOnOne(obj, L);
  return genericMap(obj, L);
}
