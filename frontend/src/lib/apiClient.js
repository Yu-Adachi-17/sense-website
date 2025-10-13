// src/lib/apiClient.js（想定フル）
export async function apiFetch(input, init = {}) {
  const rel = typeof input === "string" ? input : input?.url || "";
  const isAbs = /^https?:\/\//i.test(rel);

  const base =
    (typeof window !== "undefined" && window.__API_BASE__) ||
    process.env.NEXT_PUBLIC_BACKEND_BASE ||
    process.env.BACKEND_BASE || // 念のため後方互換
    "";

  const url = isAbs ? rel : (base ? base.replace(/\/+$/,"") + rel : rel);

  const res = await fetch(url, {
    // CORS を考慮（Cookie使わないなら omit でもOK）
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}
