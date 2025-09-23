// backend/routes/zoomOAuthExchangeRoute.js
// Zoom OAuth "authorization_code" をアクセストークンへ交換するだけのルーター。
// リクエストボディは application/json 固定で受ける。ここに try/catch と詳細ログを入れておく。

const express = require('express');
const axios = require('axios');

const router = express.Router();

// ルート個別のパーサ（保険）: サーバ全体の express.json() が効いてなくてもここで確実に JSON を読む
router.use(express.json());

// デバッグ：受信ヘッダとボディを必ずログ
router.use((req, _res, next) => {
  const safe = { ...req.headers };
  if (safe.authorization) safe.authorization = '***';
  console.log('[OAUTH] headers =', JSON.stringify(safe));
  console.log('[OAUTH] body    =', JSON.stringify(req.body));
  next();
});

/**
 * POST /api/zoom/oauth/exchange
 * body: { code: string, redirectUri: string, state?: string }
 * 成功: { ok:true, tokens:{ access_token, refresh_token, expires_in, ... } }
 * 失敗: { ok:false, error, detail? }
 */
router.post('/exchange', async (req, res) => {
  try {
    const { code, redirectUri /*, state*/ } = req.body || {};
    if (!code || !redirectUri) {
      // いま 400 で見えているメッセージはこの return が出している（Zoom には未到達）
      return res.status(400).json({ ok: false, error: 'missing code or redirectUri' });
    }

    // Zoom OAuth アプリの資格情報
    const cid = process.env.ZOOM_CLIENT_ID;
    const secret = process.env.ZOOM_CLIENT_SECRET;
    if (!cid || !secret) {
      return res.status(500).json({
        ok: false,
        error: 'missing ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET in env',
      });
    }
    const basic = Buffer.from(`${cid}:${secret}`).toString('base64');

    // RFC/Zoom 仕様上、redirect_uri は **認可時に使った URL と完全一致** である必要があります
    // （スキーム/ホスト/パス/末尾スラッシュ/サブドメイン含めて一致）
    // 例: https://www.sense-ai.world/zoom/oauth/callback

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const z = await axios.post(
      'https://zoom.us/oauth/token',
      form.toString(),
      {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    // 返り値例: { access_token, refresh_token, expires_in, token_type, scope ... }
    return res.status(200).json({ ok: true, tokens: z.data });
  } catch (e) {
    // Zoom からのエラーはここに落ちてくる。debug 出す。
    const status = e.response?.status;
    const data   = e.response?.data;
    console.error('[OAUTH] exchange failed:', status, data || e.message);
    return res.status(502).json({
      ok: false,
      error: 'token_exchange_failed',
      detail: data || e.message,
      status,
    });
  }
});

module.exports = router;
