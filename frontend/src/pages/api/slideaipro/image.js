// src/pages/api/slideaipro/image.js

function getBackendBaseUrl() {
  const base = process.env.SLIDEAIPRO_BACKEND_BASE_URL;
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

function isAllowedUrl(u, backendBase) {
  // 安全のため「backend配下のみ」を許可（オープンプロキシにしない）
  if (!backendBase) return false;
  return u.startsWith(backendBase);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const base = getBackendBaseUrl();
  if (!base) return res.status(500).json({ error: "Missing env: SLIDEAIPRO_BACKEND_BASE_URL" });

  const u = typeof req.query.u === "string" ? req.query.u : "";
  if (!u) return res.status(400).json({ error: "Missing query: u" });

  if (!isAllowedUrl(u, base)) {
    return res.status(400).json({ error: "Disallowed image url" });
  }

  try {
    const r = await fetch(u);
    if (!r.ok) {
      return res.status(r.status).json({ error: "ImageFetchFailed", status: r.status });
    }

    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get("content-type") || "application/octet-stream";

    res.setHeader("content-type", ct);
    res.setHeader("cache-control", "public, max-age=86400");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: "ImageProxyError", message: e?.message || String(e) });
  }
}
