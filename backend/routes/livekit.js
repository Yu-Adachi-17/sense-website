// routes/livekit.js
/* eslint-disable no-console */
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const { ensureAudioEgress } = require('../services/livekitEgress'); // ★ 追加：録音ensure

const router = express.Router();

// 起動時チェック（ログのみ）
if (
  !process.env.LIVEKIT_API_KEY ||
  !process.env.LIVEKIT_API_SECRET ||
  !process.env.LIVEKIT_URL
) {
  console.warn(
    `[LiveKit] Missing env(s): ${
      !process.env.LIVEKIT_API_KEY ? 'LIVEKIT_API_KEY ' : ''
    }${!process.env.LIVEKIT_API_SECRET ? 'LIVEKIT_API_SECRET ' : ''}${
      !process.env.LIVEKIT_URL ? 'LIVEKIT_URL ' : ''
    }`.trim()
  );
}

// yyyy-mm-dd を返す簡易ヘルパ（UTC基準でOK。タイムゾーンが必要ならここで調整）
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
 *   // 任意: ensure用の保存先プレフィックスを上書き可能（既定は minutes/YYYY-MM-DD/）
 *   ensurePrefix?: string
 * }
 *
 * 返り値: { token, wsUrl }
 * 副作用: 裏で ensureAudioEgress({ roomName, prefix }) を非同期実行（録音が未稼働なら起動）
 */
router.post('/token', async (req, res) => {
  try {
    const {
      roomName,
      identity,
      name,
      canPublish = true,
      canSubscribe = true,
      ensurePrefix, // 任意
    } = req.body || {};

    if (!roomName || !identity) {
      return res.status(400).json({ error: 'roomName / identity required' });
    }
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res
        .status(500)
        .json({ error: 'Server misconfigured: missing API key/secret' });
    }
    if (!process.env.LIVEKIT_URL) {
      return res
        .status(500)
        .json({ error: 'Server misconfigured: LIVEKIT_URL not set' });
    }

    // --- アクセストークン発行（JWT、例: 有効期限2h）
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
      // canPublishData: true, // 必要ならON
    });

    const token = await at.toJwt();
    const wsUrl = process.env.LIVEKIT_URL; // LiveKitのWS URL（既存ポリシーに合わせる）

    // --- レスポンスは即返す（UX重視）
    res.json({ token, wsUrl });

    // --- ★ 非同期で録音 ensure を起動（awaitしない）
    // 既定prefix = minutes/YYYY-MM-DD/（UTC日付）。クライアントが ensurePrefix を渡せばそれを優先。
    const prefix =
      typeof ensurePrefix === 'string' && ensurePrefix.length > 0
        ? ensurePrefix
        : `minutes/${yyyyMmDd()}/`;

    (async () => {
      try {
        const r = await ensureAudioEgress({
          roomName: String(roomName),
          prefix,
        });
        console.log('[livekit/token.ensureAudioEgress]', roomName, r);
      } catch (e) {
        console.error('[livekit/token.ensureAudioEgress] failed', e?.message || e);
      }
    })();
  } catch (e) {
    console.error('[LiveKit] token generation failed:', e);
    return res.status(500).json({ error: 'token generation failed' });
  }
});

module.exports = router;
