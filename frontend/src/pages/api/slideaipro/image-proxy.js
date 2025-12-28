// src/pages/api/slideaipro/image-proxy.js

export const config = {
  api: {
    responseLimit: false,
  },
};

function hostAllowed(host) {
  // カンマ区切り: "firebasestorage.googleapis.com,storage.googleapis.com,cdn.example.com"
  const raw = process.env.IMAGE_PROXY_ALLOW_HOSTS || "";
  const allow = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allow.length === 0) return true; // 未設定なら全許可（必要なら締める）
  return allow.includes(host);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const urlStr = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!urlStr) {
      return res.status(400).json({ error: "url is required" });
    }

    let u;
    try {
      u = new URL(urlStr);
    } catch {
      return res.status(400).json({ error: "invalid url" });
    }

    if (!hostAllowed(u.hostname)) {
      return res.status(400).json({ error: "host not allowed" });
    }

    const r = await fetch(urlStr, { method: "GET" });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).send(t);
    }

    const ct = r.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await r.arrayBuffer());

    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=31536000, immutable");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
