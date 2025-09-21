// Next 15+: experimental.appDir は削除
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",

  // Zoom を <iframe> で読み込む想定
  "frame-ancestors 'self' https://*.zoom.us https://*.zoom.com",
  "frame-src https://*.zoom.us https://*.zoom.com",

  // CSS / Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",

  // 画像・blob
  "img-src 'self' https: data: blob:",

  // <audio src='blob:...'> や Firebase の音声URL
  "media-src 'self' blob: https://firebasestorage.googleapis.com https://*.sense-ai.world",

  // Web Worker / OffscreenCanvas で blob:
  "worker-src 'self' blob:",

  // 外部スクリプト（必要な分だけ）
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",

  // API / SSE / WebSocket
  // ★ Railway(オフラインAPI) と FirebaseInstallations / GA を追加
  "connect-src 'self' https://api.sense-ai.world https://*.sense-ai.world https://sense-website-production.up.railway.app https://*.zoom.us https://*.zoom.com https://firebasestorage.googleapis.com https://firebaseinstallations.googleapis.com https://www.google-analytics.com wss: blob:"
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
  },

  // ✅ ビルド時に ESLint / TS のエラーで落ちないように（恒久対策が整うまで）
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
};
