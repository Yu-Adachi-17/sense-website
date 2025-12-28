// src/pages/api/slideaipro/generate.js

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }

    const base = process.env.SLIDEAIPRO_BACKEND_BASE_URL;
    if (!base) {
      return res.status(500).json({ error: "Missing env: SLIDEAIPRO_BACKEND_BASE_URL" });
    }

    // Railway 側のエンドポイントはあなたの実装に合わせて変更
    // 例: POST /slideaipro/generate
    const url = `${base.replace(/\/$/, "")}/slideaipro/generate`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 必要なら Bearer
        ...(process.env.SLIDEAIPRO_BACKEND_BEARER
          ? { Authorization: `Bearer ${process.env.SLIDEAIPRO_BACKEND_BEARER}` }
          : {}),
      },
      body: JSON.stringify({ text }),
    });

    const contentType = r.headers.get("content-type") || "";

    if (!r.ok) {
      const t = contentType.includes("application/json") ? JSON.stringify(await r.json()) : await r.text();
      return res.status(r.status).send(t);
    }

    // 生成結果は JSON 前提
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
