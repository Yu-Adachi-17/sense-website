// lib/zoomAuth.js
const jwt = require('jsonwebtoken');

/**
 * Zoom Meeting SDK 用の短命JWTを発行（HS256）
 * - ZOOM_SDK_KEY   = Zoom Marketplace の Client ID  (= SDK Key)
 * - ZOOM_SDK_SECRET= Zoom Marketplace の Client Secret (= SDK Secret)
 * - 有効期限は 5 分（Join直前に毎回発行）
 */
function issueZoomSdkJwt() {
  const now = Math.floor(Date.now() / 1000);
  const iat = now - 30;        // 端末時計のズレ吸収
  const exp = iat + 60 * 5;    // 5分

  const payload = {
    appKey: process.env.ZOOM_SDK_KEY,
    iat,
    exp,
    tokenExp: exp,             // 一部SDK実装が参照するフィールド
  };

  return jwt.sign(payload, process.env.ZOOM_SDK_SECRET, { algorithm: 'HS256' });
}

module.exports = { issueZoomSdkJwt };
