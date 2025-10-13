// src/pages/api/formats/index.js
export default async function handler(_req, res) {
  try {
    const base =
      process.env.BACKEND_BASE ||
      'https://sense-website-production.up.railway.app'; // ← フォールバック

    const r = await fetch(`${base}/api/formats`);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return res.status(r.status).json(json);
  } catch (e) {
    return res.status(502).json({ error: 'Bad Gateway', detail: String(e?.message || e) });
  }
}
