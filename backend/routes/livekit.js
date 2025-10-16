// routes/livekit.js
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const router = express.Router();

router.post('/token', async (req, res) => {
  try {
    const { roomName, identity, name, canPublish = true, canSubscribe = true } = req.body || {};
    if (!roomName || !identity) return res.status(400).json({ error: 'roomName / identity required' });

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity,
      name,
      ttl: '2h',
    });
    at.addGrant({ roomJoin: true, room: roomName, canPublish, canSubscribe });

    const token = await at.toJwt();
    res.json({ token, wsUrl: process.env.LIVEKIT_WS_URL });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'token generation failed' });
  }
});

module.exports = router;
