// backend/routes/zoomOAuthExchangeRoute.js
// Zoom OAuth "authorization_code" をアクセストークンへ交換するだけのルーター。
// JSON / x-www-form-urlencoded / text(raw JSON) を確実に受け、詳細ログを出す。

const express = require('express');
const axios = require('axios');

const router = express.Router();

/* ---- パーサ（ルート専用・保険） ---- */
router.use(express.json({ limit: '1mb' }));                         // Content-Type: application/json
router.use(express.urlencoded({ extended: false, limit: '1mb' }));  // Content-Type: application/x-www-form-urlencoded
router.use(express.text({ type: '*/*', limit: '1mb' }));            // 予期せぬ Content-Type でも raw を拾う

// _rawBody を app 側が仕込んでいるなら拾う。なければ text() で拾った文字列から JSON を復元。
router.use((req, _res, next) => {
  try {
    if (!req.body || (typeof req.body === 'string' && !req.body.trim())) {
      const raw = req._rawBody || (typeof req.body === 'string' ? req.body : '');
      if (raw && raw.trim().startsWith('{')) {
        req.body = JSON.parse(raw);
      }
    }
  } catch (_) { /* noop: ダメならそのまま */ }
  next();
});

/* ---- デバッグログ ---- */
router.use((req, _res, next) => {
  const safe = { ...req.headers };
  if (safe.authorization) safe.authorization = '***';
  console.log('[OAUTH] >>>', req.method, req.originalUrl);
  console.log('[OAUTH] headers =', JSON.stringify(safe));
  console.log('[OAUTH] body    =', JSON.stringify(req.body));
  next();
});

/**
 * POST /api/zoom/oauth/exchange
 * body: { code: string, redirectUri: string, state?: string }
 * 成功: { ok:true, tokens:{ access_token, refresh_token, expires_in, ... } }
 * 失敗: { ok:false, error, detail?, status? }
 */
router.post('/exchange', async (req, res) => {
  try {
    const { code, redirectUri /*, state*/ } = req.body || {};
    if (!code || !redirectUri) {
      return res.status(400).json({ ok: false, error: 'missing code or redirectUri' });
    }

    const cid = process.env.ZOOM_CLIENT_ID;
    const secret = process.env.ZOOM_CLIENT_SECRET;
    if (!cid || !secret) {
      return res.status(500).json({ ok: false, error: 'missing ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET in env' });
    }
    const basic = Buffer.from(`${cid}:${secret}`).toString('base64');

    // Zoom のトークンエンドポイント（application/x-www-form-urlencoded）
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri, // ※認可時に使ったURLと完全一致必須
    });

    const z = await axios.post('https://zoom.us/oauth/token', form.toString(), {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
      // Zoom はクエリでも受けるが body に入れるのが無難。参考: 公式/コミュニティの事例。 
    });

    return res.status(200).json({ ok: true, tokens: z.data });
  } catch (e) {
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
