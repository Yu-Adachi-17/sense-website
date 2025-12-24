// routes/slideaiproAgendaJson.js

const express = require('express');

function extractJsonArray(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();

  // まずそのまま配列パースを試す
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  // 次に「最初の[」〜「最後の]」で抽出
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
  // a-z, 0-9, - のみ
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

function normalizeAgendaArray(arr) {
  if (!Array.isArray(arr)) throw new Error('Output is not an array');
  if (arr.length !== 5) throw new Error(`Array length must be 5, got ${arr.length}`);

  const allowedPatternTypes = new Set([1001, 1002, 1003, 1005, 1004]);
  const expectedOrder = [1001, 1002, 1003, 1005, 1004];

  const schema = {
    1001: ['title', 'VSproblemsToSolve', 'VSproblemImagePrompt', 'VSproblemImageCacheKey', 'importantMessage'],
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
      throw new Error(
        `Item[${i}] patternType order mismatch. expected=${expectedOrder[i]} got=${patternType}`
      );
    }

    const title = typeof item.title === 'string' ? item.title : '';
    const data = item.data && typeof item.data === 'object' ? item.data : null;
    if (!data) throw new Error(`Item[${i}] missing data`);

    // 余計なキーを落とす
    const allowedDataKeys = schema[patternType];
    let cleanData = keepOnly(data, allowedDataKeys);

    // 1001/1002 cache key のサニタイズ（改行・混入事故の保険）
    if (patternType === 1001 && cleanData.VSproblemImageCacheKey !== undefined) {
      cleanData.VSproblemImageCacheKey = sanitizeCacheKey(cleanData.VSproblemImageCacheKey);
    }
    if (patternType === 1002 && cleanData.VSproposalImageCacheKey !== undefined) {
      cleanData.VSproposalImageCacheKey = sanitizeCacheKey(cleanData.VSproposalImageCacheKey);
    }

    // 配列上限（過剰生成の保険）
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
  // "YYYY-MM-DD" を JST 基準で作る
  try {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  } catch (_) {
    // フォールバック（環境により timeZone が効かない場合）
    return new Date().toISOString().slice(0, 10);
  }
}

function buildDefaultSystemInstruction(localeResolved, renderMode, theme) {
  const lang = (localeResolved || 'en').toLowerCase();
  const isJa = lang === 'ja';

  // renderMode/theme は今は「文章の雰囲気」程度でしか使わない（壊さないために受け取る）
  const modeHint =
    renderMode === 'vibeSlidingIdea'
      ? (isJa ? 'アイデア提案資料（Vibe Sliding）' : 'Idea proposal deck (Vibe Sliding)')
      : (isJa ? '資料' : 'Deck');

  const themeHint =
    theme === 'dark'
      ? (isJa ? 'ダークテーマ' : 'dark theme')
      : (isJa ? 'ライトテーマ' : 'light theme');

  if (isJa) {
    return `
あなたは SlideAI Pro の「Agenda JSON」を生成するエンジンです。
出力は必ず JSON の「トップレベル配列」だけ。前置き・説明・コードフェンスは禁止。

この資料は「${modeHint}」で、見た目は「${themeHint}」想定です（内容は変に装飾しない）。

必須仕様:
- 配列の要素数は必ず 5
- patternType の順序は必ず [1001, 1002, 1003, 1005, 1004]
- 各要素は必ず { "title": string, "patternType": number, "data": object }
- data のキーは patternType ごとに「指定キーのみ」。余計なキー禁止。

patternType=1001 data keys:
- title (string)
- VSproblemsToSolve (string[] 1〜5個)
- VSproblemImagePrompt (string)  ※課題を象徴する画像の生成プロンプト（日本語でOK）
- VSproblemImageCacheKey (string) ※a-z0-9- が望ましい（あなたは安全な短いキーを作る）
- importantMessage (string) ※このスライドの要点（1文）

patternType=1002 data keys:
- title (string)
- VSproposalForBetter (string[] 1〜5個)
- VSproposalImagePrompt (string)
- VSproposalImageCacheKey (string) ※a-z0-9- が望ましい
- importantMessage (string)

patternType=1003 data keys:
- title (string)
- VSexpectedEffectsBefore (string[] 最大3)
- VSexpectedEffectsAfter (string[] 最大3)
- importantMessage (string)

patternType=1005 data keys:
- title (string)
- yAxisName (string)
- unit (string) ※例: "円", "人", "件", "％"
- barGroups (array) ※各要素は { category: string, bars: [{ label:"actual", value:number }] } のみ
- importantMessage (string)

patternType=1004 data keys:
- title (string)
- taskTitles (string[] 3個以上)
- assignees (string[] taskTitles と同数)
- deadlines (string[] taskTitles と同数) ※BASE_DATE から見て現実的な期限

入力:
- USER_BRIEF: ユーザーが作りたい資料の短文テーマ
- BASE_DATE: 日付（YYYY-MM-DD）

USER_BRIEF:
{{USER_BRIEF}}

BASE_DATE:
{{BASE_DATE_YYYY-MM-DD}}
`.trim();
  }

  // EN
  return `
You generate SlideAI Pro "Agenda JSON".
Output MUST be a JSON top-level array only. No preface, no explanation, no code fences.

Deck type: ${modeHint}. Theme: ${themeHint}.

Hard requirements:
- Array length MUST be 5.
- patternType order MUST be [1001, 1002, 1003, 1005, 1004].
- Each item MUST be { "title": string, "patternType": number, "data": object }.
- data MUST contain ONLY the allowed keys per patternType (no extra keys).

patternType=1001 data keys:
- title (string)
- VSproblemsToSolve (string[] 1-5)
- VSproblemImagePrompt (string)
- VSproblemImageCacheKey (string, prefer a-z0-9-)
- importantMessage (string)

patternType=1002 data keys:
- title (string)
- VSproposalForBetter (string[] 1-5)
- VSproposalImagePrompt (string)
- VSproposalImageCacheKey (string, prefer a-z0-9-)
- importantMessage (string)

patternType=1003 data keys:
- title (string)
- VSexpectedEffectsBefore (string[] max 3)
- VSexpectedEffectsAfter (string[] max 3)
- importantMessage (string)

patternType=1005 data keys:
- title (string)
- yAxisName (string)
- unit (string)
- barGroups (array) where each element is { category: string, bars: [{ label:"actual", value:number }] }
- importantMessage (string)

patternType=1004 data keys:
- title (string)
- taskTitles (string[] at least 3)
- assignees (string[] same length)
- deadlines (string[] same length, realistic from BASE_DATE)

Inputs:
USER_BRIEF:
{{USER_BRIEF}}

BASE_DATE (YYYY-MM-DD):
{{BASE_DATE_YYYY-MM-DD}}
`.trim();
}

module.exports = function buildSlideaiproAgendaJsonRouter({ callGemini, resolveLocale, logLong }) {
  const router = express.Router();

  router.post('/agenda-json', async (req, res) => {
    const debug = req.headers['x-debug-log'] === '1';

    try {
      const {
        brief,
        baseDate,
        locale: localeFromBody,
        prompt,
        renderMode,
        theme,
      } = req.body || {};

      // brief は必須（これは残す）
      if (!brief || !String(brief).trim()) {
        return res.status(400).json({ ok: false, error: 'bad_request', details: 'brief is required' });
      }

      // baseDate は任意（なければ今日）
      const baseDateValue = String(baseDate || '').trim() || todayISOInTokyo();

      // locale 解決
      const localeResolved = resolveLocale(req, localeFromBody);

      // prompt は任意（なければサーバ既定プロンプト）
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

      if (debug) {
        logLong('[AGENDA_JSON raw]', raw);
      }

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

      const normalized = normalizeAgendaArray(extracted);

      // ✅ 成功時は「トップレベル配列だけ」を返す（フロントのデコードが一番安定）
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
