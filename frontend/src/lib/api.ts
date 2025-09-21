// 共通: API ベースURLとパス結合ヘルパ
// 優先順位: NEXT_PUBLIC_API_BASE_URL > NEXT_PUBLIC_API_BASE > 空文字
const RAW_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    '').trim();

export const API_BASE = RAW_BASE.replace(/\/+$/, ''); // 末尾スラッシュ除去

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p; // BASE 未設定なら相対パスを返す
}

// 便利関数（必要なら使ってください）
export async function postJson<T = any>(
  path: string,
  body: unknown,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify(body ?? {}),
    ...init,
  });
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    // JSONでない場合のフォールバック
    return { raw: txt } as unknown as T;
  }
}
