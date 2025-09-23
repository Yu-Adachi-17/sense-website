const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/exchange', async (req, res) => {
  try {
    const { code, redirectUri } = req.body || {};
    if (!code || !redirectUri) return res.status(400).json({ error: 'missing code/redirectUri' });

    const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
    const resp = await axios.post('https://zoom.us/oauth/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );
    res.json({ ok: true, tokens: resp.data });
  } catch (e) {
    res.status(500).json({ error: 'token_exchange_failed', detail: e.response?.data || e.message });
  }
});

module.exports = router;
