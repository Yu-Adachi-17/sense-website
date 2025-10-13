// src/pages/api/formats/[id]/[locale].js
export default async function handler(req, res) {
  const { id, locale } = req.query || {};
  if (!id || !locale) return res.status(400).json({ error: 'id and locale are required' });

  try {
    const base =
      process.env.BACKEND_BASE ||
      'https://sense-website-production.up.railway.app'; // ← フォールバック

    const r = await fetch(`${base}/api/formats/${encodeURIComponent(id)}/${encodeURIComponent(locale)}`);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return res.status(r.status).json(json);
  } catch (e) {
    return res.status(502).json({ error: 'Bad Gateway', detail: String(e?.message || e) });
  }
}
