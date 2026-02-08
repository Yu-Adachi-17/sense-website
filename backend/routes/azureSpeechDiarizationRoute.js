// routes/azureSpeechDiarizationRoute.js

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

router.get('/health', (req, res) => res.json({ ok: true }));

router.post('/diarize/start', upload.single('file'), async (req, res) => {
  const cleanup = () => {
    try {
      if (req.file?.path) fs.unlinkSync(req.file.path);
    } catch {}
  };

  try {
    if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });

    const locale = (req.body?.locale || req.query?.locale || 'en-US').toString();
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
      locale,
      minSpeakers: Number.isFinite(minSpeakers) ? minSpeakers : 1,
      maxSpeakers: Number.isFinite(maxSpeakers) ? maxSpeakers : 6,
      wordLevelTimestampsEnabled
    });

    cleanup();
    return res.json({
      ok: true,
      transcriptionId: started.transcriptionId,
      transcriptionUrl: started.transcriptionUrl,
      inputBlob: started.inputBlob
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
