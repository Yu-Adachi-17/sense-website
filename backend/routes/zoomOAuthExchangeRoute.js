// backend/routes/zoomOAuthExchangeRoute.js
const express = require('express');
const axios = require('axios');

const router = express.Router();
router.use(express.json({ limit: '1mb' }));

// Zoom OAuth の redirect_uri は「認可リクエスト時に使ったURL」と **完全一致** が必須。
// フロントから受け取らず、ここで固定値を使う（Production の設定に合わせる）。
const REDIRECT_URI = 'https://sense-ai.world/zoom/oauth/callback';

// Preflight（念のため個別でも204を返す）
router.options('/exchange', (req, res) => res.sendStatus(204));

router.post('/exchange', async (req, res) => {
  try {
    const { code /*, state */ } = req.body || {};
    if (!code) {
      return res.status(400).json({ ok: false, error: 'missing code' });
    }

    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        ok: false,
        error: 'missing ZOOM_CLIENT_ID or ZOOM_CLIENT_SECRET',
      });
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // Zoom の認可コード → アクセストークン交換
    // OAuth2 標準どおり、application/x-www-form-urlencoded で送る
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI, // Zoom 側に登録したものと完全一致
    });

    const token = await axios.post(
      'https://zoom.us/oauth/token',
      params.toString(),
      {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    // 必要なら保存して下さい。まずは返すだけ。
    return res.json({ ok: true, tokens: token.data });
  } catch (e) {
    console.error('[zoom oauth exchange] error:', e.response?.status, e.response?.data || e.message);
    const status = e.response?.status || 400;
    return res.status(status).json({
      ok: false,
      error: 'token_exchange_failed',
      detail: e.response?.data || e.message,
    });
  }
});

module.exports = router;
