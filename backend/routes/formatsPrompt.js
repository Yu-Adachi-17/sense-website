// routes/formatsPrompt.js
const express = require('express');
const router = express.Router();

const { loadFormatJSON } = require('../services/formatLoader');

// GET /api/formats/prompt?formatId=xxx&locale=ja
router.get('/formats/prompt', (req, res) => {
  try {
    const formatId = String(req.query.formatId || '').trim();
    const locale = String(req.query.locale || '').trim();

    if (!formatId || !locale) {
      return res.status(400).json({ error: 'Missing formatId or locale' });
    }

    const payload = loadFormatJSON(formatId, locale);
    if (!payload) {
      return res.status(404).json({ error: 'Format or locale not found' });
    }

    // Android側が .prompt を見に行ける形にする
    return res.json({
      formatId,
      locale,
      title: payload.title || null,
      schemaId: payload.schemaId || null,
      prompt: payload.prompt || '',
      notes: payload.notes || null,
    });
  } catch (e) {
    console.error('[formatsPrompt] error:', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
});

module.exports = router;
