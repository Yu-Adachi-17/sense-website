// src/pages/api/slideaipro/resolve-image-urls.js

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { cacheKeys } = req.body || {};
    if (!Array.isArray(cacheKeys) || cacheKeys.length === 0) {
      return res.status(400).json({ error: "cacheKeys[] is required" });
    }

    const base = process.env.SLIDEAIPRO_BACKEND_BASE_URL;
    if (!base) {
      return res.status(500).json({ error: "Missing env: SLIDEAIPRO_BACKEND_BASE_URL" });
    }

    // Railway 側のエンドポイントはあなたの実装に合わせて変更
    // 例: POST /slideaipro/resolve-image-urls で { cacheKeys } → { imageUrlByKey }
    const url = `${base.replace(/\/$/, "")}/slideaipro/resolve-image-urls`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SLIDEAIPRO_BACKEND_BEARER
          ? { Authorization: `Bearer ${process.env.SLIDEAIPRO_BACKEND_BEARER}` }
          : {}),
      },
      body: JSON.stringify({ cacheKeys }),
    });

    const contentType = r.headers.get("content-type") || "";
    if (!r.ok) {
      const t = contentType.includes("application/json") ? JSON.stringify(await r.json()) : await r.text();
      return res.status(r.status).send(t);
    }

    const data = await r.json();

    // 期待フォーマット：{ imageUrlByKey: { [cacheKey]: "https://..." } }
    const map = data?.imageUrlByKey && typeof data.imageUrlByKey === "object" ? data.imageUrlByKey : {};
    return res.status(200).json({ imageUrlByKey: map });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
