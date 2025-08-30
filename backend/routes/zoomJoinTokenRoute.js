// routes/zoomJoinTokenRoute.js
const express = require('express');
const axios = require('axios');

function requireEnv(k) { if (!process.env[k]) throw new Error(`Missing env: ${k}`); return process.env[k]; }

const router = express.Router();

// S2S OAuth (Server-to-Server): grant_type=account_credentials + account_id
async function getS2SAccessToken() {
  const clientId     = requireEnv('ZOOM_S2S_CLIENT_ID');
  const clientSecret = requireEnv('ZOOM_S2S_CLIENT_SECRET');
  const accountId    = requireEnv('ZOOM_ACCOUNT_ID');

  const url   = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const { data } = await axios.post(url, null, { headers: { Authorization: `Basic ${basic}` } });
  return data.access_token; // { access_token, expires_in, ... }
}

// GET /api/zoom/local-recording-token?meetingNumber=9815129794&bypass_waiting_room=true
router.get('/local-recording-token', async (req, res) => {
  try {
    // 内部トークンでゲート
    const hdr = req.header('x-internal-token');
    if (!hdr || hdr !== process.env.ZOOM_JWT_ROUTE_TOKEN) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const meetingId = req.query.meetingNumber || req.query.meetingId;
    if (!meetingId) return res.status(400).json({ error: 'missing meetingNumber' });

    const bypass = String(req.query.bypass_waiting_room) === 'true';

    const accessToken = await getS2SAccessToken();
    const api = `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/jointoken/local_recording` +
                (bypass ? '?bypass_waiting_room=true' : '');

    const { data } = await axios.get(api, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // 期待レスポンス例: { token: "eyJhbGciOi..." }
    return res.json({ token: data.token });
  } catch (err) {
    const status = err.response?.status || 500;
    const payload = err.response?.data || { message: err.message };
    return res.status(status).json({ error: payload });
  }
});

module.exports = router;
