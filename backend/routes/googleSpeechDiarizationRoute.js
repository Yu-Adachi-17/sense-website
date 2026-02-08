// routes/googleSpeechDiarizationRoute.js
const express = require('express');
const multer = require('multer');
const { getAuthorizationHeader } = require('../services/googleAuth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 疎通確認用（ルーティングが生きてるか）
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.post('/diarize/start', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required (multipart field name: file)' });
    }

    // ★ここが今回の本題：Authorization を確実に作る
    const authorization = await getAuthorizationHeader();

    // 以降、Google API 呼び出し時に必ず付ける
    // headers: { Authorization: authorization, ... }

    // ここはあなたの既存処理（GCS upload -> Speech batchRecognize）に接続
    // 例：仮レスポンス（実装済みの処理に置き換えて）
    return res.json({
      operationName: 'dummy-operation',
      debug: { authHeaderPresent: !!authorization },
    });

  } catch (e) {
    console.error('[googleSpeech/diarize/start] error:', e && e.message ? e.message : e);
    return res.status(500).json({
      error: e && e.message ? e.message : 'unknown error',
    });
  }
});

module.exports = router;
