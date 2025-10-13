// routes/zoomRecordingRoute.js
const express = require('express');
const axios = require('axios');
const { getZoomAccessToken } = require('../services/zoomTokens');
const { spawnZoomBot } = require('../services/zoomBotSpawner');

const router = express.Router();

// POST /api/recordings/zoom/start
router.post('/start', async (req, res) => {
  try {
    const { meeting_link, bypass_waiting_room = true } = req.body || {};
    if (!meeting_link) return res.status(400).json({ error: 'meeting_link is required' });

    const m = /\/j\/(\d+)/.exec(meeting_link);
    if (!m) return res.status(400).json({ error: 'invalid Zoom meeting_link (missing /j/{id})' });
    const meetingId = m[1];

    // 1) S2S アクセストークン
    const accessToken = await getZoomAccessToken();

    // 2) Join Token
    const apiUrl = `https://api.zoom.us/v2/meetings/${meetingId}/jointoken/local_recording${bypass_waiting_room ? '?bypass_waiting_room=true' : ''}`;
    const z = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const joinToken = z.data && z.data.token;
    if (!joinToken) return res.status(502).json({ error: 'Failed to fetch join token', details: z.data });

    // 3) Bot 起動
    const SDK_KEY  = process.env.ZOOM_SDK_KEY;
    const SDK_SECRET = process.env.ZOOM_SDK_SECRET;
    if (!SDK_KEY || !SDK_SECRET) return res.status(500).json({ error: 'SDK_KEY/SDK_SECRET are not set' });

    const container = process.env.BOT_CONTAINER_NAME || 'minutesai-raw';
    const outWav    = process.env.BOT_OUT_WAV  || '/tmp/mixed.wav';
    const runSecs   = process.env.BOT_RUN_SECS || '180';
    const botName   = process.env.BOT_NAME     || 'MinutesAI Bot';

    const { out } = await spawnZoomBot({
      meetingId, joinToken, sdkKey: SDK_KEY, sdkSecret: SDK_SECRET,
      container, outWav, runSecs, botName
    });

    return res.json({ bot_session_id: `${Date.now()}`, meeting_id: meetingId, out });
  } catch (err) {
    console.error('[ERROR] /api/recordings/zoom/start:', err?.response?.data || err);
    return res.status(500).json({ error: 'Internal error', details: err?.message || 'spawn failed' });
  }
});

module.exports = router;
