// src/lib/apiClient.js
const PUBLIC_BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_BASE ||
  'https://sense-website-production.up.railway.app'; // 本番フォールバック

export async function apiFetch(path, init) {
  // 1) まず同一オリジンの Next API を叩く
  try {
    const r = await fetch(path, init);
    if (r.status !== 404) return r;      // 404以外はそのまま返す
  } catch (_) {
    // ネットワークエラー時はフォールバックへ進む
  }
  // 2) 404 だったら Railway 直叩きに切り替え
  const url = `${PUBLIC_BACKEND}${path}`;
  return fetch(url, init);
}
