// backend/routes/zoomOAuthExchangeRoute.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

// Preflight（念のため個別でも204を返す）
router.options('/exchange', (req, res) => res.sendStatus(204));

router.post('/exchange', async (req, res) => {
  try {
    const { code, redirectUri, state } = req.body || {};
    if (!code || !redirectUri) {
      return res.status(400).json({ ok: false, error: 'missing code or redirectUri' });
    }

    // （必要なら）state 検証をここで行う

    const basic = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    // Zoom の認可コード → アクセストークン交換
    // OAuth2 標準どおり、application/x-www-form-urlencoded で送ります
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri, // ← Zoom 側に登録したものと完全一致が必須
    });

    const token = await axios.post(
      'https://zoom.us/oauth/token',
      params.toString(),
      {
        headers: {
          'Authorization': `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    // 必要なら保存して下さい。まずは返すだけ。
    return res.json({ ok: true, tokens: token.data });
  } catch (e) {
    console.error('[zoom oauth exchange] error:', e.response?.data || e.message);
    return res.status(400).json({
      ok: false,
      error: 'token_exchange_failed',
      detail: e.response?.data || e.message,
    });
  }
});

module.exports = router;
