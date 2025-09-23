// backend/routes/zoomOAuthExchangeRoute.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

router.post('/exchange', async (req, res) => {
  try {
    // デバッグ：何が来たか確認
    console.log('[oauth/exchange] headers=', req.headers);
    console.log('[oauth/exchange] body=', req.body);

    const { code, redirectUri /*, state*/ } = req.body || {};
    if (!code || !redirectUri) {
      return res.status(400).json({ ok:false, error: 'missing code or redirectUri' });
    }

    // Zoom OAuth (Authorization Code) 交換
    const cid = process.env.ZOOM_CLIENT_ID;
    const secret = process.env.ZOOM_CLIENT_SECRET;
    if (!cid || !secret) {
      return res.status(500).json({ ok:false, error: 'missing env ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET' });
    }
    const basic = Buffer.from(`${cid}:${secret}`).toString('base64');

    // grant_type=authorization_code、redirect_uri は Zoom App 設定値と完全一致
    const tokenResp = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    return res.status(200).json({ ok: true, tokens: tokenResp.data });
  } catch (e) {
    const detail = e.response?.data || e.message;
    console.error('[oauth/exchange] error=', detail);
    return res.status(500).json({ ok:false, error: 'token_exchange_failed', detail });
  }
});

module.exports = router;
