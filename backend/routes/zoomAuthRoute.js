// routes/zoomAuthRoute.js
const express = require('express');
const { issueZoomSdkJwt } = require('../lib/zoomAuth');

const router = express.Router();

/**
 * POST /api/zoom/sdk-jwt
 * レスポンス: { token: string, expiresInSec: number }
 *
 * 重要: 本番では認証・レート制限を必ず付けてください。
 * ここでは最小構成（開発用）として公開しています。
 */
router.post('/zoom/sdk-jwt', (req, res) => {
  try {
    const token = issueZoomSdkJwt();
    return res.json({ token, expiresInSec: 300 });
  } catch (e) {
    console.error('[zoom/sdk-jwt] error', e);
    return res.status(500).json({ error: 'failed_to_issue_sdk_jwt' });
  }
});

module.exports = router;
