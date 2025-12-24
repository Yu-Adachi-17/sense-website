// services/slideAiProAgendaJson.js

const { buildSlideAiProAgendaPromptJa } = require('../prompts/slideAiProAgendaPromptJa');

const ORDER = [1001, 1002, 1003, 1005, 1004];

const ALLOWED_DATA_KEYS = {
  1001: new Set([
    'title',
    'VSproblemsToSolve',
    'VSproblemImagePrompt',
    'VSproblemImageCacheKey',
    'importantMessage',
  ]),
  1002: new Set([
    'title',
    'VSproposalForBetter',
    'VSproposalImagePrompt',
    'VSproposalImageCacheKey',
    'importantMessage',
  ]),
  1003: new Set([
    'title',
    'VSexpectedEffectsBefore',
    'VSexpectedEffectsAfter',
    'importantMessage',
  ]),
  1005: new Set([
    'title',
    'yAxisName',
    'unit',
    'barGroups',
    'importantMessage',
  ]),
  1004: new Set([
    'title',
    'taskTitles',
    'assignees',
    'deadlines',
  ]),
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function todayJstYYYYMMDD() {
  const now = new Date();
  // サーバはUTCの場合があるので、JSTで日付を切る（最小の補正）
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}`;
}

function stripCodeFences(s) {
  if (!s || typeof s !== 'string') return '';
  let t = s.trim();
  t = t.replace(/^json\s*\n/i, '');
  t = t.replace(/^```(?:json)?\s*\n/i, '');
  t = t.replace(/\n```$/i, '');
  return t.trim();
}

function extractJsonArrayText(s) {
  const t = stripCodeFences(s);
  const first = t.indexOf('[');
  const last = t.lastIndexOf(']');
  if (first === -1 || last === -1 || last <= first) return null;
  return t.slice(first, last + 1);
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function validateAgendaArray(arr) {
  const errors = [];

  if (!Array.isArray(arr)) {
    errors.push('top-level is not array');
    return errors;
  }

  if (arr.length !== 5) errors.push(`array length must be 5, got ${arr.length}`);

  for (let i = 0; i < Math.min(arr.length, 5); i++) {
    const it = arr[i];
    const expectedType = ORDER[i];

    if (!isPlainObject(it)) {
      errors.push(`item[${i}] is not object`);
      continue;
    }

    const keys = Object.keys(it).sort();
    const okKeys = ['data', 'patternType', 'title'];
    if (keys.length !== 3 || keys.join(',') !== okKeys.join(',')) {
      errors.push(`item[${i}] keys must be exactly title/patternType/data (got: ${keys.join(',')})`);
    }

    if (typeof it.title !== 'string' || !it.title.trim()) errors.push(`item[${i}].title must be non-empty string`);

    if (typeof it.patternType !== 'number' || !Number.isInteger(it.patternType)) {
      errors.push(`item[${i}].patternType must be int`);
    } else {
      if (it.patternType !== expectedType) {
        errors.push(`item[${i}].patternType must be ${expectedType}, got ${it.patternType}`);
      }
    }

    if (!isPlainObject(it.data)) {
      errors.push(`item[${i}].data must be object`);
      continue;
    }

    const allow = ALLOWED_DATA_KEYS[expectedType];
    if (!allow) {
      errors.push(`unknown patternType at item[${i}]`);
      continue;
    }

    for (const k of Object.keys(it.data)) {
      if (!allow.has(k)) errors.push(`item[${i}].data has forbidden key: ${k}`);
    }
    // 必須キーの存在（最小限）
    for (const k of allow) {
      if (!(k in it.data)) errors.push(`item[${i}].data missing key: ${k}`);
      if (it.data[k] === null) errors.push(`item[${i}].data.${k} must not be null`);
    }

    // 追加の型・制約（最低限だが実務で効くところだけ）
    if (expectedType === 1001) {
      if (it.data.title !== '解決したい課題') errors.push(`item[${i}].data.title must be "解決したい課題"`);
      if (!Array.isArray(it.data.VSproblemsToSolve) || it.data.VSproblemsToSolve.length < 1 || it.data.VSproblemsToSolve.length > 5) {
        errors.push(`item[${i}].data.VSproblemsToSolve length must be 1..5`);
      }
      if (typeof it.data.VSproblemImageCacheKey !== 'string' || !/^[a-z0-9-]+$/.test(it.data.VSproblemImageCacheKey)) {
        errors.push(`item[${i}].data.VSproblemImageCacheKey must be [a-z0-9-]+`);
      }
    }

    if (expectedType === 1002) {
      if (!Array.isArray(it.data.VSproposalForBetter) || it.data.VSproposalForBetter.length < 1 || it.data.VSproposalForBetter.length > 5) {
        errors.push(`item[${i}].data.VSproposalForBetter length must be 1..5`);
      }
      if (typeof it.data.VSproposalImageCacheKey !== 'string' || !/^[a-z0-9-]+$/.test(it.data.VSproposalImageCacheKey)) {
        errors.push(`item[${i}].data.VSproposalImageCacheKey must be [a-z0-9-]+`);
      }
    }

    if (expectedType === 1003) {
      if (!Array.isArray(it.data.VSexpectedEffectsBefore) || it.data.VSexpectedEffectsBefore.length < 1 || it.data.VSexpectedEffectsBefore.length > 3) {
        errors.push(`item[${i}].data.VSexpectedEffectsBefore length must be 1..3`);
      }
      if (!Array.isArray(it.data.VSexpectedEffectsAfter) || it.data.VSexpectedEffectsAfter.length < 1 || it.data.VSexpectedEffectsAfter.length > 3) {
        errors.push(`item[${i}].data.VSexpectedEffectsAfter length must be 1..3`);
      }
    }

    if (expectedType === 1005) {
      if (!Array.isArray(it.data.barGroups) || it.data.barGroups.length < 2) {
        errors.push(`item[${i}].data.barGroups must be array (>=2 recommended)`);
      } else {
        for (let gi = 0; gi < it.data.barGroups.length; gi++) {
          const g = it.data.barGroups[gi];
          if (!isPlainObject(g)) {
            errors.push(`item[${i}].data.barGroups[${gi}] is not object`);
            continue;
          }
          if (typeof g.category !== 'string' || !g.category.trim()) errors.push(`item[${i}].data.barGroups[${gi}].category must be non-empty string`);
          if (!Array.isArray(g.bars) || g.bars.length !== 1) {
            errors.push(`item[${i}].data.barGroups[${gi}].bars must be array length=1`);
            continue;
          }
          const b = g.bars[0];
          if (!isPlainObject(b)) {
            errors.push(`item[${i}].data.barGroups[${gi}].bars[0] is not object`);
            continue;
          }
          if (b.label !== 'actual') errors.push(`item[${i}].data.barGroups[${gi}].bars[0].label must be "actual"`);
          if (typeof b.value !== 'number' || Number.isNaN(b.value)) errors.push(`item[${i}].data.barGroups[${gi}].bars[0].value must be number`);
        }
      }
    }

    if (expectedType === 1004) {
      const { taskTitles, assignees, deadlines } = it.data;
      if (!Array.isArray(taskTitles) || taskTitles.length < 3 || taskTitles.length > 6) errors.push(`item[${i}].data.taskTitles length must be 3..6`);
      if (!Array.isArray(assignees) || assignees.length !== (taskTitles?.length || -1)) errors.push(`item[${i}].data.assignees length must match taskTitles`);
      if (!Array.isArray(deadlines) || deadlines.length !== (taskTitles?.length || -1)) errors.push(`item[${i}].data.deadlines length must match taskTitles`);
      if (Array.isArray(deadlines)) {
        for (let di = 0; di < deadlines.length; di++) {
          const d = deadlines[di];
          if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(d)) {
            errors.push(`item[${i}].data.deadlines[${di}] must match yyyy-MM-dd HH:mm`);
          }
        }
      }
    }
  }

  return errors;
}

async function repairOnce({ callGemini, systemPrompt, badText, errors }) {
  const repairSystem = [
    "You are a strict JSON repair tool.",
    "Return ONLY a top-level JSON array that satisfies the contract.",
    "Do not output any text outside JSON.",
    "",
    "Contract summary:",
    "- Top-level must be a single JSON array.",
    "- Length must be exactly 5.",
    "- Order of patternType must be: 1001,1002,1003,1005,1004.",
    "- Each item must have exactly keys: title, patternType, data.",
    "- No null.",
    "- For 1005 bars: label must be 'actual' only and value must be number.",
    "- For 1004 deadlines must be 'yyyy-MM-dd HH:mm'."
  ].join("\n");

  const repairUser = [
    "Here is the original system prompt that must be followed:",
    systemPrompt,
    "",
    "Validation errors found:",
    errors.map((e) => `- ${e}`).join("\n"),
    "",
    "Broken output to repair (may include extra text; ignore it and output only valid JSON array):",
    badText
  ].join("\n");

  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 12000,
    responseMimeType: 'application/json',
  };

  const out = await callGemini(repairSystem, repairUser, generationConfig);
  return out;
}

function createSlideAiProAgendaJsonGenerator(callGemini) {
  if (typeof callGemini !== 'function') throw new Error('callGemini function is required');

  return async function generateAgendaJson({ userBrief, baseDate }) {
    const brief = String(userBrief || '').trim();
    if (!brief) throw new Error('userBrief is empty');

    const base = String(baseDate || '').trim() || todayJstYYYYMMDD();

    const systemPrompt = buildSlideAiProAgendaPromptJa()
      .replaceAll('{{USER_BRIEF}}', brief)
      .replaceAll('{{BASE_DATE}}', base);

    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
      responseMimeType: 'application/json',
    };

    // 1st try
    let raw = await callGemini(systemPrompt, '', generationConfig);
    raw = stripCodeFences(raw);

    // parse attempt
    let arr = null;
    let parseUsedExtraction = false;

    try {
      arr = JSON.parse(raw);
    } catch {
      const extracted = extractJsonArrayText(raw);
      if (extracted) {
        parseUsedExtraction = true;
        try {
          arr = JSON.parse(extracted);
          raw = extracted;
        } catch {
          arr = null;
        }
      }
    }

    let errors = arr ? validateAgendaArray(arr) : ['JSON parse failed'];

    // 2nd try (repair once)
    if (errors.length > 0) {
      const repaired = await repairOnce({
        callGemini,
        systemPrompt,
        badText: raw,
        errors,
      });

      let repairedRaw = stripCodeFences(repaired);
      let repairedArr = null;

      try {
        repairedArr = JSON.parse(repairedRaw);
      } catch {
        const extracted = extractJsonArrayText(repairedRaw);
        if (extracted) {
          repairedRaw = extracted;
          repairedArr = JSON.parse(repairedRaw);
        }
      }

      const repairedErrors = validateAgendaArray(repairedArr);
      if (repairedErrors.length === 0) {
        return {
          ok: true,
          baseDate: base,
          raw: repairedRaw,
          parsed: repairedArr,
          meta: {
            repaired: true,
            parseUsedExtraction: false,
          },
        };
      }

      return {
        ok: false,
        baseDate: base,
        raw: repairedRaw,
        parsed: repairedArr || null,
        meta: {
          repaired: true,
          parseUsedExtraction: false,
          errors: repairedErrors,
        },
      };
    }

    return {
      ok: true,
      baseDate: base,
      raw,
      parsed: arr,
      meta: {
        repaired: false,
        parseUsedExtraction,
      },
    };
  };
}

module.exports = {
  createSlideAiProAgendaJsonGenerator,
};
