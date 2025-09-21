// frontend/next.config.js
// Next 15: experimental.appDir は無効キーなので入れない
const csp = [
  // 基本
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",

  // Zoom を <iframe> で読み込む場合
  "frame-ancestors 'self' https://*.zoom.us https://*.zoom.com",
  "frame-src https://*.zoom.us https://*.zoom.com",

  // スクリプト（gtag/GA を許可）
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",

  // CSS / フォント
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",

  // 画像・blob
  "img-src 'self' https: data: blob:",

  // 音声/動画（<audio src='blob:...'> 等）
  "media-src 'self' blob: https://firebasestorage.googleapis.com https://*.sense-ai.world",

  // Web Worker / OffscreenCanvas など
  "worker-src 'self' blob:",

  // API/SSE/WebSocket 等（バックエンド・GA・Zoom・Firebase Installations を許可）
  "connect-src 'self' https://api.sense-ai.world https://*.sense-ai.world https://*.zoom.us https://*.zoom.com https://firebasestorage.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com https://firebaseinstallations.googleapis.com wss: blob:"
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: csp }
];

module.exports = {
  reactStrictMode: true,
  pageExtensions: ['tsx','ts','jsx','js'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
