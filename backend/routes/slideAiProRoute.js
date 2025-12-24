// routes/slideAiProRoute.js

const express = require('express');
const { createSlideAiProAgendaJsonGenerator } = require('../services/slideAiProAgendaJson');

function createSlideAiProRouter({ callGemini }) {
  const router = express.Router();

  const generateAgendaJson = createSlideAiProAgendaJsonGenerator(callGemini);

  router.get('/slideaipro/health', (_req, res) => {
    return res.json({ ok: true, service: 'slideaipro' });
  });

  // ここが「チャット入力 → Gemini → JSON配列」本体
  router.post('/slideaipro/agenda-json', async (req, res) => {
    const startedAt = Date.now();

    try {
      const brief = String(req.body?.brief ?? req.body?.userBrief ?? '').trim();
      const baseDate = String(req.body?.baseDate ?? '').trim(); // optional (YYYY-MM-DD)

      if (!brief) {
        return res.status(400).json({ ok: false, error: 'brief is required' });
      }

      console.log('[SLIDEAIPRO] /agenda-json called');
      console.log('[SLIDEAIPRO] brief.len=', brief.length);
      console.log('[SLIDEAIPRO] baseDate=', baseDate || '(auto)');

      const result = await generateAgendaJson({ userBrief: brief, baseDate });

      const ms = Date.now() - startedAt;
      console.log('[SLIDEAIPRO] done ok=', result.ok, 'elapsedMs=', ms);
      if (!result.ok) {
        console.log('[SLIDEAIPRO] errors=', JSON.stringify(result.meta?.errors || [], null, 2));
      }

      // Railwayログで確認したい用途向けに、必要なら raw を長文でも出す（環境変数 or header）
      const shouldLogRaw =
        process.env.LOG_SLIDEAIPRO_RAW === '1' ||
        req.headers['x-debug-log'] === '1';

      if (shouldLogRaw) {
        const raw = result.raw || '';
        console.log(`[SLIDEAIPRO] raw.len=${raw.length}`);
        // 長すぎるログ分割
        const step = 8000;
        for (let i = 0; i < raw.length; i += step) {
          console.log(`[SLIDEAIPRO] raw[${i}-${Math.min(i + step, raw.length)}]\n${raw.slice(i, i + step)}`);
        }
      }

      return res.json({
        ok: result.ok,
        baseDate: result.baseDate,
        meta: result.meta,
        parsed: result.parsed,
        raw: result.raw,
      });
    } catch (e) {
      console.error('[SLIDEAIPRO] error:', e?.message || e);
      return res.status(500).json({
        ok: false,
        error: 'internal_error',
        details: e?.message || String(e),
      });
    }
  });

  return router;
}

module.exports = createSlideAiProRouter;
