// src/pages/api/slideaipro/generate.js

const DEFAULT_TIMEOUT_MS = 120000;

function getBackendBaseUrl() {
  const base = process.env.SLIDEAIPRO_BACKEND_BASE_URL;
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

async function readJsonBody(req) {
  // Next.js pages API: req.body is already parsed if JSON; but handle raw too.
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const c of req) chunks.push(Buffer.from(c));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { __raw: raw };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const base = getBackendBaseUrl();
  if (!base) {
    return res.status(500).json({
      error: 'Missing env: SLIDEAIPRO_BACKEND_BASE_URL',
    });
  }

  // ここだけ必要なら変える（あなたのRailway側のエンドポイントに合わせる）
  const backendUrl = `${base}/slideaipro/generate`;

  const body = await readJsonBody(req);

  const timeoutMs = Number(process.env.SLIDEAIPRO_GENERATE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const r = await fetch(backendUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: ac.signal,
    });

    const text = await r.text();

    // backendがJSON以外を返しても、フロント側が原因調査しやすいようにそのまま返す
    if (!r.ok) {
      return res.status(r.status).json({
        error: "BackendError",
        backendStatus: r.status,
        backendBody: text.slice(0, 5000),
      });
    }

    // JSONパース
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(200).json(data);
  } catch (e) {
    const msg = e && typeof e === "object" && "name" in e && e.name === "AbortError"
      ? `Timeout after ${timeoutMs}ms`
      : (e?.message || String(e));

    return res.status(500).json({
      error: "GenerateFailed",
      message: msg,
    });
  } finally {
    clearTimeout(timer);
  }
}
