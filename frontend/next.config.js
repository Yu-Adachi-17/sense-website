// frontend/next.config.js
/** 既存設定＋セキュリティヘッダを共存させた版 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' }, // MIMEスニッフィング無効化
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, // 参照元の最小化
  {
    key: 'Content-Security-Policy',
    // 最小構成のCSP。必要に応じて script-src / style-src / img-src / connect-src を追加してください。
    value: [
      "default-src 'self'",
      // Zoomクライアント内の埋め込みを許可（クリックジャッキング対策）
      "frame-ancestors 'self' https://*.zoom.us https://*.zoom.com",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  }
];

module.exports = {
  reactStrictMode: true,
  experimental: { appDir: true },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'], // `pages/` を正しく認識
  async headers() {
    // ルート配下すべてに適用（Zoomの検査がルートに向くケースの取りこぼし防止）
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
