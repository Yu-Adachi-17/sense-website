// src/pages/api/generate-minutes.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const base =
      process.env.BACKEND_BASE ||
      'https://sense-website-production.up.railway.app'; // ← フォールバック

    const upstream = await fetch(`${base}/api/generate-minutes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return res.status(upstream.status).json(json);
  } catch (e) {
    return res.status(502).json({ error: 'Bad Gateway', detail: String(e?.message || e) });
  }
}
