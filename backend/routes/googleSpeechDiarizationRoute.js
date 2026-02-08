// routes/googleSpeechDiarizationRoute.js
const express = require('express');
const multer = require('multer');
const { getAuthorizationHeader } = require('../services/googleAuth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 疎通確認
router.get('/health', (req, res) => res.json({ ok: true }));

// start（あなたの既存）
router.post('/diarize/start', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });

    // TODO: ここで GCS upload -> Speech batchRecognize をやって
    // operationName を返す（いま dummy-operation を返してるならそのままでもOK）
    return res.json({ operationName: 'dummy-operation' });
  } catch (e) {
    console.error('[diarize/start] error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

// ★追加：operation のポーリング（JSONを必ず返す）
router.get('/diarize/operation', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    if (!name) return res.status(400).json({ error: 'query param "name" is required' });

    // dummy の場合はJSONで返す（まずiOSのパースを直す）
    if (name === 'dummy-operation') {
      return res.json({ done: true, name, response: { ok: true } });
    }

    // 実運用：Google Operations をそのまま中継
    const authorization = await getAuthorizationHeader();

    // name は `projects/.../locations/.../operations/...` の形式を想定
    const url = `https://us-speech.googleapis.com/v2/${name}`;

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Accept': 'application/json',
      },
    });

    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text);
  } catch (e) {
    console.error('[diarize/operation] error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

module.exports = router;
