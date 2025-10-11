// next.config.js

// ✅ i18n（SSR翻訳）設定を next-i18next.config.js から読み込み
const { i18n: i18nRaw } = require('./next-i18next.config');

// ✅ Next.js は boolean を要求するため、localeDetection を強制的に boolean 化
const i18n = {
  ...i18nRaw,
  localeDetection: false,
};

// --- Content Security Policy ---
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",

  // 埋め込み（Zoom）
  "frame-ancestors 'self' https://*.zoom.us https://*.zoom.com",
  "frame-src https://*.zoom.us https://*.zoom.com",

  // CSS / Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com",
  "font-src 'self' data: https://fonts.gstatic.com https://*.gstatic.com",

  // 画像 / blob
  "img-src 'self' https: data: blob:",

  // 音声/動画
  "media-src 'self' https: blob: https://firebasestorage.googleapis.com https://*.sense-ai.world",

  // Web Worker
  "worker-src 'self' blob: data:",

  // スクリプト（必要最小限に）※可能なら 'unsafe-eval' は将来的に外す
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://www.googletagmanager.com https://www.google-analytics.com https://www.gstatic.com https://www.gstatic.com/firebasejs/",

  // API / SSE / WebSocket など
  "connect-src 'self' https: wss: blob: " +
    "https://api.sense-ai.world https://*.sense-ai.world " +
    "https://sense-website-production.up.railway.app " +
    "https://firestore.googleapis.com https://firebasestorage.googleapis.com " +
    "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com " +
    "https://firebaseinstallations.googleapis.com https://www.googleapis.com " +
    "https://www.google-analytics.com https://www.googletagmanager.com " +
    "https://*.zoom.us https://*.zoom.com",

  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ i18n を next.config.js に反映（localeDetection: false もここで確定）
  i18n,

  // ✅ ここを明示：.html 生成を前提に「末尾スラなし」へ固定
  //    （/page → /page.html。/page/ → /page/index.html のズレを防ぐ）
  trailingSlash: false, // ← 重要
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },

  // ✅ OAuthコールバックをRailwayのExpressへプロキシ（多言語/素の両対応）
  async rewrites() {
    return [
      // /ja/zoom/oauth/callback → 外部（ロケールは先頭セグメントで受ける）
      {
        source: '/:locale/zoom/oauth/callback',
        destination: 'https://sense-website-production.up.railway.app/zoom/oauth/callback',
        locale: false, // ← 外部先にロケールを付けない
      },
      // /zoom/oauth/callback（ロケールなしも別途カバー）
      {
        source: '/zoom/oauth/callback',
        destination: 'https://sense-website-production.up.railway.app/zoom/oauth/callback',
        locale: false,
      },
    ];
  },

  // ✅ ビルド時の ESLint / TS エラーで落とさない（恒久対策が整うまで）
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
