// frontend/src/lib/api.ts
// すべての API ベース URL をここで一元管理
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5001';

// Zoom録音Bot(segments/files)を配信しているゲートウェイのベース
// 同居なら API_BASE と同じでOK。別ホストなら個別に設定。
export const ZOOM_BOT_BASE =
  process.env.NEXT_PUBLIC_ZOOM_BOT_BASE || API_BASE;

// Whisper など文字起こしを担当する最終バックエンド
export const TRANSCRIBE_PROXY_URL =
  process.env.NEXT_PUBLIC_TRANSCRIBE_PROXY_URL ||
  process.env.TRANSCRIBE_PROXY_URL || // サーバ側ENVで注入してもOK
  `${API_BASE}/api/transcribe`;

// 内部トークン（必要なときだけ付ける）
export const INTERNAL_TOKEN = process.env.NEXT_PUBLIC_INTERNAL_TOKEN || '';

// 便利ヘルパ
export function authHeaders(extra?: HeadersInit): HeadersInit {
  const h: Record<string, string> = { ...(extra as any) };
  if (INTERNAL_TOKEN) h['x-internal-token'] = INTERNAL_TOKEN;
  return h;
}
