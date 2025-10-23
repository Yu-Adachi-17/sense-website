// routes/livekit.js
/* eslint-disable no-console */
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const { ensureAudioEgress } = require('../services/livekitEgress'); // 録音 ensure

const router = express.Router();

/**
 * ルームが「ホストのFinishにより終了扱い」になったかどうかを保持する簡易ストア
 * 本番では Redis などに置き換え推奨（TTL付き）
 */
const finishedRooms = new Map();
// ★ server.js からは router をミドルウェアとして使えるように export しつつ
//   別ファイルからは finishedRooms を参照できるよう、プロパティで公開する
router.finishedRooms = finishedRooms;

// 起動時チェック（ログのみ）
if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
  console.warn(
    '[LiveKit] Missing env(s): ' +
      `${!process.env.LIVEKIT_API_KEY ? 'LIVEKIT_API_KEY ' : ''}` +
      `${!process.env.LIVEKIT_API_SECRET ? 'LIVEKIT_API_SECRET ' : ''}` +
      `${!process.env.LIVEKIT_URL ? 'LIVEKIT_URL ' : ''}`.trim()
  );
}

// yyyy-mm-dd（UTC）
function yyyyMmDd(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * POST /api/livekit/token
 * body: {
 *   roomName: string (required),
 *   identity: string (required),
 *   name?: string,
 *   canPublish?: boolean = true,
 *   canSubscribe?: boolean = true,
 *   ensurePrefix?: string  // 省略時は minutes/YYYY-MM-DD/
 * }
 *
 * return: { token, wsUrl }
 * side-effect: finishedRooms[roomName] が立っていなければ ensureAudioEgress を非同期起動
 */
router.post('/token', async (req, res) => {
  try {
    const {
      roomName,
      identity,
      name,
      canPublish = true,
      canSubscribe = true,
      ensurePrefix, // optional
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

    // アクセストークン発行（例: 有効期限 2h）
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: String(identity),
        name: String(name || identity),
        ttl: '2h',
      }
    );

    at.addGrant({
      roomJoin: true,
      room: String(roomName),
      canPublish: !!canPublish,
      canSubscribe: !!canSubscribe,
      // canPublishData: true,
    });

    const token = await at.toJwt();
    const wsUrl = process.env.LIVEKIT_URL;

    // レスポンスを即返す（UX優先）
    res.json({ token, wsUrl });

    // ★ 録音 ensure：Finish 済みの部屋では起動しない
    if (!finishedRooms.get(roomName)) {
      const prefix = typeof ensurePrefix === 'string' && ensurePrefix.length > 0
        ? ensurePrefix
        : `minutes/${yyyyMmDd()}/`;

      (async () => {
        try {
          const r = await ensureAudioEgress({ roomName: String(roomName), prefix });
          console.log('[livekit/token.ensureAudioEgress]', roomName, r);
        } catch (e) {
          console.error('[livekit/token.ensureAudioEgress] failed', e?.message || e);
        }
      })();
    } else {
      console.log('[token] ensure skipped because room finished:', roomName);
    }

  } catch (e) {
    console.error('[LiveKit] token generation failed:', e);
    return res.status(500).json({ error: 'token generation failed' });
  }
});

module.exports = router; // ★ ここは“関数（ミドルウェア）”をそのまま export
