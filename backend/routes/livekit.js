// routes/livekit.js
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const router = express.Router();

// 起動時に必須envの有無をチェック（ログのみ）
if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_WS_URL) {
  console.warn('[LiveKit] Missing env(s): ' +
    `${!process.env.LIVEKIT_API_KEY ? 'LIVEKIT_API_KEY ' : ''}` +
    `${!process.env.LIVEKIT_API_SECRET ? 'LIVEKIT_API_SECRET ' : ''}` +
    `${!process.env.LIVEKIT_WS_URL ? 'LIVEKIT_WS_URL ' : ''}`.trim());
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
    if (!process.env.LIVEKIT_WS_URL) {
      return res.status(500).json({ error: 'Server misconfigured: LIVEKIT_WS_URL not set' });
    }

    // AccessTokenはサーバ側で発行（JWT; 期限は短め推奨）
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: String(identity),
        name: String(name || identity),
        ttl: '2h',
      }
    );

    // 参加権限付与（部屋名は文字列に確定）
    at.addGrant({
      roomJoin: true,
      room: String(roomName),
      canPublish: !!canPublish,
      canSubscribe: !!canSubscribe,
      // もしデータチャンネルも使うなら↓を付けてもOK
      // canPublishData: true,
    });

    const token = await at.toJwt();
    const wsUrl = process.env.LIVEKIT_WS_URL;

    return res.json({ token, wsUrl });
  } catch (e) {
    console.error('[LiveKit] token generation failed:', e);
    return res.status(500).json({ error: 'token generation failed' });
  }
});

module.exports = router;
