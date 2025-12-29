// routes/slideaiproAgendaJson.js

const express = require("express");

function extractJsonArray(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();

  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  const sliced = s.slice(start, end + 1).trim();
  try {
    const parsed = JSON.parse(sliced);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  return null;
}

function sanitizeCacheKey(v) {
  const s = String(v || "").trim().toLowerCase();
  const cleaned = s.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "vibe-key";
}

function keepOnly(obj, allowedKeys) {
  const out = {};
  for (const k of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function normalizeAgendaArray(arr) {
  if (!Array.isArray(arr)) throw new Error("Output is not an array");
  if (arr.length !== 5) throw new Error(`Array length must be 5, got ${arr.length}`);

  const allowedPatternTypes = new Set([1001, 1002, 1003, 1005, 1004]);
  const expectedOrder = [1001, 1002, 1003, 1005, 1004];

  const schema = {
    1001: [
      "title",
      "coverTitle",
      "VSproblemsToSolve",
      "VSproblemImagePrompt",
      "VSproblemImageCacheKey",
      "importantMessage",
    ],
    1002: ["title", "VSproposalForBetter", "VSproposalImagePrompt", "VSproposalImageCacheKey", "importantMessage"],
    1003: ["title", "VSexpectedEffectsBefore", "VSexpectedEffectsAfter", "importantMessage"],
    1005: ["title", "yAxisName", "unit", "barGroups", "importantMessage"],
    1004: ["title", "taskTitles", "assignees", "deadlines"],
  };

  const normalized = arr.map((item, i) => {
    if (!item || typeof item !== "object") throw new Error(`Item[${i}] is not object`);

    const patternType = item.patternType;
    if (!Number.isInteger(patternType) || !allowedPatternTypes.has(patternType)) {
      throw new Error(`Item[${i}] invalid patternType=${patternType}`);
    }
    if (patternType !== expectedOrder[i]) {
      throw new Error(`Item[${i}] patternType order mismatch. expected=${expectedOrder[i]} got=${patternType}`);
    }

    const title = typeof item.title === "string" ? item.title : "";
    const data = item.data && typeof item.data === "object" ? item.data : null;
    if (!data) throw new Error(`Item[${i}] missing data`);

    const allowedDataKeys = schema[patternType];
    let cleanData = keepOnly(data, allowedDataKeys);

    // string化（モデル出力の型ブレ保険）
    for (const k of Object.keys(cleanData)) {
      if (cleanData[k] === null) cleanData[k] = "";
    }

    if (patternType === 1001) {
      cleanData.coverTitle = String(cleanData.coverTitle || "").trim();
      cleanData.title = String(cleanData.title || "").trim();
      cleanData.importantMessage = String(cleanData.importantMessage || "").trim();
      cleanData.VSproblemImagePrompt = String(cleanData.VSproblemImagePrompt || "").trim();
      cleanData.VSproblemImageCacheKey = sanitizeCacheKey(cleanData.VSproblemImageCacheKey);

      if (Array.isArray(cleanData.VSproblemsToSolve)) {
        cleanData.VSproblemsToSolve = cleanData.VSproblemsToSolve.slice(0, 5).map((x) => String(x));
      } else {
        cleanData.VSproblemsToSolve = [];
      }
    }

    if (patternType === 1002) {
      cleanData.title = String(cleanData.title || "").trim();
      cleanData.importantMessage = String(cleanData.importantMessage || "").trim();
      cleanData.VSproposalImagePrompt = String(cleanData.VSproposalImagePrompt || "").trim();
      cleanData.VSproposalImageCacheKey = sanitizeCacheKey(cleanData.VSproposalImageCacheKey);

      if (Array.isArray(cleanData.VSproposalForBetter)) {
        cleanData.VSproposalForBetter = cleanData.VSproposalForBetter.slice(0, 5).map((x) => String(x));
      } else {
        cleanData.VSproposalForBetter = [];
      }
    }

    if (patternType === 1003) {
      cleanData.title = String(cleanData.title || "").trim();
      cleanData.importantMessage = String(cleanData.importantMessage || "").trim();

      if (Array.isArray(cleanData.VSexpectedEffectsBefore)) {
        cleanData.VSexpectedEffectsBefore = cleanData.VSexpectedEffectsBefore.slice(0, 3).map((x) => String(x));
      } else {
        cleanData.VSexpectedEffectsBefore = [];
      }

      if (Array.isArray(cleanData.VSexpectedEffectsAfter)) {
        cleanData.VSexpectedEffectsAfter = cleanData.VSexpectedEffectsAfter.slice(0, 3).map((x) => String(x));
      } else {
        cleanData.VSexpectedEffectsAfter = [];
      }
    }

    if (patternType === 1005) {
      cleanData.title = String(cleanData.title || "").trim();
      cleanData.yAxisName = String(cleanData.yAxisName || "").trim();
      cleanData.unit = String(cleanData.unit || "").trim();
      cleanData.importantMessage = String(cleanData.importantMessage || "").trim();

      if (Array.isArray(cleanData.barGroups)) {
        cleanData.barGroups = cleanData.barGroups.map((bg) => {
          const category = String(bg?.category ?? "");
          const bars = Array.isArray(bg?.bars) ? bg.bars : [];
          const actual = bars.find((b) => b?.label === "actual") || bars[0];
          const value = Number(actual?.value ?? 0);
          return {
            category,
            bars: [{ label: "actual", value: Number.isFinite(value) ? value : 0 }],
          };
        });
      } else {
        cleanData.barGroups = [];
      }
    }

    if (patternType === 1004) {
      cleanData.title = String(cleanData.title || "").trim();

      const taskTitles = Array.isArray(cleanData.taskTitles) ? cleanData.taskTitles.map(String) : [];
      const assignees = Array.isArray(cleanData.assignees) ? cleanData.assignees.map(String) : [];
      const deadlines = Array.isArray(cleanData.deadlines) ? cleanData.deadlines.map(String) : [];

      const n = Math.min(taskTitles.length, assignees.length, deadlines.length);
      if (n < 3) throw new Error("Task arrays must have at least 3 items and same length");

      cleanData.taskTitles = taskTitles.slice(0, n);
      cleanData.assignees = assignees.slice(0, n);
      cleanData.deadlines = deadlines.slice(0, n);
    }

    return { title, patternType, data: cleanData };
  });

  return normalized;
}

function todayISOInTokyo() {
  try {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

function buildDefaultSystemInstruction(localeResolved, renderMode, theme) {
  const lang = String(localeResolved || "en").toLowerCase();
  const isJa = lang === "ja";

  const modeHint =
    renderMode === "vibeSlidingIdea"
      ? isJa
        ? "アイデア提案資料（Vibe Sliding）"
        : "Idea proposal deck (Vibe Sliding)"
      : isJa
        ? "資料"
        : "Deck";

  const themeHint =
    theme === "dark" ? (isJa ? "ダークテーマ" : "dark theme") : isJa ? "ライトテーマ" : "light theme";

  if (isJa) {
    return [
      "あなたは資料ラベル作成のJSONジェネレータです。これからユーザーは資料化したいテーマを短文で指定してきます。そこから(課題)→(提案)→(改善前後の顧客体験)→(期待できる効果: 数値)→(タスク)の流れで資料を作成してください。指定がない限り、ストーリーになるように数値などは創作可能です。ただし指定のキーのみで出力してください。資料のラベルにそのまま記載するため、敬語禁止、言い切り調の体言止めで。",
      "重要: title / coverTitle / importantMessage / 箇条書き / taskTitles は資料ラベルとして短く簡潔にする。冗長な説明、前置き、接続詞だらけの文章は禁止。1行で読める長さを優先。",
      "入力から、Swiftの AgendaItem / PatternData に適合する最終JSON(トップレベル配列1つ)を生成してください。",
      `この資料は「${modeHint}」で、見た目は「${themeHint}」想定です（内容は変に装飾しない）。`,
      "",
      "【入力】",
      "- ユーザーの資料テーマ: {{USER_BRIEF}}",
      "- 基準日(YYYY-MM-DD): {{BASE_DATE_YYYY-MM-DD}}",
      "",
      "【出力契約(最重要・絶対)】",
      "- 出力はJSONのみ。文章、前置き、解説、Markdown、コードブロック、バッククォート、箇条書き、jsonという見出し文字、注釈、追加の改行装飾は禁止。",
      "- 出力はトップレベルJSON配列1つだけ。",
      "- 要素数は必ず5固定。順序固定。増減禁止。",
      "- 各要素は必ず3キーのみ: title, patternType, data(これ以外のキーは禁止)。",
      "- patternTypeは必ず整数。順序は [1001, 1002, 1003, 1005, 1004]。",
      "- null禁止。絵文字禁止。TBD禁止。プレースホルダ禁止。",
      "",
      "【patternType別 data フィールド仕様(これ以外のキーは禁止)】",
      "(1) 1001 data: coverTitle,title,VSproblemsToSolve,VSproblemImagePrompt,VSproblemImageCacheKey,importantMessage",
      "(2) 1002 data: title,VSproposalForBetter,VSproposalImagePrompt,VSproposalImageCacheKey,importantMessage",
      "(3) 1003 data: title,VSexpectedEffectsBefore,VSexpectedEffectsAfter,importantMessage",
      "(4) 1005 data: title,yAxisName,unit,barGroups,importantMessage",
      "(5) 1004 data: title,taskTitles,assignees,deadlines",
      "",
      "以上の条件で、{{USER_BRIEF}}を最終JSON(配列)に変換して出力せよ。",
    ].join("\n");
  }

  return [
    "You are a JSON generator for slide label content for SlideAI Pro. The user provides a short deck theme. Create a 5-part deck in this flow: (Problem) → (Proposal) → (Before/After customer experience) → (Expected numeric impact) → (Tasks). If details are not provided, you may invent realistic numbers to form a coherent story. Output only the specified keys.",
    "Important: title / coverTitle / importantMessage / bullet items / taskTitles must be short, label-ready, and self-contained. No verbose explanations.",
    `Deck type is "${modeHint}" and visual theme is "${themeHint}".`,
    "",
    "Inputs:",
    "- Deck theme: {{USER_BRIEF}}",
    "- Base date (YYYY-MM-DD): {{BASE_DATE_YYYY-MM-DD}}",
    "",
    "Output Contract:",
    "- Output JSON only. Exactly one top-level JSON array.",
    "- Array length must be exactly 5. Order: [1001,1002,1003,1005,1004].",
    "- Each element must have exactly 3 keys: title, patternType, data.",
    "- data must contain ONLY allowed keys per patternType.",
    "",
    "Allowed keys:",
    "- 1001 data: coverTitle,title,VSproblemsToSolve,VSproblemImagePrompt,VSproblemImageCacheKey,importantMessage",
    "- 1002 data: title,VSproposalForBetter,VSproposalImagePrompt,VSproposalImageCacheKey,importantMessage",
    "- 1003 data: title,VSexpectedEffectsBefore,VSexpectedEffectsAfter,importantMessage",
    "- 1005 data: title,yAxisName,unit,barGroups,importantMessage",
    "- 1004 data: title,taskTitles,assignees,deadlines",
  ].join("\n");
}

module.exports = function buildSlideaiproAgendaJsonRouter({ callGemini, resolveLocale, logLong }) {
  const router = express.Router();

  router.post("/agenda-json", async (req, res) => {
    const debug = req.headers["x-debug-log"] === "1";

    try {
      const { brief, baseDate, locale: localeFromBody, prompt, renderMode, theme } = req.body || {};

      if (!brief || !String(brief).trim()) {
        return res.status(400).json({ ok: false, error: "bad_request", details: "brief is required" });
      }

      const baseDateValue = String(baseDate || "").trim() || todayISOInTokyo();
      const localeResolved = resolveLocale(req, localeFromBody);

      const systemInstruction =
        typeof prompt === "string" && prompt.trim()
          ? String(prompt).trim()
          : buildDefaultSystemInstruction(localeResolved, renderMode, theme);

      const filled = systemInstruction
        .split("{{USER_BRIEF}}")
        .join(String(brief).trim())
        .split("{{BASE_DATE_YYYY-MM-DD}}")
        .join(String(baseDateValue).trim());

      const generationConfig = {
        temperature: 0,
        maxOutputTokens: 16000,
        responseMimeType: "application/json",
      };

      if (debug) {
        console.log("[AGENDA_JSON] hit /api/slideaipro/agenda-json");
        console.log("[AGENDA_JSON] localeResolved=", localeResolved);
        console.log("[AGENDA_JSON] renderMode=", renderMode || "(none)");
        console.log("[AGENDA_JSON] theme=", theme || "(none)");
        console.log("[AGENDA_JSON] baseDate=", baseDateValue);
        logLong("[AGENDA_JSON systemInstruction]", filled);
      }

      const raw = await callGemini(filled, "", generationConfig);

      if (debug) {
        logLong("[AGENDA_JSON raw]", raw);
      }

      const extracted = extractJsonArray(raw);
      if (!extracted) {
        console.error("[AGENDA_JSON] failed to extract JSON array");
        return res.status(500).json({
          ok: false,
          error: "invalid_model_output",
          details: "cannot parse array",
          raw,
        });
      }

      const normalized = normalizeAgendaArray(extracted);
      return res.status(200).json(normalized);
    } catch (err) {
      console.error("[AGENDA_JSON] internal error:", err);
      return res.status(500).json({
        ok: false,
        error: "internal_error",
        details: err.message || String(err),
      });
    }
  });

  return router;
};
