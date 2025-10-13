// pages/api/generate-minutes.js
export default async function handler(req, res) {
  const BACKEND_BASE =
    process.env.BACKEND_BASE
    || process.env.NEXT_PUBLIC_API_BASE
    || 'https://sense-website-production.up.railway.app'; // 最後の砦

  if (!BACKEND_BASE) {
    return res.status(500).json({ error: 'BACKEND_BASE is not set' });
  }

  const url = `${BACKEND_BASE.replace(/\/+$/, '')}/api/generate-minutes`;

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    });

    // バックエンドのステータスをそのまま返す
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    console.error('[proxy /api/generate-minutes] error:', e);
    res.status(502).json({ error: 'Bad Gateway', details: String(e) });
  }
}
