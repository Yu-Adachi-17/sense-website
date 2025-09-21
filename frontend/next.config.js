// frontend/next.config.js
// ⚠ Next 15 以降は experimental.appDir は無効キーなので削除（警告原因）
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",

  // Zoom を <iframe> で読み込む系の安全策
  "frame-ancestors 'self' https://*.zoom.us https://*.zoom.com",
  "frame-src https://*.zoom.us https://*.zoom.com",

  // CSS / Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",

  // 画像・blob
  "img-src 'self' https: data: blob:",

  // 🔑 音声/動画（blob: を明示）— これが無いと <audio src='blob:...'> がブロックされる
  "media-src 'self' blob: https://firebasestorage.googleapis.com https://*.sense-ai.world",

  // Web Worker / Offscreen などで blob: を使う場合
  "worker-src 'self' blob:",

  // API・SSE・WebSocket
  "connect-src 'self' https://api.sense-ai.world https://*.sense-ai.world https://*.zoom.us https://*.zoom.com https://firebasestorage.googleapis.com wss: blob:"
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: csp }
];

module.exports = {
  reactStrictMode: true,
  // experimental: { appDir: true }, // ← 削除
  pageExtensions: ['tsx','ts','jsx','js'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
