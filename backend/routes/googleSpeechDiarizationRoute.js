const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');

const {
  uploadLocalFileToGCS,
  startBatchRecognize,
  getOperation,
  extractResultIfDone
} = require('../services/googleSpeechDiarizationService');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      const safe = String(file.originalname || 'audio').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
    }
  }),
  limits: { fileSize: 1024 * 1024 * 300 }
});

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.post('/diarize/start', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'file is required (multipart/form-data, field name "file")' });
    }

    const bucketName = process.env.GCP_GCS_BUCKET || 'minutes-diarization-2';

    const languageCodes = String(req.body.languageCodes || 'ja-JP,en-US')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const minSpeakerCount = Number(req.body.minSpeakerCount || 2);
    const maxSpeakerCount = Number(req.body.maxSpeakerCount || 5);
    const enableWordTimeOffsets = req.body.enableWordTimeOffsets == null ? true : String(req.body.enableWordTimeOffsets) === 'true';

    const gcsUri = await uploadLocalFileToGCS({
      localPath: req.file.path,
      bucketName
    });

    try { fs.unlinkSync(req.file.path); } catch {}

    const operationName = await startBatchRecognize({
      gcsUri,
      languageCodes,
      minSpeakerCount,
      maxSpeakerCount,
      enableWordTimeOffsets
    });

    res.json({
      operationName,
      gcsUri
    });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

router.get('/diarize/operation', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'query param "name" is required' });

    const op = await getOperation(name);
    const result = extractResultIfDone(op);

    if (!result) {
      return res.json({ done: false });
    }

    if (result.error) {
      return res.status(500).json({ done: true, error: result.error });
    }

    res.json({
      done: true,
      audioUri: result.audioUri,
      fullText: result.fullText,
      segments: result.segments
    });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

module.exports = router;
