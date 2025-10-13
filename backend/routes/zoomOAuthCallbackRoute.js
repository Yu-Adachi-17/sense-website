// routes/zoomOAuthCallbackRoute.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

// GET /zoom/oauth/callback
router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query || {};
  if (!code) return res.status(400).send('Missing code');

  try {
    const cid = process.env.ZOOM_CLIENT_ID;
    const secret = process.env.ZOOM_CLIENT_SECRET;
    if (!cid || !secret) return res.status(500).send('Missing Zoom client credentials');

    const redirectUri = 'https://sense-ai.world/zoom/oauth/callback'; // ←運用URLに合わせて固定値で

    const basic = Buffer.from(`${cid}:${secret}`).toString('base64');
    await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    res.status(200).send(`<!doctype html><meta charset="utf-8">
<title>Connected to Zoom</title>
<body style="font-family: system-ui; margin: 40px;">
  <h1>Connected to Zoom ✓</h1>
  <p>Authorization completed successfully.</p>
  <p><a href="/zoom/app">Continue</a></p>
</body>`);
  } catch (e) {
    console.error('[ZOOM] token exchange failed:', e.response?.data || e.message);
    res.status(500).send('Zoom authorization failed. Please try again.');
  }
});

module.exports = router;
