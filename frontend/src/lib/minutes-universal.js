// src/lib/minutes-universal.js
// あらゆる minutes JSON を UnifiedDoc(AST) に正規化するユーティリティ

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

// ★ 追加: 1on1スキーマ検出
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

function mapFlexible(o) {
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

function mapLegacy(o) {
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
  // 値の型に応じて自動描画
  const pushAuto = (val, label, ordered = false) => {
    if (val == null) return;
    if (typeof val === "string") {
      if (val.trim()) pushParagraph(val, label);
    } else if (Array.isArray(val)) {
      if (val.length) {
        if (val.every(x => typeof x === "string")) {
          pushList(val, label, ordered);
        } else {
          // 文字列以外が混在する場合は JSON 表示で救済
          doc.blocks.push({ type: "heading", level: 3, text: label });
          doc.blocks.push({ type: "paragraph", text: JSON.stringify(val, null, 2) });
        }
      }
    } else if (typeof val === "object") {
      // オブジェクトは KeyValue or Table で救済
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
    const head = `${i + 1}. ${tp.topic ?? "Topic"}`;
    doc.blocks.push({ type: "heading", level: 2, text: head });

    // --- 旧キー（従来互換） ---
    if (Array.isArray(tp.discussion) && tp.discussion.length) {
      pushList(tp.discussion, "Discussion");
    }

    if (Array.isArray(tp.proposals) && tp.proposals.length) {
      tp.proposals.forEach((p) => {
        const label = `Proposal${p?.proposedBy ? ` (${p.proposedBy})` : ""}`;
        if (p?.proposal) {
          doc.blocks.push({ type: "heading", level: 3, text: label });
          doc.blocks.push({ type: "paragraph", text: String(p.proposal) });
        }
        if (Array.isArray(p?.proposalReasons) && p.proposalReasons.length) {
          pushList(p.proposalReasons, "Background");
        }
        if (Array.isArray(p?.keyDiscussion) && p.keyDiscussion.length) {
          pushList(p.keyDiscussion, "Discussion Points");
        }
      });
    }

    const legacyAgg = tp.decisionsAndTasks || tp.aggregatedDecisionsAndTasks;
    if (Array.isArray(legacyAgg) && legacyAgg.length) {
      pushList(legacyAgg, "Decisions & Tasks", true);
    }

    // --- 新キー（presentation* 系）---
    pushParagraph(tp.presentationCoreProblem, "Core Problem");
    pushList(tp.presentationProposal, "Proposal");
    pushList(tp.presentationExpectedResult, "Expected Result");
    pushList(tp.presentationDecisionsAndTasks, "Decisions & Tasks", true);

    // ========== ここから拡張マッピング ==========
    // 1) formatted_* 系
    pushAuto(tp.formatted_discussion, "Discussion");
    pushAuto(tp.formatted_decisions, "Decisions", true);
    pushAuto(tp.formatted_todolist, "Action Items", true);
    pushAuto(tp.formatted_concerns, "Concerns");
    pushAuto(tp.formatted_summary, "Summary");

    // 2) negotiation_* 系（トピック直下でも拾う）
    pushAuto(tp.negotiation_proposal, "Proposal");
    pushAuto(tp.negotiation_background, "Background");
    pushAuto(tp.negotiation_discussionPoints, "Discussion Points");
    pushAuto(tp.negotiation_decisions, "Decisions", true);

    // 3) brainstorming_* 系（snake / camel の両対応）
    pushAuto(tp.brainstorming_problemToSolve ?? tp.brainstormingProblemToSolve, "Problem to solve");
    pushAuto(tp.brainstorming_topIdea ?? tp.brainstormingTopIdea, "Top Idea");
    pushAuto(tp.brainstorming_summary ?? tp.brainstormingSummary, "Summary");
    pushAuto(tp.brainstorming_meritAndEffects ?? tp.brainstormingMeritAndEffects, "Merits and Effects");
    pushAuto(tp.brainstorming_drawbacksAndRisks ?? tp.brainstormingDrawbacksAndRisks, "Drawbacks and Risks");
    pushAuto(tp.brainstorming_decisionsAndTasks ?? tp.brainstormingDecisionsAndTasks, "Decisions and Tasks", true);
    pushAuto(tp.brainstorming_RunnerUpIdea ?? tp.brainstormingRunnerUpIdea, "Runner-up Idea");
    pushAuto(tp.brainstorming_allIdeas ?? tp.brainstormingAllIdeas, "All Ideas");
    pushAuto(tp.brainstorming_title ?? tp.brainstormingTitle, "Idea Title");

    // 4) jobInterview_* 系
    pushAuto(tp.jobInterview_motivation, "Motivation");
    pushAuto(tp.jobInterview_careerSummary, "Career Summary");
    pushAuto(tp.jobInterview_successes, "Successes");
    pushAuto(tp.jobInterview_failures, "Failures");
    pushAuto(tp.jobInterview_strengths, "Strengths and Skills");
    pushAuto(tp.jobInterview_weaknesses, "Weaknesses and Areas for Improvement");
    pushAuto(tp.jobInterview_values, "Values at Work");
    pushAuto(tp.jobInterview_careerVision, "Career Vision");
    pushAuto(tp.jobInterview_understandingOfCompany, "Understanding of the Company");
    pushAuto(tp.jobInterview_workStyleAndConditions, "Work Style and Conditions");
    pushAuto(tp.jobInterview_applicantQuestions, "Questions from the Applicant (Q&A)");
    pushAuto(tp.jobInterview_passionMessage, "Passion and Message");

    // 5) 1on1_* 系（単一トピック内にも来る可能性に対応）
    pushAuto(tp["1on1_momentOfSuccess"], "Recent Success");
    pushAuto(tp["1on1_yourContribution"], "Contributing Factors");
    pushAuto(tp["1on1_scalableAction"], "Scalable Action");
    pushAuto(tp["1on1_managerFeedback"], "Manager Feedback");
    pushAuto(tp["1on1_challengeFaced"], "Challenge Faced");
    pushAuto(tp["1on1_whatCausedIt"] ?? tp["1on1_bottleneck"], "Bottleneck");
    pushAuto(tp["1on1_nextTimeStrategy"], "Improvement Strategy");
    pushAuto(tp["1on1_expectation"], "Future Expectation");
    pushAuto(tp["1on1_whyExpectation"], "Reason for Expectation");
    pushAuto(tp["1on1_preparation"], "Preparation for the Future");
    pushAuto(tp["1on1_worry"], "Concern");
    pushAuto(tp["1on1_whyWorry"], "Reason for Concern");
    pushAuto(tp["1on1_mitigationIdeas"], "Mitigation Ideas");
    pushAuto(tp["1on1_mental"], "Mental Aspects");
    pushAuto(tp["1on1_emotionAndBackground"], "Feelings and Background");
    pushAuto(tp["1on1_emotionChange"], "Emotional Change");
    pushAuto(tp["1on1_forBetter"], "Next Action");

    // 6) lecture_* 系
    pushAuto(tp.lecture_lectureObjectives, "Lecture Objectives");
    pushAuto(tp.lecture_lectureProcedures, "Procedures");
    pushAuto(tp.lecture_notes, "Notes & Remarks");
    pushAuto(tp.lecture_lectureExamples, "Examples & Scenarios");
    pushAuto(tp.lecture_dos, "Dos");
    pushAuto(tp.lecture_donts, "Don'ts");
    pushAuto(tp.lecture_lectureTips, "Tips & Insights");

    // 7) 汎用よくあるキー（既存）
    pushList(tp.actionItems, "Action Items", true);
    pushList(tp.decisions, "Decisions", true);
    pushList(tp.concerns, "Concerns");
    pushList(tp.keyMessages, "Summary");
    // ========== 拡張ここまで ==========

    // --- 未対応フィールドを汎用描画で救済 ---
    const handled = new Set([
      // 基本
      "topic","discussion","proposals","decisionsAndTasks","aggregatedDecisionsAndTasks",
      "presentationCoreProblem","presentationProposal","presentationExpectedResult","presentationDecisionsAndTasks",
      "actionItems","decisions","concerns","keyMessages",
      // formatted_*
      "formatted_discussion","formatted_decisions","formatted_todolist","formatted_concerns","formatted_summary",
      // negotiation_*
      "negotiation_proposal","negotiation_background","negotiation_discussionPoints","negotiation_decisions",
      // brainstorming_*（snake & camel）
      "brainstorming_problemToSolve","brainstorming_topIdea","brainstorming_summary","brainstorming_meritAndEffects",
      "brainstorming_drawbacksAndRisks","brainstorming_decisionsAndTasks","brainstorming_RunnerUpIdea",
      "brainstorming_allIdeas","brainstorming_title",
      "brainstormingProblemToSolve","brainstormingTopIdea","brainstormingSummary","brainstormingMeritAndEffects",
      "brainstormingDrawbacksAndRisks","brainstormingDecisionsAndTasks","brainstormingRunnerUpIdea",
      "brainstormingAllIdeas","brainstormingTitle",
      // jobInterview_*
      "jobInterview_motivation","jobInterview_careerSummary","jobInterview_successes","jobInterview_failures",
      "jobInterview_strengths","jobInterview_weaknesses","jobInterview_values","jobInterview_careerVision",
      "jobInterview_understandingOfCompany","jobInterview_workStyleAndConditions","jobInterview_applicantQuestions",
      "jobInterview_passionMessage",
      // 1on1_*
      "1on1_momentOfSuccess","1on1_yourContribution","1on1_scalableAction","1on1_managerFeedback",
      "1on1_challengeFaced","1on1_whatCausedIt","1on1_bottleneck","1on1_nextTimeStrategy","1on1_expectation",
      "1on1_whyExpectation","1on1_preparation","1on1_worry","1on1_whyWorry","1on1_mitigationIdeas","1on1_mental",
      "1on1_emotionAndBackground","1on1_emotionChange","1on1_forBetter",
      // lecture_*
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
  if (!doc.title) doc.title = "Minutes";
  return doc;
}

// ★ 追加: 1on1スキーマ用マッパ
function mapOneOnOne(o) {
  const doc = {
    title: typeof o.meetingTitle === "string" ? o.meetingTitle : "1on1",
    meta: pickMeta(o),
    blocks: []
  };

  // coreEmotion を先頭にコールアウト表示
  if (o.coreEmotion && typeof o.coreEmotion === "object") {
    const emo = [];
    if (typeof o.coreEmotion.emotionAndBackground === "string" && o.coreEmotion.emotionAndBackground.trim()) {
      emo.push(`Feelings and Background: ${o.coreEmotion.emotionAndBackground.trim()}`);
    }
    if (typeof o.coreEmotion.managerFeedback === "string" && o.coreEmotion.managerFeedback.trim()) {
      emo.push(`Manager Feedback: ${o.coreEmotion.managerFeedback.trim()}`);
    }
    if (emo.length) {
      doc.blocks.push({ type: "callout", title: "Core Emotion", text: emo.join("\n"), tone: "info" });
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
    pushParagraph(node.topic, "Topic");
    pushParagraph(node.challengeFaced, "Challenge Faced");
    pushParagraph(node.expectation, "Expectation");
    pushParagraph(node.worry, "Worry");

    pushList(node.why, "Why");
    pushList(node.whatCausedIt, "What Caused It");
    pushList(node.nextTimeStrategy, "Next Time Strategy");
    pushList(node.preparation, "Preparation");
    pushList(node.mitigationIdeas, "Mitigation Ideas");

    if (typeof node.managerFeedback === "string" && node.managerFeedback.trim()) {
      doc.blocks.push({ type: "callout", title: "Manager Feedback", text: node.managerFeedback.trim(), tone: "success" });
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
    const head = `${idx + 1}. ${g?.groupTitle || "Topic Group"}`;
    doc.blocks.push({ type: "heading", level: 2, text: head });

    if (g.pastPositive)  renderNode(g.pastPositive,  "Past Positive");
    if (g.pastNegative)  renderNode(g.pastNegative,  "Past Negative");
    if (g.futurePositive)renderNode(g.futurePositive,"Future Positive");
    if (g.futureNegative)renderNode(g.futureNegative,"Future Negative");

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
      continue; // それ以外（オブジェクト配列等）はスキップ
    }
    // オブジェクトは KeyValue では冗長になりやすいのでスキップ（専用マッパへ任せる）
    // 必要なら JSON.stringify に切り替え可能
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

function genericMap(o) {
  const title = (typeof o?.meetingTitle === "string" && o.meetingTitle)
    || (typeof o?.title === "string" && o.title)
    || "No Content Provided";

  const meta = pickMeta(o);
  const doc = { title, meta, blocks: [] };

  // 主要キーを優先
  const PRIORITY = ["summary","overview","sections","topics","items","content","body"];
  let didPriority = false;

  for (const k of PRIORITY) {
    if (!(k in o)) continue;
    didPriority = true;
    const v = o[k];
    if (typeof v === "string") {
      doc.blocks.push({ type: "heading", level: 2, text: labelize(k) });
      doc.blocks.push({ type: "paragraph", text: v });
      doc.blocks.push({ type: "divider" });
    } else if (Array.isArray(v)) {
      doc.blocks.push({ type: "heading", level: 2, text: labelize(k) });
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
      doc.blocks.push({ type: "heading", level: 2, text: labelize(k) });
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

export function toUnifiedDoc(rawOrObject) {
  const obj = safeParse(rawOrObject);
  if (!obj) {
    // JSONじゃなければプレーンテキスト扱いのASTを返す
    return {
      title: "No Content Provided",
      blocks: [{ type: "paragraph", text: typeof rawOrObject === "string" ? stripCodeFences(rawOrObject) : "" }]
    };
  }
  if (isFlexible(obj)) return mapFlexible(obj);
  if (isLegacy(obj)) return mapLegacy(obj);
  if (isOneOnOne(obj)) return mapOneOnOne(obj); // ★ 追加
  return genericMap(obj);
}
