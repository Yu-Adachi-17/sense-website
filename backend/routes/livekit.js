// routes/livekit.js
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const router = express.Router();

// 起動時チェック（ログのみ）
if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
  console.warn('[LiveKit] Missing env(s): ' +
    `${!process.env.LIVEKIT_API_KEY ? 'LIVEKIT_API_KEY ' : ''}` +
    `${!process.env.LIVEKIT_API_SECRET ? 'LIVEKIT_API_SECRET ' : ''}` +
    `${!process.env.LIVEKIT_URL ? 'LIVEKIT_URL ' : ''}`.trim());
}

router.post('/token', async (req, res) => {
  try {
    const {
      roomName,
      identity,
      name,
      canPublish = true,
      canSubscribe = true,
    } = req.body || {};

    if (!roomName || !identity) {
      return res.status(400).json({ error: 'roomName / identity required' });
    }
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res.status(500).json({ error: 'Server misconfigured: missing API key/secret' });
    }
    if (!process.env.LIVEKIT_URL) {
      return res.status(500).json({ error: 'Server misconfigured: LIVEKIT_URL not set' });
    }

    // サーバ側でアクセス・トークンを発行（JWT / 例: 有効期限2h）
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: String(identity),
        name: String(name || identity),
        ttl: '2h',
      }
    );

    // 参加権限
    at.addGrant({
      roomJoin: true,
      room: String(roomName),
      canPublish: !!canPublish,
      canSubscribe: !!canSubscribe,
      // canPublishData: true, // 必要なら
    });

    const token = await at.toJwt();
    const wsUrl = process.env.LIVEKIT_URL; // ← ここを LIVEKIT_URL に統一

    return res.json({ token, wsUrl });
  } catch (e) {
    console.error('[LiveKit] token generation failed:', e);
    return res.status(500).json({ error: 'token generation failed' });
  }
});

module.exports = router;
