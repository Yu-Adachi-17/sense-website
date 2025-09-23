// backend/routes/zoomOAuthExchangeRoute.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

// 念のためこのルーター配下でも JSON を強制しておく（親でも設定しているが二重でも害なし）
router.use(express.json());

router.post('/exchange', async (req, res) => {
  try {
    const { code, redirectUri /*, state*/ } = req.body || {};
    if (!code || !redirectUri) {
      // ボディが取れているか徹底ログ
      console.error('[OAUTH] missing field. headers=', req.headers, 'body=', req.body);
      return res.status(400).json({ error: 'missing code/redirectUri' });
    }

    const cid = process.env.ZOOM_CLIENT_ID;
    const secret = process.env.ZOOM_CLIENT_SECRET;
    if (!cid || !secret) {
      return res.status(500).json({ error: 'missing env ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET' });
    }

    // Zoom の OAuth トークンは Basic 認証 + x-www-form-urlencoded
    // redirect_uri は「認可時に使ったもの」と Zoom App 設定の値と完全一致が必須
    const basic = Buffer.from(`${cid}:${secret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });

    const resp = await axios.post('https://zoom.us/oauth/token', params, {
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 15000
    });

    // 正常系（Zoom 返却: access_token, refresh_token, expires_in, scope, token_type）
    return res.status(200).json({ ok: true, tokens: resp.data });
  } catch (e) {
    // 失敗時は Zoom のボディをそのまま detail に載せる
    const detail = e.response?.data || e.message;
    console.error('[OAUTH] token exchange failed:', detail);
    return res.status(500).json({ ok: false, error: 'token_exchange_failed', detail });
  }
});

module.exports = router;
