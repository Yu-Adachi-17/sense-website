// src/pages/api/slideaipro/image-by-key.js

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const cacheKey = typeof req.query.cacheKey === "string" ? req.query.cacheKey.trim() : "";
    if (!cacheKey) {
      return res.status(400).json({ error: "cacheKey is required" });
    }

    const base = process.env.SLIDEAIPRO_BACKEND_BASE_URL;
    if (!base) {
      return res.status(500).json({ error: "Missing env: SLIDEAIPRO_BACKEND_BASE_URL" });
    }

    // Railway 側で「cacheKeyから画像バイナリを返す」エンドポイントがあるのが理想
    // 例: GET /slideaipro/image-by-key?cacheKey=xxx
    const url = `${base.replace(/\/$/, "")}/slideaipro/image-by-key?cacheKey=${encodeURIComponent(cacheKey)}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        ...(process.env.SLIDEAIPRO_BACKEND_BEARER
          ? { Authorization: `Bearer ${process.env.SLIDEAIPRO_BACKEND_BEARER}` }
          : {}),
      },
    });

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
