// routes/slideaiproAgendaJson.js
const express = require('express');

function extractJsonArray(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();

  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;

  const sliced = s.slice(start, end + 1).trim();
  try {
    const parsed = JSON.parse(sliced);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  return null;
}

function sanitizeCacheKey(v) {
  const s = String(v || '').trim().toLowerCase();
  const cleaned = s
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'vibe-key';
}

function keepOnly(obj, allowedKeys) {
  const out = {};
  for (const k of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function normalizeOneLine(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/\u3000/g, ' ')
    .trim();
}

function clamp(s, maxLen) {
  const t = normalizeOneLine(s);
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim();
}

// ここが重要: “デッキ種別ラベル”っぽい coverTitle を弾く（最終防衛ライン）
function isBadCoverTitle(v) {
  const s = normalizeOneLine(v).toLowerCase();
  if (!s) return true;

  // 典型的な「混入して困る」固定ラベル群
  const badExact = new Set([
    'アイデア提案資料（vibe sliding）',
    'idea proposal deck (vibe sliding)',
    'vibe sliding',
    '資料',
    'deck',
  ]);
  if (badExact.has(s)) return true;

  // “Vibe Sliding” が含まれるなら、ほぼラベル混入扱いにする（あなたの要望）
  if (s.includes('vibe') && s.includes('sliding')) return true;

  // 極端に一般名詞だけ
  if (s === 'slideai pro') return false; // これは許容（フォールバックでも使う）
  if (s.length <= 6 && (s.includes('資料') || s.includes('deck'))) return true;

  return false;
}

function normalizeAgendaArray(arr, opts = {}) {
  if (!Array.isArray(arr)) throw new Error('Output is not an array');
  if (arr.length !== 5) throw new Error(`Array length must be 5, got ${arr.length}`);

  const fallbackCoverTitle = clamp(opts.fallbackCoverTitle || '', 52) || 'SlideAI Pro';

  const allowedPatternTypes = new Set([1001, 1002, 1003, 1005, 1004]);
  const expectedOrder = [1001, 1002, 1003, 1005, 1004];

  const schema = {
    1001: ['coverTitle', 'title', 'VSproblemsToSolve', 'VSproblemImagePrompt', 'VSproblemImageCacheKey', 'importantMessage'],
    1002: ['title', 'VSproposalForBetter', 'VSproposalImagePrompt', 'VSproposalImageCacheKey', 'importantMessage'],
    1003: ['title', 'VSexpectedEffectsBefore', 'VSexpectedEffectsAfter', 'importantMessage'],
    1005: ['title', 'yAxisName', 'unit', 'barGroups', 'importantMessage'],
    1004: ['title', 'taskTitles', 'assignees', 'deadlines'],
  };

  const normalized = arr.map((item, i) => {
    if (!item || typeof item !== 'object') throw new Error(`Item[${i}] is not object`);

    const patternType = item.patternType;
    if (!Number.isInteger(patternType) || !allowedPatternTypes.has(patternType)) {
      throw new Error(`Item[${i}] invalid patternType=${patternType}`);
    }
    if (patternType !== expectedOrder[i]) {
      throw new Error(`Item[${i}] patternType order mismatch. expected=${expectedOrder[i]} got=${patternType}`);
    }

    const title = typeof item.title === 'string' ? item.title : '';
    const data = item.data && typeof item.data === 'object' ? item.data : null;
    if (!data) throw new Error(`Item[${i}] missing data`);

    const allowedDataKeys = schema[patternType];
    let cleanData = keepOnly(data, allowedDataKeys);

    // ✅ 1001 coverTitle の補完・整形（モデルのラベル混入を弾く）
    if (patternType === 1001) {
      const ct = clamp(cleanData.coverTitle || '', 52);
      cleanData.coverTitle = !isBadCoverTitle(ct) ? ct : fallbackCoverTitle;
    }

    // 1001/1002 cache key のサニタイズ
    if (patternType === 1001 && cleanData.VSproblemImageCacheKey !== undefined) {
      cleanData.VSproblemImageCacheKey = sanitizeCacheKey(cleanData.VSproblemImageCacheKey);
    }
    if (patternType === 1002 && cleanData.VSproposalImageCacheKey !== undefined) {
      cleanData.VSproposalImageCacheKey = sanitizeCacheKey(cleanData.VSproposalImageCacheKey);
    }

    // 配列上限
    if (patternType === 1001 && Array.isArray(cleanData.VSproblemsToSolve)) {
      cleanData.VSproblemsToSolve = cleanData.VSproblemsToSolve.slice(0, 5).map((x) => String(x));
    }
    if (patternType === 1002 && Array.isArray(cleanData.VSproposalForBetter)) {
      cleanData.VSproposalForBetter = cleanData.VSproposalForBetter.slice(0, 5).map((x) => String(x));
    }
    if (patternType === 1003 && Array.isArray(cleanData.VSexpectedEffectsBefore)) {
      cleanData.VSexpectedEffectsBefore = cleanData.VSexpectedEffectsBefore.slice(0, 3).map((x) => String(x));
    }
    if (patternType === 1003 && Array.isArray(cleanData.VSexpectedEffectsAfter)) {
      cleanData.VSexpectedEffectsAfter = cleanData.VSexpectedEffectsAfter.slice(0, 3).map((x) => String(x));
    }

    // 1005 bars を actual のみに正規化
    if (patternType === 1005 && Array.isArray(cleanData.barGroups)) {
      cleanData.barGroups = cleanData.barGroups.map((bg) => {
        const category = String(bg?.category ?? '');
        const bars = Array.isArray(bg?.bars) ? bg.bars : [];
        const actual = bars.find((b) => b?.label === 'actual') || bars[0];
        const value = Number(actual?.value ?? 0);
        return {
          category,
          bars: [{ label: 'actual', value: Number.isFinite(value) ? value : 0 }],
        };
      });
    }

    // 1004 タスク配列の整合
    if (patternType === 1004) {
      const taskTitles = Array.isArray(cleanData.taskTitles) ? cleanData.taskTitles.map(String) : [];
      const assignees = Array.isArray(cleanData.assignees) ? cleanData.assignees.map(String) : [];
      const deadlines = Array.isArray(cleanData.deadlines) ? cleanData.deadlines.map(String) : [];

      const n = Math.min(taskTitles.length, assignees.length, deadlines.length);
      if (n < 3) throw new Error('Task arrays must have at least 3 items and same length');

      cleanData.taskTitles = taskTitles.slice(0, n);
      cleanData.assignees = assignees.slice(0, n);
      cleanData.deadlines = deadlines.slice(0, n);
    }

    return {
      title,
      patternType,
      data: cleanData,
    };
  });

  return normalized;
}

function todayISOInTokyo() {
  try {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

function buildDefaultSystemInstruction(localeResolved, renderMode, theme) {
  const lang = String(localeResolved || 'en').toLowerCase();
  const isJa = lang === 'ja';

  // “人間向けラベル”は書かない。メタは値だけ渡す（モデルが coverTitle に混入させないため）
  const renderModeMeta = String(renderMode || 'default');
  const themeMeta = theme === 'dark' ? 'dark' : 'light';

  if (isJa) {
    return [
      "あなたは資料ラベル作成のJSONジェネレータです。これからユーザーは資料化したいテーマを短文で指定してきます。そこから(課題)→(提案)→(改善前後の顧客体験)→(期待できる効果: 数値)→(タスク)の流れで資料を作成してください。指定がない限り、ストーリーになるように数値などは創作可能です。ただし指定のキーのみで出力してください。資料のラベルにそのまま記載するため、敬語禁止、言い切り調の体言止めで。",
      "重要: title / importantMessage / 箇条書き / taskTitles は資料ラベルとして短く簡潔にする。冗長な説明、前置き、接続詞だらけの文章は禁止。1行で読める長さを優先。",
      "入力から、Swiftの AgendaItem / PatternData に適合する最終JSON(トップレベル配列1つ)を生成してください。",
      "参考情報: renderMode=" + renderModeMeta + ", theme=" + themeMeta + "。この行の文言や値を、出力JSONの文字列として流用しない。",
      "",
      "【入力】",
      "- ユーザーの資料テーマ: {{USER_BRIEF}}",
      "- 基準日(YYYY-MM-DD): {{BASE_DATE_YYYY-MM-DD}}",
      "",
      "【出力契約(最重要・絶対)】",
      "- 出力はJSONのみ。文章、前置き、解説、Markdown、コードブロック、バッククォート、箇条書き、jsonという見出し文字、注釈、追加の改行装飾は禁止。",
      "- 出力はトップレベルJSON配列1つだけ。",
      "  - 先頭は必ず[、末尾は必ず]。",
      "  - ]の後にいかなる文字も出力しない(改行・空白・2つ目のJSON・追記すべて禁止)。",
      "- 要素数は必ず5固定。順序固定。増減禁止。",
      "- 各要素は必ず3キーのみ: title, patternType, data(これ以外のキーは禁止)。",
      "- patternTypeは必ず整数。次のいずれかのみ: 1001, 1002, 1003, 1004, 1005。",
      "- null禁止。",
      "- 禁止: 絵文字、//を含む文字列、TBD/未定、プレースホルダ(XXX等)。",
      "- JSONとして必ずパース可能(末尾カンマ禁止、文字列内のダブルクォートは必ずエスケープ)。",
      "",
      "【5アイテム固定(順序厳守)】",
      "(1) 課題(patternType: 1001)",
      "(2) 提案(patternType: 1002)",
      "(3) Before/After(patternType: 1003)",
      "(4) 数値改善(patternType: 1005)",
      "(5) 誰が何をいつまでに(patternType: 1004)",
      "",
      "【必須仕様(最重要)】",
      "- 配列の要素数は必ず 5",
      "- patternType の順序は必ず [1001, 1002, 1003, 1005, 1004]",
      "- 各要素は必ず { \"title\": string, \"patternType\": number, \"data\": object }",
      "- data のキーは patternType ごとに「指定キーのみ」。余計なキー禁止。",
      "",
      "【patternType別 data フィールド仕様(これ以外のキーは禁止)】",
      "",
      "(1) patternType=1001(課題) data:",
      "- coverTitle: String(資料全体の表紙タイトル。ユーザー入力のテーマから意味のある短いタイトルを作る。禁止: 一般ラベル(例: 資料/デック/アイデア提案/ Vibe Sliding 等)の丸写し。)",
      "- title: String(このページのタイトル。ここだけ指定: 解決したい課題 とだけ記載すること)",
      "- VSproblemsToSolve: [String](最大5。短く。資料ラベルとして完結に)",
      "- VSproblemImagePrompt: String(画像生成用プロンプト。課題感。英語でOK。短く要点のみ)",
      "- VSproblemImageCacheKey: String(ASCIIのみ。英小文字/数字/ハイフンのみ。例: vibe-problem-1)",
      "- importantMessage: String(結論1行。体言止め。短く)",
      "",
      "(2) patternType=1002(提案) data:",
      "- title: String(提案内容を一言で表す。体言止め。短く)",
      "- VSproposalForBetter: [String](最大5。短く。資料ラベルとして完結に)",
      "- VSproposalImagePrompt: String(解決後のポジティブ。英語でOK。短く要点のみ)",
      "- VSproposalImageCacheKey: String(ASCIIのみ。英小文字/数字/ハイフンのみ。例: vibe-proposal-1)",
      "- importantMessage: String(結論1行。体言止め。短く)",
      "",
      "(3) patternType=1003(Before/After) data:",
      "- title: String(Afterの効果を一言で表す。体言止め。短く)",
      "- VSexpectedEffectsBefore: [String](最大3。短く。体言止め)",
      "- VSexpectedEffectsAfter:  [String](最大3。短く。体言止め)",
      "- importantMessage: String(短く。体言止め)",
      "",
      "(4) patternType=1005(数値改善 bars) data:",
      "- title: String(数値改善の効果を一言で表す。体言止め。短く)",
      "- yAxisName: String(基本的に時間軸。例: X月、2026年など)",
      "- unit: String(例: 円, %, 件, 分)",
      "- barGroups: [{ category: String, bars: [{ label: \"actual\", value: Number }] }]",
      "- importantMessage: String(結論1行。体言止め。短く)",
      "制約:",
      "- barGroupsは説得力を補強する本数にする(年間=12本、改善前後=2本など)。",
      "- bars内のlabelはactual固定。valueは必ず数値。",
      "- valueは現実的な数値。",
      "- 課題→提案→Before/Afterと矛盾しない改善ストーリー。",
      "",
      "(5) patternType=1004(タスク表) data:",
      "- title: String(タスク全体像の最も簡潔なタイトル。体言止め。短く)",
      "- taskTitles: [String](3〜6。短く。体言止め)",
      "- assignees: [String](taskTitlesと同数)",
      "- deadlines: [String](taskTitlesと同数)",
      "  - 形式: yyyy-MM-dd HH:mm(ゼロ埋め厳守)",
      "  - 時刻不明は23:59",
      "制約:",
      "- 3配列は必ず同じ要素数。",
      "- 空配列は禁止(最低3件)。",
      "- タスクは提案(1002)と矛盾しない具体性。",
      "- 期限は基準日から1〜8週以内。",
      "",
      "【内部検証(出力前に必ず実施・外部に書かない)】",
      "出力前に以下をすべて満たすまで内部で修正し続けよ(外部には一切表示しない):",
      "1) JSONがパースできる(トップレベル配列1つ、末尾ゴミなし)",
      "2) 要素数が5、順序が正しい",
      "3) 各要素がtitle/patternType/dataの3キーのみ",
      "4) dataキーが仕様どおりで余計なキーがない",
      "5) (1005) barsがlabel=actualのみでvalueが数値",
      "6) deadlinesが基準日から1〜8週以内、形式が厳密",
      "",
      "上記に1つでも違反があれば、出力せずに内部で修正し、最終的に条件を完全に満たしたJSON配列のみを出力せよ。",
      "",
      "以上の条件で、{{USER_BRIEF}}を最終JSON(配列)に変換して出力せよ。"
    ].join("\n");
  }

  // EN (follow the JA contract, avoid Japanese-specific style rules)
  return [
    "You are a JSON generator for slide label content for SlideAI Pro. The user provides a short deck theme. Create a 5-part deck in this flow: (Problem) → (Proposal) → (Before/After customer experience) → (Expected numeric impact) → (Tasks). If details are not provided, invent realistic numbers to form a coherent story. Output only the specified keys.",
    "Important: title / importantMessage / bullet items / taskTitles must be short, label-ready, and self-contained. No verbose explanations, no long prefaces.",
    "Generate the final JSON that matches Swift AgendaItem / PatternData. Output exactly one top-level JSON array.",
    "Meta: renderMode=" + renderModeMeta + ", theme=" + themeMeta + ". Do not reuse these words/values verbatim in any output strings.",
    "",
    "【Inputs】",
    "- Deck theme: {{USER_BRIEF}}",
    "- Base date (YYYY-MM-DD): {{BASE_DATE_YYYY-MM-DD}}",
    "",
    "【Output Contract (STRICT)】",
    "- Output JSON only. No prose, no preface, no explanations, no Markdown, no code blocks, no backticks, no headings like 'json'.",
    "- Output exactly one top-level JSON array. Must start with [ and end with ]. After ] output nothing at all.",
    "- Array length must be exactly 5. Do not add or remove items.",
    "- Each element must have exactly 3 keys: title, patternType, data (no other keys).",
    "- patternType must be an integer and must be one of: 1001, 1002, 1003, 1004, 1005.",
    "- null is forbidden. Emojis are forbidden. Strings containing // are forbidden.",
    "- JSON must be parseable (no trailing commas; escape double quotes inside strings).",
    "",
    "【Fixed 5 items (order is mandatory)】",
    "(1) Problem (patternType: 1001)",
    "(2) Proposal (patternType: 1002)",
    "(3) Before/After (patternType: 1003)",
    "(4) Numeric impact (patternType: 1005)",
    "(5) Tasks (patternType: 1004)",
    "",
    "【Mandatory requirements】",
    "- patternType order must be [1001, 1002, 1003, 1005, 1004]",
    "- data must contain ONLY the allowed keys per patternType (no extra keys).",
    "",
    "【Allowed data fields per patternType (NO other keys)】",
    "",
    "(1) patternType=1001 (Problem) data:",
    "- coverTitle: String (a meaningful short deck title derived from the user's theme; do NOT output generic labels like Deck/Proposal/Vibe Sliding)",
    "- title: String (must be exactly: \"Problem to solve\")",
    "- VSproblemsToSolve: [String] (max 5; short; label-ready)",
    "- VSproblemImagePrompt: String (image prompt; problem; English OK; short key points only)",
    "- VSproblemImageCacheKey: String (ASCII only; lowercase letters/numbers/hyphen only; example: vibe-problem-1)",
    "- importantMessage: String (one-line conclusion; short)",
    "",
    "(2) patternType=1002 (Proposal) data:",
    "- title: String (short phrase naming the proposal)",
    "- VSproposalForBetter: [String] (max 5; short; label-ready)",
    "- VSproposalImagePrompt: String (positive outcome prompt; English OK; short key points only)",
    "- VSproposalImageCacheKey: String (ASCII only; lowercase letters/numbers/hyphen only; example: vibe-proposal-1)",
    "- importantMessage: String (one-line conclusion; short)",
    "",
    "(3) patternType=1003 (Before/After) data:",
    "- title: String (short phrase summarizing the After impact)",
    "- VSexpectedEffectsBefore: [String] (max 3; short)",
    "- VSexpectedEffectsAfter:  [String] (max 3; short)",
    "- importantMessage: String (short)",
    "",
    "(4) patternType=1005 (Numeric impact bars) data:",
    "- title: String (short phrase summarizing the numeric impact)",
    "- yAxisName: String (time axis labels)",
    "- unit: String (e.g., JPY, %, requests, minutes)",
    "- barGroups: [{ category: String, bars: [{ label: \"actual\", value: Number }] }]",
    "- importantMessage: String (one-line conclusion; short)",
    "Constraints: label must be \"actual\" only, value must be numeric, values realistic and consistent.",
    "",
    "(5) patternType=1004 (Tasks table) data:",
    "- title: String (short title for the task set)",
    "- taskTitles: [String] (3 to 6; short)",
    "- assignees: [String] (same length as taskTitles)",
    "- deadlines: [String] (same length as taskTitles; format yyyy-MM-dd HH:mm; use 23:59 if unknown time; within 1–8 weeks from base date)",
    "",
    "【Internal validation】",
    "Before output, ensure parseable JSON, exactly 5 items, correct order, only allowed keys, and strict deadline format/range.",
    "",
    "Convert {{USER_BRIEF}} into the final JSON array and output it under this contract."
  ].join("\n");
}

module.exports = function buildSlideaiproAgendaJsonRouter({ callGemini, resolveLocale, logLong }) {
  const router = express.Router();

  router.post('/agenda-json', async (req, res) => {
    const debug = req.headers['x-debug-log'] === '1';

    try {
      const { brief, baseDate, locale: localeFromBody, prompt, renderMode, theme } = req.body || {};

      if (!brief || !String(brief).trim()) {
        return res.status(400).json({ ok: false, error: 'bad_request', details: 'brief is required' });
      }

      const baseDateValue = String(baseDate || '').trim() || todayISOInTokyo();
      const localeResolved = resolveLocale(req, localeFromBody);

      const systemInstruction =
        (typeof prompt === 'string' && prompt.trim())
          ? String(prompt).trim()
          : buildDefaultSystemInstruction(localeResolved, renderMode, theme);

      const filled = systemInstruction
        .split('{{USER_BRIEF}}').join(String(brief).trim())
        .split('{{BASE_DATE_YYYY-MM-DD}}').join(String(baseDateValue).trim());

      const generationConfig = {
        temperature: 0,
        maxOutputTokens: 16000,
        responseMimeType: 'application/json',
      };

      if (debug) {
        console.log('[AGENDA_JSON] hit /api/slideaipro/agenda-json');
        console.log('[AGENDA_JSON] localeResolved=', localeResolved);
        console.log('[AGENDA_JSON] renderMode=', renderMode || '(none)');
        console.log('[AGENDA_JSON] theme=', theme || '(none)');
        console.log('[AGENDA_JSON] baseDate=', baseDateValue);
        logLong('[AGENDA_JSON systemInstruction]', filled);
      }

      const raw = await callGemini(filled, '', generationConfig);

      if (debug) logLong('[AGENDA_JSON raw]', raw);

      const extracted = extractJsonArray(raw);
      if (!extracted) {
        console.error('[AGENDA_JSON] failed to extract JSON array');
        return res.status(500).json({
          ok: false,
          error: 'invalid_model_output',
          details: 'cannot parse array',
          raw,
        });
      }

      // brief を coverTitle フォールバックとして渡す（最終防衛）
      const normalized = normalizeAgendaArray(extracted, { fallbackCoverTitle: brief });

      return res.status(200).json(normalized);
    } catch (err) {
      console.error('[AGENDA_JSON] internal error:', err);
      return res.status(500).json({
        ok: false,
        error: 'internal_error',
        details: err.message || String(err),
      });
    }
  });

  return router;
};
