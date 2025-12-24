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
  const cleaned = s.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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
      throw new Error(`Item[${i}] patternType order mismatch. expected=${expectedOrder[i]} got=${patternType}`);
    }

    const title = typeof item.title === 'string' ? item.title : '';
    const data = (item.data && typeof item.data === 'object') ? item.data : null;
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
      cleanData.VSproblemsToSolve = cleanData.VSproblemsToSolve.slice(0, 5).map(x => String(x));
    }
    if (patternType === 1002 && Array.isArray(cleanData.VSproposalForBetter)) {
      cleanData.VSproposalForBetter = cleanData.VSproposalForBetter.slice(0, 5).map(x => String(x));
    }
    if (patternType === 1003 && Array.isArray(cleanData.VSexpectedEffectsBefore)) {
      cleanData.VSexpectedEffectsBefore = cleanData.VSexpectedEffectsBefore.slice(0, 3).map(x => String(x));
    }
    if (patternType === 1003 && Array.isArray(cleanData.VSexpectedEffectsAfter)) {
      cleanData.VSexpectedEffectsAfter = cleanData.VSexpectedEffectsAfter.slice(0, 3).map(x => String(x));
    }

    // 1005 bars を actual のみに正規化
    if (patternType === 1005 && Array.isArray(cleanData.barGroups)) {
      cleanData.barGroups = cleanData.barGroups.map(bg => {
        const category = String(bg?.category ?? '');
        const bars = Array.isArray(bg?.bars) ? bg.bars : [];
        const actual = bars.find(b => (b?.label === 'actual')) || bars[0];
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

module.exports = function buildSlideaiproAgendaJsonRouter({ callGemini, resolveLocale, logLong }) {
  const router = express.Router();

  router.post('/agenda-json', async (req, res) => {
    const debug = req.headers['x-debug-log'] === '1';

    try {
      const { brief, baseDate, locale: localeFromBody, prompt } = req.body || {};
      if (!brief || !String(brief).trim()) {
        return res.status(400).json({ ok: false, error: 'bad_request', details: 'brief is required' });
      }
      if (!baseDate || !String(baseDate).trim()) {
        return res.status(400).json({ ok: false, error: 'bad_request', details: 'baseDate is required' });
      }

      const localeResolved = resolveLocale(req, localeFromBody);

      // あなたの既存プロンプト文字列を body.prompt で渡す運用でもOKにしておく
      // （サーバ側で ja/en を持つならそこに差し替えてください）
      const systemInstruction = String(prompt || '').trim();
      if (!systemInstruction) {
        return res.status(400).json({ ok: false, error: 'bad_request', details: 'prompt is required on this route' });
      }

      const filled = systemInstruction
        .split('{{USER_BRIEF}}').join(String(brief).trim())
        .split('{{BASE_DATE_YYYY-MM-DD}}').join(String(baseDate).trim());

      const generationConfig = {
        temperature: 0,
        maxOutputTokens: 16000,
        responseMimeType: 'application/json',
      };

      if (debug) {
        console.log('[AGENDA_JSON] hit /api/slideaipro/agenda-json');
        console.log('[AGENDA_JSON] localeResolved=', localeResolved);
        logLong('[AGENDA_JSON systemInstruction]', filled);
      }

      const raw = await callGemini(filled, '', generationConfig);

      if (debug) {
        logLong('[AGENDA_JSON raw]', raw);
      }

      const extracted = extractJsonArray(raw);
      if (!extracted) {
        console.error('[AGENDA_JSON] failed to extract JSON array');
        return res.status(500).json({ ok: false, error: 'invalid_model_output', details: 'cannot parse array', raw });
      }

      const normalized = normalizeAgendaArray(extracted);

      // ✅ 成功時は「トップレベル配列だけ」を返す（フロントのデコードが一番安定する）
      return res.status(200).json(normalized);

    } catch (err) {
      console.error('[AGENDA_JSON] internal error:', err);
      return res.status(500).json({ ok: false, error: 'internal_error', details: err.message || String(err) });
    }
  });

  return router;
};
