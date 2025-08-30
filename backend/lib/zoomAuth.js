// lib/zoomAuth.js
const jwt = require('jsonwebtoken');

function requireEnv(k) {
  if (!process.env[k]) throw new Error(`Missing env: ${k}`);
  return process.env[k];
}

/**
 * Zoom Meeting SDK 用 JWT（HS256）
 * 必須: appKey, iat, exp, tokenExp（すべて秒）
 * ルール: exp は iat + 1800 以上（推奨は 3600 以上）、最大 48h 程度
 */
function issueZoomSdkJwt() {
  const SDK_KEY    = requireEnv('ZOOM_SDK_KEY');    // Meeting SDK の Client ID / SDK Key
  const SDK_SECRET = requireEnv('ZOOM_SDK_SECRET'); // Meeting SDK の Client Secret / SDK Secret

  const now = Math.floor(Date.now() / 1000);
  const iat = now - 30;          // 時計ズレ吸収
  const exp = iat + 3600;        // ★ 1時間（>=1800 必須）
  const tokenExp = exp;          // Desktop/Mobile は exp と同値でOK

  const payload = { appKey: SDK_KEY, iat, exp, tokenExp };
  return jwt.sign(payload, SDK_SECRET, { algorithm: 'HS256' });
}

module.exports = { issueZoomSdkJwt };
