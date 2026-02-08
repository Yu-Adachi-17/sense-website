'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  startAzureDiarizationFromLocalFile,
  getAzureDiarizationStatus,
  getAzureDiarizationResult
} = require('../services/azureSpeechBatch');

const router = express.Router();

/**
 * Mounted at: app.use('/azureSpeech', router)
 *
 * Endpoints:
 *   GET  /azureSpeech/health
 *   POST /azureSpeech/diarize/start
 *   GET  /azureSpeech/diarize/status?id=...
 *   GET  /azureSpeech/diarize/result?id=...
 */

const tempDir = path.join(os.tmpdir(), 'minutesai_azureSpeech');
try { fs.mkdirSync(tempDir, { recursive: true }); } catch {}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '';
      const safe = `${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
      cb(null, safe);
    }
  }),
  limits: {
    fileSize: 1024 * 1024 * 1024
  }
});

function pickStr(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    if (v != null && typeof v !== 'object') {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return '';
}

function normalizeBcp47(s) {
  if (!s) return '';
  return String(s).trim().replace(/_/g, '-');
}

function parseCandidateLocalesFromReq(req) {
  // Accept:
  // - candidateLocales (repeatable field)  => req.body.candidateLocales can be string or array
  // - candidateLocales[]                  => some clients use bracket notation
  // - candidateLocalesCsv                 => "en-US,ja-JP,de-DE"
  // - candidateLocalesJson                => '["en-US","ja-JP"]'
  const b = req.body || {};
  const q = req.query || {};

  let raw =
    b.candidateLocales ??
    b['candidateLocales[]'] ??
    q.candidateLocales ??
    q['candidateLocales[]'] ??
    b.candidateLocalesJson ??
    q.candidateLocalesJson ??
    b.candidateLocalesCsv ??
    q.candidateLocalesCsv;

  if (raw == null) return [];

  // Array (multipart repeated keys)
  if (Array.isArray(raw)) {
    return raw.map(normalizeBcp47).filter(Boolean);
  }

  const s = String(raw).trim();
  if (!s) return [];

  // JSON array string
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(normalizeBcp47).filter(Boolean);
    } catch {}
  }

  // CSV
  if (s.includes(',')) {
    return s.split(',').map(normalizeBcp47).filter(Boolean);
  }

  // Single item
  return [normalizeBcp47(s)].filter(Boolean);
}

function uniqPreserveOrder(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const k = String(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function normalizeLocales(primaryLocale, candidateLocales, mode) {
  const primary = normalizeBcp47(primaryLocale) || 'en-US';
  const candidates = uniqPreserveOrder([primary, ...(candidateLocales || [])].map(normalizeBcp47).filter(Boolean));

  // Guardrails:
  // - Continuous: max 10 candidates (Azure仕様)
  // - Single: cap to avoid overly wide/unstable detection
  const m = (String(mode || 'Single').toLowerCase() === 'continuous') ? 'Continuous' : 'Single';
  const cap = (m === 'Continuous') ? 10 : 15;

  return {
    primaryLocale: primary,
    languageIdMode: m,
    candidateLocales: candidates.slice(0, cap)
  };
}

router.get('/health', (req, res) => res.json({ ok: true }));

router.post('/diarize/start', upload.single('file'), async (req, res) => {
  const cleanup = () => {
    try {
      if (req.file?.path) fs.unlinkSync(req.file.path);
    } catch {}
  };

  try {
    if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });

    const primaryLocaleRaw =
      pickStr(req.body?.primaryLocale, req.query?.primaryLocale, req.body?.locale, req.query?.locale) || 'en-US';

    const candidateLocalesRaw = parseCandidateLocalesFromReq(req);

    const languageIdModeRaw = pickStr(req.body?.languageIdMode, req.query?.languageIdMode) || 'Single';

    const lang = normalizeLocales(primaryLocaleRaw, candidateLocalesRaw, languageIdModeRaw);

    const minSpeakersRaw = req.body?.minSpeakers || req.query?.minSpeakers;
    const maxSpeakersRaw = req.body?.maxSpeakers || req.query?.maxSpeakers;

    const minSpeakers = minSpeakersRaw != null ? parseInt(String(minSpeakersRaw), 10) : 1;
    const maxSpeakers = maxSpeakersRaw != null ? parseInt(String(maxSpeakersRaw), 10) : 6;

    const wordLevelTimestampsEnabledRaw =
      req.body?.wordLevelTimestampsEnabled ?? req.query?.wordLevelTimestampsEnabled ?? '0';

    const wordLevelTimestampsEnabled =
      String(wordLevelTimestampsEnabledRaw) === '1' ||
      String(wordLevelTimestampsEnabledRaw).toLowerCase() === 'true';

    const started = await startAzureDiarizationFromLocalFile({
      filePath: req.file.path,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,

      // ✅ locale は Azure submit のトップレベル必須（fallback）
      locale: lang.primaryLocale,

      // ✅ languageIdentification 用（第二候補配列）
      candidateLocales: lang.candidateLocales,
      languageIdMode: lang.languageIdMode,

      minSpeakers: Number.isFinite(minSpeakers) ? minSpeakers : 1,
      maxSpeakers: Number.isFinite(maxSpeakers) ? maxSpeakers : 6,
      wordLevelTimestampsEnabled
    });

    cleanup();
    return res.json({
      ok: true,
      transcriptionId: started.transcriptionId,
      transcriptionUrl: started.transcriptionUrl,
      inputBlob: started.inputBlob,

      // デバッグ用に echo（不要なら消してOK）
      localeUsed: lang.primaryLocale,
      candidateLocalesUsed: lang.candidateLocales,
      languageIdModeUsed: lang.languageIdMode
    });
  } catch (e) {
    cleanup();
    console.error('[azureSpeech/diarize/start] error:', e?.message || e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

router.get('/diarize/status', async (req, res) => {
  try {
    const transcriptionId = (req.query?.id || req.query?.transcriptionId || '').toString();
    if (!transcriptionId) return res.status(400).json({ error: 'id (transcriptionId) is required' });

    const s = await getAzureDiarizationStatus({ transcriptionId });

    return res.json({
      ok: true,
      transcriptionId,
      status: s.status
    });
  } catch (e) {
    console.error('[azureSpeech/diarize/status] error:', e?.message || e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

router.get('/diarize/result', async (req, res) => {
  try {
    const transcriptionId = (req.query?.id || req.query?.transcriptionId || '').toString();
    if (!transcriptionId) return res.status(400).json({ error: 'id (transcriptionId) is required' });

    const r = await getAzureDiarizationResult({ transcriptionId });

    return res.json({
      ok: true,
      transcriptionId,
      status: r.status,
      combinedText: r.combinedText,
      segments: r.segments
    });
  } catch (e) {
    console.error('[azureSpeech/diarize/result] error:', e?.message || e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

module.exports = router;
