// frontend/next.config.js
const csp = [
  "default-src 'self'",
  "frame-ancestors 'self' https://*.zoom.us https://*.zoom.com",
  "base-uri 'self'",
  "form-action 'self'",
  // ▼ CSS/フォント/画像/API を許可（必要に応じて追記）
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.sense-ai.world https://*.sense-ai.world"
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: csp }
];

module.exports = {
  reactStrictMode: true,
  // experimental: { appDir: true },
  pageExtensions: ['tsx','ts','jsx','js'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
